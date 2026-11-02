import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'7b000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function model(page:Page,role:'CUSTOMER'|'SELLER'|'ADMIN'='CUSTOMER',{listError=false,missing=false,delayed=false}={}){
 const reads:string[]=[],details:string[]=[],pending:any[]=[];
 const state={listError,holdPage:0};
 const orders=Array.from({length:45},(_,n)=>({id:id(n+1),purchase_group_id:id(n+100),store_id:id(1000),status:n===44?'AWAITING_PAYMENT':'COMPLETED',version:3,refund_status:n===43?'UNKNOWN':n===0?'REQUESTED':undefined,payment_method:n===44?'SANDBOX':'COD',payment_status:n===44?'UNKNOWN':'SUCCEEDED',created_at:'2026-10-30T17:15:00Z',address_snapshot:{recipient_name:'Nguyễn Người Nhận',phone:'0912345678',line1:'123 đường kiểm thử',ward:'Phường A',district:'Quận B',city:'Huế'},amounts:{goods_vnd:200000,store_discount_vnd:0,platform_discount_vnd:0,shipping_vnd:20000,payable_vnd:220000},items:missing?[]:[{id:id(n+200),product_id:id(2000),variant_id:id(3000),sku_snapshot:n===44?'009264':'SKU-'+n,product_snapshot:n===44?{title:'Áo Đỏ snapshot cũ',variant_values:{color:'Đỏ',size:'M'}}:{title:'Món phổ thông '+n,variant_values:{size:'L'}},quantity:2,unit_price_vnd:100000,line_total_vnd:200000}]}));
 const context={user_id:id(4000),roles:role==='ADMIN'?['ADMIN']:role==='SELLER'?['CUSTOMER','SELLER']:['CUSTOMER'],role_permissions:role==='ADMIN'?['platform.admin']:[],token_version:0,...(role==='SELLER'?{store_membership:{store_id:id(1000),role:'SELLER',status:'ACTIVE',permissions:['order.store.read_status_cancel']}}:{})};
 const fulfill=(route:any,data:any)=>route.fulfill({json:data});
 await page.route('**/api/v1/**',async route=>{const req=route.request(),url=new URL(req.url()),path=url.pathname.replace('/api/v1','');
  if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:{...f.login.response,context},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/me/context')return fulfill(route,context);
  if(path==='/stores/'+id(1000))return fulfill(route,{id:id(1000),name:'Store tên hiện tại',shipping_fee_vnd:20000});
  if(['/me/orders','/store/orders','/admin/orders'].includes(path)){
   reads.push(path+url.search);if(state.listError)return route.fulfill({status:503,json:{code:'LIST_UNAVAILABLE',message:'Không đọc được danh sách đơn'}});
   const p=Number(url.searchParams.get('page')??1),size=Number(url.searchParams.get('size')??20),q=url.searchParams.get('q')??'',status=url.searchParams.get('status'),payment=url.searchParams.get('payment_status'),refund=url.searchParams.get('refund_status');
   const filtered=orders.filter(order=>(!q||JSON.stringify(order).includes(q))&&(!status||order.status===status)&&(!payment||order.payment_status===payment)&&(!refund||order.refund_status===refund));const data={items:filtered.slice((p-1)*size,p*size),total:filtered.length,page:p,size};if(delayed&&q==='old-query'||state.holdPage===p){pending.push({route,data});return;}return fulfill(route,data);
  }
  if(/^\/(me|store)\/orders\/[^/]+$/.test(path)){details.push(path);return fulfill(route,orders.find(order=>path.endsWith(order.id)));}
  if(path.includes('/orders/')&&path.endsWith('/refund'))return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Chưa có hoàn tiền'}});
  if(path.includes('/delivery-return'))return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Chưa có hồ sơ hoàn về'}});
  if(path==='/me/returns')return fulfill(route,{items:[],total:0,page:1,size:20});
  if(path.startsWith('/orders/batches/'))return fulfill(route,{purchase_group_id:orders[44].purchase_group_id,orders:[orders[44]],order_ids:[orders[44].id],payable_total_vnd:220000});
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture chưa cấu hình'}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();
 return {orders,reads,details,pending,state,release:async()=>{for(const item of pending)try{await fulfill(item.route,item.data);}catch{/* canceled old request */}}};
}
async function search(page:Page,value:string){await page.getByRole('searchbox',{name:'Tìm đơn theo mã, món, SKU hoặc người nhận',exact:true}).fill(value);await page.getByRole('button',{name:'Tìm trong toàn bộ đơn',exact:true}).click();}
test('Customer finds an old order by SKU with snapshot identity and returns from details without losing query or money status',async({page})=>{
 const m=await model(page);await page.goto('/customer/orders');await expect(page.getByText('Món phổ thông 0',{exact:true})).toBeVisible();await search(page,'009264');await page.getByRole('combobox',{name:'Tình trạng tiền',exact:true}).selectOption('UNKNOWN');await expect.poll(()=>m.reads.some(path=>path.includes('q=009264')&&path.includes('payment_status=UNKNOWN'))).toBe(true);await expect(page.getByText('Áo Đỏ snapshot cũ',{exact:true})).toBeVisible();await expect(page.getByText('Store hiện tại: Store tên hiện tại',{exact:true})).toBeVisible();await expect(page.getByText('Món phổ thông 0',{exact:true})).toHaveCount(0);await page.getByRole('link',{name:'Xem chi tiết',exact:true}).click();await expect(page).toHaveURL(new RegExp('/customer/orders/'+m.orders[44].id+'$'));await expect(page.getByText('Áo Đỏ snapshot cũ',{exact:true})).toBeVisible();await page.getByRole('link',{name:'Quay lại lịch sử đơn hàng',exact:true}).click();await expect(page).toHaveURL(/q=009264.*payment_status=UNKNOWN/);await expect(page.getByRole('searchbox',{name:'Tìm đơn theo mã, món, SKU hoặc người nhận',exact:true})).toHaveValue('009264');
});
test('Customer page, actual order states and filters survive reload and Back/Forward',async({page})=>{
 const m=await model(page);await page.goto('/customer/orders');await page.getByRole('button',{name:'Trang sau',exact:true}).click();await expect(page).toHaveURL(/page=2/);await expect(page.getByText('Món phổ thông 20',{exact:true})).toBeVisible();await search(page,'009264');await expect(page).not.toHaveURL(/page=2/);await page.getByRole('combobox',{name:'Trạng thái đơn',exact:true}).selectOption('AWAITING_PAYMENT');await page.reload();await expect(page.getByRole('combobox',{name:'Trạng thái đơn',exact:true})).toHaveValue('AWAITING_PAYMENT');await page.goBack();await expect(page.getByRole('combobox',{name:'Trạng thái đơn',exact:true})).toHaveValue('');await page.goForward();await expect.poll(()=>m.reads.some(path=>path.includes('status=AWAITING_PAYMENT'))).toBe(true);
});
test('Seller searches beyond the first page, recognizes snapshot item/recipient and closes details into the same queue',async({page},info)=>{
 const m=await model(page,'SELLER');await page.goto('/seller/orders');await search(page,'009264');await page.getByRole('combobox',{name:'Trạng thái đơn',exact:true}).selectOption('AWAITING_PAYMENT');await expect(page.locator('tbody')).toContainText('Áo Đỏ snapshot cũ');await expect(page.locator('tbody')).toContainText('Nguyễn Người Nhận');await page.locator('tbody').getByRole('button',{name:'Xem đơn',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('009264');await page.keyboard.press('Escape');await expect(page).toHaveURL(/q=009264.*status=AWAITING_PAYMENT/);expect(m.details).toContain('/store/orders/'+m.orders[44].id);
 for(const width of process.env.CORE_FIX_DESKTOP_ONLY==='1'?[1440]:[1440,1024,768,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(width===390){const cards=page.getByRole('list',{name:'Các đơn hàng phù hợp',exact:true});await expect(cards).toContainText('Áo Đỏ snapshot cũ');await expect(cards.getByRole('button',{name:'Xem đơn',exact:true})).toBeVisible();}await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:info.outputPath('seller-order-queue-'+width+'.png'),fullPage:true});}
});
test('Admin filters all orders using server state and shows original items and full recipient in its detail dialog',async({page},info)=>{
 const m=await model(page,'ADMIN');await page.goto('/admin?tab=orders');await search(page,'009264');await page.getByRole('combobox',{name:'Trạng thái đơn',exact:true}).selectOption('AWAITING_PAYMENT');await expect(page.getByText('1 đơn phù hợp · trang 1.',{exact:true})).toBeVisible();await expect.poll(()=>m.reads.some(path=>path.startsWith('/admin/orders?')&&path.includes('status=AWAITING_PAYMENT'))).toBe(true);await page.locator('tbody').getByRole('button',{name:'Chi tiết đơn '+m.orders[44].id,exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toContainText('Áo Đỏ snapshot cũ');await expect(dialog.locator('address')).toContainText('Nguyễn Người Nhận');await expect(dialog).toContainText('009264');await page.keyboard.press('Escape');for(const width of process.env.CORE_FIX_DESKTOP_ONLY==='1'?[1440]:[1440,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('admin-order-queue-'+width+'.png'),fullPage:true});}
});
test('slow search response cannot replace a newer filtered queue',async({page})=>{
 const m=await model(page,'CUSTOMER',{delayed:true});await page.goto('/customer/orders');await search(page,'old-query');await expect.poll(()=>m.pending.length).toBe(1);await search(page,'009264');await expect(page.getByText('Áo Đỏ snapshot cũ',{exact:true})).toBeVisible();await m.release();await expect(page.getByText('Áo Đỏ snapshot cũ',{exact:true})).toBeVisible();
});
test('list failure and missing legacy item data are stated explicitly without current-catalog reconstruction',async({page})=>{
 await model(page,'CUSTOMER',{listError:true});await page.goto('/customer/orders?q=009264');await expect(page.getByRole('alert')).toContainText('Không đọc được danh sách đơn');await expect(page.getByText('Không có đơn hàng phù hợp trong lịch sử của bạn.',{exact:true})).toHaveCount(0);
});
test('legacy queue item data remains unavailable instead of borrowing a current Product title',async({page})=>{
 await model(page,'SELLER',{missing:true});await page.goto('/seller/orders?q='+id(45));await expect(page.locator('tbody')).toContainText('Đơn cũ chưa có dữ liệu món trong bản đọc này.');await expect(page.getByText('Áo Đỏ snapshot cũ',{exact:true})).toHaveCount(0);
});

test('refund UNKNOWN uses a separate server filter and never appears as confirmed money returned',async({page})=>{
 const m=await model(page,'ADMIN');await page.goto('/admin?tab=orders');await page.getByRole('combobox',{name:'Trạng thái lệnh hoàn tiền',exact:true}).selectOption('UNKNOWN');await expect.poll(()=>m.reads.some(path=>path.includes('refund_status=UNKNOWN'))).toBe(true);await expect(page.locator('tbody')).toContainText('Lệnh hoàn tiền: Đang đối soát hoàn');await expect(page.locator('tbody')).not.toContainText('Đã xác nhận hoàn');await expect(page.locator('tbody tr')).toHaveCount(1);
});

for(const role of ['CUSTOMER','SELLER','ADMIN'] as const){
 test(role+' can reopen a last order page after the list grows without cached empty data redirecting navigation',async({page})=>{
  const m=await model(page,role),removed=m.orders.splice(40);
  const path=role==='CUSTOMER'?'/customer/orders?page=3':role==='SELLER'?'/seller/orders?page=3':'/admin?tab=orders&page=3';
  await page.goto(path);await expect(page.locator('.boot-pagination')).toContainText('Trang 2 · 40 kết quả');
  m.orders.push(removed[0]);
  await page.getByRole('banner').getByRole('link',{name:'Trang chủ PBL6',exact:true}).click();await page.goBack();
  await expect(page.locator('.boot-pagination')).toContainText('Trang 2 · 41 kết quả');
  m.state.holdPage=3;await page.getByRole('button',{name:'Trang sau',exact:true}).click();
  await expect.poll(()=>m.pending.length).toBe(1);await expect(page).toHaveURL(/page=3/);
  await m.release();await expect(page.locator('.boot-pagination')).toContainText('Trang 3 · 41 kết quả');
  await expect(page.getByText('Món phổ thông 40',{exact:true}).first()).toBeVisible();
 });
}

for(const role of ['CUSTOMER','SELLER','ADMIN']as const){
 test(role+' automatic queue page correction does not trap browser Back',async({page})=>{
  const m=await model(page,role);m.orders.splice(40);const path=role==='CUSTOMER'?'/customer/orders?page=3':role==='SELLER'?'/seller/orders?page=3':'/admin?tab=orders&page=3';
  await page.goto(path);await expect(page).toHaveURL(/page=2/);await page.goBack();await expect(page).toHaveURL(/\/login$/);await page.goForward();await expect(page).toHaveURL(/page=2/);
 });
}
