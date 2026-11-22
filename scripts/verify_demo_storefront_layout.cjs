/** Read-only demo layout/anchor QA; login session is revoked through the UI. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const {chromium,expect}=createRequire(path.resolve(__dirname,'../frontend/package.json'))('@playwright/test');
const folder=process.env.PBL6_EVIDENCE_ROOT||'C:/PBL6/outputs/bug-storefront-phase5-2026-11-21/demo-layout';
fs.mkdirSync(folder,{recursive:true});
const base='https://demo.congnguyen.me',report={checks:[],page_errors:[],unexpected_http:[],failed_requests:[],per_card_reads:0,api_intercepts:0},save=()=>fs.writeFileSync(path.join(folder,'results.json'),JSON.stringify(report,null,2));
let browser,page,signedIn=false;
async function run(){
 browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1366,height:900}});
 page.on('pageerror',e=>report.page_errors.push(e.message));page.on('response',r=>{if(r.status()>=500||r.status()===429)report.unexpected_http.push({path:new URL(r.url()).pathname,status:r.status()});});page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')report.failed_requests.push({path:new URL(r.url()).pathname,error:r.failure()?.errorText});});page.on('request',r=>{if(r.method()==='GET'&&/\/api\/v1\/products\/[a-f0-9-]{36}$/.test(new URL(r.url()).pathname))report.per_card_reads++;});
 await page.goto(base+'/login');await page.getByRole('button',{name:/Khách hàng A/}).click();signedIn=true;await page.waitForURL(base+'/');await new Promise(r=>setTimeout(r,12000));
 for(const [id,title]of [['d01b0f73-9130-4d8e-ba65-631ff9c6cd6a','Đơn giản để mặc mỗi ngày'],['3400e0a9-fc99-452c-bd4b-80dc472c025d','Không gian gọn, ngày nhẹ nhàng']]){
  await page.goto(base+'/stores/'+id);await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible({timeout:20000});
  for(const width of [1366,390,320]){
   await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));
   await expect(page.locator('.storefront-banner>img')).toHaveJSProperty('complete',true);assert(await page.locator('.storefront-banner>img').evaluate(el=>el.naturalWidth>0));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:path.join(folder,id+'-'+width+'.png'),fullPage:false});
   report.checks.push({name:'DEMO_LAYOUT',store_id:id,width,result:'PASS'});save();
  }
  await page.setViewportSize({width:1366,height:900});await page.getByRole('link',{name:/TỪ GIAN HÀNG/}).click();
  await expect.poll(()=>page.locator('#store-products').evaluate(el=>Math.abs(el.getBoundingClientRect().top)),{timeout:5000}).toBeLessThan(180);
  report.checks.push({name:'BANNER_JUMPS_TO_ALL_PRODUCTS',store_id:id,result:'PASS'});save();
  await new Promise(r=>setTimeout(r,12000));
 }
 assert.equal(report.per_card_reads,0);assert.deepEqual(report.page_errors,[]);assert.deepEqual(report.unexpected_http,[]);assert.deepEqual(report.failed_requests,[]);
}
run().catch(async e=>{report.error=e.message;if(page&&!page.isClosed())await page.screenshot({path:path.join(folder,'failure.png'),fullPage:false}).catch(()=>{});process.exitCode=1;}).finally(async()=>{
 if(signedIn&&page&&!page.isClosed())try{await page.setViewportSize({width:1366,height:900});await page.getByRole('button',{name:'Menu tài khoản',exact:true}).click();const logout=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/auth/logout'&&r.request().method()==='POST');await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();assert.equal((await logout).status(),200);report.session_revoked=true;}catch{report.session_revoked=false;process.exitCode=1;}
 await browser?.close();save();console.log(JSON.stringify({checks:report.checks.length,error:report.error||null,session_revoked:report.session_revoked}));
});
