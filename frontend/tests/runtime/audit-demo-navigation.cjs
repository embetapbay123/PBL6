const {chromium}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
const folder=path.resolve(__dirname,'../../../outputs/bug-acceptance-2026-11-14-navigation');fs.mkdirSync(folder,{recursive:true});
const base='https://demo.congnguyen.me',wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage();
 const data={base,api_intercepts:0,started_at:new Date().toISOString(),phases:[],responses:[],page_errors:[]};let phase='home-initial';
 page.on('pageerror',e=>data.page_errors.push(e.message));page.on('response',async r=>{if(!r.url().includes('/api/v1/'))return;const b=r.status()>=400?await r.json().catch(()=>({})):{};data.responses.push({phase,status:r.status(),path:new URL(r.url()).pathname,code:b.code,retry_after:r.headers()['retry-after']});});
 await page.goto(base+'/');await wait(6000);await page.screenshot({path:folder+'/home-initial.png',fullPage:true});data.phases.push({name:phase,requests:data.responses.length,rate_limited:data.responses.filter(r=>r.status===429).length});
 const link=await page.locator('a[href^="/stores/"]').first().getAttribute('href').catch(()=>null);
 if(link){phase='store';await page.goto(base+link);await wait(4000);data.phases.push({name:phase,requests:data.responses.filter(r=>r.phase===phase).length,rate_limited:data.responses.filter(r=>r.phase===phase&&r.status===429).length});
  phase='return-home';await page.goto(base+'/');await wait(5000);await page.screenshot({path:folder+'/home-after-store.png',fullPage:true});data.phases.push({name:phase,requests:data.responses.filter(r=>r.phase===phase).length,rate_limited:data.responses.filter(r=>r.phase===phase&&r.status===429).length});}
 data.finished_at=new Date().toISOString();data.conclusion=data.responses.some(r=>r.status===429)?'RATE_LIMIT_REPRODUCED':'NO_RATE_LIMIT_IN_THIS_RUN';fs.writeFileSync(folder+'/results.json',JSON.stringify(data,null,2));console.log(JSON.stringify({phases:data.phases,conclusion:data.conclusion,page_errors:data.page_errors}));await browser.close();
})().catch(e=>{console.error(e.message);process.exitCode=1});
