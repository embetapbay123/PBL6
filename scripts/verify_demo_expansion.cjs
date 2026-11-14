const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const requireFrontend=createRequire(path.resolve(__dirname,'../frontend/package.json'));
const {chromium,expect}=requireFrontend('@playwright/test');
const folder=path.resolve(__dirname,'../outputs/demo-expansion-2026-11-14'),report=JSON.parse(fs.readFileSync(path.join(folder,'report.json'),'utf8'));
if(report.status!=='PASS')throw Error('Seed must finish before UI verification');
const base='https://demo.congnguyen.me',wait=ms=>new Promise(r=>setTimeout(r,ms));
const result={base,api_intercepts:0,checks:[],page_errors:[],http_errors:[],started_at:new Date().toISOString()};
const sessions=[];let browser;
function observe(page){page.on('pageerror',e=>result.page_errors.push(e.message));page.on('response',r=>{if(r.url().includes('/api/v1/')&&(r.status()>=500||r.status()===429))result.http_errors.push({path:new URL(r.url()).pathname,status:r.status()});});}
async function check(name,fn){try{const detail=await fn();result.checks.push({name,result:'PASS',...detail});console.log(name+': PASS');}catch(e){result.checks.push({name,result:'FAIL',error:e.message});console.log(name+': FAIL '+e.message.slice(0,160));process.exitCode=1;}fs.writeFileSync(path.join(folder,'ui-verification.json'),JSON.stringify(result,null,2));}
async function api(route,token){const r=await fetch(base+'/api/v1'+route,{headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(route+' '+r.status);return r.json();}
async function login(name){const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage();observe(page);await page.goto(base+'/login');const [r]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/auth/demo-login')&&r.request().method()==='POST'),page.getByRole('button',{name:new RegExp('^'+name)}).click()]);expect(r.status()).toBe(200);const auth=await r.json();await page.waitForURL(u=>u.pathname!=='/login');const actor={context,page,token:auth.access_token};sessions.push(actor);return actor;}
(async()=>{try{
 browser=await chromium.launch({headless:true});
 const publicContext=await browser.newContext({viewport:{width:1366,height:900}}),page=await publicContext.newPage();observe(page);
 await check('Public Store catalog and photos',async()=>{
  const store=report.stores.find(s=>!s.existing),data=await api('/stores/'+store.id+'/products?size=100');expect(data.total).toBe(12);expect(data.items.every(p=>p.images.length>0)).toBe(true);
  await page.goto(base+'/stores/'+store.id);await expect(page.getByRole('heading',{name:store.name,exact:true})).toBeVisible();await expect(page.locator('.market-product-grid .product-card')).toHaveCount(12);
  const img=page.locator('.product-card img').first();await img.scrollIntoViewIfNeeded();await expect.poll(()=>img.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);await page.screenshot({path:path.join(folder,'new-store.png'),fullPage:true});return {store_name:store.name,products:data.total,photo_loaded:true};
 });
 await wait(11000);
 await check('Product reviews from completed orders',async()=>{
  const id=report.reviews[0].product_id,data=await api('/products/'+id+'/reviews?size=20');expect(data.total).toBeGreaterThan(0);expect(data.items.some(r=>r.body?.startsWith('[DEMO] '))).toBe(true);
  await page.goto(base+'/products/'+id);const reviews=page.locator('#reviews');await reviews.scrollIntoViewIfNeeded();await expect(reviews).toContainText('[DEMO]');await page.screenshot({path:path.join(folder,'product-reviews.png')});return {product_id:id,review_total:data.total};
 });
 await publicContext.close();await wait(11000);
 const buyer=await login('Khách hàng A');await wait(3000);
 await check('Customer order history',async()=>{
  const data=await api('/me/orders?size=100',buyer.token);expect(data.total).toBeGreaterThan(0);expect(data.items.some(o=>report.orders.some(n=>n.id===o.id))).toBe(true);
  await buyer.page.goto(base+'/customer/orders');await expect(buyer.page.getByRole('heading',{name:'Lịch sử đơn hàng',exact:true})).toBeVisible();await expect(buyer.page.locator('a[href^="/customer/orders/"]').first()).toBeVisible();await buyer.page.screenshot({path:path.join(folder,'customer-orders.png')});return {total:data.total,new_orders:data.items.filter(o=>report.orders.some(n=>n.id===o.id)).length};
 });
 await wait(11000);const owner=await login('Chủ Store An Nhiên');
 await check('Seller catalog and report',async()=>{
  const data=await api('/store/products?size=100',owner.token);expect(data.items.filter(p=>p.variants.some(v=>v.sku.startsWith('DX26-')))).toHaveLength(8);
  await owner.page.goto(base+'/seller/products');await expect(owner.page.locator('main')).toContainText('Studio');await owner.page.screenshot({path:path.join(folder,'seller-products.png')});
  await owner.page.goto(base+'/seller/reports');await expect(owner.page.getByRole('heading',{name:'Báo cáo gian hàng',exact:true})).toBeVisible();await wait(2500);await owner.page.screenshot({path:path.join(folder,'seller-report.png')});return {catalog_total:data.total,added_products:8};
 });
 await wait(11000);const admin=await login('Quản trị viên');
 await check('Admin vouchers and financial report',async()=>{
  await admin.page.goto(base+'/admin?tab=vouchers');await expect(admin.page.locator('main')).toContainText('PBL6DEMO20');await admin.page.screenshot({path:path.join(folder,'admin-vouchers.png')});
  await admin.page.goto(base+'/admin?tab=reports');await expect(admin.page.getByRole('heading',{name:'Báo cáo thu / hoàn toàn sàn',exact:true})).toBeVisible();await wait(3000);await admin.page.screenshot({path:path.join(folder,'admin-financial-report.png')});return {new_vouchers:report.vouchers.length};
 });
}finally{
 for(const actor of sessions){try{await actor.page.evaluate(async token=>{const csrf=document.cookie.split('; ').find(s=>s.startsWith('pbl6_csrf='))?.split('=')[1]||'';const r=await fetch('/api/v1/auth/logout',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'X-CSRF-Token':csrf},body:'{}'});return r.status;},actor.token);}catch{}await actor.context.close();}
 await browser?.close();result.finished_at=new Date().toISOString();result.passed=result.checks.length===5&&result.checks.every(c=>c.result==='PASS')&&!result.page_errors.length&&!result.http_errors.length;fs.writeFileSync(path.join(folder,'ui-verification.json'),JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
}})().catch(e=>{console.error(e.message);process.exitCode=1});
