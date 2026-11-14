const {chromium,expect}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path');
const f=require('./demo-acceptance.cjs');
const source=JSON.parse(fs.readFileSync(path.join(f.root,'outputs/bug-acceptance-2026-11-14-checkout/results.json'),'utf8'));
const outputName=process.env.DEMO_NAVIGATION_OUTPUT||'bug-acceptance-2026-11-14-navigation-authenticated';
if(!/^bug-acceptance-2026-11-14-[a-z-]+$/.test(outputName))throw Error('Invalid navigation output folder');
const user=source.fixture_ids.users[0],email=source.tag+'.0@pbl6.test',folder=path.join(f.root,'outputs',outputName);fs.mkdirSync(folder,{recursive:true});
const base='https://demo.congnguyen.me',wait=ms=>new Promise(r=>setTimeout(r,ms));let browser;
(async()=>{try{
 f.remote('m3',`const {Client}=require('pg'),bcrypt=require('bcryptjs');(async()=>{if(!/^acceptbug-[0-9]+\\.0@pbl6\\.test$/.test(x.email))throw Error('Private identity guard');const c=new Client({connectionString:process.env.M3_DATABASE_URL});await c.connect();try{const h=await bcrypt.hash(x.password,10);const r=await c.query('UPDATE "user" SET status=$1,password_hash=$2,version=version+1 WHERE id=$3 AND email=$4 RETURNING id',['ACTIVE',h,x.user,x.email]);if(r.rowCount!==1)throw Error('Private identity missing');console.log(JSON.stringify({private_actor_ready:true}));}finally{await c.end()}})().catch(e=>{console.error(e.message);process.exitCode=1});`,{user,email,password:f.password});
 browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage();
 const data={base,user_id:user,api_intercepts:0,started_at:new Date().toISOString(),phases:[],responses:[],page_errors:[]};let phase='login';
 page.on('pageerror',e=>data.page_errors.push(e.message));page.on('response',async r=>{if(!r.url().includes('/api/v1/'))return;const b=r.status()>=400?await r.json().catch(()=>({})):{};data.responses.push({phase,status:r.status(),path:new URL(r.url()).pathname,code:b.code,retry_after:r.headers()['retry-after']});});
 await page.goto(base+'/login');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill(f.password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();
 phase='home-initial';await page.goto(base+'/');await wait(7000);await page.screenshot({path:folder+'/home-initial.png'});data.phases.push({name:phase,requests:data.responses.filter(r=>r.phase===phase).length,rate_limited:data.responses.filter(r=>r.phase===phase&&r.status===429).length});
 const link=page.locator('a[href^="/stores/"]').first();if(await link.count()){
  phase='store';await link.click();await wait(5000);data.phases.push({name:phase,requests:data.responses.filter(r=>r.phase===phase).length,rate_limited:data.responses.filter(r=>r.phase===phase&&r.status===429).length});
  phase='return-home';await page.locator('a[href="/"]').first().click();await wait(6000);await page.screenshot({path:folder+'/home-after-store.png'});data.phases.push({name:phase,requests:data.responses.filter(r=>r.phase===phase).length,rate_limited:data.responses.filter(r=>r.phase===phase&&r.status===429).length});
 }
 data.finished_at=new Date().toISOString();data.conclusion=data.responses.some(r=>r.status===429)?'RATE_LIMIT_REPRODUCED':'NO_RATE_LIMIT_IN_THIS_RUN';data.product_detail_requests=data.responses.filter(r=>/^\/api\/v1\/products\/[^/]+$/.test(r.path)).length;fs.writeFileSync(folder+'/results.json',JSON.stringify(data,null,2));console.log(JSON.stringify({phases:data.phases,conclusion:data.conclusion,product_detail_requests:data.product_detail_requests,page_errors:data.page_errors}));
 if(process.env.DEMO_NAVIGATION_EXPECT_PASS==='1'&&(data.conclusion!=='NO_RATE_LIMIT_IN_THIS_RUN'||data.page_errors.length))process.exitCode=1;
}finally{
 await browser?.close();f.sql('m3','UPDATE refresh_session SET revoked_at=coalesce(revoked_at,now()) WHERE user_id=$1',[user]);f.sql('m3','UPDATE "user" SET status=$1,version=version+1 WHERE id=$2 AND email=$3',['LOCKED',user,email]);f.dispose();
}})().catch(e=>{console.error(e.message);process.exitCode=1});
