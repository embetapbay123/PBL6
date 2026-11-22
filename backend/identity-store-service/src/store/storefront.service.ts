import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import type {DataSource,EntityManager} from 'typeorm';
import {database} from '../../../shared/src/database';
import {ApiError} from '../../../shared/src/errors';
import {audit} from '../../../shared/src/audit';
import {config,required} from '../../../shared/src/config';
import {InternalClients} from '../../../shared/src/internal-clients';
import type {OperationInputs,OperationOutputs} from '../../../shared/src/operations.generated';
import {PrivateChatFiles} from '../messaging/media-files';
import {ChatMediaProcessor} from '../messaging/media-process';

type Content=OperationInputs['updateOwnStorefront']['body']['content'];
const empty=():Content=>({enabled:false,groups:[]});
const noProducts=()=>({curated:[],newest:[],bestsellers:[],bestsellers_complete:true});
const asset=(r:any)=>({id:r.id,status:r.status,...(r.width?{width:r.width,height:r.height}:{})});
function draft(r:any,store:string):OperationOutputs['getOwnStorefront']{
 return {store_id:store,version:r?.version??0,content:r?.draft_json??empty(),...(r?.published_at?{published_at:new Date(r.published_at).toISOString(),published_version:r.published_version}:{})};
}
export function checkStorefrontContent(content:Content){
 if(new Set(content.groups.map(g=>g.id)).size!==content.groups.length)throw new ApiError(422,'DUPLICATE_GROUP','Mỗi nhóm cần mã riêng.');
 if(content.groups.some(g=>!g.title.trim()||g.kind==='CURATED'&&!g.product_ids.length||g.kind!=='CURATED'&&g.product_ids.length))throw new ApiError(422,'INVALID_GROUP','Nhóm chọn tay cần sản phẩm; nhóm tự động không nhận danh sách chọn tay.');
 if(content.groups.filter(g=>g.kind==='NEW').length>1||content.groups.filter(g=>g.kind==='BEST_SELLING').length>1)throw new ApiError(422,'DUPLICATE_GROUP','Mỗi nhóm tự động chỉ xuất hiện một lần.');
 const banner=content.banner;
 if(banner&&(!banner.title.trim()||banner.link_type==='PRODUCT'&&!banner.product_id||banner.link_type==='ALL_PRODUCTS'&&banner.product_id))throw new ApiError(422,'INVALID_BANNER_LINK','Chọn đúng sản phẩm đích hoặc danh sách gian hàng.');
 const c=content.campaign;
 if(c&&(!c.title.trim()||!Number.isFinite(Date.parse(c.starts_at))||!Number.isFinite(Date.parse(c.ends_at))||Date.parse(c.starts_at)>=Date.parse(c.ends_at)))throw new ApiError(422,'INVALID_CAMPAIGN_PERIOD','Thời gian kết thúc phải sau thời gian bắt đầu.');
}
export class StorefrontService {
 constructor(private readonly db:DataSource=database,private readonly factory?:()=>InternalClients){}
 private clients(){if(this.factory)return this.factory();const c=config('M3');return new InternalClients('M3',c.internalKeys.M3,{M1:c.catalogUrl,M2:required('COMMERCE_URL'),M3:c.identityUrl});}
 private async scope(auth:any,manager:EntityManager=this.db.manager,lock=false){
  const m=auth?.store_membership;
  if(!auth?.roles?.includes('STORE_OWNER')||m?.role!=='OWNER'||m.status!=='ACTIVE')throw new ApiError(403,'STOREFRONT_OWNER_REQUIRED','Chỉ chủ gian hàng được sửa trang gian hàng.');
  const [s]=await manager.query(`SELECT s.id FROM store s JOIN store_membership m ON m.store_id=s.id
   JOIN "user" u ON u.id=m.user_id WHERE s.id=$1 AND m.user_id=$2 AND m.role='OWNER' AND m.status='ACTIVE'
   AND s.status='ACTIVE' AND u.status='ACTIVE'${lock?' FOR SHARE OF s,m,u':''}`,[m.store_id,auth.user_id]);
  if(!s)throw new ApiError(403,'STORE_UNAVAILABLE','Quyền chủ gian hàng hoặc trạng thái gian hàng đã thay đổi.');return s.id as string;
 }
 private async active(store:string){if(!(await this.db.query("SELECT id FROM store WHERE id=$1 AND status='ACTIVE'",[store])).length)throw new ApiError(404,'NOT_FOUND','Không tìm thấy gian hàng đang hoạt động.');}
 async own(auth:any){const store=await this.scope(auth);return draft((await this.db.query('SELECT * FROM store_storefront WHERE store_id=$1',[store]))[0],store);}
 async save(input:OperationInputs['updateOwnStorefront']['body'],auth:any,trace:string){
  checkStorefrontContent(input.content);
  return this.db.transaction(async manager=>{
   const store=await this.scope(auth,manager,true);
   await manager.query('SELECT pg_advisory_xact_lock(721616)');
   await manager.query('INSERT INTO store_storefront(store_id) VALUES($1) ON CONFLICT DO NOTHING',[store]);
   const [before]=await manager.query('SELECT * FROM store_storefront WHERE store_id=$1 FOR UPDATE',[store]);
   if(before.version!==input.expected_version)throw new ApiError(409,'VERSION_CONFLICT','Bản nháp đã thay đổi. Đọc lại trước khi lưu.');
   await this.checkBanner(manager,store,input.content);
   await manager.query('UPDATE store_storefront SET draft_json=$2,version=version+1,updated_at=now() WHERE store_id=$1',[store,JSON.stringify(input.content)]);
   const [after]=await manager.query('SELECT * FROM store_storefront WHERE store_id=$1',[store]);
   await audit(manager,'M3',auth.user_id,'Storefront',store,'STOREFRONT_DRAFT_SAVED',trace,{version:before.version,storefront:before.draft_json},{version:after.version,store_id:store,storefront:after.draft_json},store);
   return draft(after,store);
  });
 }
 private async checkBanner(manager:EntityManager,store:string,content:Content){
  if(content.banner&&!(await manager.query("SELECT id FROM storefront_banner WHERE id=$1 AND store_id=$2 AND status='READY' AND content IS NOT NULL FOR SHARE",[content.banner.asset_id,store])).length)throw new ApiError(422,'BANNER_UNAVAILABLE','Banner chưa sẵn sàng hoặc không thuộc gian hàng.');
 }
 private async resolve(store:string,content:Content,trace:string,strict=false){
  if(!content.enabled)return {content:empty(),products:noProducts()};
  checkStorefrontContent(content);
  const ids=[...new Set([...content.groups.flatMap(g=>g.product_ids),...(content.banner?.product_id?[content.banner.product_id]:[])])];
  const client=this.clients();
  const [products,terms]=await Promise.all([
   client.call('ResolveStorefrontCatalog',{store_id:store,product_ids:ids,include_new:content.groups.some(g=>g.kind==='NEW'),include_bestsellers:content.groups.some(g=>g.kind==='BEST_SELLING')},trace),
   content.campaign?client.call('ResolveStorefrontVoucher',{store_id:store,voucher_id:content.campaign.voucher_id},trace):Promise.resolve({voucher:undefined})
  ]);
  const visible=new Set(products.curated.map(p=>p.id));
  if(strict&&ids.some(id=>!visible.has(id)))throw new ApiError(422,'STOREFRONT_PRODUCT_UNAVAILABLE','Có sản phẩm không còn công khai hoặc không thuộc gian hàng. Kiểm tra lại nhóm và đích banner.');
  let banner=content.banner;
  if(banner){const valid=await this.db.query("SELECT id FROM storefront_banner WHERE id=$1 AND store_id=$2 AND status='READY'",[banner.asset_id,store]);if(!valid.length||banner.product_id&&!visible.has(banner.product_id))banner=undefined;}
  let campaign=content.campaign,campaign_voucher=terms.voucher;
  if(campaign){
   const v=terms.voucher,valid=v&&Date.parse(campaign.starts_at)>=Date.parse(v.starts_at)&&Date.parse(campaign.ends_at)<=Date.parse(v.ends_at);
   if(strict&&(!valid||Date.parse(campaign.ends_at)<=Date.now()))throw new ApiError(422,'CAMPAIGN_VOUCHER_UNAVAILABLE','Chọn mã còn lượt và đặt lịch trong thời gian hiệu lực của mã.');
   if(!valid||Date.now()<Date.parse(campaign.starts_at)||Date.now()>=Date.parse(campaign.ends_at)){campaign=undefined;campaign_voucher=undefined;}
  }
  const groups=content.groups.map(g=>({...g,product_ids:g.product_ids.filter(id=>visible.has(id))})).filter(g=>g.kind==='CURATED'?g.product_ids.length:g.kind==='NEW'?products.newest.length:products.bestsellers_complete&&products.bestsellers.length);
  return {content:{enabled:true,groups,...(banner?{banner}:{}),...(campaign?{campaign}:{})},products,...(campaign_voucher&&campaign?{campaign_voucher}:{})};
 }
 async preview(auth:any,trace:string){const own=await this.own(auth);return {store_id:own.store_id,version:own.version,...await this.resolve(own.store_id,own.content,trace)};}
 async publish(input:{expected_version:number},auth:any,trace:string){
  const snapshot=await this.own(auth);
  if(snapshot.version!==input.expected_version)throw new ApiError(409,'VERSION_CONFLICT','Bản nháp đã thay đổi. Đọc lại trước khi xuất bản.');
  await this.resolve(snapshot.store_id,snapshot.content,trace,true);
  return this.db.transaction(async manager=>{
   const store=await this.scope(auth,manager,true);await manager.query('SELECT pg_advisory_xact_lock(721616)');await manager.query('INSERT INTO store_storefront(store_id) VALUES($1) ON CONFLICT DO NOTHING',[store]);
   const [before]=await manager.query('SELECT * FROM store_storefront WHERE store_id=$1 FOR UPDATE',[store]);
   if(before.version!==input.expected_version)throw new ApiError(409,'VERSION_CONFLICT','Bản nháp đã thay đổi. Đọc lại trước khi xuất bản.');
   await this.checkBanner(manager,store,before.draft_json);
   await manager.query('UPDATE store_storefront SET published_json=draft_json,version=version+1,published_version=version+1,published_at=now(),updated_at=now() WHERE store_id=$1',[store]);
   const [after]=await manager.query('SELECT * FROM store_storefront WHERE store_id=$1',[store]);
   await audit(manager,'M3',auth.user_id,'Storefront',store,'STOREFRONT_PUBLISHED',trace,{version:before.published_version,storefront:before.published_json},{version:after.version,store_id:store,status:after.draft_json.enabled?'PUBLISHED':'DISABLED',storefront:after.published_json},store);
   return draft(after,store);
  });
 }
 async public(store:string,trace:string):Promise<OperationOutputs['getPublicStorefront']>{
  await this.active(store);const [row]=await this.db.query('SELECT * FROM store_storefront WHERE store_id=$1',[store]);
  const result=await this.resolve(store,row?.published_json??empty(),trace);
  await this.active(store);
  return {store_id:store,version:row?.published_version??0,...result,...(row?.published_at?{published_at:new Date(row.published_at).toISOString()}:{})};
 }
 async createBanner(input:OperationInputs['createStorefrontBanner']['body'],auth:any){
  return this.db.transaction(async manager=>{
   const store=await this.scope(auth,manager,true);await manager.query('SELECT pg_advisory_xact_lock(721616)');
   const [existing]=await manager.query('SELECT * FROM storefront_banner WHERE store_id=$1 AND client_upload_id=$2',[store,input.client_upload_id]);
   if(existing){if(existing.expected_sha256!==input.sha256||existing.expected_bytes!==input.size_bytes)throw new ApiError(409,'UPLOAD_CHANGED','Tệp của lần tải này đã thay đổi. Chọn lại tệp.');return asset(existing);}
   // Retain current draft/published assets. Other banners expire after one day.
   await manager.query(`DELETE FROM storefront_banner b WHERE b.created_at<now()-interval '1 day' AND coalesce(b.lease_until,'-infinity')<now()
    AND NOT EXISTS(SELECT 1 FROM store_storefront s WHERE s.store_id=b.store_id AND (s.draft_json#>>'{banner,asset_id}'=b.id::text OR s.published_json#>>'{banner,asset_id}'=b.id::text))`);
   const [counts]=await manager.query(`SELECT count(*) FILTER(WHERE store_id=$1)::int AS own,count(*)::int AS total,
    count(*) FILTER(WHERE store_id=$1 AND created_at>now()-interval '1 day')::int AS daily FROM storefront_banner`,[store]);
   if(counts.own>=8||counts.total>=200||counts.daily>=20)throw new ApiError(429,'BANNER_QUOTA_REACHED','Đã hết lượt lưu banner. Giữ banner đang dùng hoặc thử lại sau.');
   const [row]=await manager.query('INSERT INTO storefront_banner(store_id,owner_id,client_upload_id,expected_bytes,expected_sha256) VALUES($1,$2,$3,$4,$5) RETURNING *',[store,auth.user_id,input.client_upload_id,input.size_bytes,input.sha256]);return asset(row);
  });
 }
 async uploadBanner(id:string,auth:any,stream:AsyncIterable<Buffer>,type:string,length?:string){
  const store=await this.scope(auth),token=randomUUID();
  const selected=await this.db.transaction(async manager=>{
   await manager.query('SELECT pg_advisory_xact_lock(721616)');
   const [r]=await manager.query('SELECT * FROM storefront_banner WHERE id=$1 AND store_id=$2 FOR UPDATE',[id,store]);
   if(!r)throw new ApiError(404,'NOT_FOUND','Không tìm thấy banner.');if(r.status==='READY')return r;
   if(type.split(';')[0].trim()!=='application/octet-stream'||length!==undefined&&Number(length)!==r.expected_bytes)throw new ApiError(422,'BANNER_UPLOAD_INVALID','Tệp tải lên không khớp bản đã chọn.');
   const [count]=await manager.query("SELECT count(*)::int AS n FROM storefront_banner WHERE status='PROCESSING' AND lease_until>now()");
   if(r.lease_until&&new Date(r.lease_until).getTime()>Date.now()||count.n>=2)throw new ApiError(429,'BANNER_UPLOAD_BUSY','Đang xử lý banner. Đợi một lát rồi thử lại tệp này.');
   await manager.query("UPDATE storefront_banner SET status='PROCESSING',lease_token=$2,lease_until=now()+interval '150 seconds' WHERE id=$1",[id,token]);return r;
  });
  if(selected.status==='READY')return asset(selected);
  let directory:string|undefined;
  try{
   const chunks:Buffer[]=[],hash=createHash('sha256');let size=0;
   for await(const chunk of stream){size+=chunk.length;if(size>selected.expected_bytes)throw new ApiError(413,'BANNER_TOO_LARGE','Banner tối đa 2 MB.');hash.update(chunk);chunks.push(chunk);}
   if(size!==selected.expected_bytes||hash.digest('hex')!==selected.expected_sha256)throw new ApiError(422,'BANNER_UPLOAD_INVALID','Tệp tải lên không khớp bản đã chọn.');
   directory=await mkdtemp(join(tmpdir(),'pbl6-banner-'));const files=new PrivateChatFiles(directory),temporary=await files.temporary();
   try{await temporary.handle.writeFile(Buffer.concat(chunks));}finally{await temporary.handle.close();}
   const processed=await new ChatMediaProcessor(files).process(temporary.key,'IMAGE');
   if(processed.stored_bytes>524288)throw new ApiError(413,'BANNER_TOO_LARGE','Ảnh sau xử lý quá lớn. Chọn ảnh banner gọn hơn.');
   const bytes=await readFile(files.path(processed.key));
   return await this.db.transaction(async manager=>{
    await this.scope(auth,manager,true);
    const rows=await manager.query("UPDATE storefront_banner SET status='READY',content=$4,width=$5,height=$6,lease_token=NULL,lease_until=NULL WHERE id=$1 AND store_id=$2 AND lease_token=$3 AND lease_until>now() RETURNING id,status,width,height",[id,store,token,bytes,processed.width,processed.height]);
    const r=Array.isArray(rows[0])?rows[0][0]:rows[0];if(!r)throw new ApiError(409,'BANNER_UPLOAD_EXPIRED','Lần tải đã hết hạn. Hãy thử lại.');return asset(r);
   });
  }catch(error){await this.db.query("UPDATE storefront_banner SET status='FAILED',lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2",[id,token]);throw error;}
  finally{if(directory&&dirname(resolve(directory))===resolve(tmpdir())&&directory.startsWith(join(tmpdir(),'pbl6-banner-')))await rm(directory,{recursive:true,force:true});}
 }
 async banner(id:string,store:string,auth?:any){
  if(auth){if(await this.scope(auth)!==store)throw new ApiError(404,'NOT_FOUND','Không tìm thấy banner.');}
  else{await this.active(store);const [s]=await this.db.query("SELECT store_id FROM store_storefront WHERE store_id=$1 AND published_json->>'enabled'='true' AND published_json#>>'{banner,asset_id}'=$2",[store,id]);if(!s)throw new ApiError(404,'NOT_FOUND','Không tìm thấy banner đang xuất bản.');}
  const [r]=await this.db.query("SELECT content FROM storefront_banner WHERE id=$1 AND store_id=$2 AND status='READY' AND content IS NOT NULL",[id,store]);if(!r)throw new ApiError(404,'NOT_FOUND','Không tìm thấy banner.');return r.content as Buffer;
 }
 async ownBanner(id:string,auth:any){return this.banner(id,await this.scope(auth),auth);}
}
