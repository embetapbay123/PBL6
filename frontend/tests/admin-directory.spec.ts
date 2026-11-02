import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'7a000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function model(page:Page,{conflict=false,lostAck=false,readbackFails=false,missingVersion=false,noPermission=false}={}){
 const users=Array.from({length:31},(_,n)=>({id:id(n+1),email:'account'+n+'@example.test',display_name:'Nguyễn Ánh Đỏ '+n,status:'ACTIVE',...(missingVersion?{}:{version:2})}));
 const stores=users.map((user,n)=>({id:id(n+101),name:'Store Đỏ '+n,status:'ACTIVE',version:3,shipping_fee_vnd:20000,...(n<30?{owner_user_id:user.id,owner_email:user.email,owner_display_name:user.display_name}:{})}));
 const writes:any[]=[],reads:string[]=[],pending:any[]=[];const state={holdPage:0};let failed=false,written=false;
 await page.route('**/api/v1/**',async route=>{const req=route.request(),url=new URL(req.url()),path=url.pathname.replace('/api/v1','');
  if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:{...f.login.response,context:{user_id:id(99),roles:['ADMIN'],role_permissions:noPermission?[]:['platform.admin'],token_version:0}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/admin/users'||path==='/admin/stores'){
   reads.push(path+url.search);if(readbackFails&&written)return route.fulfill({status:503,json:{code:'READ_FAILED',message:'Đọc lại thất bại'}});
   const q=url.searchParams.get('q')??'',status=url.searchParams.get('status'),p=Number(url.searchParams.get('page')??1),size=Number(url.searchParams.get('size')??20),all=path.endsWith('users')?users:stores;
   const filtered=all.filter(entry=>(!q||JSON.stringify(entry).includes(q))&&(!status||entry.status===status));const data={items:filtered.slice((p-1)*size,p*size),total:filtered.length,page:p,size};if(state.holdPage===p){pending.push({route,data});return;}return route.fulfill({json:data});
  }
  if(req.method()==='PATCH'&&/^\/admin\/(users|stores)\//.test(path)){
   const body=req.postDataJSON(),all=path.includes('/users/')?users:stores,entry=all.find(row=>path.endsWith(row.id))!;writes.push({path,body});written=true;
   if(conflict&&!failed){failed=true;entry.version=8;return route.fulfill({status:409,json:{code:'VERSION_CONFLICT',message:'Đối tượng đã được người khác cập nhật'}});}
   Object.assign(entry,{status:body.status,version:(entry.version??0)+1});if(lostAck)return route.fulfill({status:503,json:{code:'LOST_ACK',message:'Chưa rõ kết quả cập nhật'}});return route.fulfill({json:entry});
  }
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture chưa cấu hình'}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();return {users,stores,writes,reads,state,pending,release:async()=>{for(const item of pending)await item.route.fulfill({json:item.data}).catch(()=>{});}};
}
test('Admin identifies an account outside the first page, checks effect, cancels, then confirms once',async({page},info)=>{
 const m=await model(page);await page.goto('/admin?tab=users');await page.getByRole('searchbox',{name:'Tìm tài khoản theo tên, email hoặc ID',exact:true}).fill('account30@example.test');await page.getByRole('button',{name:'Tìm tài khoản',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(1);await page.getByRole('button',{name:'Khóa tài khoản',exact:true}).click();let dialog=page.getByRole('dialog');await expect(dialog).toContainText(m.users[30].id);await expect(dialog).toContainText('không tự khóa Store');await expect(dialog.getByRole('button',{name:'Xác nhận khóa',exact:true})).toBeDisabled();await dialog.getByRole('button',{name:'Hủy',exact:true}).click();expect(m.writes).toEqual([]);
 await page.getByRole('button',{name:'Khóa tài khoản',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByRole('textbox',{name:'Lý do quyết định',exact:true}).fill('Đã xác minh phản ánh đúng tài khoản này');
 for(const width of (process.env.CORE_FIX_DESKTOP_ONLY==='1'?[1440,1024,768]:[1440,1024,768,390])){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('account-decision-'+width+'.png'),fullPage:true});}
 await dialog.getByRole('button',{name:'Xác nhận khóa',exact:true}).dblclick();await expect(page.getByRole('dialog')).toHaveCount(0);expect(m.writes).toHaveLength(1);expect(m.writes[0]).toMatchObject({path:'/admin/users/'+m.users[30].id,body:{expected_version:2,status:'LOCKED'}});await expect(page.locator('tbody')).toContainText('Đã khóa');
});
test('Store dialog identifies Owner and preserves the distinction between Store and account lock',async({page})=>{
 const m=await model(page);await page.goto('/admin?tab=stores&q=account29@example.test');await expect(page.locator('tbody')).toContainText(m.stores[29].owner_user_id!);await page.getByRole('button',{name:'Khóa Store',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toContainText('không khóa tài khoản Owner');await expect(dialog).toContainText(m.stores[29].id);await dialog.getByLabel('Lý do quyết định').fill('Store cần tạm dừng để xác minh');await dialog.getByRole('button',{name:'Xác nhận khóa',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);expect(m.writes[0]).toMatchObject({path:'/admin/stores/'+m.stores[29].id,body:{expected_version:3,status:'LOCKED'}});
});
test('409 preserves reason and requires readback of the exact ID before version8 can be confirmed',async({page})=>{
 const m=await model(page,{conflict:true});await page.goto('/admin?tab=users&q=account30@example.test');await page.getByRole('button',{name:'Khóa tài khoản',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('Lý do quyết định').fill('Lý do cần giữ sau xung đột');await dialog.getByRole('button',{name:'Xác nhận khóa',exact:true}).click();await expect(dialog.getByRole('button',{name:'Đọc lại đối tượng',exact:true})).toBeVisible();await expect(dialog.getByLabel('Lý do quyết định')).toHaveValue('Lý do cần giữ sau xung đột');await dialog.getByRole('button',{name:'Đọc lại đối tượng',exact:true}).click();await expect(dialog).toContainText('phiên bản 8');expect(m.writes).toHaveLength(1);expect(m.reads.some(path=>new URL('http://fixture'+path).searchParams.get('q')===m.users[30].id)).toBe(true);await dialog.getByRole('button',{name:'Xác nhận khóa',exact:true}).click();expect(m.writes[1].body.expected_version).toBe(8);
});
test('503 after commit reconciles state and never issues another PATCH',async({page})=>{
 const m=await model(page,{lostAck:true});await page.goto('/admin?tab=users&q=account30@example.test');await page.getByRole('button',{name:'Khóa tài khoản',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('Lý do quyết định').fill('Quyết định cần đối chiếu sau mất phản hồi');await dialog.getByRole('button',{name:'Xác nhận khóa',exact:true}).click();await dialog.getByRole('button',{name:'Đọc lại đối tượng',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByText(/Đã đối chiếu:/)).toBeVisible();expect(m.writes).toHaveLength(1);
});
test('GET failure after an acknowledged decision stays a list error without reopening or replaying the mutation',async({page})=>{
 const m=await model(page,{readbackFails:true});await page.goto('/admin?tab=stores&q=Store%20Đỏ%2030');await page.getByRole('button',{name:'Khóa Store',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toContainText('Chưa có nhãn Owner');await dialog.getByLabel('Lý do quyết định').fill('Dừng bán để xác minh');await dialog.getByRole('button',{name:'Xác nhận khóa',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('alert')).toContainText('Đọc lại thất bại');expect(m.writes).toHaveLength(1);
});
test('server query/status/page context survives reload and Back/Forward',async({page})=>{
 const m=await model(page);await page.goto('/admin?tab=users');await page.getByRole('button',{name:'Trang sau',exact:true}).click();await expect(page).toHaveURL(/page=2/);await expect(page.locator('tbody')).toContainText('account30@example.test');await page.getByRole('searchbox',{name:'Tìm tài khoản theo tên, email hoặc ID',exact:true}).fill('account30@example.test');await page.getByRole('button',{name:'Tìm tài khoản',exact:true}).click();await expect(page).not.toHaveURL(/page=2/);await page.reload();await expect(page.getByRole('searchbox',{name:'Tìm tài khoản theo tên, email hoặc ID',exact:true})).toHaveValue('account30@example.test');await page.goBack();await expect(page).toHaveURL(/page=2/);await page.goForward();await expect(page.getByRole('searchbox',{name:'Tìm tài khoản theo tên, email hoặc ID',exact:true})).toHaveValue('account30@example.test');await page.getByLabel('Trạng thái tài khoản').selectOption('LOCKED');await expect.poll(()=>m.reads.some(path=>path.includes('status=LOCKED'))).toBe(true);await expect(page.getByText('Không có tài khoản phù hợp.',{exact:true})).toBeVisible();
});
test('missing version cannot be substituted with0',async({page})=>{
 await model(page,{missingVersion:true});await page.goto('/admin?tab=users&q=account30@example.test');await expect(page.getByRole('button',{name:'Khóa tài khoản',exact:true})).toBeDisabled();await expect(page.locator('tbody')).toContainText('Chưa có dữ liệu');
});
test('Admin without platform permission sends no directory request',async({page})=>{
 const m=await model(page,{noPermission:true});await page.goto('/admin?tab=users');await expect(page.getByRole('alert')).toContainText('chưa có quyền');expect(m.reads).toEqual([]);
});

for(const kind of ['users','stores'] as const){
 test('Admin '+kind+' directory reaches a newly added last page without a cached empty page redirect',async({page})=>{
  const m=await model(page),users=m.users.splice(20),stores=m.stores.splice(20);
  await page.goto('/admin?tab='+kind+'&page=2');await expect(page.locator('.boot-pagination')).toContainText('Trang 1 · 20 kết quả');
  m.users.push(users[0]);m.stores.push(stores[0]);
  await page.getByRole('banner').getByRole('link',{name:'Trang chủ PBL6',exact:true}).click();await page.goBack();
  await expect(page.locator('.boot-pagination')).toContainText('Trang 1 · 21 kết quả');
  m.state.holdPage=2;await page.getByRole('button',{name:'Trang sau',exact:true}).click();await expect.poll(()=>m.pending.length).toBe(1);await expect(page).toHaveURL(/page=2/);await m.release();
  await expect(page.locator('.boot-pagination')).toContainText('Trang 2 · 21 kết quả');await expect(page.locator('tbody tr')).toHaveCount(1);
 });
}
