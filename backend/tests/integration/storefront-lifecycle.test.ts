import 'reflect-metadata';
import {DataSource} from 'typeorm';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {Readable} from 'node:stream';
import {StorefrontService} from '../../identity-store-service/src/store/storefront.service';
import {StorefrontCatalog} from '../../catalog-service/src/catalog/storefront-catalog';
import {StorefrontCommerce} from '../../commerce-service/src/report/storefront-commerce';
import {CatalogRepository} from '../../catalog-service/src/catalog/catalog.repository';
import {InternalClients} from '../../shared/src/internal-clients';
import {schemaErrors} from '../../shared/src/contract-validation';
import {operationContracts,validateOperation} from '../../shared/src/request-contract';
import type {OperationInputs} from '../../shared/src/operations.generated';

const enabled=['M1','M2','M3'].every(id=>process.env[id+'_DATABASE_URL'])?describe:describe.skip;
enabled('storefront: isolated PostgreSQL catalog, commerce and identity',()=>{
 const roots:DataSource[]=[],sources:Record<string,DataSource>={},schemas:string[]=[];
 const store=randomUUID(),otherStore=randomUUID(),owner=randomUUID(),other=randomUUID(),type=randomUUID();
 const product=randomUUID(),second=randomUUID(),foreign=randomUUID(),hidden=randomUUID(),group=randomUUID();
 const auth={user_id:owner,roles:['STORE_OWNER'],store_membership:{store_id:store,role:'OWNER',status:'ACTIVE'}};
 let service:StorefrontService,commerce:StorefrontCommerce,catalog:StorefrontCatalog;
 let voucher:string,banner:string,png:Buffer,directory:string;
 const content=()=>({enabled:true,groups:[{id:group,title:'Chọn cho mùa mới',kind:'CURATED' as const,product_ids:[product,second]}]});
 const internal=(caller:'M1'|'M3')=>new InternalClients(caller,'isolated-key',{M1:'http://catalog.test',M2:'http://commerce.test',M3:'http://identity.test'},{request:async(url,_caller,_key,trace,input:any)=>{
  if(url.includes('/stores/active'))return {ids:[store,otherStore]} as any;
  if(url.endsWith('/storefront/catalog'))return await catalog.resolve(input,trace) as any;
  if(url.endsWith('/storefront/sales'))return await commerce.sales(input) as any;
  if(url.endsWith('/storefront/voucher'))return await commerce.voucher(input) as any;
  throw Error('Unexpected internal route');
 }});
 beforeAll(async()=>{
  for(const [id,folder]of [['M1','catalog-service'],['M2','commerce-service'],['M3','identity-store-service']]){
   const root=await new DataSource({type:'postgres',url:process.env[id+'_DATABASE_URL']}).initialize();roots.push(root);
   const schema='storefront_'+id.toLowerCase()+'_'+randomUUID().replace(/-/g,'');schemas.push(schema);await root.query('CREATE SCHEMA '+schema);
   const db=await new DataSource({type:'postgres',url:process.env[id+'_DATABASE_URL'],extra:{options:'-csearch_path='+schema+',public',statement_timeout:15000},poolSize:10}).initialize();sources[id]=db;
   for(const file of readdirSync(resolve(folder,'migrations')).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(folder,'migrations',file),'utf8'));
  }
  const m3=sources.M3;
  for(const id of [owner,other])await m3.query('INSERT INTO "user"(id,email,password_hash,status) VALUES($1,$2,$3,$4)',[id,id+'@example.test','disabled-fixture','ACTIVE']);
  for(const [id,user]of [[store,owner],[otherStore,other]]){const app=randomUUID();await m3.query("INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status) VALUES($1,$2,'Fixture','fixture','APPROVED')",[app,user]);await m3.query("INSERT INTO store(id,application_id,name,slug,contact,shipping_fee_vnd,status) VALUES($1::uuid,$2,'Fixture',$1::text,'fixture',0,'ACTIVE')",[id,app]);await m3.query("INSERT INTO store_membership(store_id,user_id,role,status,joined_at) VALUES($1,$2,'OWNER','ACTIVE',now())",[id,user]);}
  const cat=randomUUID();await sources.M1.query("INSERT INTO category(id,name,slug,status) VALUES($1::uuid,'Fixture',$1::text,'ACTIVE')",[cat]);await sources.M1.query("INSERT INTO product_type(id,category_id,name,status) VALUES($1,$2,'Fixture','ACTIVE')",[type,cat]);
  for(const [id,shop,status]of [[product,store,'VISIBLE'],[second,store,'VISIBLE'],[foreign,otherStore,'VISIBLE'],[hidden,store,'HIDDEN']])await sources.M1.query("INSERT INTO product(id,store_id,product_type_id,title,attributes_json,status,moderation_status,sold_count) VALUES($1,$2,$3,$4,'{}','ACTIVE',$5,9999)",[id,shop,type,'Sản phẩm '+id,status]);
  directory=await mkdtemp(join(tmpdir(),'pbl6-storefront-pg-'));const sample=join(directory,'red.png');execFileSync('/usr/bin/ffmpeg',['-v','error','-f','lavfi','-i','color=c=red:s=128x96','-frames:v','1','-threads','1',sample]);png=await readFile(sample);
  commerce=new StorefrontCommerce(sources.M2);catalog=new StorefrontCatalog(sources.M1,()=>internal('M1'));service=new StorefrontService(sources.M3,()=>internal('M3'));
 });
 beforeEach(async()=>{
  await sources.M3.query('DELETE FROM store_storefront');await sources.M3.query('DELETE FROM storefront_banner');await sources.M3.query("UPDATE store SET status='ACTIVE'");await sources.M3.query("UPDATE store_membership SET role='OWNER',status='ACTIVE'");
  await sources.M1.query("UPDATE product SET status='ACTIVE',moderation_status=CASE WHEN id=$1 THEN 'HIDDEN' ELSE 'VISIBLE' END,first_published_at=NULL,publication_tracked=false",[hidden]);
  for(const table of ['voucher_redemption','voucher_reservation','voucher','order_return_request','order_status_history','order_item','order'])await sources.M2.query('DELETE FROM "'+table+'"');
  voucher=randomUUID();await sources.M2.query("INSERT INTO voucher(id,code,scope,store_id,owner_user_id,discount_type,discount_value,min_goods_vnd,starts_at,ends_at,usage_limit,per_customer_limit,status) VALUES($1,$2,'STORE',$3,$4,'PERCENT',10,100000,now()-interval '1 day',now()+interval '10 days',100,2,'ACTIVE')",[voucher,'SHOP'+voucher.slice(0,8),store,owner]);
 });
 afterAll(async()=>{
  for(const db of Object.values(sources))if(db.isInitialized)await db.destroy();
  for(let n=0;n<roots.length;n++){if(/^storefront_m[123]_[a-f0-9]{32}$/.test(schemas[n]))await roots[n].query('DROP SCHEMA '+schemas[n]+' CASCADE');await roots[n].destroy();}
  if(directory&&dirname(resolve(directory))===resolve(tmpdir())&&directory.startsWith(join(tmpdir(),'pbl6-storefront-pg-')))await rm(directory,{recursive:true,force:true});
 });
 async function readyBanner(){const a=await service.createBanner({client_upload_id:randomUUID(),size_bytes:png.length,sha256:createHash('sha256').update(png).digest('hex')},auth);const result=await service.uploadBanner(a.id,auth,Readable.from([png]),'application/octet-stream',String(png.length));expect(result.status).toBe('READY');banner=result.id;return result;}
 async function publish(body:OperationInputs['updateOwnStorefront']['body']['content']=content()){
  const saved=await service.save({expected_version:0,content:body},auth,'draft');await service.publish({expected_version:saved.version},auth,'publish');
 }
 async function sale(id:string,quantity:number,{status='COMPLETED',days=0,received=0,legacy=false}:{status?:string;days?:number;received?:number;legacy?:boolean}={}){
  const order=randomUUID(),item=randomUUID();await sources.M2.query('INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd) VALUES($1,$1,$2,$3,$4,\'COD\',0,0,0,0,0)',[order,other,store,status]);
  await sources.M2.query("INSERT INTO order_item(id,order_id,product_id,variant_id,sku_snapshot,unit_price_vnd,quantity,line_total_vnd) VALUES($1,$2,$3,$3,'fixture',0,$4,0)",[item,order,id,quantity]);
  await sources.M2.query("INSERT INTO order_status_history(order_id,to_status,actor_user_id,operation_id,created_at) VALUES($1,$2,$3,$4,now()-make_interval(days=>$5))",[order,status,owner,randomUUID(),days]);
  if(received||legacy)await sources.M2.query("INSERT INTO order_return_request(order_id,type,reason,status,inspection_json) VALUES($1,'REFUND','Fixture','RECEIVED',$2)",[order,legacy?null:JSON.stringify([{order_item_id:item,received_quantity:received,resellable_quantity:received,damaged_quantity:0,pending_quantity:0}])]);return {order,item};
 }
 test('draft is private; publish is versioned, audited and stale writes cannot replace it',async()=>{
  expect((await service.public(store,'read')).content.enabled).toBe(false);
  const saved=await service.save({expected_version:0,content:content()},auth,'save');expect(saved.version).toBe(1);expect((await service.public(store,'read')).content.enabled).toBe(false);
  const results=await Promise.allSettled([service.publish({expected_version:1},auth,'publish-a'),service.publish({expected_version:1},auth,'publish-b')]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  const live=await service.public(store,'read');expect(live.version).toBe(2);expect(live.products.curated).toHaveLength(2);expect(schemaErrors(live,operationContracts.getPublicStorefront.responses['200'])).toEqual([]);
  await expect(service.save({expected_version:1,content:{enabled:false,groups:[]}},auth,'stale')).rejects.toMatchObject({status:409});expect((await service.public(store,'read')).content.enabled).toBe(true);
  const audits=await sources.M3.query("SELECT action,store_id FROM m3_audit WHERE target_type='Storefront'");expect(audits).toHaveLength(2);expect(audits.every((r:any)=>r.store_id===store)).toBe(true);
 });
 test('requires current owner, active membership and active store for writes and banners',async()=>{
  for(const bad of [{...auth,roles:['SELLER'],store_membership:{...auth.store_membership,role:'STAFF'}},{...auth,user_id:other}])await expect(service.save({expected_version:0,content:content()},bad,'bad')).rejects.toMatchObject({status:403});
  await sources.M3.query("UPDATE store_membership SET status='REMOVED' WHERE user_id=$1",[owner]);await expect(service.own(auth)).rejects.toMatchObject({status:403});
  await sources.M3.query("UPDATE store_membership SET status='ACTIVE' WHERE user_id=$1",[owner]);await sources.M3.query("UPDATE store SET status='LOCKED' WHERE id=$1",[store]);await expect(service.own(auth)).rejects.toMatchObject({status:403});await expect(service.public(store,'bad')).rejects.toMatchObject({status:404});
 });
 test('publish rejects a foreign/hidden product; current reads remove stopped products and empty groups',async()=>{
  for(const id of [foreign,hidden]){await service.save({expected_version:0,content:{...content(),groups:[{...content().groups[0],product_ids:[id]}]}},auth,'save');await expect(service.publish({expected_version:1},auth,'publish')).rejects.toMatchObject({status:422});await sources.M3.query('DELETE FROM store_storefront');}
  await publish();await sources.M1.query("UPDATE product SET status='STOPPED' WHERE store_id=$1",[store]);const live=await service.public(store,'read');expect(live.products.curated).toEqual([]);expect(live.content.groups).toEqual([]);
 });
 test('real banner upload is immutable, normalized, scoped, hidden before publish and revoked on disable',async()=>{
  const a=await readyBanner();expect(a.width).toBe(128);const bytes=await service.ownBanner(a.id,auth);expect(bytes.toString('ascii',8,12)).toBe('WEBP');await expect(service.banner(a.id,store)).rejects.toMatchObject({status:404});
  const input={...content(),banner:{asset_id:a.id,title:'Bộ sưu tập',link_type:'ALL_PRODUCTS' as const}};await publish(input);expect(await service.banner(a.id,store)).toEqual(bytes);
  await expect(service.banner(a.id,otherStore,{...auth,user_id:other,store_membership:{...auth.store_membership,store_id:otherStore}})).rejects.toMatchObject({status:404});
  expect((await service.uploadBanner(a.id,auth,Readable.from([Buffer.from('new')]),'application/octet-stream')).status).toBe('READY');expect(await service.banner(a.id,store)).toEqual(bytes);
  await service.save({expected_version:2,content:{enabled:false,groups:[]}},auth,'disable');await service.publish({expected_version:3},auth,'disable');await expect(service.banner(a.id,store)).rejects.toMatchObject({status:404});
 });
 test('banner retry uses the same admission; hash mismatch/spoofed content never becomes READY',async()=>{
  const body={client_upload_id:randomUUID(),size_bytes:png.length,sha256:createHash('sha256').update(png).digest('hex')};const a=await service.createBanner(body,auth);expect((await service.createBanner(body,auth)).id).toBe(a.id);await expect(service.createBanner({...body,size_bytes:1},auth)).rejects.toMatchObject({status:409});
  await expect(service.uploadBanner(a.id,auth,Readable.from([Buffer.alloc(png.length)]),'application/octet-stream')).rejects.toMatchObject({status:422});
  const spoof=Buffer.from('<svg><script/></svg>'),b=await service.createBanner({client_upload_id:randomUUID(),size_bytes:spoof.length,sha256:createHash('sha256').update(spoof).digest('hex')},auth);await expect(service.uploadBanner(b.id,auth,Readable.from([spoof]),'application/octet-stream')).rejects.toMatchObject({status:422});expect((await sources.M3.query('SELECT status,content FROM storefront_banner WHERE id=$1',[b.id]))[0]).toMatchObject({status:'FAILED',content:null});
 });
 test('bounded banner storage retains old published/draft assets and expires unreferenced rows',async()=>{
  await readyBanner();await publish({...content(),banner:{asset_id:banner,title:'Còn dùng',link_type:'ALL_PRODUCTS'}});
  const old=await service.createBanner({client_upload_id:randomUUID(),size_bytes:png.length,sha256:createHash('sha256').update(png).digest('hex')},auth);await sources.M3.query("UPDATE storefront_banner SET created_at=now()-interval '2 days'");
  await service.createBanner({client_upload_id:randomUUID(),size_bytes:png.length,sha256:createHash('sha256').update(png).digest('hex')},auth);expect((await sources.M3.query('SELECT id FROM storefront_banner WHERE id=$1',[old.id])).length).toBe(0);expect((await service.banner(banner,store)).length).toBeGreaterThan(0);
 });
 test('campaign is linked to real current voucher, obeys schedule, cap and scope',async()=>{
  const campaign={title:'Ưu đãi',voucher_id:voucher,starts_at:new Date(Date.now()-3600000).toISOString(),ends_at:new Date(Date.now()+86400000).toISOString()};await publish({...content(),campaign});expect((await service.public(store,'read')).campaign_voucher?.discount_value).toBe(10);
  await sources.M2.query("UPDATE voucher SET status='STOPPED' WHERE id=$1",[voucher]);expect((await service.public(store,'read')).content.campaign).toBeUndefined();await expect(service.publish({expected_version:2},auth,'invalid')).rejects.toMatchObject({status:422});
 });
 test('future campaign is saved and published but hidden until its actual interval',async()=>{
  await publish({...content(),campaign:{title:'Ngày mai',voucher_id:voucher,starts_at:new Date(Date.now()+86400000).toISOString(),ends_at:new Date(Date.now()+2*86400000).toISOString()}});expect((await service.public(store,'read')).content.campaign).toBeUndefined();expect((await service.own(auth)).content.campaign?.title).toBe('Ngày mai');
 });
 test('new means a recorded first publication, never migration time or reactivation time',async()=>{
  const repo=new CatalogRepository(sources.M1.manager);const made=await repo.insertProduct({storeId:store,productTypeId:type,title:'Mới thật',description:null,attributes:{},status:'DRAFT'});expect((await sources.M1.query('SELECT first_published_at FROM product WHERE id=$1',[made.id]))[0].first_published_at).toBeNull();
  await repo.updateProductFields(made.id,{status:'ACTIVE'});const first=(await sources.M1.query('SELECT first_published_at FROM product WHERE id=$1',[made.id]))[0].first_published_at;
  await repo.updateProductFields(made.id,{status:'STOPPED'});await repo.updateProductFields(made.id,{status:'ACTIVE'});expect((await sources.M1.query('SELECT first_published_at FROM product WHERE id=$1',[made.id]))[0].first_published_at).toEqual(first);
  const result=await catalog.resolve({store_id:store,product_ids:[],include_new:true,include_bestsellers:false},'new');expect(result.newest.map((p:any)=>p.id)).toEqual([made.id]);expect(first).toBeInstanceOf(Date);await sources.M1.query('DELETE FROM product WHERE id=$1',[made.id]);
 });
 test('bestsellers use completed quantity less received returns, excluding old/cancelled and unknown legacy returns',async()=>{
  await sale(product,10,{received:8});await sale(second,5);await sale(hidden,20);await sale(product,100,{status:'CANCELLED'});await sale(product,90,{days:31});await sale(product,50,{legacy:true});
  const counts=await commerce.sales({store_id:store});expect(counts.items).toEqual([{product_id:hidden,quantity:20},{product_id:second,quantity:5},{product_id:product,quantity:2}]);
  const list=await catalog.resolve({store_id:store,product_ids:[],include_new:false,include_bestsellers:true},'best');expect(list.bestsellers.map((p:any)=>p.id)).toEqual([second,product]);expect(list.bestsellers_complete).toBe(true);
 });
 test('strict contracts reject excess groups, arbitrary URLs, unknown fields and invalid UUIDs',()=>{
  const request={body:{expected_version:0,content:content()}};
  expect(()=>validateOperation('updateOwnStorefront',request)).not.toThrow();
  expect(()=>validateOperation('updateOwnStorefront',{body:{...request.body,content:{...content(),groups:Array.from({length:5},()=>content().groups[0])}}})).toThrow();
  expect(()=>validateOperation('updateOwnStorefront',{body:{...request.body,content:{...content(),banner:{asset_id:randomUUID(),title:'bad',link_type:'URL',url:'https://evil.test'}}} as any})).toThrow();
 });
});
