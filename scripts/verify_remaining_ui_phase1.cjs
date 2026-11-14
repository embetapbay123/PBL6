/** Read-only public UI acceptance. Creates/revokes a demo login session; never edits saved customer data. */
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const {chromium,expect}=createRequire(path.resolve(__dirname,'../frontend/package.json'))('@playwright/test');
const base='https://demo.congnguyen.me',baseline=process.argv.includes('--baseline'),homeOnly=process.argv.includes('--home-only');
const folder=path.resolve(process.env.PBL6_EVIDENCE_ROOT||path.join(__dirname,'../outputs/bug-ui-phase1-2026-11-14'),baseline?'before':homeOnly?'after-home-recheck':'after');fs.mkdirSync(folder,{recursive:true});
const result={base,mode:baseline?'BASELINE':'AFTER',api_intercepts:0,business_data_mutations:0,checks:[],page_errors:[],http_errors:[],started_at:new Date().toISOString()};
const wait=ms=>new Promise(r=>setTimeout(r,ms));let browser,actor;
function observe(page){page.on('pageerror',e=>result.page_errors.push(e.message));page.on('response',r=>{if(r.url().includes('/api/v1/')&&(r.status()>=500||r.status()===429))result.http_errors.push({path:new URL(r.url()).pathname,status:r.status()});});}
async function check(name,fn){if(homeOnly&&name!=='Public discovery and sorting label')return;try{result.checks.push({name,status:'PASS',...await fn()});console.log(name+': PASS');}catch(e){result.checks.push({name,status:'FAIL',error:e.message.slice(0,400)});console.log(name+': FAIL');process.exitCode=1;}}
async function shot(page,name){await page.screenshot({path:path.join(folder,name+'.png'),fullPage:true});}
(async()=>{try{
 browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage();observe(page);
 await check('Public discovery and sorting label',async()=>{await page.goto(base+'/');await expect(page.locator('.market-product-grid .product-card').first()).toBeVisible();await expect(page.locator('.discovery-category-grid > a')).toHaveCount(5);
  if(!baseline){await expect(page.locator('.catalog-total')).toHaveCount(0);await expect(page.getByRole('option',{name:'Mặc định',exact:true})).toHaveAttribute('value','title');await expect(page.getByRole('navigation',{name:'Điều hướng chính',exact:true}).getByRole('link',{name:'Tin nhắn',exact:true})).toHaveCount(0);}
  await shot(page,'home-desktop');return {categories:5};});
 await wait(11000);
 await check('Filtered results retain count',async()=>{await page.goto(base+'/?q=áo');await expect(page.locator('.market-product-grid .product-card').first()).toBeVisible();if(!baseline)await expect(page.locator('.catalog-result-count')).toContainText('sản phẩm');await shot(page,'search-desktop');});
 await wait(11000);
 await check('Account navigation and readable addresses',async()=>{
  await page.goto(base+'/login');const [r]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/auth/demo-login')&&r.request().method()==='POST'),page.getByRole('button',{name:/^Khách hàng A/}).click()]);expect(r.status()).toBe(200);actor={token:(await r.json()).access_token,page};await page.waitForURL(u=>u.pathname!=='/login');await wait(3000);
  await page.goto(base+'/profile');await expect(page.getByRole('heading',{name:'Trung tâm tài khoản',exact:true})).toBeVisible();if(!baseline){await expect(page.locator('.account-additional-links')).toBeVisible();await page.locator('.account-additional-links > summary').click();await expect(page.locator('.account-additional-links').getByRole('link',{name:/Tin nhắn/})).toBeVisible();}
  await shot(page,'account-desktop');await wait(3000);await page.goto(base+'/customer/addresses');await expect(page.getByRole('heading',{name:'Địa chỉ của tôi',exact:true})).toBeVisible();await shot(page,'addresses-desktop');
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await shot(page,'addresses-mobile');
  if(!baseline){const more=page.locator('.account-sidebar-more');await more.locator('summary').click();await expect(more.getByRole('link',{name:'Đổi trả',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(more.locator('summary')).toBeFocused();}
  return {saved_customer_data_edited:false,mobile_width:390};
 });
 await wait(11000);
 await check('Customer orders and cart remain reachable',async()=>{await page.setViewportSize({width:1366,height:900});await page.goto(base+'/customer/orders');await expect(page.getByRole('heading',{name:'Lịch sử đơn hàng',exact:true})).toBeVisible();await shot(page,'orders-desktop');await wait(3000);await page.goto(base+'/cart');await expect(page.getByRole('heading',{name:'Giỏ hàng',exact:true})).toBeVisible();await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await shot(page,'cart-mobile');});
 // The browser closes after logout in finally.
}finally{
 // Logout while the authenticated page and its CSRF cookie still exist.
 if(actor?.page&&!actor.page.isClosed())try{const status=await actor.page.evaluate(async token=>{const csrf=document.cookie.split('; ').find(x=>x.startsWith('pbl6_csrf='))?.split('=')[1]||'';const r=await fetch('/api/v1/auth/logout',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'X-CSRF-Token':csrf},body:'{}'});return r.status;},actor.token);result.session_revoked=status<300;}catch{result.session_revoked=false;}
 await browser?.close();result.finished_at=new Date().toISOString();result.passed=result.checks.length===(homeOnly?1:4)&&result.checks.every(c=>c.status==='PASS')&&!result.page_errors.length&&!result.http_errors.length;fs.writeFileSync(path.join(folder,'results.json'),JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
}})().catch(e=>{console.error(e.message);process.exitCode=1;});
