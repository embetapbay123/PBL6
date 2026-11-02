#!/usr/bin/env node
/** Upgrade synthetic demo catalog via APIs; preserve all order/payment/inventory history. */
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{createHash}=require('node:crypto');
const requireBackend=createRequire(path.resolve(process.env.PBL6_BACKEND_ROOT??process.cwd(),'package.json'));
const idFor=label=>{const h=createHash('sha256').update('curated-v2:'+label).digest('hex');return h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32);};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function readCatalog(file){const data=JSON.parse(fs.readFileSync(file,'utf8'));if(data.version!=='marketplace-curated-v2'||data.products.length!==32||new Set(data.products.map(p=>p.id)).size!==32||new Set(data.products.map(p=>p.title)).size!==32)throw Error('Invalid curated catalog');return data;}
function variantsFor(p){return p.sizes?(p.colors??[p.color]).flatMap(color=>p.sizes.map(size=>({color,size}))):[{}];}
async function main(argv=process.argv.slice(2),env=process.env){
 const apply=argv.includes('--apply'),preflight=argv.includes('--preflight'),catalogPath=env.CURATED_CATALOG_FILE??path.join(__dirname,'../data/marketplace-catalog.json'),catalog=readCatalog(catalogPath);
 const count=catalog.products.reduce((n,p)=>n+variantsFor(p).length,0),output=argv.includes('--output')?argv[argv.indexOf('--output')+1]:undefined;
 if(!apply&&!preflight){console.log(JSON.stringify({status:'PLAN_ONLY',dataset:catalog.version,products:32,variants:count,categories:4,stores:2,orders:'Preserved; adds 12 varied COD example orders using current catalog',legacy:'Stop selling only the 12 allowlisted DEMO products; retain order snapshots, stock and money history'}));return;}
 if(env.DEMO_SEED_ALLOWED!=='1'||env.NODE_ENV==='production'||!env.SEED_PASSWORD)throw Error('Explicit synthetic demo opt-in required');
 const {Client}=requireBackend('pg'),bundle=requireBackend('./shared/src/contracts.runtime.generated.json');
 async function db(service,fn){if(!env[service+'_DATABASE_URL'])throw Error('Missing database configuration');const c=new Client({connectionString:env[service+'_DATABASE_URL']});await c.connect();try{return await fn(c);}finally{await c.end();}}
 await db('M3',async c=>{const users=(await c.query('SELECT u.email,p.display_name FROM "user" u LEFT JOIN customer_profile p ON p.user_id=u.id')).rows;const allowed=['admin','customer.a','customer.b','owner.a','owner.b','seller.a','seller.b'].map(x=>x+'@pbl6.test');if(users.length!==7||users.some(u=>!allowed.includes(u.email)||!u.display_name?.startsWith('[DEMO] ')))throw Error('Not the isolated synthetic demo dataset');});
 await db('M1',async c=>{const items=(await c.query('SELECT p.title,v.sku FROM product p JOIN product_variant v ON v.product_id=p.id')).rows;const prefixes=catalog.products.map(p=>p.id+'-');if(items.some(row=>!(row.title.startsWith('[DEMO] ')&&/^DEMO-[AB]-\d{2}-\d{3}$/.test(row.sku))&&!prefixes.some(prefix=>row.sku.startsWith(prefix))))throw Error('Unrecognized product data; refusing to overwrite or hide user products');});
 await db('M2',async c=>{const attempts=(await c.query('SELECT phase FROM checkout_attempt WHERE key=ANY($1::text[])',[Array.from({length:6},(_,i)=>idFor('purchase:'+i))])).rows;if(attempts.some(row=>row.phase!=='COMMITTED'))throw Error('Curated checkout is unresolved; inspect its durable attempt');const n=(await c.query('SELECT count(*)::int AS n FROM cart_item')).rows[0].n;if(n&&attempts.length<6)throw Error('Demo carts contain user work; refusing to alter them');});
 if(preflight&&!apply){console.log(JSON.stringify({status:'PASS',mode:'READ_ONLY_PREFLIGHT',dataset:catalog.version,changes:0}));return;}
 const actors={},products=[],stores=[],orders=[],report={dataset:catalog.version,status:'RUNNING',products,stores,orders,started_at:new Date().toISOString()};
 const save=()=>{if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}};save();
 const routes=Object.values(bundle.operations).filter(r=>!r.internal).sort((a,b)=>(a.route.match(/\{/g)?.length??0)-(b.route.match(/\{/g)?.length??0));
 const match=(template,value)=>new RegExp('^'+template.replace(/\{[^}]+\}/g,'[^/]+')+'$').test(value);
 async function api(route,actor,method='GET',body,key){const pathname=route.split('?')[0],record=routes.find(r=>r.method===method&&match(r.route,pathname));if(!record)throw Error('Unmapped operation '+method+' '+pathname);const base=env[record.service+'_API_URL']??`http://${record.service.toLowerCase()}:${{M1:3101,M2:3102,M3:3103,M4:3104}[record.service]}/api/v1`,serialized=body===undefined?undefined:JSON.stringify(body);
  for(let attempt=0;;attempt++){const r=await fetch(base+route,{method,signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',...(actor?.token?{Authorization:'Bearer '+actor.token}:{}),...(key?{'Idempotency-Key':key}:{})},...(serialized===undefined?{}:{body:serialized})}),result=await r.json();const delay=Number(r.headers.get('Retry-After'));if(r.status===429&&delay>0&&delay<=60&&attempt<2){await wait((delay+1)*1000);continue;}if(!r.ok)throw Error(method+' '+pathname+': '+r.status+' '+result.code);return result;}
 }
 async function list(route,actor){const rows=[];for(let page=1;;page++){const r=await api(route+(route.includes('?')?'&':'?')+`page=${page}&size=100`,actor);rows.push(...r.items);if(!r.items.length||rows.length>=r.total)return rows;}}
 for(const [key,email] of Object.entries({admin:'admin',ownerA:'owner.a',ownerB:'owner.b',customerA:'customer.a',customerB:'customer.b'})){const auth=await api('/auth/login',undefined,'POST',{email:email+'@pbl6.test',password:env.SEED_PASSWORD,client_type:'MOBILE'});actors[key]={token:auth.access_token,id:auth.context.user_id};}
 const before=await db('M2',async c=>(await c.query(`SELECT count(*)::int AS orders,(SELECT count(*)::int FROM money_movement) AS money_entries FROM "order"`)).rows[0]);report.previous_business_counts=before;
 const retained=await db('M2',async c=>({orders:(await c.query('SELECT id,md5(to_jsonb(o)::text) AS hash FROM "order" o ORDER BY id')).rows,money:(await c.query('SELECT id,md5(to_jsonb(m)::text) AS hash FROM money_movement m ORDER BY id')).rows}));
 const categories={};for(const name of catalog.categories){let all=await list('/categories',actors.admin),row=all.find(c=>c.name===name);if(!row&&name==='Thời trang'){const legacy=all.find(c=>c.name==='[DEMO] Thời trang và phụ kiện');if(legacy)row=await api('/admin/categories/'+legacy.id,actors.admin,'PATCH',{expected_version:legacy.version,name});}if(!row)row=await api('/admin/categories',actors.admin,'POST',{name});categories[name]=row.id;}
 const types={};for(const name of catalog.categories){let type=(await list('/product-types',actors.admin)).find(t=>t.name==='Danh mục · '+name);if(!type)type=await api('/admin/product-types',actors.admin,'POST',{name:'Danh mục · '+name,category_id:categories[name]});
  const defs=[{code:'color',name:'Màu sắc',variant_axis:name==='Thời trang'},{code:'material',name:'Chất liệu'},{code:'dimensions',name:'Quy cách'},{code:'care',name:'Bảo quản'},...(name==='Thời trang'?[{code:'size',name:'Kích cỡ',variant_axis:true,allowed_values:['S','M','L','XL']}]:[])];
  for(const def of defs)if(!type.attribute_definitions?.some(d=>d.code===def.code))await api('/admin/attribute-definitions',actors.admin,'POST',{...def,product_type_id:type.id,data_type:'STRING',required:true});types[name]=type.id;
 }
 const baseOrigin=(env.DEMO_PUBLIC_ORIGIN??env.WEB_ORIGIN??'').replace(/\/$/,'');if(!baseOrigin)throw Error('Public image origin missing');
 for(const key of ['A','B']){const actor=actors['owner'+key];let store=await api('/store',actor);const allowed=['[DEMO] '+(key==='A'?'An Nhiên Fashion':'Mây Xanh Boutique'),catalog.stores[key].name];if(!allowed.includes(store.name))throw Error('Unexpected Store identity');
  if(store.name!==catalog.stores[key].name||store.description!==catalog.stores[key].description)store=await api('/store',actor,'PATCH',{expected_version:store.version,name:catalog.stores[key].name,description:catalog.stores[key].description});stores.push({key,id:store.id,name:store.name});save();
  const old=await list('/store/products',actor);
  for(const item of catalog.products.filter(p=>p.store===key)){
   let product=old.find(p=>p.variants.some(v=>v.sku===item.id+'-001'));
   const values=variantsFor(item),attrs={color:item.color,material:item.material,dimensions:item.dimensions,care:item.care,...(item.sizes?{size:item.sizes[0]}:{})};
   if(!product)product=await api('/store/products',actor,'POST',{title:item.title,description:item.description,product_type_id:types[item.category],attributes:attrs,status:'ACTIVE',variants:values.map((v,index)=>({sku:item.id+'-'+String(index+1).padStart(3,'0'),price_vnd:item.price_vnd+(item.sizes&&v.size==='XL'?10000:0),variant_values:v,is_default:index===0}))});
   if(product.status!=='ACTIVE')throw Error('Curated product changed; refusing silent overwrite');
   if(product.title!==item.title){if(!item.previous_titles?.includes(product.title))throw Error('Curated product changed; refusing silent overwrite');product=await api('/store/products/'+product.id,actor,'PATCH',{expected_version:product.version,title:item.title,description:item.description,attributes:attrs});}
   const balance=await list('/store/inventory?product_id='+product.id,actor);
   for(const [index,v] of product.variants.entries()){const row=balance.find(b=>b.variant_id===v.id);if(!row)throw Error('Variant inventory missing');const initial=item.id==='AN-TS01'?(index===11?0:index===10?1:24):['AN-HB02','MX-HP04'].includes(item.id)?1:item.id==='MX-SH01'?0:12+catalog.products.indexOf(item)%17;
    if(row.version===0&&initial)await api('/store/inventory/adjustments',actor,'POST',{variant_id:v.id,delta_quantity:initial,expected_version:0,operation_id:idFor('stock:'+v.id),reason:'Nhập catalog tuyển chọn '+catalog.version+' · '+item.id});
   }
   let current=await api('/store/products/'+product.id,actor);
   const seenImages=new Set();for(const image of current.images){const identity=(image.variant_id??'')+'|'+image.image_url;if(seenImages.has(identity))await api('/store/products/'+product.id+'/images/'+image.id,actor,'DELETE');else seenImages.add(identity);}
   current=await api('/store/products/'+product.id,actor);
   if(item.colors){for(const [colorIndex,color] of item.colors.entries())for(const variant of current.variants.filter(v=>v.variant_values.color===color)){const url=baseOrigin+'/catalog/'+item.photos[colorIndex]+'.webp';if(!current.images.some(i=>i.variant_id===variant.id&&i.image_url===url)){await api('/store/products/'+product.id+'/images',actor,'POST',{image_url:url,variant_id:variant.id,position:colorIndex});}}}
   else for(const [index,photo] of item.photos.entries()){const url=baseOrigin+'/catalog/'+photo+'.webp';if(!current.images.some(i=>i.image_url===url))await api('/store/products/'+product.id+'/images',actor,'POST',{image_url:url,position:index});}
   current=await api('/store/products/'+product.id,actor);products.push({catalog_id:item.id,id:product.id,store_id:store.id,title:current.title,variant_ids:current.variants.map(v=>v.id),image_count:current.images.length});save();
  }
  // Retire only known legacy demo products; keep their stock/order snapshots and identities.
  for(const p of old.filter(p=>p.title.startsWith('[DEMO] ')&&p.variants.every(v=>v.sku.startsWith('DEMO-'+key+'-'))&&p.status==='ACTIVE'))await api('/store/products/'+p.id,actor,'PATCH',{expected_version:p.version,status:'STOPPED'});
 }
 // Add varied, multi-line purchase groups through the same checkout kernel as the UI.
 // Deterministic keys are resolved by stored group IDs on resume; never replay with a new quote.
 const stateIds=await db('M2',async c=>(await c.query('SELECT key,phase,response_json FROM checkout_attempt WHERE key=ANY($1::text[])',[Array.from({length:6},(_,i)=>idFor('purchase:'+i))])).rows);
 if(stateIds.some(row=>row.phase!=='COMMITTED'||!row.response_json))throw Error('Prior curated checkout is unresolved; inspect its durable attempt before rerun');
 const stateMap=new Map(stateIds.map(row=>[row.key,row.response_json]));
 const samples=[['AN-TS01','MX-MG01'],['AN-TS02','MX-CD01'],['AN-HB01','MX-NB01'],['AN-TS03','MX-HP01'],['AN-TS05','MX-TR01'],['AN-HB04','MX-LM01']];
 for(const [index,ids] of samples.entries()){
  const buyer=actors[index%2?'customerB':'customerA'],key=idFor('purchase:'+index),addresses=await list('/me/addresses',buyer);let batch;
  if(stateMap.has(key))batch=stateMap.get(key);
  else {
   const cart=await list('/cart/items',buyer);if(cart.length)throw Error('Demo Customer cart is not empty; refusing to alter user work');
   for(const [line,catalogId] of ids.entries()){const item=products.find(p=>p.catalog_id===catalogId),p=await api('/products/'+item.id,buyer),v=p.variants.find(v=>v.is_default);await api('/cart/items',buyer,'POST',{product_id:p.id,variant_id:v.id,quantity:line===1&&index%2===0?2:1});}
   const rows=await list('/cart/items',buyer),input={source:'CART',cart_item_ids:rows.map(r=>r.id),address_id:addresses[0].id,payment_methods:Object.fromEntries(stores.map(s=>[s.id,'COD']))},quote=await api('/checkout/quotes',buyer,'POST',input),command={...input,quote_id:quote.quote_id,expected_payable_total_vnd:quote.payable_total_vnd};
   for(let attempt=0;;attempt++){try{batch=await api('/orders/batches',buyer,'POST',command,key);break;}catch(error){if(!error.message.endsWith('ORDER_RECOVERY_PENDING')||attempt>=30)throw error;await wait(1000);}}
  }
  for(const order of batch.orders){const owner=actors['owner'+stores.find(s=>s.id===order.store_id).key];let current=await api('/store/orders/'+order.id,owner);
   for(let n=0;current.status==='PREPARING'&&n<40;n++){await wait(250);current=await api('/store/orders/'+order.id,owner);}
   const target=['PENDING','CONFIRMED','PROCESSING','SHIPPED','COMPLETED','COMPLETED'][index],sequence=['PENDING','CONFIRMED','PROCESSING','SHIPPED','COMPLETED'];
   while(sequence.indexOf(current.status)>=0&&sequence.indexOf(current.status)<sequence.indexOf(target)){const next=sequence[sequence.indexOf(current.status)+1];if(next==='COMPLETED'&&current.payment_status!=='SUCCEEDED')current=await api('/store/orders/'+current.id+'/cod-collection',owner,'POST',{expected_version:current.version,amount_collected_vnd:current.amounts.payable_vnd});current=await api('/store/orders/'+order.id,owner);await api('/store/orders/'+current.id+'/status',owner,'PATCH',{expected_version:current.version,to_status:next});current=await api('/store/orders/'+order.id,owner);}
   orders.push({id:order.id,store_id:order.store_id,status:current.status,payable_vnd:current.amounts.payable_vnd});save();
  }
 }
 const publicItems=await list('/products',actors.customerA),actual=publicItems.filter(p=>products.some(item=>item.id===p.id));
 if(actual.length!==32||publicItems.length!==32||actual.some(p=>!p.description||!p.images.length||Object.keys(p.attributes).length<4))throw Error('Incomplete public catalog');
 const ledger=await db('M1',async c=>(await c.query(`SELECT count(*)::int AS mismatches FROM inventory i LEFT JOIN (SELECT inventory_id,sum(delta_quantity) AS quantity,sum(delta_reserved) AS reserved FROM stock_movement GROUP BY inventory_id)m ON m.inventory_id=i.id WHERE i.quantity<>coalesce(m.quantity,0) OR i.reserved_quantity<>coalesce(m.reserved,0)`)).rows[0].mismatches);
 if(ledger)throw Error('Inventory ledger mismatch');
 await db('M2',async c=>{for(const [table,rows] of [['order',retained.orders],['money_movement',retained.money]]){const existing=(await c.query(`SELECT id,md5(to_jsonb(t)::text) AS hash FROM "${table}" t WHERE id=ANY($1::uuid[]) ORDER BY id`,[rows.map(r=>r.id)])).rows;if(JSON.stringify(existing)!==JSON.stringify(rows))throw Error('Prior '+table+' rows changed; inspect before claiming history preserved');}});
 report.verification={public_products:32,variants:actual.reduce((n,p)=>n+p.variants.length,0),images:actual.reduce((n,p)=>n+p.images.length,0),categories:4,new_orders:orders.length,inventory_ledger_mismatches:ledger,history_preserved:true};if(report.verification.variants!==count||orders.length!==12)throw Error('Dataset counts mismatch');
 report.status='PASS';report.finished_at=new Date().toISOString();save();console.log(JSON.stringify({status:'PASS',...report.verification,credentials_recorded:false}));
}
module.exports={main,readCatalog,variantsFor};if(require.main===module)main().catch(e=>{console.error('Curated seed failed: '+e.message);process.exitCode=1;});
