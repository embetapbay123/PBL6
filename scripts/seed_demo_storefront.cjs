/** Populate only the two allowlisted demo shops, using their real catalog and vouchers. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash,randomUUID}=require('node:crypto');
if(process.env.DEMO_STOREFRONT_SEED!=='1')throw Error('Enable the demo storefront seed explicitly');
const base='https://demo.congnguyen.me',folder=process.env.PBL6_EVIDENCE_ROOT||'C:/PBL6/outputs/bug-storefront-phase5-2026-11-21/demo-content';
fs.mkdirSync(folder,{recursive:true});
const shops=new Map([
 ['3400e0a9-fc99-452c-bd4b-80dc472c025d',{title:'Không gian gọn, ngày nhẹ nhàng',subtitle:'Đồ dùng và những điểm nhấn nhỏ cho tổ ấm.',groups:['Góc sống mỗi ngày','Một chút cảm hứng cho căn phòng'],hero:/kệ trang trí/i}],
 ['d01b0f73-9130-4d8e-ba65-631ff9c6cd6a',{title:'Đơn giản để mặc mỗi ngày',subtitle:'Áo thun, phụ kiện và những món đồ dễ phối.',groups:['Áo mặc hằng ngày','Phụ kiện để đi cùng bạn'],hero:/hoodie/i}],
]);
const report={started_at:new Date().toISOString(),base,shops:[],paid_calls:0,new_products:0,new_vouchers:0,sessions_revoked:0};
const save=()=>fs.writeFileSync(path.join(folder,'results.json'),JSON.stringify(report,null,2));
async function json(route,token,method='GET',body){const r=await fetch(base+'/api/v1'+route,{method,headers:{'Content-Type':'application/json',Origin:base,...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(25000)});const data=await r.json();if(!r.ok)throw Error(method+' '+route+' '+r.status+' '+data.code);return {data,response:r};}
async function run(){
 for(const account of ['ownerA','ownerB']){
  const {data:login,response}=await json('/auth/demo-login',null,'POST',{account});
  const token=login.access_token,storeId=login.context?.store_membership?.store_id,copy=shops.get(storeId);
  const cookies=response.headers.getSetCookie().map(v=>v.split(';')[0]),csrf=cookies.find(v=>v.startsWith('pbl6_csrf='))?.slice('pbl6_csrf='.length);
  try{
   assert(copy,'Refuse a shop outside the two demo IDs');
   const before=(await json('/store/storefront',token)).data;
   // Existing owner content is never overwritten by this initializer.
   if(before.version!==0||before.content.enabled||before.content.groups.length){report.shops.push({store_id:storeId,result:'SKIPPED_EXISTING_CONTENT'});save();continue;}
   fs.writeFileSync(path.join(folder,storeId+'-before.json'),JSON.stringify(before,null,2));
   const catalog=(await json('/stores/'+storeId+'/products?size=100')).data.items;
   assert(catalog.length>=4&&catalog.every(p=>p.store_id===storeId));
   const hero=catalog.find(p=>copy.hero.test(p.title))||catalog[0],url=new URL(hero.images[0].image_url,base);
   assert(url.origin===base&&url.pathname.startsWith('/catalog/'));
   const image=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000)});assert(image.ok);
   const bytes=Buffer.from(await image.arrayBuffer());assert(bytes.length>0&&bytes.length<=2097152);
   const asset=(await json('/store/storefront/banners',token,'POST',{client_upload_id:randomUUID(),size_bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})).data;
   const upload=await fetch(base+'/api/v1/store/storefront/banners/'+asset.id+'/content',{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/octet-stream'},body:bytes,signal:AbortSignal.timeout(30000)});
   assert.equal(upload.status,200);assert.equal((await upload.json()).status,'READY');
   const mid=Math.ceil(catalog.length/2),lists=[catalog.slice(0,mid),catalog.slice(mid)];
   const content={enabled:true,banner:{asset_id:asset.id,title:copy.title,subtitle:copy.subtitle,link_type:'ALL_PRODUCTS'},groups:lists.map((items,n)=>({id:randomUUID(),title:copy.groups[n],kind:'CURATED',product_ids:items.slice(0,12).map(p=>p.id)}))};
   const vouchers=(await json('/store/vouchers?size=100',token)).data.items;
   const voucher=vouchers.find(v=>v.status==='ACTIVE'&&Date.parse(v.starts_at)<=Date.now()&&Date.parse(v.ends_at)>Date.now()+3600000&&(v.usage_summary?.remaining_count??0)>0);
   if(voucher)content.campaign={title:'Ưu đãi đang áp dụng',voucher_id:voucher.id,starts_at:voucher.starts_at,ends_at:voucher.ends_at};
   const draft=(await json('/store/storefront',token,'PUT',{expected_version:before.version,content})).data;
   const preview=(await json('/store/storefront/preview',token)).data;
   assert.equal(preview.products.curated.length,catalog.length);assert.equal(preview.content.banner.asset_id,asset.id);
   await json('/store/storefront/publish',token,'POST',{expected_version:draft.version});
   const live=(await json('/stores/'+storeId+'/storefront')).data;
   assert(live.content.enabled);assert.equal(live.products.curated.length,catalog.length);
   report.shops.push({store_id:storeId,result:'PUBLISHED',version:live.version,banner:asset.id,groups:content.groups.map(g=>({title:g.title,products:g.product_ids.length})),campaign_voucher:live.campaign_voucher?.id||null});save();
  }finally{
   const logout=await fetch(base+'/api/v1/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+token,Origin:base,'Content-Type':'application/json',Cookie:cookies.join('; '),'X-CSRF-Token':csrf},body:'{}',signal:AbortSignal.timeout(15000)});
   assert.equal(logout.status,200);report.sessions_revoked++;save();
  }
 }
 report.finished_at=new Date().toISOString();save();console.log('DEMO_STOREFRONTS_PUBLISHED '+report.shops.filter(s=>s.result==='PUBLISHED').length);
}
run().catch(e=>{report.error=e.message;save();console.error(e.message);process.exitCode=1;});
