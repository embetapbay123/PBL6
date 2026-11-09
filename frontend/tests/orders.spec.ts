import {test,expect,Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id='45000000-0000-4000-8000-000000000001';
async function setup(page:Page,{status='CONFIRMED',conflict=false,missing=false,unavailable=false,lostAck=false}={}){
 let current={...f.getOwnOrder.response,id,status,version:7,payment_method:'SANDBOX',payment_status:'SUCCEEDED',items:[{id,product_id:id,product_snapshot:{title:'Actual purchased product'},quantity:2,unit_price_vnd:100000}],amounts:{goods_vnd:200000,shipping_vnd:15000,store_discount_vnd:10000,platform_discount_vnd:5000,payable_vnd:200000}};
 const writes:any[]=[],pages:string[]=[];
 await page.route('**/api/v1/**',route=>{const req=route.request(),url=new URL(req.url()),path=url.pathname;
  if(path.endsWith('/auth/login')||path.endsWith('/auth/refresh'))return route.fulfill({json:{...f.login.response,context:{user_id:id,roles:['CUSTOMER'],role_permissions:[],token_version:0}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/api/v1/me/orders'){pages.push(url.searchParams.get('page')!);return route.fulfill(unavailable?{status:503,json:{code:'DOWN',message:'Orders unavailable',details:[]}}:{json:{items:[current],page:Number(url.searchParams.get('page')),size:20,total:21}})}
  if(path==='/api/v1/me/orders/'+id)return route.fulfill(missing?{status:404,json:{code:'NOT_FOUND',message:'Order not found or outside ownership',details:[]}}:{json:current});
  if(path==='/api/v1/me/orders/'+id+'/cancel'){
   writes.push(req.postDataJSON());if(conflict)return route.fulfill({status:409,json:{code:'VERSION_CONFLICT',message:'Order version changed',details:[]}});
   current={...current,status:'CANCELLED',version:8,refund_status:'REQUESTED'};if(lostAck)return route.fulfill({status:503,json:{code:'UNKNOWN_OUTCOME',message:'Chưa rõ hủy đã ghi hay chưa'}});return route.fulfill({json:current});
  }
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Unconfigured fixture',details:[]}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();return {writes,pages,serverStatus:(status:string)=>{current={...current,status,version:current.version+1};}};
}
test('owned history is reachable, paginated and links to the real Order UUID',async({page})=>{
  const t=await setup(page);await page.getByRole('button',{name:'Menu tài khoản',exact:true}).click();await page.getByRole('navigation',{name:'Menu tài khoản'}).getByRole('link',{name:'Đơn hàng',exact:true}).click();await page.getByRole('button',{name:'Trang sau',exact:true}).click();await expect(page.getByText('Trang 2 · 21 kết quả')).toBeVisible();expect([...new Set(t.pages)]).toEqual(['1','2']);await page.getByRole('link',{name:'Xem chi tiết',exact:true}).click();await expect(page).toHaveURL(new RegExp('/customer/orders/'+id));await expect(page.getByText('Actual purchased product',{exact:true})).toBeVisible();await expect(page.getByText('ORD-001')).toHaveCount(0);
});

test('customer detail displays the full address and policy agreed at purchase without consulting the current address book',async({page})=>{
 await setup(page);const address={recipient_name:'Người nhận khi đặt',phone:'0901234567',line1:'123 Địa chỉ cũ, cổng B, tầng 15',ward:'Phường A',district:'Quận B',city:'Huế'},policy={version:'PLATFORM_2026_10_30',window_hours:168,full_refund_includes_original_shipping:true,fault_fee_rule:'STORE_IF_STORE_FAULT_CUSTOMER_IF_CHANGE_OF_MIND_ADMIN_IF_DISPUTED',return_address:{...address,line1:'456 Kho nhận trả đã chốt'}};let currentAddressReads=0;
 await page.route('**/api/v1/me/addresses**',route=>{currentAddressReads++;return route.fulfill({json:{items:[{...address,line1:'999 Địa chỉ hồ sơ mới'}]}});});await page.route('**/api/v1/me/orders/'+id,route=>route.fulfill({json:{...f.getOwnOrder.response,id,status:'CONFIRMED',address_snapshot:address,return_policy_snapshot:policy}}));await page.goto('/customer/orders/'+id);await expect(page.getByRole('region',{name:'Địa chỉ giao hàng đã chốt',exact:true})).toContainText(address.line1);await expect(page.getByRole('region',{name:'Chính sách đổi trả đã chốt',exact:true})).toContainText('456 Kho nhận trả đã chốt');await expect(page.locator('main')).not.toContainText('999 Địa chỉ hồ sơ mới');expect(currentAddressReads).toBe(0);
});

test('historical customer detail explains missing address and policy instead of inventing current values',async({page})=>{
 await setup(page);await page.route('**/api/v1/me/orders/'+id,route=>route.fulfill({json:{...f.getOwnOrder.response,id,status:'CONFIRMED',address_snapshot:{},return_policy_snapshot:undefined}}));await page.goto('/customer/orders/'+id);await expect(page.getByRole('region',{name:'Địa chỉ giao hàng đã chốt',exact:true})).toContainText('Đơn cũ thiếu thông tin');await expect(page.locator('main')).toContainText('không áp hồi tố hạn 7 ngày');
});
test('cancellation sends the server version and never claims a requested refund is complete',async({page})=>{
 const t=await setup(page);await page.goto('/customer/orders/'+id);await page.getByLabel('Lý do hủy').fill('Customer changed their mind');await page.getByRole('button',{name:'Hủy đơn',exact:true}).click();await page.getByRole('dialog',{name:'Hủy đơn hàng?',exact:true}).getByRole('button',{name:'Hủy đơn',exact:true}).click();await expect(page.getByText('Chưa xác nhận hoàn tiền. Trạng thái yêu cầu: Đã yêu cầu hoàn, chưa xác nhận')).toBeVisible();expect(t.writes).toEqual([{expected_version:7,reason:'Customer changed their mind'}]);await expect(page.getByRole('button',{name:'Hủy đơn',exact:true})).toHaveCount(0);await expect(page.getByText('Đã hoàn tiền.',{exact:true})).toHaveCount(0);
});
test('409 keeps the cancellation reason and requires a reload before another write',async({page})=>{
 const t=await setup(page,{conflict:true});await page.goto('/customer/orders/'+id);await page.getByLabel('Lý do hủy').fill('Preserve draft');await page.getByRole('button',{name:'Hủy đơn',exact:true}).click();await page.getByRole('dialog',{name:'Hủy đơn hàng?',exact:true}).getByRole('button',{name:'Hủy đơn',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Order version changed');await expect(page.getByLabel('Lý do hủy')).toHaveValue('Preserve draft');await expect(page.getByRole('button',{name:'Hủy đơn',exact:true})).toBeDisabled();expect(t.writes).toHaveLength(1);
});
test('missing or foreign Order remains 404 with no fabricated details',async({page})=>{
 await setup(page,{missing:true});await page.goto('/customer/orders/'+id);await expect(page.getByRole('alert')).toContainText('outside ownership');await expect(page.getByText('Actual purchased product',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Hủy đơn',exact:true})).toHaveCount(0);
});
test('shipped Orders cannot be cancelled from the UI',async({page})=>{
 await setup(page,{status:'SHIPPED'});await page.goto('/customer/orders/'+id);await expect(page.getByText('Trạng thái: Đã bàn giao giao hàng',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Hủy đơn',exact:true})).toHaveCount(0);
});
test('list failure remains an error rather than an empty successful history',async({page})=>{
 await setup(page,{unavailable:true});await page.goto('/customer/orders');await expect(page.getByRole('alert')).toContainText('Orders unavailable');await expect(page.getByText('Bạn chưa có đơn hàng ở trang này.')).toHaveCount(0);
});

test('an unknown cancellation result freezes the reason and reads back the committed result without another POST',async({page})=>{
 const t=await setup(page,{lostAck:true});await page.goto('/customer/orders/'+id);await page.getByLabel('Lý do hủy',{exact:true}).fill('Giữ đúng lý do ban đầu');await page.getByRole('button',{name:'Hủy đơn',exact:true}).click();await page.getByRole('dialog',{name:'Hủy đơn hàng?',exact:true}).getByRole('button',{name:'Hủy đơn',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Chưa rõ hủy đã ghi hay chưa');await expect(page.getByLabel('Lý do hủy',{exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Hủy đơn',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(page.getByRole('button',{name:'Hủy đơn',exact:true})).toHaveCount(0);await expect(page.getByText('Chưa xác nhận hoàn tiền. Trạng thái yêu cầu: Đã yêu cầu hoàn, chưa xác nhận')).toBeVisible();expect(t.writes).toEqual([{expected_version:7,reason:'Giữ đúng lý do ban đầu'}]);
});
test('Customer explicitly refreshes a pending order after Store completion without leaving the detail screen',async({page})=>{
 const t=await setup(page,{status:'PENDING'});await page.goto('/customer/orders/'+id);await expect(page.getByRole('button',{name:'Hủy đơn',exact:true})).toBeVisible();t.serverStatus('COMPLETED');await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(page.getByText('Trạng thái: Hoàn tất',{exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Viết đánh giá',exact:true})).toBeVisible();expect(t.writes).toHaveLength(0);
});
