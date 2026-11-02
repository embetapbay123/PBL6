import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'79000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function setup(page:Page,{seller=false,actorsFail=false,listFail=false,admin=false}={}){
 const reads:string[]=[],lookups:any[]=[];
 const context={user_id:id(1),roles:admin?['ADMIN']:seller?['SELLER']:['CUSTOMER','STORE_OWNER'],role_permissions:admin?['platform.admin']:[],token_version:0,...(admin?{}:{store_membership:{store_id:id(2),role:seller?'SELLER':'OWNER',status:'ACTIVE',permissions:['inventory.store.read_adjust']}})};
 await page.route('**/api/v1/**',route=>{const req=route.request(),url=new URL(req.url()),path=url.pathname.replace('/api/v1','');
  if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:{...fixtures.login.response,context},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/me/context')return route.fulfill({json:context});
  if(path.endsWith('/audit/actors')){lookups.push(req.postDataJSON());return actorsFail?route.fulfill({status:503,json:{code:'LABELS_UNAVAILABLE',message:'Không đọc được nhãn tài khoản'}}):route.fulfill({json:{users:[{id:id(1),label:'Nguyễn Ánh Đỏ'}]}});}
  if(/^\/(store|admin)\/audit\//.test(path)){
   reads.push(path+url.search);if(listFail)return route.fulfill({status:503,json:{code:'AUDIT_UNAVAILABLE',message:'Không đọc được nhật ký'}});
   const source=path.endsWith('catalog')?'M1':path.endsWith('commerce')?'M2':'M3';
   const row={id:id(4),service:source,store_id:id(2),actor_kind:'ACCOUNT',actor_user_id:id(1),target_type:'Product',target_id:id(3),target_label:'Áo đỏ · size M',action:'UPDATE',request_id:'trace-store-audit',created_at:'2026-10-30T17:15:00Z',before:{variants:[{sku:'009264',price_vnd:100000,variant_values:{color:'Đỏ',size:'M'}}]},after:{variants:[{sku:'009264',price_vnd:100500,variant_values:{color:'Đỏ',size:'M'}}]}};
   return route.fulfill({json:{items:admin?[row,{...row,id:id(5),actor_user_id:id(99)},{...row,id:id(6),actor_user_id:undefined},{...row,id:id(7),actor_user_id:'00000000-0000-0000-0000-000000000000'}]:[row],page:1,size:20,total:admin?4:1}});
  }
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture chưa cấu hình'}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();return {reads,lookups};
}
test('Owner reads actionable variant changes, actor label and Vietnam time on desktop and mobile',async({page},info)=>{
 const m=await setup(page);await page.goto('/seller');await page.getByRole('link',{name:'Nhật ký Store',exact:true}).click();await expect(page.getByRole('heading',{name:'Nhật ký Store',exact:true})).toBeVisible();await expect(page.locator('tbody')).toContainText('Nguyễn Ánh Đỏ');await page.locator('tbody summary').click();await expect(page.locator('tbody')).toContainText('100000');await expect(page.locator('tbody')).toContainText('100500');await expect(page.locator('tbody')).toContainText('009264');await expect(page.locator('tbody time')).toContainText('31/10/2026');expect(m.lookups[0]).toEqual({user_ids:[id(1)]});
 for(const width of process.env.CORE_FIX_DESKTOP_ONLY==='1'?[1440]:[1440,1024,768,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(width===390){const cards=page.getByRole('list',{name:'Các sự kiện nhật ký Store',exact:true});await expect(cards).toBeVisible();await cards.locator('summary').click();await expect(cards).toContainText('100500');}await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:info.outputPath('store-audit-'+width+'.png'),fullPage:true});}
});
test('date, source and actor filters use server predicates and survive reload',async({page})=>{
 const m=await setup(page);await page.goto('/seller/audit');await page.getByLabel('Từ ngày (giờ Việt Nam)').fill('2026-10-31');await page.getByLabel('Đến hết ngày (giờ Việt Nam)').fill('2026-10-31');await page.getByRole('button',{name:'Áp dụng bộ lọc',exact:true}).click();await expect.poll(()=>m.reads.some(path=>{const u=new URL('http://fixture'+path);return u.searchParams.get('from')==='2026-10-31T00:00:00+07:00'&&u.searchParams.get('to')==='2026-11-01T00:00:00+07:00';})).toBe(true);
 await page.locator('tbody').getByRole('button',{name:'Xem nhật ký của người này',exact:true}).click();await expect(page).toHaveURL(/actor_user_id=/);await page.getByLabel('Khu vực nhật ký').selectOption('identity');await expect.poll(()=>m.reads.some(p=>p.startsWith('/store/audit/identity')&&p.includes('actor_user_id'))).toBe(true);await page.reload();await expect(page.getByLabel('Đến hết ngày (giờ Việt Nam)')).toHaveValue('2026-10-31');await page.getByRole('button',{name:'Bỏ bộ lọc',exact:true}).click();await expect(page).toHaveURL(/\/seller\/audit\?source=identity$/);
});
test('malformed date in a deep link cannot crash the log screen',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);await page.goto('/seller/audit?to=invalid');await expect(page.getByRole('heading',{name:'Nhật ký Store',exact:true})).toBeVisible();await expect(page.getByLabel('Đến hết ngày (giờ Việt Nam)')).toHaveValue('');expect(errors).toEqual([]);
});
test('Seller cannot see Owner log navigation or make log requests via a deep link',async({page})=>{
 const m=await setup(page,{seller:true});await page.goto('/seller');await expect(page.getByRole('link',{name:'Nhật ký Store',exact:true})).toHaveCount(0);await page.goto('/seller/audit');await expect(page.getByRole('table')).toHaveCount(0);expect(m.reads).toEqual([]);expect(m.lookups).toEqual([]);
});
test('failed log read is shown as an error rather than a truthful-looking empty history',async({page})=>{
 await setup(page,{listFail:true});await page.goto('/seller/audit');await expect(page.getByRole('alert')).toContainText('Không đọc được nhật ký');await expect(page.getByText('Không có nhật ký phù hợp trong phạm vi này.',{exact:true})).toHaveCount(0);
});
test('Admin distinguishes resolved, unresolved and System actors without inventing names',async({page})=>{
 const m=await setup(page,{admin:true});await page.goto('/admin?tab=audit');await expect(page.locator('tbody')).toContainText('Nguyễn Ánh Đỏ');await expect(page.locator('tbody')).toContainText('Chưa có nhãn tài khoản trong phạm vi này');await expect(page.locator('tbody')).toContainText('Chưa có thông tin người thực hiện');await expect(page.locator('tbody').getByText('Hệ thống',{exact:true})).toHaveCount(1);await expect.poll(()=>m.lookups[0]?.user_ids.length).toBe(2);expect(m.lookups[0].user_ids).toEqual([id(1),id(99)]);
});
test('actor lookup failure keeps account IDs and exposes retry instead of claiming System',async({page})=>{
 await setup(page,{actorsFail:true});await page.goto('/seller/audit');await expect(page.locator('tbody')).toContainText('Chưa đọc được nhãn tài khoản');await expect(page.locator('tbody')).toContainText(id(1));await expect(page.getByRole('alert')).toContainText('Không đọc được nhãn tài khoản');await expect(page.locator('tbody').getByText('Hệ thống',{exact:true})).toHaveCount(0);
});
test('Store distinguishes a missing historical actor from System and keeps destinations inside the Store workspace',async({page})=>{
 const m=await setup(page);const entries=[
  {id:id(11),target_type:'Product',target_id:id(12),target_label:'Áo kiểm lịch sử',action:'UPDATE',actor_kind:'UNKNOWN',before:{},after:{}},
  {id:id(13),target_type:'Order',target_id:id(14),target_label:'Đơn cần đối chiếu',action:'INVENTORY_CONSUMED',actor_kind:'SYSTEM',actor_user_id:'00000000-0000-0000-0000-000000000000',before:{state:'HELD'},after:{state:'CONSUMED'}},
  {id:id(15),target_type:'Inventory',target_id:id(16),target_label:'Áo Đỏ · mã khó đoán',action:'ADJUST',actor_kind:'ACCOUNT',actor_user_id:id(1),before:{variant_id:id(17),quantity:5},after:{variant_id:id(17),quantity:7}},
  {id:id(18),target_type:'Order',target_id:id(19),target_label:'Đơn do khách hủy',action:'CANCEL_ORDER',actor_kind:'ACCOUNT',actor_user_id:id(1),before:{status:'CONFIRMED'},after:{status:'CANCELLED',reason:'INVENTORY_CONSUMED'}},
 ].map(row=>({...row,service:'M1',store_id:id(2),created_at:'2026-11-02T00:00:00Z',request_id:'audit-fixture'}));
 await page.route('**/api/v1/store/audit/catalog*',route=>route.fulfill({json:{items:entries,page:1,size:20,total:4}}));await page.goto('/seller/audit');const table=page.locator('tbody');await expect(table.getByText('Chưa có thông tin người thao tác trong lịch sử',{exact:true})).toHaveCount(1);await expect(table.getByText('Hệ thống',{exact:true})).toHaveCount(1);await expect(table.locator('tr').filter({hasText:'Đơn do khách hủy'})).toContainText('Hủy đơn');await expect(table.getByRole('link',{name:'Tìm đơn trong Store',exact:true}).first()).toHaveAttribute('href','/seller/orders?q='+id(14));await expect(table.getByRole('link',{name:'Xem phân loại trong kho',exact:true})).toHaveAttribute('href','/seller/inventory?variant_id='+id(17));await table.getByRole('button',{name:'Chỉ xem hành động này',exact:true}).nth(2).click();await expect(page).toHaveURL(/action=ADJUST/);if(process.env.CORE_FIX_DESKTOP_ONLY!=='1'){await page.setViewportSize({width:390,height:900});const cards=page.getByRole('list',{name:'Các sự kiện nhật ký Store',exact:true});await expect(cards.getByText('Chưa có thông tin người thao tác trong lịch sử',{exact:true})).toBeVisible();await expect(cards.getByRole('link',{name:'Tìm đơn trong Store',exact:true}).first()).toBeVisible();}expect(m.lookups.every(q=>!q.user_ids.includes('00000000-0000-0000-0000-000000000000'))).toBe(true);
});
