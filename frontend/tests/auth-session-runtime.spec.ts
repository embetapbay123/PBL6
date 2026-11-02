import {test,expect,type Page} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
test.skip(process.env.CORE_FIX_SESSION!=='1','Actual cookie/session/DB test on private pbl6-fe-verify only.');
async function clientModule(page:Page){return page.evaluate(()=>performance.getEntriesByType('resource').map(row=>row.name).find(url=>new URL(url).pathname==='/src/api/client.ts')!);}
test('two real tabs refresh the same cookie family without revoking each other or losing private UI',async({page,context},info)=>{
 test.setTimeout(120000);page.setDefaultTimeout(15000);
 expect(execFileSync('docker',['inspect','--format','{{index .Config.Labels "com.docker.compose.project"}}','pbl6-fe-verify-m3-1'],{encoding:'utf8'}).trim()).toBe('pbl6-fe-verify');
 const tag='coresession-'+Date.now(),email=tag+'@pbl6.test',password='Cf-'+randomBytes(18).toString('hex'),base='http://127.0.0.1:18080/api/v1';
 async function api(path:string,body:any){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const value=await r.json();if(!r.ok)throw new Error(path+': '+r.status+' '+value.code);return value;}
 await api('/auth/register',{email,password,display_name:tag});
 const capture=`const fs=require('fs');for(const name of fs.readdirSync('/tmp/pbl6-core-fix-email')){if(!/^[a-f0-9-]+\\.json$/.test(name))continue;const row=JSON.parse(fs.readFileSync('/tmp/pbl6-core-fix-email/'+name,'utf8'));if(row.email===process.argv[1]&&row.kind==='VERIFICATION'){process.stdout.write(new URL(row.link).searchParams.get('token'));break;}}`;
 const verification=execFileSync('docker',['exec','pbl6-fe-verify-m3-1','node','-e',capture,email],{encoding:'utf8'});expect(!!verification).toBe(true);await api('/auth/verify-email',{token:verification});
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();await page.getByRole('button',{name:'Menu tài khoản',exact:true}).click();await page.getByRole('navigation',{name:'Menu tài khoản',exact:true}).getByRole('link',{name:'Hồ sơ',exact:true}).click();await expect(page.locator('main')).toContainText(tag);
 const second=await context.newPage();second.setDefaultTimeout(15000);await second.goto(page.url());await expect(second.locator('main')).toContainText(tag);
 const moduleA=await clientModule(page),moduleB=await clientModule(second),family=await page.evaluate(async url=>{const c=await import(/* @vite-ignore */url),token=c.getAuthSession().access_token;return JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sid;},moduleA);
 let first=true,inFlight=0,maxFlight=0,seenSecond=false,enter!:()=>void,release!:()=>void,allow!:()=>void,commit!:()=>void;const entered=new Promise<void>(resolve=>enter=resolve),held=new Promise<void>(resolve=>release=resolve),allowed=new Promise<void>(resolve=>allow=resolve),committed=new Promise<void>(resolve=>commit=resolve),statuses:number[]=[];
 await context.route('**/api/v1/auth/refresh',async route=>{
  const isFirst=first;first=false;inFlight++;maxFlight=Math.max(maxFlight,inFlight);if(!isFirst)seenSecond=true;
  try{
   // Capture actual request cookies before either response changes the shared jar.
   const headers=await route.request().allHeaders();if(isFirst){enter();await allowed;}else await committed;
   const response=await route.fetch({headers});statuses.push(response.status());if(isFirst){commit();await held;}await route.fulfill({response});
  }finally{inFlight--;}
 });
 const start=async(p:Page,url:string)=>p.evaluate(async url=>{const c=await import(/* @vite-ignore */url);(window as any).refreshOutcome=c.api.restore().then((v:any)=>({user_id:v.context.user_id}), (e:any)=>({code:e.code}));return true;},url);
 try{
  await start(page,moduleA);await entered;await start(second,moduleB);
  // Wait for either the actual second HTTP request (old implementation), or a queued
  // native lock (fixed implementation). No arbitrary sleep or forged token/cookie.
  await expect.poll(async()=>seenSecond||await second.evaluate(async()=>{const locks=await navigator.locks?.query();return locks?.pending?.some(lock=>lock.name==='pbl6_auth_cookie')??false;})).toBe(true);
 }finally{allow();await committed;release();}
 const outcomes=await Promise.all([page.evaluate(()=>(window as any).refreshOutcome),second.evaluate(()=>(window as any).refreshOutcome)]);
 const proofCode=`const {Client}=require('pg');(async()=>{const c=new Client({connectionString:process.env.M3_DATABASE_URL});await c.connect();try{const r=await c.query('SELECT count(*) FILTER(WHERE revoked_at IS NULL)::int AS active,count(*) FILTER(WHERE revoked_at IS NOT NULL)::int AS revoked FROM refresh_session WHERE family_id=$1',[process.argv[1]]);process.stdout.write(JSON.stringify(r.rows[0]));}finally{await c.end();}})();`;
 const database=JSON.parse(execFileSync('docker',['exec','pbl6-fe-verify-m3-1','node','-e',proofCode,family],{encoding:'utf8'}));writeFileSync(info.outputPath('session-refresh-proof.json'),JSON.stringify({tag,statuses,max_concurrent_refresh:maxFlight,outcomes,database,evidence:'REAL_COOKIE_HTTP_DATABASE',injection:'Delay first real refresh ACK after commit; second tab explicitly restores the same shared cookie.',limitations:'Edge localhost only; no device/network-speed claim.'},null,2));
 expect(statuses).toEqual([200,200]);expect(maxFlight).toBe(1);expect(database.active).toBe(1);expect(outcomes[0].user_id).toEqual(expect.any(String));expect(outcomes[1]).toEqual(outcomes[0]);
 await page.reload();await expect(page.locator('main')).toContainText(tag);await second.reload();await expect(second.locator('main')).toContainText(tag);await second.close();
});
