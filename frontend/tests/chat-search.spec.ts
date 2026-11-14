import {test,expect,type Page,type Route} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'b1030000-0000-4000-8000-'+String(n).padStart(12,'0'),user=id(1);
async function model(page:Page){
 const state={requests:[] as {path:string;q:string|null;page:number}[],held:undefined as Route|undefined,fail:false,deletes:[] as string[],errors:[] as string[],sends:0,
  sessions:Array.from({length:25},(_,n)=>({id:id(100+n),created_at:'2026-11-14T00:00:00Z',title:n===24?'Đổi cỡ áo sơ mi':'Nội dung AI '+n})),
  threads:Array.from({length:25},(_,n)=>({id:id(200+n),store_id:id(300+n),store_name:n===24?'Giày Đỏ':'Gian hàng '+n,customer_name:'Khách',last_message:n===24?'Đổi cỡ áo sơ mi':'Tin nhắn '+n,updated_at:'2026-11-14T00:00:00Z'}))};
 const paged=(items:any[],p=1,size=20)=>({items:items.slice((p-1)*size,p*size),total:items.length,page:p,size});
 await page.context().addCookies([{name:'pbl6_csrf',value:'fixture',url:process.env.WEB_TEST_URL!}]);
 await page.route('**/api/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace('/api/v1',''),q=url.searchParams.get('q'),p=Number(url.searchParams.get('page')??1);
  if(path.startsWith('/auth/'))return route.fulfill({json:{...f.login.response,context:{user_id:user,roles:['CUSTOMER'],role_permissions:[],token_version:0}}});
  if(path==='/me')return route.fulfill({json:{...f.getProfile.response,user_id:user}});
  if(path==='/me/conversations'||path==='/me/chat/sessions'&&req.method()==='GET'){
   state.requests.push({path,q,page:p});if(q==='old'){state.held=route;return;}
   if(state.fail)return route.fulfill({status:503,json:{code:'READ_FAILED',message:'Chưa tìm được lịch sử. Hãy thử lại.',details:[]}});
   if(path==='/me/chat/sessions'&&url.searchParams.has('session_id'))return route.fulfill({json:{items:state.sessions.filter(s=>s.id===url.searchParams.get('session_id')).map(s=>({...s,messages:{...paged([{id:id(500),role:'USER',content:s.title}]),total:1}})),total:1,page:1,size:20}});
   const items=path==='/me/conversations'?state.threads:state.sessions;
   return route.fulfill({json:paged(q?(q==='none'?[]:items.filter(item=>('title' in item?item.title.includes('Đổi'):item.last_message.includes('Đổi')))):items,p)});
  }
  if(path.startsWith('/me/chat/sessions/')&&req.method()==='DELETE'){state.deletes.push(path);state.sessions=state.sessions.filter(s=>!path.endsWith(s.id));return route.fulfill({json:{deleted_count:1}});}
  if(path==='/me/chat/sessions'&&req.method()==='DELETE'){state.deletes.push(path);state.sessions=[];return route.fulfill({json:{deleted_count:25}});}
  if(req.method()==='POST'&&path.startsWith('/chat/'))state.sends++;
  return route.fulfill({json:paged([])});
 });page.on('pageerror',e=>state.errors.push(e.message));return state;
}
test('Customer search is sent to server from page2, resets pagination, survives reload and leaves empty filter editable',async({page})=>{
 const s=await model(page);await page.goto('/customer/messages?page=2');const sidebar=page.getByRole('complementary',{name:'Danh sách hội thoại'});await expect(sidebar.getByRole('link',{name:/Giày Đỏ/})).toBeVisible();
 await sidebar.getByLabel('Tìm hội thoại',{exact:true}).fill('đổi cỡ áo');await expect.poll(()=>s.requests.filter(r=>r.path==='/me/conversations').at(-1)).toEqual({path:'/me/conversations',q:'đổi cỡ áo',page:1});await expect(sidebar.getByRole('link')).toHaveCount(1);expect(new URL(page.url()).searchParams.get('page')).toBe(null);await expect(page.getByRole('searchbox',{name:'Tìm kiếm toàn sàn',exact:true})).toHaveValue('');
 await page.reload();await expect(page.locator('main').getByLabel('Tìm hội thoại',{exact:true})).toHaveValue('đổi cỡ áo');await expect(sidebar.getByRole('link')).toHaveCount(1);
 await sidebar.getByLabel('Tìm hội thoại',{exact:true}).fill('none');await expect(sidebar).toContainText('Không tìm thấy hội thoại phù hợp.');await expect(sidebar.getByLabel('Tìm hội thoại',{exact:true})).toBeEditable();await sidebar.getByRole('button',{name:'Xóa lọc',exact:true}).click();await expect(sidebar.getByRole('link')).toHaveCount(20);expect(s.sends).toBe(0);expect(s.errors).toEqual([]);
});
test('a late conversation response cannot replace the latest search and failures can retry',async({page})=>{
 const s=await model(page);await page.goto('/customer/messages');const input=page.locator('main').getByLabel('Tìm hội thoại',{exact:true});await input.fill('old');await expect.poll(()=>Boolean(s.held)).toBe(true);await input.fill('new');const sidebar=page.getByRole('complementary',{name:'Danh sách hội thoại'});await expect(sidebar.getByRole('link')).toHaveCount(1);await s.held!.fulfill({json:{items:[],total:0,page:1,size:20}}).catch(()=>{});await expect(sidebar.getByRole('link')).toHaveCount(1);
 s.fail=true;await input.fill('failure');await expect(sidebar.getByRole('alert')).toContainText('Chưa tìm được lịch sử');s.fail=false;await sidebar.getByRole('button',{name:'Thử lại',exact:true}).click();await expect(sidebar.getByRole('link')).toHaveCount(1);expect(s.errors).toEqual([]);
});
for(const width of [390,1366])test(`AI history searches stored titles, persists and deletes the selected result at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:900});const s=await model(page);await page.goto('/profile');await page.getByRole('button',{name:'Mở chat',exact:true}).first().click();const dialog=page.getByRole('dialog',{name:'Trung tâm chat',exact:true});await dialog.getByRole('tab',{name:'Trợ lý AI',exact:true}).click();if(width<768)await dialog.getByRole('button',{name:'Lịch sử chat AI',exact:true}).click();const history=dialog.getByRole('region',{name:'Lịch sử chat',exact:true});await expect(history.locator('.chat-session-row')).toHaveCount(20);
 await history.getByLabel('Tìm lịch sử AI',{exact:true}).fill('đổi cỡ áo');await expect.poll(()=>s.requests.filter(r=>r.path==='/me/chat/sessions').at(-1)?.q).toBe('đổi cỡ áo');await expect(history.locator('.chat-session-row')).toHaveCount(1);await expect(history.locator('.chat-session-row')).toContainText('Đổi cỡ áo sơ mi');if(width===1366){await page.reload();await page.getByRole('button',{name:'Mở chat',exact:true}).first().click();await dialog.getByRole('tab',{name:'Trợ lý AI',exact:true}).click();await expect(history.getByLabel('Tìm lịch sử AI',{exact:true})).toHaveValue('đổi cỡ áo');await expect(history.locator('.chat-session-row')).toHaveCount(1);}
 expect(await history.getByLabel('Tìm lịch sử AI',{exact:true}).evaluate(e=>e.getBoundingClientRect().width)).toBeGreaterThan(120);await page.screenshot({path:info.outputPath('ai-history-search.png'),fullPage:true});await history.locator('.chat-session-row').click();await expect(dialog.getByRole('log')).toContainText('Đổi cỡ áo sơ mi');expect(s.requests.filter(r=>r.path==='/me/chat/sessions').at(-1)?.q).toBe(null);await page.screenshot({path:info.outputPath('ai-search.png'),fullPage:true});
 if(width<768)await dialog.getByRole('button',{name:'Lịch sử chat AI',exact:true}).click();page.once('dialog',d=>d.accept());await history.getByRole('button',{name:'Xóa phiên chat',exact:true}).click();await expect(history).toContainText('Không tìm thấy phiên phù hợp.');expect(s.deletes).toHaveLength(1);expect(s.sends).toBe(0);expect(s.errors).toEqual([]);
});
test('mobile history deletion errors stay visible and readback sends no second delete',async({page})=>{
 await page.setViewportSize({width:390,height:844});const s=await model(page);await page.goto('/profile');await page.getByRole('button',{name:'Mở chat',exact:true}).first().click();const dialog=page.getByRole('dialog',{name:'Trung tâm chat',exact:true});await dialog.getByRole('tab',{name:'Trợ lý AI',exact:true}).click();await dialog.getByRole('button',{name:'Lịch sử chat AI',exact:true}).click();const history=dialog.getByRole('region',{name:'Lịch sử chat',exact:true});await expect(history.locator('.chat-session-row')).toHaveCount(20);let deletes=0;
 await page.route('**/api/v1/me/chat/sessions/*',async route=>{if(route.request().method()!=='DELETE')return route.fallback();deletes++;return route.fulfill({status:429,json:{code:'RATE_LIMITED',message:'Bạn gửi yêu cầu quá nhanh. Hãy thử lại sau 10 giây.',details:[]}});});
 page.once('dialog',d=>d.accept());await history.getByRole('button',{name:'Xóa phiên chat',exact:true}).first().click();await expect(history.getByRole('alert')).toContainText('10 giây');await expect(history.locator('.chat-session-row')).toHaveCount(20);await history.getByRole('button',{name:'Đọc lại lịch sử',exact:true}).click();await expect(history.locator('.chat-session-row')).toHaveCount(20);expect(deletes).toBe(1);expect(s.sends).toBe(0);expect(s.errors).toEqual([]);
});
