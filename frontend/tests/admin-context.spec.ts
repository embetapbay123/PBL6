import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixture=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'54000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function model(page:Page,{failure=false,missingPayment=false,legacy=false}={}){
 const stores=[{id:id(10),name:'An Nhiên Hà Nội',status:'ACTIVE',shipping_fee_vnd:20000,version:1},{id:id(11),name:'An Nhiên Huế',status:'LOCKED',shipping_fee_vnd:20000,version:1}],users=[{id:id(20),email:'buyer-one@example.test',display_name:'Nguyễn Khách',status:'ACTIVE',version:0},{id:id(21),email:'buyer-two@example.test',display_name:'Nguyễn Khách',status:'LOCKED',version:2}],writes:any[]=[],reads:URL[]=[];
 const products=stores.map((s,n)=>({...fixture.getProduct.response,id:id(30+n),store_id:s.id,title:'Áo linen giống tên',version:3,status:'ACTIVE',moderation_status:'VISIBLE',variants:[{id:id(40+n),sku:'SAME-SKU',price_vnd:100000,variant_values:{size:n?'L':'M'},status:'ACTIVE'}]}));
 const returns=stores.map((s,n)=>({...fixture.createReturnRequest.response,id:id(50+n),order_id:id(60+n),type:'EXCHANGE',status:'REQUESTED',version:2,amount_vnd:120000,reason:'Đổi đúng kích thước',created_at:'2026-11-02T00:00:00Z',updated_at:'2026-11-02T00:01:00Z',admin_context:{store_id:s.id,customer_user_id:users[n].id,order_created_at:'2026-11-01T03:04:05Z',order_status:'COMPLETED',payment_status:'SUCCEEDED',collected_vnd:120000,refunded_vnd:0}}));
 for(const request of returns){if(legacy)delete (request as any).admin_context;else if(missingPayment){delete (request.admin_context as any).collected_vnd;delete (request.admin_context as any).refunded_vnd;delete (request.admin_context as any).payment_status;}}
 await page.route('**/api/v1/**',async route=>{const r=route.request(),u=new URL(r.url()),p=u.pathname.replace('/api/v1','');if(p==='/auth/login'||p==='/auth/refresh')return route.fulfill({json:{...fixture.login.response,context:{user_id:id(1),roles:['ADMIN'],role_permissions:['platform.admin'],token_version:0}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});if(p==='/admin/products')return route.fulfill({json:{items:products,total:2,page:1,size:20}});if(p==='/admin/stores'||p==='/admin/users'){reads.push(u);if(failure)return route.fulfill({status:503,json:{code:'IDENTITY_UNAVAILABLE',message:'Chưa đọc được danh tính'}});const ids=(u.searchParams.get('ids')??'').split(',');const all=p.endsWith('stores')?stores:users;const matched=all.filter(x=>ids.includes(x.id));return route.fulfill({json:{items:matched,total:matched.length,page:1,size:100}});}if(p==='/admin/returns')return route.fulfill({json:{items:returns,total:2,page:1,size:20}});if(p.startsWith('/admin/products/')&&r.method()==='POST'){writes.push({path:p,body:r.postDataJSON()});const product=products.find(x=>p.includes(x.id))!;product.moderation_status='HIDDEN';product.version++;return route.fulfill({json:product});}return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture route'}});});
 await page.setViewportSize({width:1440,height:950});await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('admin@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();return {stores,users,products,returns,reads,writes};
}
test('same title and SKU are distinguished by current Store identity before writing the chosen product',async({page})=>{const m=await model(page);await page.goto('/admin?tab=catalog&section=products');const chosen=page.locator('article').filter({hasText:'An Nhiên Huế'});await expect(chosen).toHaveCount(1);await expect(chosen).toContainText('Đã khóa');await expect(chosen.getByRole('link',{name:'An Nhiên Huế',exact:true})).toHaveAttribute('href','/admin?tab=stores&q='+id(11));await chosen.getByRole('button',{name:'Ẩn sản phẩm',exact:true}).click();await page.getByLabel('Lý do kiểm duyệt sản phẩm',{exact:true}).fill('Đối chiếu đúng Store Huế');await page.getByRole('dialog').getByRole('button',{name:'Ẩn sản phẩm',exact:true}).click();await expect.poll(()=>m.writes.length).toBe(1);expect(m.writes[0]).toEqual({path:'/admin/products/'+id(31)+'/hide',body:{expected_version:3,reason:'Đối chiếu đúng Store Huế'}});expect(m.reads.filter(u=>u.pathname.endsWith('/stores'))).toHaveLength(1);});
test('equal-amount return requests show distinct Store/customer, original order time, money and a source link',async({page})=>{const m=await model(page);await page.goto('/admin?tab=returns');const table=page.getByRole('table',{name:'Bảng tóm tắt yêu cầu đổi trả hệ thống'});await expect(table.getByRole('row')).toHaveCount(3);await expect(table).toContainText('An Nhiên Hà Nội');await expect(table).toContainText('An Nhiên Huế');let card=page.locator('article');await expect(card).toHaveCount(1);await expect(card).toContainText('buyer-one@example.test');await expect(card).toContainText('An Nhiên Hà Nội');await expect(card).toContainText('Đã thu: 120.000');await expect(card.getByRole('link',{name:'Xem đơn nguồn để hỗ trợ',exact:true})).toHaveAttribute('href','/admin?tab=orders&q='+id(60));await expect(card.locator('time[datetime="2026-11-01T03:04:05Z"]')).toBeVisible();await table.getByRole('button',{name:'Xem hồ sơ'}).click();card=page.locator('article');await expect(card).toHaveCount(1);await expect(card).toContainText('buyer-two@example.test');await expect(card).toContainText('An Nhiên Huế');await expect(card).toContainText('Đã khóa');expect(m.reads.filter(u=>u.pathname.endsWith('/stores'))).toHaveLength(1);expect(m.reads.filter(u=>u.pathname.endsWith('/users'))).toHaveLength(1);});
test('failed identity read cannot present a guessed Store or enable a moderation decision',async({page})=>{const m=await model(page,{failure:true});await page.goto('/admin?tab=catalog&section=products');await expect(page.getByRole('alert')).toContainText('Chưa đọc được danh tính',{timeout:15000});await expect(page.getByRole('button',{name:'Ẩn sản phẩm',exact:true}).first()).toBeDisabled();expect(m.writes).toEqual([]);});
test('missing reconciled payment is unknown, never a fabricated zero or collection',async({page})=>{await model(page,{missingPayment:true});await page.goto('/admin?tab=returns');const context=page.getByRole('region',{name:'Ngữ cảnh đơn nguồn của yêu cầu',exact:true}).first();await expect(context).toContainText('Đã thu: Chưa có dữ liệu đối chiếu');await expect(context).toContainText('Đã hoàn: Chưa có dữ liệu đối chiếu');await expect(context).not.toContainText('Đã thu: 0');});
test('legacy context absence exposes source links and never enables a blind Admin decision',async({page})=>{const m=await model(page,{legacy:true});await page.goto('/admin?tab=returns');await expect(page.getByRole('region',{name:'Ngữ cảnh đơn nguồn của yêu cầu',exact:true}).first()).toContainText('chưa có đủ ngữ cảnh Store/khách');await expect(page.locator('article').getByRole('link',{name:'Xem đơn nguồn để hỗ trợ',exact:true})).toHaveCount(1);await expect(page.getByRole('button',{name:'Lưu quyết định',exact:true})).toHaveCount(0);expect(m.reads).toEqual([]);});
test('Admin return search matches store name and order hash, clear button resets input and results',async({page})=>{
  await model(page);
  await page.goto('/admin?tab=returns');
  const searchInput=page.getByPlaceholder('Tìm theo mã yêu cầu, mã đơn hàng, gian hàng...');
  const table=page.getByRole('table',{name:'Bảng tóm tắt yêu cầu đổi trả hệ thống'});
  await expect(table.getByRole('row')).toHaveCount(3);

  // Search by store name
  await searchInput.fill('An Nhiên Huế');
  await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();
  await expect(table.getByRole('row')).toHaveCount(2);
  await expect(table).toContainText('An Nhiên Huế');
  await expect(table).not.toContainText('An Nhiên Hà Nội');

  // Clear search button empties search input and restores full table
  const clearBtn=page.getByRole('button',{name:'Xóa tìm kiếm',exact:true});
  await expect(clearBtn).toBeVisible();
  await clearBtn.click();
  await expect(searchInput).toHaveValue('');
  await expect(table.getByRole('row')).toHaveCount(3);

  // Search with '#' prefix on order hash
  const orderCode='#'+id(60).slice(-8).toUpperCase();
  await searchInput.fill(orderCode);
  await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();
  await expect(table.getByRole('row')).toHaveCount(2);
  await expect(table).toContainText('An Nhiên Hà Nội');
});
test('Admin changing filter synchronizes table active row and detail card',async({page})=>{
  await model(page);
  await page.goto('/admin?tab=returns');
  const table=page.getByRole('table',{name:'Bảng tóm tắt yêu cầu đổi trả hệ thống'});

  // Initial selection is first row
  await expect(table.getByRole('button',{name:'Đang xem'})).toHaveCount(1);
  const card=page.locator('article');
  await expect(card).toContainText('An Nhiên Hà Nội');

  // Click second row to view profile
  await table.getByRole('button',{name:'Xem hồ sơ'}).click();
  await expect(table.getByRole('button',{name:'Đang xem'})).toHaveCount(1);
  await expect(card).toContainText('An Nhiên Huế');

  // Change status tab to 'Chờ duyệt'
  await page.getByRole('button',{name:'Chờ duyệt',exact:true}).click();
  // Form and active row are in sync
  await expect(table.getByRole('button',{name:'Đang xem'})).toHaveCount(1);
  await expect(card).toContainText('An Nhiên Hà Nội');
});
