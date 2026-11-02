import {expect,type Page} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';

/** Tagged fixture setup only. Credentials and captured action tokens stay in process memory. */
export function privateMarket(prefix:string){
 expect(execFileSync('docker',['inspect','--format','{{index .Config.Labels "com.docker.compose.project"}}','pbl6-fe-verify-m3-1'],{encoding:'utf8'}).trim()).toBe('pbl6-fe-verify');
 const tag=prefix+'-'+Date.now(),password='Cf-'+randomBytes(18).toString('hex'),base='http://127.0.0.1:18080/api/v1';
 const rateLimits={waits:0};
 async function raw(path:string,token?:string,method='GET',body?:any){const r=await fetch(base+path,{method,signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,value:await r.json(),retryAfter:Number(r.headers.get('Retry-After'))};}
 async function api(path:string,token?:string,method='GET',body?:any){
  // Fixture setup only: bootstrap rejects429 before handlers. Never replay UNKNOWN or other failures.
  const input=body===undefined?undefined:JSON.parse(JSON.stringify(body));
  for(let attempt=0;;attempt++){
   const r=await raw(path,token,method,input);
   if(r.status===429&&r.value.code==='RATE_LIMITED'&&Number.isFinite(r.retryAfter)&&r.retryAfter>0&&r.retryAfter<=60&&attempt<2){rateLimits.waits++;await new Promise(resolve=>setTimeout(resolve,(r.retryAfter+1)*1000));continue;}
   if(r.status>=400)throw new Error(method+' '+path+': '+r.status+' '+r.value.code);return r.value;
  }
 }
 async function actor(name:string){const email=tag+'.'+name+'@pbl6.test';await api('/auth/register',undefined,'POST',{email,password,display_name:tag+' '+name});const code=`const fs=require('fs');for(const name of fs.readdirSync('/tmp/pbl6-core-fix-email')){if(!/^[a-f0-9-]+\\.json$/.test(name))continue;const row=JSON.parse(fs.readFileSync('/tmp/pbl6-core-fix-email/'+name,'utf8'));if(row.email===process.argv[1]&&row.kind==='VERIFICATION'){process.stdout.write(new URL(row.link).searchParams.get('token'));break;}}`;
  const token=execFileSync('docker',['exec','pbl6-fe-verify-m3-1','node','-e',code,email],{encoding:'utf8'});expect(!!token).toBe(true);await api('/auth/verify-email',undefined,'POST',{token});const login=await api('/auth/login',undefined,'POST',{email,password,client_type:'MOBILE'});return {email,user:login.context.user_id,access:login.access_token};
 }
 async function login(page:Page,email:string){await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();}
 return {tag,password,api,raw,actor,login,rateLimits};
}
