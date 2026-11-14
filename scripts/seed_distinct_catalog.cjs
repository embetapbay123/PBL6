#!/usr/bin/env node
/** Append synthetic demo data through business APIs. Never reset shared data or call paid providers. */
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{createHash}=require('node:crypto');
const DATASET='marketplace-distinct-2026-v1';
const {idFor:legacyId}=require('./seed_demo_expansion.cjs');
const idFor=label=>{const h=createHash('sha256').update(DATASET+':'+label).digest('hex');return h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32);};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const storePlan=require('./seed_demo_expansion.cjs').storePlan.map(s=>({...s,existing:true,count:12}));
const targets=['COMPLETED','COMPLETED','COMPLETED','COMPLETED'];
const reviewedCorrections={
 'MOC-06':{title:'Tai nghe chụp tai chống ồn',price:899000,photo:'noise-cancelling-headphones'},
 'NHE-12':{title:'Tai nghe nhét tai Bluetooth đỏ',price:329000,photo:'red-bluetooth-earbuds'},
};
function createPlan(catalog){
 if(catalog.dataset!==DATASET||catalog.products.length!==72)throw Error('Distinct catalog identity mismatch');
 const heroes=catalog.products.map(p=>p.photos[0]);
 if(new Set(heroes).size!==72||new Set(catalog.products.map(p=>p.title)).size!==72)throw Error('Repeated hero or product title');
 for(const s of storePlan)if(catalog.products.filter(p=>p.storeKey===s.key).length!==12)throw Error('Uneven store catalog');
 return {dataset:DATASET,stores_new:0,products_new:72,orders_new:24,reviews_new:24,vouchers_new:0,products:catalog.products,mode:'PLAN_ONLY'};
}
function variantsFor(p){return p.sizes?p.sizes.map(size=>({size})):[{}];}
function options(argv){const result={apply:false,output:undefined};for(let i=0;i<argv.length;i++){if(argv[i]==='--apply')result.apply=true;else if(argv[i]==='--plan')continue;else if(argv[i]==='--output'){result.output=argv[++i];if(!result.output)throw Error('Missing output path');}else throw Error('Unknown option '+argv[i]);}return result;}
async function main(argv=process.argv.slice(2),env=process.env){
 const args=options(argv);
 const catalog=JSON.parse(fs.readFileSync(env.CURATED_CATALOG_FILE??path.join(__dirname,'../data/marketplace-distinct-2026.json'),'utf8')),plan=createPlan(catalog);
 if(!args.apply){console.log(JSON.stringify({...plan,products:undefined},null,2));return;}
 if(!args.output)throw Error('An output path is required to checkpoint cleanup before applying');
 if(env.NODE_ENV==='production'||env.DEMO_SEED_ALLOWED!=='1'||!env.SEED_PASSWORD)throw Error('Explicit non-production demo configuration required');
 for(const service of ['M1','M2','M3'])if(new URL(env[service+'_DATABASE_URL']).pathname!=='/import2_'+service.toLowerCase())throw Error('Unexpected demo database');
 const req=createRequire(path.resolve(env.PBL6_BACKEND_ROOT??process.cwd(),'package.json')),{Client}=req('pg'),bcrypt=req('bcryptjs'),bundle=req('./shared/src/contracts.runtime.generated.json');
 const file=args.output;
 const report={dataset:DATASET,status:'RUNNING',started_at:new Date().toISOString(),stores:[],products:[],orders:[],reviews:[],vouchers:[],rate_limit_waits:0,credentials_recorded:false,paid_provider_calls:0};
 const save=()=>{if(file){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(report,null,2));}};save();
 async function db(service,statement,values=[]){if(!env[service+'_DATABASE_URL'])throw Error('Missing '+service+' database');const c=new Client({connectionString:env[service+'_DATABASE_URL']});await c.connect();try{return (await c.query(statement,values)).rows;}finally{await c.end();}}
 const routes=Object.values(bundle.operations).filter(r=>!r.internal).sort((a,b)=>(a.route.match(/\{|:/g)?.length??0)-(b.route.match(/\{|:/g)?.length??0));
 const routeMatch=(template,value)=>new RegExp('^'+template.replace(/\{[^}]+\}|:[^/]+/g,'[^/]+')+'$').test(value);
 async function raw(route,actor,method='GET',body,key){
  const p=route.split('?')[0],op=routes.find(r=>r.method===method&&routeMatch(r.route,p));if(!op)throw Error('Unmapped '+method+' '+p);
  const base=env[op.service+'_API_URL']??`http://${op.service.toLowerCase()}:${{M1:3101,M2:3102,M3:3103,M4:3104}[op.service]}/api/v1`;
  await wait(70);
  const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(actor?.token?{Authorization:'Bearer '+actor.token}:{}),...(actor?.store?{'X-Store-Context':actor.store}:{}),...(key?{'Idempotency-Key':key}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
  return {status:r.status,value:await r.json().catch(()=>({})),retry:Number(r.headers.get('Retry-After'))};
 }
 async function api(route,actor,method='GET',body,key){for(let n=0;;n++){const r=await raw(route,actor,method,body,key);if(r.status===429&&r.value.code==='RATE_LIMITED'&&r.retry>0&&r.retry<=60&&n<3){report.rate_limit_waits++;save();await wait((r.retry+1)*1000);continue;}if(r.status>=400)throw Error(method+' '+route.split('?')[0]+': '+r.status+' '+r.value.code);return r.value;}}
 async function list(route,actor){const out=[];for(let page=1;;page++){const r=await api(route+(route.includes('?')?'&':'?')+'size=100&page='+page,actor);if(!Array.isArray(r.items))throw Error('Invalid list '+route);out.push(...r.items);if(!r.items.length||out.length>=r.total)return out;}}
 const issued=[];
 let deliveryCookie;
 async function delivery(route,method='GET',body){
  const operator=route.startsWith('/ops/');
  const r=await fetch(env.DELIVERY_API_URL+route,{method,headers:{'Content-Type':'application/json',...(operator?(deliveryCookie?{Cookie:deliveryCookie}:{}):{Authorization:'Bearer '+env.DELIVERY_API_KEY})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
  const value=await r.json();if(!r.ok)throw Error('Delivery '+method+' '+r.status+' '+value.code);
  if(route==='/ops/api/login')deliveryCookie=r.headers.get('set-cookie')?.split(';')[0];return value;
 }
 async function login(email){const value=await api('/auth/login',null,'POST',{email,password:env.SEED_PASSWORD,client_type:'MOBILE'}),actor={email,id:value.context.user_id,token:value.access_token,refresh:value.refresh_token,store:value.context.store_membership?.store_id};issued.push(actor);return actor;}
 try {
 const photos=[...new Set(plan.products.flatMap(p=>p.photos))];for(const photo of photos){const r=await fetch((env.DEMO_MEDIA_ORIGIN||'http://web:3000')+'/catalog/'+photo+'.webp',{method:'HEAD',signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('Catalog image unavailable: '+photo);}
 const legacyEmails=['admin@pbl6.test','customer.a@pbl6.test','customer.b@pbl6.test','owner.a@pbl6.test','owner.b@pbl6.test'];
 const known=await db('M3','SELECT u.id,u.email,p.display_name,u.status FROM "user" u JOIN customer_profile p ON p.user_id=u.id WHERE u.email=ANY($1::text[])',[legacyEmails]);
 if(known.length!==5||known.some(r=>r.status!=='ACTIVE'||!r.display_name.startsWith('[DEMO] ')))throw Error('Expected synthetic demo identities not found');
 const beforeCart=await db('M2','SELECT i.id,md5(to_jsonb(i)::text) hash FROM cart_item i JOIN cart c ON c.id=i.cart_id WHERE c.customer_user_id=ANY($1::uuid[]) ORDER BY i.id',[known.map(r=>r.id)]);
 const oldTerminal=await db('M2',"SELECT o.id,md5(to_jsonb(o)::text) hash FROM \"order\" o WHERE status IN ('COMPLETED','CANCELLED','EXPIRED') ORDER BY id");
 const actors={},newPeople=[...storePlan.filter(s=>s.owner.startsWith('seed26.')).map(s=>({email:s.owner,name:'[DEMO] Chủ '+s.name})),...['Lê Thu Lan','Phạm Quốc Huy','Vũ Hà Trang','Đặng Hoàng Minh','Nguyễn Phương Thảo','Trần Anh Quân'].map((name,i)=>({email:'seed26.customer.'+(i+1)+'@pbl6.test',name:'[DEMO] '+name}))];
 const hash=await bcrypt.hash(env.SEED_PASSWORD,10);
 for(const p of newPeople){
  const existing=await db('M3','SELECT u.id,u.status,u.password_hash,p.display_name FROM "user" u JOIN customer_profile p ON p.user_id=u.id WHERE u.email=$1',[p.email]);
  if(existing.length){if(existing[0].id!==legacyId('person:'+p.email)||existing[0].status!=='ACTIVE'||existing[0].display_name!==p.name||!await bcrypt.compare(env.SEED_PASSWORD,existing[0].password_hash))throw Error('Existing identity differs: '+p.email);continue;}
  throw Error('Expected existing expansion identity missing: '+p.email);
 }
 for(const email of [...legacyEmails,...newPeople.map(p=>p.email)])actors[email]=await login(email);
 const admin=actors['admin@pbl6.test'],buyers=['customer.a@pbl6.test','customer.b@pbl6.test',...newPeople.filter(p=>p.email.includes('.customer.')).map(p=>p.email)].map(email=>actors[email]);
 const address=name=>({recipient_name:name.replace('[DEMO] ',''),phone:'0900000000',line1:'123 Đường Mẫu, khu dân cư minh họa',ward:'Phường A',district:'Quận B',city:'Huế'});
 for(const buyer of buyers){const rows=await list('/me/addresses',buyer);buyer.address=rows[0]??await api('/me/addresses',buyer,'POST',{...address('[DEMO] Khách trải nghiệm'),is_default:true});}
 const stores={};
 for(const s of storePlan){let owner=actors[s.owner];
  if(!owner.store){if(s.existing)throw Error('Existing demo owner lost membership');let app=(await list('/me/store-applications',owner)).find(a=>a.proposed_name===s.name);if(!app)app=await api('/me/store-applications',owner,'POST',{proposed_name:s.name,contact:s.owner});if(app.status==='PENDING')await api('/admin/store-applications/'+app.id,admin,'PATCH',{expected_version:app.version,status:'APPROVED'});else if(app.status!=='APPROVED')throw Error('Store application changed');owner=actors[s.owner]=await login(s.owner);}
  let store=await api('/store',owner);if(store.name!==s.name)throw Error('Store name changed; refusing overwrite');
  if(!s.existing&&!store.description)store=await api('/store',owner,'PATCH',{expected_version:store.version,description:'Bộ sưu tập '+s.category.toLowerCase()+' cho sinh hoạt hằng ngày. Gian hàng mẫu của bản trải nghiệm PBL6.',shipping_fee_vnd:s.fee,return_address:address('[DEMO] '+s.name)});
  stores[s.key]={...s,id:store.id,owner};report.stores.push({key:s.key,id:store.id,name:s.name,existing:!!s.existing});save();
 }
 if(!env.DELIVERY_OPERATOR_PASSWORD||!env.DELIVERY_API_KEY||env.DELIVERY_API_URL!=='http://delivery:3110')throw Error('Owned internal Delivery demo configuration is required');
 await delivery('/ops/api/login','POST',{password:env.DELIVERY_OPERATOR_PASSWORD});
 const locations=(await api('/admin/shipping/locations',admin)).items;
 for(const s of storePlan){const store=stores[s.key];let pickup=locations.find(p=>p.store_id===store.id&&p.enabled);if(!pickup){if(s.existing||locations.some(p=>p.store_id===store.id))throw Error('Existing Store pickup is disabled; refusing overwrite');pickup=await api('/admin/shipping/platform/locations',admin,'POST',{id:idFor('pickup:'+s.key),store_id:store.id,name:'[DEMO] Kho '+s.name,address:address('[DEMO] Kho '+s.name),enabled:true,expected_version:0});locations.push(pickup);}if(pickup.provider!=='PLATFORM')throw Error('Refuse external carrier pickup');store.pickup=pickup.id;}
 async function advanceDelivery(order,target,store,buyer){
  let data=await api('/store/orders/'+order.id+'/shipping',store.owner),shipment=data.items.find(s=>s.leg==='OUTBOUND'&&s.status!=='CANCELLED');
  if(!shipment)shipment=await api('/store/orders/'+order.id+'/shipping',store.owner,'POST',{operation_id:idFor('shipment:'+order.id),expected_order_version:order.version,pickup_location_id:store.pickup,weight:800,length:25,width:20,height:12,note:'[DEMO] Kiện mẫu để trình diễn luồng giao nhận PBL6'});
  for(let n=0;!shipment.tracking_code&&n<100;n++){await wait(500);data=await api('/store/orders/'+order.id+'/shipping',store.owner);shipment=data.items.find(s=>s.id===shipment.id)||shipment;if(shipment.status==='CREATE_FAILED')throw Error('Demo parcel creation failed');}if(!shipment.tracking_code)throw Error('Delivery tracking reconciliation timed out');
  const reference='pbl6-'+shipment.id;let parcel=await delivery('/api/v1/parcels/'+encodeURIComponent(reference));
  async function action(kind,extra={}){parcel=await delivery('/ops/api/parcels/'+encodeURIComponent(reference)+'/actions','POST',{operation_id:idFor('delivery:'+order.id+':'+kind),expected_version:parcel.version,action:kind,note:'[DEMO] Thao tác giao nhận mẫu DR26',...extra});}
  if(!parcel.courier_name)await action('ASSIGN',{courier_name:'[DEMO] Shipper PBL6'});
  if(parcel.status==='READY_FOR_PICKUP')await action('PICK_UP');
  if(target==='COMPLETED'){
   if(['PICKED_UP','IN_TRANSIT'].includes(parcel.status))await action('OUT_FOR_DELIVERY');
   if(parcel.status==='OUT_FOR_DELIVERY')await action('DELIVER',{collected_vnd:parcel.cod_amount});
   if(parcel.status!=='DELIVERED')throw Error('Unexpected demo parcel state '+parcel.status);
   if(parcel.cod_amount>0&&!parcel.remitted_at)await action('REMIT_COD');
  }
  for(let n=0;n<120;n++){const current=await api('/me/orders/'+order.id,buyer);if(current.status===target)return current;await wait(500);}
  throw Error('Signed Delivery webhook did not reconcile order '+order.id);
 }
 const categories=await list('/categories',admin),oldTypes=await list('/product-types',admin),types={};
 for(const item of plan.products){
  const typeKey=item.product_type;if(types[typeKey])continue;
  let category=categories.find(c=>c.name===item.category);
  if(!category){category=await api('/admin/categories',admin,'POST',{name:item.category});categories.push(category);}
  const name=item.product_type+' · Tuyển chọn';let type=oldTypes.find(t=>t.name===name&&t.category_id===category.id);
  if(!type){type=await api('/admin/product-types',admin,'POST',{name,category_id:category.id});oldTypes.push(type);}
  const members=plan.products.filter(p=>p.product_type===typeKey),sizes=[...new Set(members.flatMap(p=>p.sizes??[]))];
  if(members.some(p=>!!p.sizes!==!!item.sizes))throw Error('Mixed size axis in product type');
  const defs=[{code:'color',name:'Màu',data_type:'STRING',required:true,variant_axis:false,allowed_values:[...new Set(members.map(p=>p.color))]},...(sizes.length?[{code:'size',name:'Cỡ',data_type:'STRING',required:true,variant_axis:true,allowed_values:sizes}]:[]),...['material','dimensions','care'].map((code,i)=>({code,name:['Chất liệu','Kích thước','Bảo quản'][i],data_type:'STRING',required:true,variant_axis:false}))];
  for(const def of defs)if(!(type.attribute_definitions??[]).some(d=>d.code===def.code))await api('/admin/attribute-definitions',admin,'POST',{product_type_id:type.id,...def});types[typeKey]=type.id;
 }
 const products=[];const origin=(env.DEMO_PUBLIC_ORIGIN||'https://demo.congnguyen.me').replace(/\/$/,'');
 for(const s of storePlan){const store=stores[s.key],owner=store.owner,old=await list('/store/products',owner);
  for(const item of plan.products.filter(p=>p.storeKey===s.key)){
   const prefix='DR26-'+item.key+'-',variantValues=variantsFor(item),values={color:item.color,material:item.material,dimensions:item.dimensions,care:item.care,...(item.sizes?{size:item.sizes[0]}:{})};let p=old.find(p=>p.variants?.some(v=>v.sku===prefix+'001'));
   if(!p){p=await api('/store/products',owner,'POST',{product_type_id:types[item.product_type],title:item.title,description:item.description+' Thuộc bộ sưu tập '+s.brand+' cho bản trải nghiệm PBL6.',status:'ACTIVE',attributes:values,variants:variantValues.map((v,i)=>({sku:prefix+String(i+1).padStart(3,'0'),price_vnd:item.price_vnd+(v.size==='XL'?10000:0),variant_values:v,is_default:i===0}))});old.push(p);}
   const correction=reviewedCorrections[item.key];
   if(correction&&p.title===correction.title){
    if(p.status!=='ACTIVE'||p.variants.some(v=>v.price_vnd!==correction.price||!v.sku.startsWith(prefix)))throw Error('Correction target differs from reviewed fixture');
    if((await db('M2','SELECT id FROM order_item WHERE product_id=$1 LIMIT 1',[p.id])).length)throw Error('Cannot repurpose a product already used by an order');
    p=await api('/store/products/'+p.id,owner,'PATCH',{expected_version:p.version,product_type_id:types[item.product_type],title:item.title,description:item.description,attributes:values,variants:p.variants.map(v=>({id:v.id,sku:v.sku,price_vnd:item.price_vnd,variant_values:v.variant_values,is_default:v.is_default,status:v.status}))});
   }
   if(correction)for(const image of p.images??[])if(image.image_url.endsWith('/'+correction.photo+'.webp'))await api('/store/products/'+p.id+'/images/'+image.id,owner,'DELETE');
   if(p.title!==item.title||p.status!=='ACTIVE'||p.variants.length!==variantValues.length||p.variants.some(v=>!v.sku.startsWith(prefix)))throw Error('Existing expansion product was modified: '+item.key);
   const inventory=await list('/store/inventory?product_id='+p.id,owner),n=plan.products.indexOf(item);
   for(const [i,v] of p.variants.entries()){const row=inventory.find(r=>r.variant_id===v.id);if(!row)throw Error('Inventory missing');const qty=n%12>=4&&n%11===10?0:n%12>=4&&n%9===8&&i===0?1:30+(n%5)*5;if(row.version===0&&qty)await api('/store/inventory/adjustments',owner,'POST',{variant_id:v.id,delta_quantity:qty,expected_version:0,operation_id:idFor('stock:'+v.id),reason:'[DEMO] Tồn đầu '+DATASET});}
   const images=[];if(item.colors){for(const v of p.variants)images.push({image_url:origin+'/catalog/'+item.photos[item.colors.indexOf(v.variant_values.color)]+'.webp',variant_id:v.id,position:item.colors.indexOf(v.variant_values.color)});}else for(const [i,photo] of item.photos.entries())images.push({image_url:origin+'/catalog/'+photo+'.webp',position:i});
   for(const image of images)if(!(p.images??[]).some(i=>i.image_url===image.image_url&&(i.variant_id??null)===(image.variant_id??null)))await api('/store/products/'+p.id+'/images',owner,'POST',image);
   p=await api('/store/products/'+p.id,owner);products.push({...item,...p,key:item.key,storeKey:s.key});report.products.push({key:item.key,id:p.id,store_id:store.id,title:p.title,variants:p.variants.map(v=>v.id),images:p.images.length});save();if(products.length%8===0)console.log('Catalog '+products.length+'/'+plan.products.length);
  }
 }
 for(const [si,s] of storePlan.entries())for(const [j,target] of targets.entries()){
  const buyer=buyers[(si*3+j)%buyers.length],store=stores[s.key],key=idFor('order:'+s.key+':'+j),previous=(await db('M2','SELECT phase,response_json FROM checkout_attempt WHERE customer_user_id=$1 AND key=$2',[buyer.id,key]))[0];let batch;
  if(previous){if(previous.phase!=='COMMITTED'||!previous.response_json?.orders)throw Error('Prior checkout unresolved: '+key);batch=previous.response_json;}
  else{
   const own=products.filter(p=>p.storeKey===s.key);let chosen,quantity=1+j%3;
   for(let k=0;k<own.length;k++){const p=await api('/products/'+own[(j+k)%own.length].id,buyer),v=p.variants.find(v=>v.available_quantity>=quantity);if(v){chosen={p,v};break;}}if(!chosen)throw Error('No stock for planned order');
   const goods=chosen.v.price_vnd*quantity,input={source:'BUY_NOW',buy_now:{product_id:chosen.p.id,variant_id:chosen.v.id,quantity},address_id:buyer.address.id,payment_methods:{[store.id]:'COD'},...(goods>=100000&&j%3===0?{store_vouchers:{[store.id]:s.key+'26-10K'}}:{}),...(goods>=250000&&j%4===0?{platform_voucher_code:'PBL6DEMO20'}:{})};
   const quote=await api('/checkout/quotes',buyer,'POST',input);if((quote.stores??[]).some(s=>s.shipping_mode==='GHN'))throw Error('Refuse external carrier checkout');const command={...input,quote_id:quote.quote_id,expected_payable_total_vnd:quote.payable_total_vnd};
   for(let n=0;;n++){batch=await api('/orders/batches',buyer,'POST',command,key);if(batch.orders)break;if(batch.code!=='ORDER_RECOVERY_PENDING'||n>=25)throw Error('Unresolved new checkout: '+key);await wait(1000);}
  }
  if(batch.orders.length!==1)throw Error('Unexpected Store split');const orderId=batch.orders[0].id;let order=await api('/me/orders/'+orderId,buyer);
  for(let n=0;['PREPARING','RECOVERING'].includes(order.status)&&n<60;n++){await wait(350);order=await api('/me/orders/'+orderId,buyer);}if(['PREPARING','RECOVERING'].includes(order.status))throw Error('Order reconciliation timed out');
  if(target==='CANCELLED'&&order.status==='PENDING')await api('/me/orders/'+orderId+'/cancel',buyer,'POST',{expected_version:order.version,reason:'[DEMO] Đổi kế hoạch mua trước khi giao'});
  else{const sequence=['PENDING','CONFIRMED','PROCESSING','SHIPPED','COMPLETED'];while(sequence.indexOf(order.status)>=0&&sequence.indexOf(order.status)<sequence.indexOf(target)){const next=sequence[sequence.indexOf(order.status)+1];if(['SHIPPED','COMPLETED'].includes(next)&&order.shipping_mode==='PLATFORM'){order=await advanceDelivery(order,target,store,buyer);continue;}if(next==='COMPLETED'&&order.payment_status!=='SUCCEEDED'){if(order.shipping_mode&&!['LEGACY_MANUAL'].includes(order.shipping_mode))throw Error('Refuse non-manual delivery');await api('/store/orders/'+orderId+'/cod-collection',store.owner,'POST',{expected_version:order.version,amount_collected_vnd:order.amounts.payable_vnd});order=await api('/me/orders/'+orderId,buyer);}await api('/store/orders/'+orderId+'/status',store.owner,'PATCH',{expected_version:order.version,to_status:next});order=await api('/me/orders/'+orderId,buyer);}}
  order=await api('/me/orders/'+orderId,buyer);if(order.status!==target)throw Error('Existing expansion order changed: '+orderId);report.orders.push({id:orderId,customer_user_id:buyer.id,store_id:store.id,status:order.status,payment_method:order.payment_method,payable_vnd:order.amounts.payable_vnd,attempt_key:key});save();
  if(target==='COMPLETED'){const item=order.items[0],old=(await list('/me/reviews',buyer)).find(r=>r.order_item_id===item.id),rating=[5,4,5,3][j];let review=old;if(!review)review=await api('/me/reviews',buyer,'POST',{order_item_id:item.id,rating,body:'[DEMO] '+['Mẫu nhận đúng mô tả, màu sắc dễ phối và dùng hằng ngày khá tiện.','Đóng gói gọn, sản phẩm vừa nhu cầu. Thông tin kích thước dễ đối chiếu.','Trải nghiệm tốt, hình và thông tin phân loại giúp chọn mẫu nhanh.','Sản phẩm đúng mẫu đặt; phần đóng gói có thể chắc chắn hơn.'][j]});report.reviews.push({id:review.id,product_id:review.product_id,order_item_id:item.id,rating:review.rating});save();}
  if(report.orders.length%9===0)console.log('Orders '+report.orders.length+'/24; reviews '+report.reviews.length+'/24');
 }
 const variantIds=report.products.flatMap(p=>p.variants),balances=await db('M1',`SELECT count(*)::int AS mismatches FROM inventory i LEFT JOIN (SELECT inventory_id,sum(delta_quantity) quantity,sum(delta_reserved) reserved FROM stock_movement GROUP BY inventory_id)m ON m.inventory_id=i.id WHERE i.variant_id=ANY($1::uuid[]) AND (i.quantity<>coalesce(m.quantity,0) OR i.reserved_quantity<>coalesce(m.reserved,0))`,[variantIds]);
 const afterCart=await db('M2','SELECT i.id,md5(to_jsonb(i)::text) hash FROM cart_item i JOIN cart c ON c.id=i.cart_id WHERE c.customer_user_id=ANY($1::uuid[]) ORDER BY i.id',[known.map(r=>r.id)]);if(JSON.stringify(beforeCart)!==JSON.stringify(afterCart))throw Error('Existing demo carts changed during seed; inspect concurrent work');
 const terminalAfter=await db('M2','SELECT o.id,md5(to_jsonb(o)::text) hash FROM "order" o WHERE id=ANY($1::uuid[]) ORDER BY id',[oldTerminal.map(o=>o.id)]);if(JSON.stringify(oldTerminal)!==JSON.stringify(terminalAfter))throw Error('Prior terminal orders changed during seed; inspect concurrent work');
 const shipments=await db('M2','SELECT id,order_id,tracking_code,status,provider FROM shipping_shipment WHERE order_id=ANY($1::uuid[]) ORDER BY order_id',[report.orders.map(o=>o.id)]);report.shipments=shipments;
 const codEvidence=await db('M2','SELECT count(*)::int AS n FROM shipping_cod_evidence WHERE shipment_id=ANY($1::uuid[])',[shipments.map(s=>s.id)]);
 const verification={shipments:shipments.length,delivery_cod_evidence:codEvidence[0].n,products:report.products.length,variants:variantIds.length,images:report.products.reduce((n,p)=>n+p.images,0),stores_new:report.stores.filter(s=>!s.existing).length,orders:report.orders.length,reviews:report.reviews.length,vouchers:report.vouchers.length,inventory_ledger_mismatches:balances[0].mismatches,saved_carts_preserved:true,prior_terminal_orders_preserved:true,order_statuses:Object.fromEntries([...new Set(targets)].map(status=>[status,report.orders.filter(o=>o.status===status).length]))};
 if(verification.products!==72||verification.orders!==24||verification.reviews!==24||verification.vouchers!==0||verification.shipments!==24||verification.delivery_cod_evidence!==24||verification.inventory_ledger_mismatches)throw Error('Expansion verification mismatch');report.verification=verification;
 report.retired_duplicates=[];
 for(const s of storePlan){const owner=stores[s.key].owner,rows=await list('/store/products',owner);for(let p of rows.filter(p=>p.variants?.some(v=>v.sku.startsWith('DX26-')))){
  if(p.status!=='STOPPED')p=await api('/store/products/'+p.id,owner,'PATCH',{expected_version:p.version,status:'STOPPED'});
  report.retired_duplicates.push({id:p.id,title:p.title,status:p.status});save();
 }}
 if(report.retired_duplicates.length!==64)throw Error('Expected exactly 64 duplicate models');
 await require('./cleanup_test_catalog.cjs')({db,api,admin,Client,env,report,file,save});
 report.status='PASS';report.finished_at=new Date().toISOString();save();console.log(JSON.stringify({status:'PASS',...verification}));
 } finally {if(deliveryCookie)try{await delivery('/ops/api/logout','POST',{});}catch{}for(const actor of issued)try{await api('/auth/logout',actor,'POST',{refresh_token:actor.refresh});}catch{report.session_cleanup_warning=true;}save();}
}
module.exports={createPlan,variantsFor,idFor,storePlan,targets,options};
if(require.main===module)main().catch(e=>{console.error('Expansion seed stopped: '+e.message);process.exitCode=1});
