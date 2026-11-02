#!/usr/bin/env node
/** Explicit demo fixture bootstrap. Business state is created through public API handlers. */
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{randomUUID,createHash}=require('node:crypto');
const backendRequire=createRequire(path.resolve(process.env.PBL6_BACKEND_ROOT??process.cwd(),'package.json'));
const DATASET='marketplace-demo-v1';
const PEOPLE=[
 {key:'admin',email:'admin@pbl6.test',name:'[DEMO] Quản trị viên',role:'ADMIN'},
 {key:'customerA',email:'customer.a@pbl6.test',name:'[DEMO] Nguyễn Minh An',role:'CUSTOMER'},
 {key:'customerB',email:'customer.b@pbl6.test',name:'[DEMO] Trần Ngọc Mai',role:'CUSTOMER'},
 {key:'ownerA',email:'owner.a@pbl6.test',name:'[DEMO] Chủ An Nhiên',role:'CUSTOMER'},
 {key:'ownerB',email:'owner.b@pbl6.test',name:'[DEMO] Chủ Mây Xanh',role:'CUSTOMER'},
 {key:'staffA',email:'seller.a@pbl6.test',name:'[DEMO] Nhân viên xử lý đơn',role:'CUSTOMER'},
 {key:'staffB',email:'seller.b@pbl6.test',name:'[DEMO] Nhân viên kho',role:'CUSTOMER'},
];
const PERMISSIONS={staffA:['product.store.read_write','inventory.store.read_adjust','order.store.read_status_cancel'],staffB:['inventory.store.read_adjust']};
const plan={dataset:DATASET,accounts:PEOPLE.map(({key,email,name,role})=>({key,email,name,role})),stores:2,products:12,variants:34,order_examples:17,online:'Awaiting payment only; no payment attempts or bank callbacks.',money:'COD collection/refund is explicitly simulated manual demo attestation.',credentials:'SEED_PASSWORD environment variable; never printed or stored in report.',bootstrap:'Verified synthetic identities and staff memberships via M3 SQL; product/stock/order/money/return state via public service APIs.',requires:'Fresh migrated databases; do not run base seed first. Direct service APIs/worker must be running; gateway may remain stopped.'};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const op=label=>{const h=createHash('sha256').update(DATASET+':'+label).digest('hex');return h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32);};
function options(argv){const result={apply:false,output:undefined};for(let i=0;i<argv.length;i++){if(argv[i]==='--apply')result.apply=true;else if(argv[i]==='--output')result.output=argv[++i];else if(argv[i]!=='--plan')throw Error('Unknown option');}return result;}
function validate(env){if(env.NODE_ENV==='production'||env.DEMO_SEED_ALLOWED!=='1')throw Error('Demo seed requires explicit non-production opt-in');if(!env.SEED_PASSWORD||env.SEED_PASSWORD.length<8)throw Error('SEED_PASSWORD is required');for(const id of ['M1','M2','M3','M4'])if(!env[id+'_DATABASE_URL'])throw Error('Missing owned database configuration');}
async function main(argv=process.argv.slice(2),env=process.env){
 const args=options(argv);if(!args.apply){console.log(JSON.stringify({...plan,mode:'PLAN_ONLY'},null,2));return;}
 validate(env);const {Client}=backendRequire('pg'),bcrypt=backendRequire('bcryptjs');
 const bundle=backendRequire('./shared/src/contracts.runtime.generated.json'),actors={},stores=[],products=[],orders=[];
 const output=args.output?path.resolve(args.output):undefined,report={...plan,status:'RUNNING',stores,products,orders,started_at:new Date().toISOString()};
 const save=()=>{if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}};save();
 async function db(id,fn){const c=new Client({connectionString:env[id+'_DATABASE_URL']});await c.connect();try{return await fn(c);}finally{await c.end();}}
 // Refuse a real/shared dataset. Partial setup may resume, but partial orders require inspection.
 await db('M3',async c=>{const rows=await c.query('SELECT u.email,p.display_name FROM "user" u LEFT JOIN customer_profile p ON p.user_id=u.id');if(rows.rows.some(u=>!PEOPLE.some(p=>p.email===u.email)||!u.display_name?.startsWith('[DEMO]')))throw Error('Database contains non-demo users; reset must be a separate explicit operation');});
 await db('M1',async c=>{if((await c.query("SELECT count(*)::int AS n FROM product WHERE title NOT LIKE '[DEMO] %'")).rows[0].n)throw Error('Database contains non-demo products');});
 await db('M3',async c=>{
  await c.query('BEGIN');try{
   for(const code of ['CUSTOMER','ADMIN'])await c.query('INSERT INTO role(id,code,scope,status) VALUES($1,$2,\'GLOBAL\',\'ACTIVE\') ON CONFLICT DO NOTHING',[randomUUID(),code]);
   await c.query("INSERT INTO permission(id,code,resource,action) VALUES($1,'platform.admin','platform','admin') ON CONFLICT(code) DO NOTHING",[randomUUID()]);
   await c.query("INSERT INTO role_permission(role_id,permission_id) SELECT r.id,p.id FROM role r CROSS JOIN permission p WHERE r.code='ADMIN' AND p.code='platform.admin' ON CONFLICT DO NOTHING");
   const hash=await bcrypt.hash(env.SEED_PASSWORD,10);
   for(const person of PEOPLE){let user=(await c.query('SELECT id,password_hash,status FROM "user" WHERE email=$1',[person.email])).rows[0];
    if(!user){user={id:randomUUID(),password_hash:hash,status:'ACTIVE'};await c.query('INSERT INTO "user"(id,email,password_hash,status,created_at,version,email_verified_at) VALUES($1,$2,$3,\'ACTIVE\',now(),0,now())',[user.id,person.email,hash]);await c.query('INSERT INTO customer_profile(id,user_id,display_name,updated_at) VALUES($1,$2,$3,now())',[randomUUID(),user.id,person.name]);}
    if(user.status!=='ACTIVE'||!await bcrypt.compare(env.SEED_PASSWORD,user.password_hash))throw Error('Existing demo credentials/status differ; refusing overwrite');
    await c.query('INSERT INTO user_role(user_id,role_id,granted_at) SELECT $1,id,now() FROM role WHERE code=$2 ON CONFLICT DO NOTHING',[user.id,person.role]);actors[person.key]={...person,id:user.id};
   }await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK');throw e;}
 });
 const matchRoute=(route,value)=>{const pattern=route.split('/').map(s=>/^\{.*\}$/.test(s)||s.startsWith(':')?'[^/]+':s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('/');return new RegExp('^'+pattern+'$').test(value);};
 const records=Object.values(bundle.operations).filter(r=>!r.route.startsWith('/internal/')).sort((a,b)=>(a.route.match(/\{|:/g)?.length??0)-(b.route.match(/\{|:/g)?.length??0));
 async function api(route,actor,method='GET',body,key){const pathname=route.split('?')[0],record=records.find(r=>r.method===method&&matchRoute(r.route,pathname));if(!record)throw Error('Unmapped public operation '+method+' '+pathname);
  const base=env[record.service+'_API_URL']??'http://'+record.service.toLowerCase()+':'+({M1:3101,M2:3102,M3:3103,M4:3104}[record.service])+'/api/v1';const serialized=body===undefined?undefined:JSON.stringify(body);
  for(let attempt=0;;attempt++){const r=await fetch(base+route,{method,signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',...(actor?.access?{Authorization:'Bearer '+actor.access}:{}),...(key?{'Idempotency-Key':key}:{})},...(serialized===undefined?{}:{body:serialized})}),value=await r.json();
   const seconds=Number(r.headers.get('Retry-After'));if(r.status===429&&value.code==='RATE_LIMITED'&&seconds>0&&seconds<=60&&attempt<2){await pause((seconds+1)*1000);continue;}
   if(!r.ok)throw Error(method+' '+pathname+': '+r.status+' '+value.code);return value;
  }
 }
 async function login(actor){actor.access=(await api('/auth/login',undefined,'POST',{email:actor.email,password:env.SEED_PASSWORD,client_type:'MOBILE'})).access_token;}
 for(const actor of Object.values(actors))await login(actor);
 const list=async(route,actor)=>(await api(route+(route.includes('?')?'&':'?')+'size=100',actor)).items;
 const catName='[DEMO] Thời trang và phụ kiện';let category=(await list('/categories',actors.admin)).find(x=>x.name===catName);if(!category)category=await api('/admin/categories',actors.admin,'POST',{name:catName});
 const types=[];
 for(const [name,axes] of [['[DEMO] Áo có màu và cỡ',true],['[DEMO] Phụ kiện đơn giản',false]]){
  let type=(await list('/product-types',actors.admin)).find(x=>x.name===name);if(!type)type=await api('/admin/product-types',actors.admin,'POST',{name,category_id:category.id});
  if(axes){for(const d of [{code:'color',name:'Màu',allowed_values:['Trắng','Xanh','Đen']},{code:'size',name:'Cỡ',allowed_values:['S','M','L','XL']}]){
    if(!(type.attribute_definitions??[]).some(x=>x.code===d.code))await api('/admin/attribute-definitions',actors.admin,'POST',{...d,product_type_id:type.id,data_type:'STRING',required:true,variant_axis:true});
   }}types.push(type);
 }
 const address=(label,line)=>({recipient_name:label,phone:'0900000000',line1:line+' (dữ liệu kiểm thử)',ward:'Phường A',district:'Quận B',city:'Huế'});
 for(const [i,key] of ['A','B'].entries()){
  const owner=actors['owner'+key],name='[DEMO] '+(key==='A'?'An Nhiên Fashion':'Mây Xanh Boutique');
  let apps=await list('/me/store-applications',owner),app=apps.find(x=>x.proposed_name===name);
  if(!app)app=await api('/me/store-applications',owner,'POST',{proposed_name:name,contact:owner.email});
  if(app.status==='PENDING')await api('/admin/store-applications/'+app.id,actors.admin,'PATCH',{status:'APPROVED',expected_version:app.version});
  await login(owner);let store=await api('/store',owner);if(store.name!==name)throw Error('Wrong Store scope');
  if(!store.return_address)store=await api('/store',owner,'PATCH',{expected_version:store.version,shipping_fee_vnd:i?30000:20000,return_address:address('Kho nhận trả '+name,'456 Đường Minh Họa, cổng kiểm hàng C')});
  stores.push({id:store.id,key,name,owner_email:owner.email,shipping_fee_vnd:store.shipping_fee_vnd});save();
  // Bootstrap memberships are fixture setup, not proof of an invitation email workflow.
  const staff=actors['staff'+key];await db('M3',async c=>{let m=(await c.query('SELECT id,store_id,role FROM store_membership WHERE user_id=$1',[staff.id])).rows[0];if(m&&(m.store_id!==store.id||m.role!=='SELLER'))throw Error('Wrong demo staff membership');if(!m){m={id:randomUUID()};await c.query("INSERT INTO store_membership(id,store_id,user_id,role,status,joined_at,version) VALUES($1,$2,$3,'SELLER','ACTIVE',now(),0)",[m.id,store.id,staff.id]);}for(const code of PERMISSIONS[staff.key])await c.query('INSERT INTO membership_permission(membership_id,permission_id,granted_at,version) SELECT $1,id,now(),0 FROM permission WHERE code=$2 ON CONFLICT DO NOTHING',[m.id,code]);});await login(staff);
  const names=['Sơ mi Oxford','Áo thun cotton','Túi tote canvas','Balo đi làm','Ví vải nhỏ','Khăn quàng nhẹ'],prices=[159000,89000,129000,299000,59000,99000];
  for(const [n,title] of names.entries()){
   const label='[DEMO] '+title+' · '+key;let product=(await list('/store/products?q='+encodeURIComponent(label),owner)).find(p=>p.title===label);
   if(!product){const values=n===0?['Trắng','Xanh','Đen'].flatMap(color=>['S','M','L','XL'].map(size=>({color,size}))):[{}];
    product=await api('/store/products',owner,'POST',{product_type_id:types[n===0?0:1].id,title:label,description:'Dữ liệu kiểm thử '+DATASET+'. Ảnh minh họa, giao hàng và tiền COD mô phỏng; không phải giao dịch thật.',attributes:n===0?{color:'Trắng',size:'S'}:{},status:'ACTIVE',variants:values.map((variant_values,index)=>({sku:'DEMO-'+key+'-'+String(n+1).padStart(2,'0')+'-'+String(index+1).padStart(3,'0'),price_vnd:prices[n],variant_values,is_default:index===0}))});
   }
   const balances=await list('/store/inventory?product_id='+product.id,owner);
   for(const [index,v] of product.variants.entries()){const balance=balances.find(b=>b.variant_id===v.id);if(!balance)throw Error('Inventory missing');const initial=n===0?(index===0?30:index===1?1:index===11?0:10):12;
    if(balance.version===0&&initial)await api('/store/inventory/adjustments',owner,'POST',{variant_id:v.id,delta_quantity:initial,expected_version:0,operation_id:op('stock:'+v.id),reason:'[DEMO] Tồn đầu '+DATASET});
   }
   const image=env.DEMO_PUBLIC_ORIGIN??env.WEB_ORIGIN;if(image&&product.images.length===0)await api('/store/products/'+product.id+'/images',owner,'POST',{image_url:image.replace(/\/$/,'')+'/demo/'+(n<=1?'shirt':n<=3?'bag':'accessory')+'.svg',position:0});
   products.push({id:product.id,store_id:store.id,title:label,variants:product.variants.map(v=>({id:v.id,sku:v.sku,values:v.variant_values,price_vnd:v.price_vnd})),flagship:n===0});save();
  }
  const code='DEMO-'+key+'-10K';if(!(await list('/store/vouchers',owner)).some(v=>v.code===code))await api('/store/vouchers',owner,'POST',{code,scope:'STORE',discount_type:'FIXED',discount_value:10000,min_goods_vnd:100000,starts_at:new Date(Date.now()-60000).toISOString(),ends_at:new Date(Date.now()+365*86400000).toISOString(),usage_limit:200,per_customer_limit:50});
 }
 if(!(await list('/admin/vouchers',actors.admin)).some(v=>v.code==='DEMO-SAN-5K'))await api('/admin/vouchers',actors.admin,'POST',{code:'DEMO-SAN-5K',scope:'PLATFORM',discount_type:'FIXED',discount_value:5000,min_goods_vnd:100000,starts_at:new Date(Date.now()-60000).toISOString(),ends_at:new Date(Date.now()+365*86400000).toISOString(),usage_limit:200,per_customer_limit:50});
 const books={};for(const key of ['A','B']){const actor=actors['customer'+key];let rows=await list('/me/addresses',actor);if(!rows.length)rows=[await api('/me/addresses',actor,'POST',{...address(actor.name,'123 Đường Minh Họa, cổng B'),is_default:true})];books[key]=rows[0].id;}
 async function poll(read,ready){for(let n=0;n<80;n++){const v=await read();if(ready(v))return v;await pause(250);}throw Error('Demo worker reconciliation timed out');}
 async function own(order,customer){return api('/me/orders/'+order.id,customer);}
 async function transition(order,owner,status){const current=await api('/store/orders/'+order.id,owner);return api('/store/orders/'+order.id+'/status',owner,'PATCH',{expected_version:current.version,to_status:status});}
 for(const key of ['A','B']){
  const owner=actors['owner'+key],customer=actors['customer'+key],store=stores.find(s=>s.key===key),product=products.find(p=>p.store_id===store.id&&p.flagship),variant=product.variants[0];
  const existing=await list('/me/orders',customer);
  // A completed/partial prior seed is not silently replayed into more orders.
  if(existing.length&&existing.length!==(key==='A'?8:9))throw Error('Partial demo orders exist; inspect the prior report instead of silently duplicating or declaring completion');
  if(existing.length){orders.push(...existing.map(o=>({id:o.id,store_id:o.store_id,status:o.status,resumed_existing:true})));continue;}
  const labels=['PENDING','CONFIRMED','PROCESSING','SHIPPED','COMPLETED','CANCELLED','AWAITING_PAYMENT',...(key==='A'?['REFUNDED']:['EXCHANGE_APPROVED','DELIVERY_FAILED'])];
  for(const label of labels){
   const method=label==='AWAITING_PAYMENT'?'SANDBOX':'COD',input={source:'BUY_NOW',buy_now:{product_id:product.id,variant_id:variant.id,quantity:1},address_id:books[key],payment_methods:{[store.id]:method},store_vouchers:{[store.id]:'DEMO-'+key+'-10K'},platform_voucher_code:'DEMO-SAN-5K'},quote=await api('/checkout/quotes',customer,'POST',input),command={...input,quote_id:quote.quote_id,expected_payable_total_vnd:quote.payable_total_vnd};
   let batch;try{batch=await api('/orders/batches',customer,'POST',command,op('checkout:'+key+':'+label));}catch(error){if(!error.message.endsWith('ORDER_RECOVERY_PENDING'))throw error;batch=await poll(async()=>{try{return await api('/orders/batches',customer,'POST',command,op('checkout:'+key+':'+label));}catch(e){if(e.message.endsWith('ORDER_RECOVERY_PENDING'))return null;throw e;}},v=>!!v);}
   const order=batch.orders[0];orders.push({id:order.id,store_id:store.id,label,payment_method:method,payable_vnd:order.amounts.payable_vnd});save();
   if(method==='SANDBOX')continue;await poll(()=>own(order,customer),o=>o.status==='PENDING');
   if(label==='CANCELLED'){const current=await own(order,customer);await api('/me/orders/'+order.id+'/cancel',customer,'POST',{expected_version:current.version,reason:'[DEMO] Khách đổi ý trước bàn giao'});continue;}
   if(label==='PENDING')continue;await transition(order,owner,'CONFIRMED');if(label==='CONFIRMED')continue;await transition(order,owner,'PROCESSING');if(label==='PROCESSING')continue;await transition(order,owner,'SHIPPED');if(label==='SHIPPED')continue;
   if(label==='DELIVERY_FAILED'){const current=await api('/store/orders/'+order.id,owner);await api('/store/orders/'+order.id+'/delivery-return',owner,'POST',{operation_id:op('delivery:'+order.id),expected_order_version:current.version,reason:'[DEMO] Khách từ chối nhận, đang chờ kiện hoàn về'});continue;}
   let current=await api('/store/orders/'+order.id,owner);await api('/store/orders/'+order.id+'/cod-collection',owner,'POST',{expected_version:current.version,amount_collected_vnd:current.amounts.payable_vnd});await transition(order,owner,'COMPLETED');
   if(label==='COMPLETED')continue;current=await own(order,customer);let request=await api('/me/orders/'+order.id+'/returns',customer,'POST',{type:label==='REFUNDED'?'REFUND':'EXCHANGE',reason:'[DEMO] Đối chiếu sai màu hoặc cỡ',expected_order_version:current.version});
   request=await api('/store/returns/'+request.id,owner,'PATCH',{operation_id:op('approve:'+request.id),expected_version:request.version,status:'APPROVED',decision_note:'[DEMO] Store xác minh gửi sai và chịu phí',fault_party:'STORE'});
   if(label==='EXCHANGE_APPROVED')continue;
   await api('/store/returns/'+request.id,owner,'PATCH',{operation_id:op('inspect:'+request.id),expected_version:request.version,status:'RECEIVED',inspection_note:'[DEMO] Nhận đủ, còn bán lại được',inspection:request.items.map(i=>({order_item_id:i.order_item_id,received_quantity:i.quantity,resellable_quantity:i.quantity,damaged_quantity:0,pending_quantity:0}))});
   request=await poll(async()=>(await api('/store/returns?order_id='+order.id,owner)).items[0],r=>r.inventory_status==='APPLIED');current=await api('/store/orders/'+order.id,owner);
   await api('/store/orders/'+order.id+'/cod-refund',owner,'POST',{operation_id:op('refund:'+request.id),expected_order_version:current.version,expected_return_version:request.version,receipt_reference:'DEMO-'+request.id,recipient_name:customer.name,refunded_at:new Date().toISOString(),full_amount_confirmed:true});
   request=(await api('/store/returns?order_id='+order.id,owner)).items[0];await api('/store/returns/'+request.id,owner,'PATCH',{expected_version:request.version,status:'COMPLETED'});
  }
 }
 for(const store of stores){const owner=actors['owner'+store.key],balances=await list('/store/inventory',owner);store.inventory_variants=balances.length;store.available_total=balances.reduce((n,b)=>n+b.available_quantity,0);store.report=await api('/store/reports?from='+encodeURIComponent(new Date(Date.now()-86400000).toISOString())+'&to='+encodeURIComponent(new Date(Date.now()+60000).toISOString()),owner);}
 if(stores.length!==2||products.length!==12||orders.length!==17)throw Error('Demo inventory incomplete');
 report.database_verification={
  catalog:await db('M1',async c=>(await c.query(`SELECT json_build_object(
   'products',(SELECT count(*) FROM product),'variants',(SELECT count(*) FROM product_variant),
   'images',(SELECT count(*) FROM product_image),
   'ledger_mismatches',(SELECT count(*) FROM inventory i LEFT JOIN
    (SELECT inventory_id,sum(delta_quantity) AS quantity,sum(delta_reserved) AS reserved FROM stock_movement GROUP BY inventory_id)m
    ON m.inventory_id=i.id WHERE i.quantity<>coalesce(m.quantity,0) OR i.reserved_quantity<>coalesce(m.reserved,0)),
   'invalid_balances',(SELECT count(*) FROM inventory WHERE quantity<0 OR reserved_quantity<0 OR reserved_quantity>quantity)
  ) AS result`)).rows[0].result),
  commerce:await db('M2',async c=>(await c.query(`SELECT json_build_object(
   'orders',(SELECT count(*) FROM "order"),'collections',(SELECT count(*) FROM money_movement WHERE kind='COLLECTION'),
   'collected_vnd',(SELECT coalesce(sum(amount_vnd),0) FROM money_movement WHERE kind='COLLECTION'),
   'refunds',(SELECT count(*) FROM money_movement WHERE kind='REFUND'),
   'refunded_vnd',(SELECT coalesce(sum(amount_vnd),0) FROM money_movement WHERE kind='REFUND'),
   'cod_refund_receipts',(SELECT count(*) FROM cod_refund_receipt),
   'returns',(SELECT count(*) FROM order_return_request),'delivery_returns',(SELECT count(*) FROM delivery_return_case)
  ) AS result`)).rows[0].result),
  identity:await db('M3',async c=>(await c.query(`SELECT json_build_object(
   'users',(SELECT count(*) FROM "user"),'stores',(SELECT count(*) FROM store),
   'return_addresses',(SELECT count(*) FROM store WHERE return_address IS NOT NULL),'addresses',(SELECT count(*) FROM address),
   'staff',(SELECT count(*) FROM store_membership WHERE role='SELLER' AND status='ACTIVE'),
   'staff_permissions',(SELECT count(*) FROM membership_permission mp JOIN store_membership m ON m.id=mp.membership_id WHERE m.role='SELLER')
  ) AS result`)).rows[0].result)
 };
 const expected={catalog:{products:12,variants:34,images:12,ledger_mismatches:0,invalid_balances:0},
  commerce:{orders:17,collections:4,collected_vnd:676000,refunds:1,refunded_vnd:164000,cod_refund_receipts:1,returns:2,delivery_returns:1},
  identity:{users:7,stores:2,return_addresses:2,addresses:2,staff:2,staff_permissions:4}};
 for(const [service,fields] of Object.entries(expected))for(const [field,value] of Object.entries(fields))
  if(report.database_verification[service][field]!==value){save();throw Error('Demo database verification mismatch: '+service+'.'+field);}
 report.accounts=PEOPLE.map(p=>({email:p.email,name:p.name,role:p.role,...(p.key.startsWith('staff')?{membership:'SELLER',permissions:PERMISSIONS[p.key]}:p.key.startsWith('owner')?{membership:'OWNER'}:{})}));report.status='PASS';report.finished_at=new Date().toISOString();save();console.log(JSON.stringify({status:'PASS',dataset:DATASET,accounts:PEOPLE.length,stores:stores.length,products:products.length,variants:products.reduce((n,p)=>n+p.variants.length,0),orders:orders.length,report_written:!!output,credentials_not_recorded:true}));
}
module.exports={main,options,validate,plan};
if(require.main===module)main().catch(e=>{console.error('Demo seed failed: '+e.message);process.exitCode=1;});
