import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixture=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const a='65000000-0000-4000-8000-000000000001',b='65000000-0000-4000-8000-000000000002';
const auth=(user=a,token='token-A')=>({...fixture.login.response,access_token:token,context:{user_id:user,roles:user===a?['CUSTOMER','STORE_OWNER']:['CUSTOMER'],role_permissions:[],token_version:0,...(user===a?{store_membership:{store_id:'65000000-0000-4000-8000-000000000010',role:'OWNER',status:'ACTIVE',permissions:[]}}:{})}});
async function login(p:Page){await p.goto('/login');await p.getByLabel('Email',{exact:true}).fill('a@example.test');await p.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await p.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(p.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();}
async function probe(p:Page,path:string,options:any={}){return p.evaluate(async({path,options})=>{const modulePath=performance.getEntriesByType('resource').map(e=>e.name).find(u=>new URL(u).pathname==='/src/api/client.ts')!,client=await import(/* @vite-ignore */modulePath);try{return {data:await client.request(path,options)};}catch(e:any){return {code:e.code};}},{path,options});}

test('concurrent denials retain the fresh narrower context when an older context read is aborted',async({page:p})=>{
 const held:any[]=[];
 await p.route('**/api/v1/**',async r=>{const path=new URL(r.request().url()).pathname;
  if(path.endsWith('/auth/login'))return r.fulfill({json:auth(),headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path.endsWith('/store/inventory')||path.endsWith('/store/orders'))return r.fulfill({status:403,json:{code:'FORBIDDEN',message:'Store locked'}});
  if(path.endsWith('/me/context')){held.push(r);if(held.length===2)await held[0].fulfill({json:{user_id:a,roles:['CUSTOMER'],role_permissions:[],token_version:0}});return;}
  return r.fulfill({status:404,json:{code:'NOT_FOUND'}});
 });await login(p);
 const results=await p.evaluate(async()=>{const url=performance.getEntriesByType('resource').map(e=>e.name).find(u=>new URL(u).pathname==='/src/api/client.ts')!,c=await import(/* @vite-ignore */url);const codes=await Promise.all(['/store/inventory','/store/orders'].map(path=>c.request(path).then(()=> 'UNEXPECTED',(e:any)=>e.code)));return {codes,user:c.getAuthSession()?.context.user_id,roles:c.getAuthSession()?.context.roles};});
 expect(results).toEqual({codes:['SESSION_CHANGED','SESSION_CHANGED'],user:a,roles:['CUSTOMER']});await expect(p.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();await held[1].fulfill({json:auth().context}).catch(()=>{});
});
test('CR-016 changing principal on refresh never replays a mutation under the next user',async({page:p})=>{
 const posts:string[]=[];
 await p.route('**/api/v1/**',r=>{const q=r.request(),path=new URL(q.url()).pathname;
  if(path.endsWith('/auth/login'))return r.fulfill({json:auth(),headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path.endsWith('/auth/refresh'))return r.fulfill({json:auth(b,'token-B')});
  if(path.endsWith('/cart/items')&&q.method()==='POST'){posts.push(q.headers().authorization);return r.fulfill({status:401,json:{code:'EXPIRED',message:'Expired'}});}
  return r.fulfill({status:404,json:{code:'NOT_FOUND',message:'Not configured'}});
 });await login(p);
 const result=await probe(p,'/cart/items',{method:'POST',body:JSON.stringify({variant_id:'65000000-0000-4000-8000-000000000020',quantity:2})});
 expect(result.code).toBe('SESSION_CHANGED');expect(posts).toEqual(['Bearer token-A']);
 await expect(p.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();await expect(p.locator('main')).not.toContainText('STORE_OWNER');
 await p.getByRole('button',{name:'Menu tài khoản',exact:true}).click();await expect(p.getByRole('navigation',{name:'Menu tài khoản',exact:true}).getByRole('link',{name:'Store Portal',exact:true})).toHaveCount(0);
});
test('same-principal refresh retries the exact body/key and keeps an unsent form',async({page:p})=>{
 const posts:any[]=[];
 await p.route('**/api/v1/**',r=>{const q=r.request(),path=new URL(q.url()).pathname;
  if(path.endsWith('/auth/login'))return r.fulfill({json:auth(),headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path.endsWith('/auth/refresh'))return r.fulfill({json:auth(a,'token-A-refreshed')});
  if(path.endsWith('/orders/batches')){posts.push({body:q.postDataJSON(),key:q.headers()['idempotency-key'],token:q.headers().authorization});return posts.length===1?r.fulfill({status:401,json:{code:'EXPIRED',message:'Expired'}}):r.fulfill({json:{accepted:true}});}
  return r.fulfill({status:404,json:{code:'NOT_FOUND',message:'Not configured'}});
 });await login(p);const search=p.getByRole('searchbox',{name:'Tìm kiếm toàn sàn',exact:true});await search.fill('Công việc chưa gửi');
 const payload={quote_id:'65000000-0000-4000-8000-000000000030',expected_payable_total_vnd:120000};
 expect((await probe(p,'/orders/batches',{method:'POST',headers:{'idempotency-key':'unchanged-command'},body:JSON.stringify(payload)})).data).toEqual({accepted:true});
 expect(posts).toEqual([{body:payload,key:'unchanged-command',token:'Bearer token-A'},{body:payload,key:'unchanged-command',token:'Bearer token-A-refreshed'}]);await expect(search).toHaveValue('Công việc chưa gửi');
});
test('late private response cannot populate the next session',async({page:p})=>{
 let held=false;
 await p.route('**/api/v1/**',r=>{const q=r.request(),path=new URL(q.url()).pathname;
  if(path.endsWith('/auth/login'))return r.fulfill({json:q.postDataJSON().email.startsWith('b@')?auth(b,'token-B'):auth(),headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/api/v1/me'){held=true;return;}
  return r.fulfill({status:404,json:{code:'NOT_FOUND',message:'Not configured'}});
 });await login(p);
 await p.evaluate(()=>{const modulePath=performance.getEntriesByType('resource').map(e=>e.name).find(u=>new URL(u).pathname==='/src/api/client.ts')!;(window as any).latePrivate=import(/* @vite-ignore */modulePath).then(c=>c.request('/me')).then(data=>({data}),error=>({code:error.code}));});await expect.poll(()=>held).toBe(true);
 await p.evaluate(async()=>{const modulePath=performance.getEntriesByType('resource').map(e=>e.name).find(u=>new URL(u).pathname==='/src/api/client.ts')!;await(await import(/* @vite-ignore */modulePath)).api.login('b@example.test','Fixture-password-123');});
 expect(await p.evaluate(()=>(window as any).latePrivate)).toEqual({code:'SESSION_CHANGED'});await expect(p.locator('main')).not.toContainText('STORE_OWNER');
});
test('account changes in a second tab clear old private UI without sending tokens over the channel',async({page:p,context})=>{
 let current=auth();
 await context.route('**/api/v1/**',r=>{const q=r.request(),path=new URL(q.url()).pathname;
  if(path.endsWith('/auth/login')){current=q.postDataJSON().email.startsWith('b@')?auth(b,'token-B'):auth();return r.fulfill({json:current,headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});}
  if(path.endsWith('/auth/refresh'))return r.fulfill({json:current});
  if(path==='/api/v1/me')return r.fulfill({json:{user_id:current.context.user_id,email:current.context.user_id===a?'a@example.test':'b@example.test',display_name:current.context.user_id===a?'Tên tài khoản A':'Tên tài khoản B'}});
  return r.fulfill({status:404,json:{code:'NOT_FOUND',message:'Not configured'}});
 });await login(p);await p.getByRole('button',{name:'Menu tài khoản',exact:true}).click();await p.getByRole('navigation',{name:'Menu tài khoản',exact:true}).getByRole('link',{name:'Hồ sơ',exact:true}).click();await expect(p.locator('main')).toContainText('Tên tài khoản A');
 const second=await context.newPage();await second.goto('/login');await expect(second.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();
 const signals=await p.evaluate(()=>{(window as any).authSignals=[];const c=new BroadcastChannel('pbl6_auth_signal');c.onmessage=e=>(window as any).authSignals.push(e.data);(window as any).testChannel=c;return true;});expect(signals).toBe(true);
 await second.evaluate(async()=>{const modulePath=performance.getEntriesByType('resource').map(e=>e.name).find(u=>new URL(u).pathname==='/src/api/client.ts')!;await(await import(/* @vite-ignore */modulePath)).api.login('b@example.test','Fixture-password-123');});
 await expect(p.locator('main')).toContainText('Tên tài khoản B');await expect(p.locator('main')).not.toContainText('Tên tài khoản A');
 expect(await p.evaluate(()=>(window as any).authSignals.every((x:any)=>Object.keys(x).sort().join(',')==='kind,nonce'))).toBe(true);await second.close();
});
