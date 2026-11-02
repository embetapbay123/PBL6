import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {writeFileSync} from 'node:fs';
import {seededMarket} from './runtime/seeded-market';

test.skip(process.env.CORE_FIX_CART_CHECKOUT!=='1','Private tagged pbl6-fe-verify only; real handlers, databases and workers.');
test.use({viewport:{width:Number(process.env.CORE_FIX_CART_WIDTH??1440),height:900}});

function sql(service:'m1'|'m2',statement:string,values:unknown[]=[]){
 const code=`const {Client}=require('pg');(async()=>{let t='';for await(const b of process.stdin)t+=b;const x=JSON.parse(t),c=new Client({connectionString:process.env.${service.toUpperCase()}_DATABASE_URL});await c.connect();try{console.log(JSON.stringify((await c.query(x.statement,x.values)).rows));}finally{await c.end();}})();`;
 return JSON.parse(execFileSync('docker',['exec','-i','pbl6-fe-verify-'+service+'-1','node','-e',code],{input:JSON.stringify({statement,values}),encoding:'utf8'}));
}

/** A live PostgreSQL lock, released explicitly; no app/provider fixture replaces execution. */
async function block(service:'m1'|'m2',table:'inventory'|'voucher',id:string){
 const column=table==='inventory'?'variant_id':'id';
 const script=`const {Client}=require('pg');(async()=>{const c=new Client({connectionString:process.env.${service.toUpperCase()}_DATABASE_URL});await c.connect();await c.query('BEGIN');await c.query('SET LOCAL idle_in_transaction_session_timeout=15000');await c.query('SELECT id FROM ${table} WHERE ${column}=$1 FOR UPDATE',[process.argv[1]]);console.log(JSON.stringify((await c.query('SELECT pg_backend_pid() AS pid')).rows[0]));for await(const b of process.stdin){if(String(b).trim()==='COMMIT'){await c.query('COMMIT');await c.end();return;}}await c.query('ROLLBACK');await c.end();})();`;
 const child=spawn('docker',['exec','-i','pbl6-fe-verify-'+service+'-1','node','-e',script,id],{stdio:['pipe','pipe','pipe']});
 const lines=createInterface({input:child.stdout});let stderr='';child.stderr.on('data',b=>stderr+=b);
 const ready=await new Promise<{pid:number}>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Lock setup timeout')),8000);lines.once('line',line=>{clearTimeout(timer);resolve(JSON.parse(line));});child.once('exit',code=>{clearTimeout(timer);if(code!==0)reject(new Error('Lock process failed: '+stderr));});});
 let released=false;
 return {pid:ready.pid,release:async()=>{if(released)return;released=true;await new Promise<void>((resolve,reject)=>{child.once('exit',code=>code===0?resolve():reject(new Error('Lock release failed: '+stderr)));child.stdin.end('COMMIT\n');});lines.close();}};
}

async function market(names:string[]){
 const f=seededMarket('corecheckout'),buyers=await Promise.all(names.map(n=>f.actor(n))),owners=[await f.actor('owner-a'),await f.actor('owner-b')];
 const admin=(await f.api('/auth/login',undefined,'POST',{email:'admin@pbl6.test',password:process.env.SEED_PASSWORD,client_type:'MOBILE'})).access_token;
 const address={recipient_name:f.tag+' Người nhận',phone:'0900000000',line1:'123 Đường kiểm đơn, cổng B tầng 15',ward:'Phường A',district:'Quận B',city:'Huế'},stores:any[]=[],vouchers:any[]=[];
 const category=await f.api('/admin/categories',admin,'POST',{name:f.tag+' Cart category'}),type=await f.api('/admin/product-types',admin,'POST',{name:f.tag+' Cart axes',category_id:category.id});
 await f.api('/admin/attribute-definitions',admin,'POST',{product_type_id:type.id,code:'color',name:'Màu',data_type:'STRING',required:true,variant_axis:true,allowed_values:['Đỏ','Xanh','Lá','Đen']});
 for(const [index,owner] of owners.entries()){
  const app=await f.api('/me/store-applications',owner.access,'POST',{proposed_name:f.tag+' Store '+index,contact:owner.email});await f.api('/admin/store-applications/'+app.id,admin,'PATCH',{status:'APPROVED',expected_version:app.version});
  owner.access=(await f.api('/auth/login',undefined,'POST',{email:owner.email,password:f.password,client_type:'MOBILE'})).access_token;
  const store=await f.api('/store',owner.access);await f.api('/store',owner.access,'PATCH',{expected_version:store.version,shipping_fee_vnd:index?25000:15000,return_address:address});
  const colors=index?['Đen']:['Đỏ','Xanh','Lá'];
  const product=await f.api('/store/products',owner.access,'POST',{product_type_id:type.id,title:f.tag+' '+(index?'Quần công sở':'Áo công sở'),status:'ACTIVE',attributes:{color:colors[0]},variants:colors.map((color,i)=>({sku:f.tag+'-'+index+'-'+i,price_vnd:index?80003:100001+i*20000,variant_values:{color},is_default:i===0}))});
  for(const variant of product.variants)await f.api('/store/inventory/adjustments',owner.access,'POST',{variant_id:variant.id,delta_quantity:30,expected_version:0,reason:f.tag+' stock setup',operation_id:randomUUID()});
  stores.push({store,owner,product,variants:colors.map(color=>product.variants.find((v:any)=>v.variant_values.color===color))});
 }
 const addresses=await Promise.all(buyers.map(b=>f.api('/me/addresses',b.access,'POST',{...address,is_default:true})));
 async function voucher(scope:'STORE'|'PLATFORM',suffix:string,value:number,limit=20,index=0){
  const token=scope==='PLATFORM'?admin:stores[index].owner.access;
  const path=scope==='PLATFORM'?'/admin/vouchers':'/store/vouchers';
  const row=await f.api(path,token,'POST',{scope,code:(f.tag+'-'+suffix).toUpperCase(),discount_type:scope==='PLATFORM'?'PERCENT':'FIXED',discount_value:value,min_goods_vnd:0,starts_at:new Date(Date.now()-60000).toISOString(),ends_at:new Date(Date.now()+3600000).toISOString(),usage_limit:limit,per_customer_limit:Math.min(10,limit)});
  vouchers.push({row,path,token});return row;
 }
 async function add(buyerIndex:number,storeIndex:number,variantIndex:number,quantity=1){const s=stores[storeIndex];return f.api('/cart/items',buyers[buyerIndex].access,'POST',{product_id:s.product.id,variant_id:s.variants[variantIndex].id,quantity});}
 async function confirm(body:any,token:string,key:string){const r=await fetch('http://127.0.0.1:18080/api/v1/orders/batches',{method:'POST',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'Idempotency-Key':key},body:JSON.stringify(body)});return {status:r.status,value:await r.json()};}
 async function cancelOrders(){
  await expect.poll(()=>sql('m2',"SELECT count(*)::int AS n FROM checkout_attempt WHERE customer_user_id=ANY($1::uuid[]) AND phase IN ('RESERVING','READY','COMPENSATING')",[buyers.map(b=>b.user)])[0].n,{timeout:45000}).toBe(0);
  for(const buyer of buyers){
   const orders=(await f.api('/me/orders?size=100',buyer.access)).items;
   for(const order of orders)if(!['CANCELLED','EXPIRED','COMPLETED'].includes(order.status)){
    // Workers may advance version between read and command; retry only a definite version conflict.
    for(let n=0;n<4;n++){let fresh=await f.api('/me/orders/'+order.id,buyer.access);await expect.poll(async()=>{fresh=await f.api('/me/orders/'+order.id,buyer.access);return ['PREPARING','RECOVERING'].includes(fresh.status);},{timeout:15000}).toBe(false);if(fresh.status==='CANCELLED')break;const r=await f.raw('/me/orders/'+order.id+'/cancel',buyer.access,'POST',{expected_version:fresh.version,reason:f.tag+' test cleanup'});if(r.status<400)break;if(r.value.code!=='VERSION_CONFLICT')throw Error('Cleanup cancellation: '+r.value.code);}
   }
  }
  await expect.poll(async()=>{
   const ids=stores.flatMap(s=>s.variants.map((v:any)=>v.id));return sql('m1','SELECT sum(reserved_quantity)::int AS n FROM inventory WHERE variant_id=ANY($1::uuid[])',[ids])[0].n;
  },{timeout:15000}).toBe(0);
 }
 async function cleanup(){
  await cancelOrders();
  for(const s of stores){const p=await f.api('/store/products/'+s.product.id,s.owner.access);await f.api('/store/products/'+p.id,s.owner.access,'PATCH',{expected_version:p.version,status:'STOPPED'});}
  for(const v of vouchers){const list=await f.api(v.path+'?size=100',v.token),current=list.items.find((r:any)=>r.id===v.row.id);if(current?.status==='ACTIVE')await f.api(v.path+'/'+v.row.id,v.token,'PATCH',{expected_version:current.version,status:'STOPPED'});}
  const counts=sql('m1',"SELECT count(*)::int AS n FROM product WHERE product_type_id=$1 AND status='ACTIVE'",[type.id]);expect(counts[0].n).toBe(0);
  sql('m1',"UPDATE product_type SET status='STOPPED',version=version+1 WHERE id=$1 AND name=$2",[type.id,f.tag+' Cart axes']);sql('m1',"UPDATE category SET status='STOPPED',version=version+1 WHERE id=$1 AND name=$2",[category.id,f.tag+' Cart category']);
 }
 return {...f,buyers,stores,addresses,voucher,add,confirm,cancelOrders,cleanup};
}

test('cart walkthrough: pending writes, lost delete ACK, partial choices, repricing, split discounts and result recovery',async({page},info)=>{
 test.setTimeout(180000);page.setDefaultTimeout(12000);const f=await market(['buyer']),s=f.stores,b=f.buyers[0],checkpoints:any[]=[];
 const record=(step:string,data:any)=>{checkpoints.push({step,...data});writeFileSync(info.outputPath('cart-checkpoints.json'),JSON.stringify({tag:f.tag,runtime:process.env.CORE_FIX_RUNTIME_MANIFEST,viewport:Number(process.env.CORE_FIX_CART_WIDTH??1440),evidence:'REAL_UI_HTTP_DATABASE_WORKER',identity_setup:'Private tagged M3 seed, not registration acceptance.',checkpoints},null,2));};
 const row=(sku:string)=>page.locator('.cart-store-group > div').filter({hasText:sku});
 const badge=page.getByRole('link',{name:'Giỏ hàng',exact:true}).locator('b');
 let latest:any;page.on('response',async r=>{if(new URL(r.url()).pathname==='/api/v1/checkout/quotes'&&r.status()===200)latest=await r.json();});
 try{
  const red=await f.add(0,0,0),blue=await f.add(0,0,1),green=await f.add(0,0,2);const black=await f.add(0,1,0);
  await f.login(page,b.email);await expect(badge).toHaveText('4');await page.getByRole('link',{name:'Giỏ hàng',exact:true}).click();
  let pending:any;await page.route('**/api/v1/cart/items/'+red.id,async route=>{if(route.request().method()==='PATCH'){pending=route;return;}await route.continue();});
  await row(s[0].variants[0].sku).getByRole('button',{name:'Tăng số lượng',exact:true}).click();await expect.poll(()=>!!pending).toBe(true);
  await expect(page.getByRole('button',{name:'Tiến hành thanh toán',exact:true})).toBeDisabled();expect(new URL(page.url()).pathname).toBe('/cart');
  const updated=await pending.fetch();expect(updated.status()).toBe(200);await pending.fulfill({response:updated});await expect(page.getByRole('button',{name:'Tiến hành thanh toán',exact:true})).toBeEnabled();
  expect((await f.api('/cart/items?size=100',b.access)).items.find((x:any)=>x.id===red.id).quantity).toBe(2);await expect(row(s[0].variants[0].sku)).toContainText('Thành tiền dự tính: 200.002 ₫');await expect(page.locator('.purchase-summary')).toContainText('Tạm tính tiền hàng: 540.007 ₫');record('PATCH_PENDING_BLOCKED',{quantity_after:2,red_line:200002,selected_goods:540007});
  let deletion:any,deletePosts=0;await page.route('**/api/v1/cart/items/'+blue.id,async route=>{if(route.request().method()==='DELETE'){deletePosts++;deletion=route;return;}await route.continue();});
  await row(s[0].variants[1].sku).getByRole('button',{name:'Xóa',exact:true}).click();await expect.poll(()=>!!deletion).toBe(true);await expect(page.getByRole('button',{name:'Tiến hành thanh toán',exact:true})).toBeDisabled();
  const removed=await deletion.fetch();expect(removed.status()).toBe(200);await deletion.fulfill({status:503,json:{code:'ACK_LOST',message:'Delete committed; response lost.'}});
  await page.getByRole('button',{name:'Đọc lại giỏ hàng',exact:true}).click();await expect(row(s[0].variants[1].sku)).toHaveCount(0);record('DELETE_READBACK',{delete_posts:deletePosts,cart_total:(await f.api('/cart/items?size=100',b.access)).total,badge:await badge.textContent()});
  await expect(badge).toHaveText('3',{timeout:2000});expect(deletePosts).toBe(1);
  await row(s[0].variants[2].sku).getByRole('checkbox').uncheck();await row(s[1].variants[0].sku).getByRole('checkbox').uncheck();
  await expect(page.locator('.purchase-summary')).toContainText('Tạm tính tiền hàng: 200.002 ₫');await expect(page.locator('.purchase-summary')).toContainText('chưa gồm phí giao hàng và ưu đãi');record('SELECTED_GOODS_ESTIMATE',{selected_goods:200002,unselected_ids:[green.id,black.id]});
  await page.getByRole('button',{name:'Tiến hành thanh toán',exact:true}).click();await expect.poll(()=>latest?.stores?.length).toBe(1);expect(latest.stores[0].store_id).toBe(s[0].store.id);
  await page.getByRole('link',{name:'Quay lại giỏ hàng',exact:false}).click();await expect(row(s[1].variants[0].sku).getByRole('checkbox')).not.toBeChecked();await page.reload();await expect(row(s[0].variants[2].sku).getByRole('checkbox')).not.toBeChecked();await expect(row(s[1].variants[0].sku).getByRole('checkbox')).not.toBeChecked();
  await row(s[1].variants[0].sku).getByRole('checkbox').check();await page.getByRole('button',{name:'Tiến hành thanh toán',exact:true}).click();await expect.poll(()=>latest?.stores?.length).toBe(2);
  const va=await f.voucher('STORE','A',10000),vb=await f.voucher('STORE','B',7001,20,1),vp=await f.voucher('PLATFORM','P',10);
  await page.getByLabel('Voucher cửa hàng '+s[0].store.id,{exact:true}).fill(va.code);await page.getByLabel('Voucher cửa hàng '+s[1].store.id,{exact:true}).fill(vb.code);await page.getByLabel('Voucher toàn sàn',{exact:true}).fill(vp.code);
  await page.getByLabel('Thanh toán cửa hàng '+s[1].store.id,{exact:true}).selectOption('SANDBOX');await page.getByRole('button',{name:'Áp dụng ưu đãi',exact:true}).click();await expect.poll(()=>latest?.payable_total_vnd).toBe(276704);
  const product=await f.api('/store/products/'+s[0].product.id,s[0].owner.access);await f.api('/store/products/'+product.id,s[0].owner.access,'PATCH',{expected_version:product.version,variants:product.variants.map((v:any)=>({id:v.id,sku:v.sku,variant_values:v.variant_values,status:v.status,is_default:v.is_default,price_vnd:v.id===s[0].variants[0].id?110001:v.price_vnd}))});
  const conflict=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/orders/batches'&&r.request().method()==='POST');await page.getByRole('button',{name:'Xác nhận đặt hàng',exact:true}).click();expect((await conflict).status()).toBe(409);await expect.poll(()=>latest?.payable_total_vnd).toBe(294704);await expect(page.getByText('Đơn giá báo giá: 110.001 ₫',{exact:true})).toBeVisible();
  const summary=page.locator('.purchase-summary');await expect(summary).toContainText('Giảm từ cửa hàng:');await expect(summary).toContainText('Giảm từ sàn:');record('PARTIAL_CHOICE_AND_REQUOTE',{selected_ids:[red.id,black.id],unselected_kept:green.id,quote:latest});await summary.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('checkout-two-store-quote.png')});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const geometry=await page.getByRole('button',{name:'Xác nhận đặt hàng',exact:true}).evaluate(element=>{const box=element.getBoundingClientRect();return {button:{x:box.x,y:box.y,width:box.width,height:box.height},hit_points:[.1,.5,.9].map(ratio=>{const hit=document.elementFromPoint(box.left+box.width*ratio,box.top+box.height/2);return {ratio,covered:!hit||!element.contains(hit),by:hit?.closest('button')?.getAttribute('aria-label')};})};});
  const retryContrast=await page.getByRole('button',{name:'Tính lại báo giá',exact:true}).evaluate(element=>{const style=getComputedStyle(element);return {text:style.color,background:style.backgroundColor};});
  record('FINANCIAL_CONTROLS_GEOMETRY',{geometry,retryContrast});expect(geometry.hit_points.every(p=>!p.covered)).toBe(true);expect(retryContrast.text).not.toBe(retryContrast.background);
  const submits:any[]=[];let committed:any;
  await page.route('**/api/v1/orders/batches',async route=>{const request=route.request();submits.push({body:request.postDataJSON(),key:request.headers()['idempotency-key']});const response=await route.fetch();expect(response.status()).toBe(201);committed=await response.json();if(submits.length===1)await route.fulfill({status:503,json:{code:'ACK_LOST',message:'Order committed; response lost.'}});else await route.fulfill({response});});
  await page.getByRole('button',{name:'Xác nhận đặt hàng',exact:true}).evaluate((button:HTMLButtonElement)=>{button.click();button.click();});await expect(page.getByRole('alert')).toContainText('Chưa xác định được');expect(submits).toHaveLength(1);
  await page.getByRole('button',{name:'Xác nhận đặt hàng',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã tạo nhóm đơn hàng',exact:true})).toBeVisible();expect(submits).toHaveLength(2);expect(submits[1]).toEqual(submits[0]);await expect(badge).toHaveText('1');
  expect(committed.orders).toHaveLength(2);expect(committed.payable_total_vnd).toBe(294704);expect(committed.orders.reduce((n:number,o:any)=>n+o.amounts.payable_vnd,0)).toBe(294704);
  await page.reload();await expect(page.getByRole('heading',{name:'Đã tạo nhóm đơn hàng',exact:true})).toBeVisible();expect(submits).toHaveLength(2);const group=await f.api('/orders/batches/'+committed.purchase_group_id,b.access);expect(group.orders.map((o:any)=>o.id).sort()).toEqual(committed.orders.map((o:any)=>o.id).sort());
  const remaining=await f.api('/cart/items?size=100',b.access);expect(remaining.items).toEqual([expect.objectContaining({id:green.id,quantity:1})]);
  const money=sql('m2','SELECT kind,amount_vnd FROM money_movement WHERE order_id=ANY($1::uuid[])',[committed.order_ids]);expect(money).toEqual([]);
  const usage=sql('m2','SELECT voucher_id,count(*)::int AS n,sum(discount_vnd)::text AS discount FROM voucher_redemption WHERE purchase_group_id=$1 GROUP BY voucher_id',[committed.purchase_group_id]);expect(usage).toHaveLength(3);expect(usage.reduce((n:number,r:any)=>n+Number(r.discount),0)).toBe(45301);
  record('COMMITTED_REPLAY_RELOAD',{purchase_group_id:committed.purchase_group_id,orders:group.orders,submits,remaining_cart:remaining.items,voucher_rows:usage,money});await page.screenshot({path:info.outputPath('checkout-result.png')});
  await page.getByRole('link',{name:'Giỏ hàng',exact:true}).click();await row(s[0].variants[2].sku).getByRole('checkbox').check();await page.getByRole('button',{name:'Tiến hành thanh toán',exact:true}).click();await expect(page.getByRole('button',{name:'Xác nhận đặt hàng',exact:true})).toBeEnabled();
  await page.unroute('**/api/v1/orders/batches');const full=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/orders/batches'&&r.request().method()==='POST');await page.getByRole('button',{name:'Xác nhận đặt hàng',exact:true}).click();expect((await full).status()).toBe(201);await expect(page.getByRole('heading',{name:'Đã tạo nhóm đơn hàng',exact:true})).toBeVisible();await expect(badge).toHaveCount(0);expect((await f.api('/cart/items?size=100',b.access)).total).toBe(0);record('FULL_CART_BADGE_EMPTY',{cart_total:0});
 }catch(error){record('FAILURE',{message:error instanceof Error?error.message:'Scenario failed'});throw error;}finally{await f.cleanup();record('CLEANUP',{products:'STOPPED',taxonomy:'STOPPED',transactions_retained:true});}
});

test('two-Store checkout races: last stock and voucher quota yield one group, release losers and preserve committed usage',async({},info)=>{
 test.setTimeout(180000);const f=await market(['buyer-a','buyer-b']),checkpoints:any[]=[];
 const record=(step:string,data:any)=>{checkpoints.push({step,...data});writeFileSync(info.outputPath('checkout-race-checkpoints.json'),JSON.stringify({tag:f.tag,runtime:process.env.CORE_FIX_RUNTIME_MANIFEST,evidence:'REAL_HTTP_DATABASE_WORKER',identity_setup:'Private tagged M3 seed, not registration acceptance.',checkpoints},null,2));};
 const ids=f.stores.map(s=>s.variants[0].id),cart:any[][]=[[],[]];let lock:Awaited<ReturnType<typeof block>>|undefined,jobs:Promise<any>[]=[];
 async function settle(first:any,body:any,index:number,key:string){
  let result=first;
  if(result.status===503){expect(result.value.code).toBe('ORDER_RECOVERY_PENDING');
   await expect.poll(async()=>{result=await f.confirm(body,f.buyers[index].access,key);return result.status;},{timeout:40000,intervals:[100,300,500,1000]}).not.toBe(503);
  }
  return result;
 }

 async function payload(index:number,platform?:string,store_vouchers?:Record<string,string>){const input={cart_item_ids:cart[index].map(r=>r.id),address_id:f.addresses[index].id,payment_methods:Object.fromEntries(f.stores.map(s=>[s.store.id,'SANDBOX'])),...(platform?{platform_voucher_code:platform}:{}),...(store_vouchers?{store_vouchers}:{})};const quote=await f.api('/checkout/quotes',f.buyers[index].access,'POST',input);return {...input,quote_id:quote.quote_id,expected_payable_total_vnd:quote.payable_total_vnd};}
 const blockedSql='WITH RECURSIVE waiters(pid) AS (SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid)) UNION SELECT a.pid FROM pg_stat_activity a JOIN waiters w ON w.pid=ANY(pg_blocking_pids(a.pid))) SELECT count(*)::int AS n FROM waiters';
 async function balances(){return sql('m1','SELECT variant_id,quantity,reserved_quantity FROM inventory WHERE variant_id=ANY($1::uuid[]) ORDER BY variant_id',[ids]);}
 try{
  for(let i=0;i<2;i++)for(let j=0;j<2;j++)cart[i].push(await f.add(i,j,0));
  let stock=(await f.api('/store/inventory?variant_id='+ids[0],f.stores[0].owner.access)).items[0];await f.api('/store/inventory/adjustments',f.stores[0].owner.access,'POST',{variant_id:ids[0],delta_quantity:1-stock.quantity,expected_version:stock.version,reason:f.tag+' last unit',operation_id:randomUUID()});
  const bodies=await Promise.all([payload(0),payload(1)]),keys=[randomUUID(),randomUUID()];lock=await block('m1','inventory',ids[0]);
  jobs=bodies.map((body,i)=>f.confirm(body,f.buyers[i].access,keys[i]));
  await expect.poll(()=>sql('m1',blockedSql,[lock!.pid])[0].n,{timeout:8000}).toBeGreaterThanOrEqual(2);await lock.release();lock=undefined;
  const initial=await Promise.all(jobs);jobs=[];const results=await Promise.all(initial.map((r,i)=>settle(r,bodies[i],i,keys[i])));expect(results.map(r=>r.status).sort()).toEqual([201,409]);const winner=results.findIndex(r=>r.status===201),loser=1-winner;expect(results[loser].value.code).toBe('INSUFFICIENT_STOCK');expect(results[winner].value.orders).toHaveLength(2);
  expect((await f.api('/me/orders?size=100',f.buyers[loser].access)).total).toBe(0);expect((await f.api('/cart/items?size=100',f.buyers[loser].access)).total).toBe(2);expect((await f.api('/cart/items?size=100',f.buyers[winner].access)).total).toBe(0);expect((await balances()).map((r:any)=>r.reserved_quantity)).toEqual([1,1]);
  record('LAST_STOCK_ONE_GROUP',{initial_statuses:initial.map(r=>r.status),winner_user:f.buyers[winner].user,loser_user:f.buyers[loser].user,winner:results[winner].value,loser_code:results[loser].value.code,balances:await balances()});await f.cancelOrders();
  const replay=await f.confirm(bodies[loser],f.buyers[loser].access,keys[loser]);expect(replay.status).toBe(409);expect(replay.value.code).toBe('INSUFFICIENT_STOCK');expect((await balances()).every((r:any)=>r.reserved_quantity===0)).toBe(true);
  stock=(await f.api('/store/inventory?variant_id='+ids[0],f.stores[0].owner.access)).items[0];await f.api('/store/inventory/adjustments',f.stores[0].owner.access,'POST',{variant_id:ids[0],delta_quantity:30-stock.quantity,expected_version:stock.version,reason:f.tag+' quota race stock',operation_id:randomUUID()});
  for(let j=0;j<2;j++)cart[winner][j]=await f.add(winner,j,0);
  const limited=await f.voucher('PLATFORM','LAST',10,1),limitedBodies=await Promise.all([payload(0,limited.code),payload(1,limited.code)]),limitedKeys=[randomUUID(),randomUUID()];
  lock=await block('m2','voucher',limited.id);jobs=limitedBodies.map((body,i)=>f.confirm(body,f.buyers[i].access,limitedKeys[i]));
  await expect.poll(()=>sql('m2',blockedSql,[lock!.pid])[0].n,{timeout:8000}).toBeGreaterThanOrEqual(2);expect((await balances()).every((r:any)=>r.reserved_quantity===2)).toBe(true);await lock.release();lock=undefined;
  const quotaInitial=await Promise.all(jobs);jobs=[];const quota=await Promise.all(quotaInitial.map((r,i)=>settle(r,limitedBodies[i],i,limitedKeys[i])));expect(quota.map(r=>r.status).sort()).toEqual([201,422]);const used=quota.findIndex(r=>r.status===201),rejected=1-used;expect(quota[rejected].value.code).toBe('VOUCHER_OUT_OF_QUOTA');expect((await balances()).every((r:any)=>r.reserved_quantity===1)).toBe(true);
  const usage=sql('m2','SELECT count(*)::int AS rows,count(DISTINCT purchase_group_id)::int AS groups,sum(discount_vnd)::text AS discount FROM voucher_redemption WHERE voucher_id=$1',[limited.id])[0];expect(usage).toMatchObject({rows:2,groups:1,discount:'18000'});
  const losers=sql('m2',"SELECT phase,released_orders,plan_json->>'purchaseGroupId' AS purchase_group_id FROM checkout_attempt WHERE customer_user_id=$1 AND key=$2",[f.buyers[rejected].user,limitedKeys[rejected]])[0];expect(losers.phase).toBe('FAILED');expect(losers.released_orders).toHaveLength(2);expect(sql('m2','SELECT id FROM "order" WHERE purchase_group_id=$1',[losers.purchase_group_id])).toEqual([]);
  record('VOUCHER_ONE_USAGE_FULL_COMPENSATION',{initial_statuses:quotaInitial.map(r=>r.status),winner:quota[used].value,loser_code:quota[rejected].value.code,loser_attempt:losers,usage,balances:await balances()});await f.cancelOrders();
  const after=sql('m2','SELECT count(DISTINCT purchase_group_id)::int AS groups FROM voucher_redemption WHERE voucher_id=$1',[limited.id])[0];expect(after.groups).toBe(1);expect((await balances()).every((r:any)=>r.reserved_quantity===0)).toBe(true);
  const quoteAgain=await f.raw('/checkout/quotes',f.buyers[rejected].access,'POST',{...limitedBodies[rejected],quote_id:undefined,expected_payable_total_vnd:undefined});expect(quoteAgain.status).toBe(422);record('CANCEL_DOES_NOT_RESTORE_USED_VOUCHER',{used_groups:after.groups,quote_status:quoteAgain.status,code:quoteAgain.value.code,balances:await balances()});
  const stopped=await f.voucher('STORE','STOP',1000),stoppedBody=await payload(rejected,undefined,{[f.stores[0].store.id]:stopped.code}),stoppedKey=randomUUID();
  lock=await block('m2','voucher',stopped.id);
  const stop=f.raw('/store/vouchers/'+stopped.id,f.stores[0].owner.access,'PATCH',{expected_version:stopped.version,status:'STOPPED'});jobs=[stop];
  await expect.poll(()=>sql('m2',blockedSql,[lock!.pid])[0].n,{timeout:5000}).toBeGreaterThanOrEqual(1);
  const pending=f.confirm(stoppedBody,f.buyers[rejected].access,stoppedKey);jobs.push(pending);
  await expect.poll(()=>sql('m2',blockedSql,[lock!.pid])[0].n,{timeout:8000}).toBeGreaterThanOrEqual(2);await lock.release();lock=undefined;
  const stoppedResults=await Promise.all(jobs);jobs=[];expect(stoppedResults[0].status).toBe(200);const stoppedResult=await settle(stoppedResults[1],stoppedBody,rejected,stoppedKey);expect(stoppedResult.status).toBe(422);expect(stoppedResult.value.code).toBe('VOUCHER_INACTIVE');
  const stoppedAttempt=sql('m2',"SELECT phase,released_orders,plan_json->>'purchaseGroupId' AS purchase_group_id FROM checkout_attempt WHERE customer_user_id=$1 AND key=$2",[f.buyers[rejected].user,stoppedKey])[0];expect(stoppedAttempt.phase).toBe('FAILED');expect(stoppedAttempt.released_orders).toHaveLength(2);expect(sql('m2','SELECT id FROM "order" WHERE purchase_group_id=$1',[stoppedAttempt.purchase_group_id])).toEqual([]);expect(sql('m2','SELECT id FROM voucher_redemption WHERE voucher_id=$1',[stopped.id])).toEqual([]);expect((await balances()).every((r:any)=>r.reserved_quantity===0)).toBe(true);
  record('VOUCHER_STOP_WHILE_CONFIRMING',{stop_http:stoppedResults[0].status,confirm_status:stoppedResult.status,code:stoppedResult.value.code,attempt:stoppedAttempt,balances:await balances()});

 }catch(error){record('FAILURE',{message:error instanceof Error?error.message:'Scenario failed'});throw error;}finally{await lock?.release();await Promise.allSettled(jobs);await f.cleanup();record('CLEANUP',{products:'STOPPED',taxonomy:'STOPPED',transactions_retained:true});}
});
