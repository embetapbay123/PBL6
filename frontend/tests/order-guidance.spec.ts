import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'83000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function model(page:Page,status='AWAITING_PAYMENT',payment='UNKNOWN',employee=false){
 const s={order:{...f.getOwnOrder.response,id:id(1),store_id:id(2),status,payment_status:payment,payment_method:'SANDBOX',version:4,created_at:'2026-11-01T17:10:00Z',timeline:[],amounts:{goods_vnd:100000,shipping_vnd:20000,store_discount_vnd:0,platform_discount_vnd:0,payable_vnd:120000},items:[{...f.getOwnOrder.response.items[0],product_snapshot:{title:'Áo nhận diện',variant_values:{color:'Đỏ',size:'M'}},quantity:1}]},reads:0,posts:[] as unknown[]};
 await page.route('**/api/v1/**',route=>{const req=route.request(),p=new URL(req.url()).pathname.replace('/api/v1','');
  if(p.startsWith('/auth/'))return route.fulfill({json:{...f.login.response,context:{user_id:id(9),roles:employee?['CUSTOMER','SELLER']:['CUSTOMER'],role_permissions:[],token_version:0,...(employee?{store_membership:{store_id:id(2),role:'SELLER',status:'ACTIVE',permissions:['order.store.read_status_cancel']}}:{})}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(p==='/me/orders/'+id(1)||p==='/store/orders/'+id(1)){s.reads++;return route.fulfill({json:s.order});}
  if(p==='/me/orders'||p==='/store/orders')return route.fulfill({json:{items:[s.order],total:1,page:1,size:20}});
  if(p==='/stores/'+id(2))return route.fulfill({json:{id:id(2),name:'Cửa hàng đọc lại'}});
  if(req.method()!=='GET'){s.posts.push({path:p,body:req.postDataJSON()});return route.fulfill({status:409,json:{code:'PAYMENT_RECONCILIATION_REQUIRED',message:'Chưa rõ kết quả'}});}
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'No fixture record'}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();return s;
}
test('UNKNOWN history offers readback, never pay again, and detail explains who must act',async({page})=>{
 const s=await model(page);await page.goto('/customer/orders');await expect(page.getByRole('link',{name:'Thanh toán ngay →',exact:true})).toHaveCount(0);await expect(page.getByText('Chưa rõ kết quả thanh toán.',{exact:false})).toBeVisible();await page.getByRole('link',{name:'Xem chi tiết',exact:true}).click();await expect(page.getByRole('region',{name:'Bước tiếp theo',exact:true})).toContainText('không trả thêm tiền');await expect(page.getByRole('link',{name:'Thanh toán',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Làm mới',exact:true}).click();expect(s.posts).toEqual([]);
});
test('opening UNKNOWN payment is GET-only and can recover by reading a final result',async({page})=>{
 const s=await model(page);await page.goto('/orders/'+id(1)+'/pay');await expect(page.getByTestId('payment-unknown')).toContainText('Đừng thanh toán lại');expect(s.posts).toEqual([]);const before=s.reads;s.order.payment_status='SUCCEEDED';s.order.status='PENDING';await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();await expect(page.getByTestId('payment-succeeded')).toBeVisible();expect(s.reads).toBe(before+1);expect(s.posts).toEqual([]);
});
test('readback becoming payable still needs a separate explicit action before creating a QR',async({page})=>{
 const s=await model(page);await page.goto('/orders/'+id(1)+'/pay');await expect(page.getByTestId('payment-unknown')).toBeVisible();s.order.payment_status='PENDING';await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();await expect(page.getByRole('button',{name:'Tạo mã QR',exact:true})).toBeVisible();expect(s.posts).toEqual([]);await page.getByRole('button',{name:'Tạo mã QR',exact:true}).click();await expect(page.getByTestId('payment-setup-error')).toBeVisible();expect(s.posts).toEqual([{path:'/orders/'+id(1)+'/payment-attempts',body:{expected_order_version:4}}]);
});
test('a collected result never creates an attempt even if the order projection still awaits payment',async({page})=>{
 const s=await model(page,'AWAITING_PAYMENT','SUCCEEDED');await page.goto('/orders/'+id(1)+'/pay');await expect(page.getByTestId('payment-succeeded')).toBeVisible();expect(s.posts).toEqual([]);
});
for(const [status,payment,expected]of [['PREPARING','PENDING','Đang xác nhận đơn'],['RECOVERING','UNKNOWN','Đang kiểm tra kết quả đặt hàng'],['PENDING','PENDING','Chờ cửa hàng xác nhận'],['CONFIRMED','PENDING','Cửa hàng đang chuẩn bị hàng'],['PROCESSING','PENDING','Cửa hàng đang đóng gói đơn'],['SHIPPED','PENDING','Chờ xác nhận thanh toán'],['COMPLETED','SUCCEEDED','Đã hoàn tất'],['CANCELLED','PENDING','Đơn đã đóng'],['EXPIRED','PENDING','Đơn đã đóng']])test('customer next step '+status+' does not require enum knowledge',async({page})=>{
 await model(page,status,payment);await page.goto('/customer/orders/'+id(1));await expect(page.getByRole('region',{name:'Bước tiếp theo',exact:true})).toContainText(expected);
});
for(const width of (process.env.CORE_FIX_DESKTOP_ONLY==='1'?[1440,1024,768]:[1440,1024,768,390]))test('order guidance and cash controls remain readable at '+width+'px',async({page},info)=>{
 await page.setViewportSize({width,height:900});const s=await model(page,'SHIPPED','PENDING',true);s.order.payment_method='COD';await page.goto('/seller/orders');await page.getByRole('button',{name:'Xem đơn',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Xử lý đơn Store',exact:true});await expect(dialog.getByRole('region',{name:'Bước tiếp theo',exact:true})).toContainText('Chỉ hoàn tất sau khi giao thành công');await expect(dialog).toContainText('Bạn thiếu quyền ghi nhận COD');const reload=dialog.getByRole('button',{name:'Làm mới',exact:true});await reload.focus();await expect(reload).toBeFocused();await page.keyboard.press('Enter');await expect(dialog.getByRole('button',{name:'Hoàn tất đơn',exact:true})).toBeDisabled();await reload.scrollIntoViewIfNeeded();expect(await reload.evaluate(e=>{const r=e.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return top===e||e.contains(top);})).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('order-guidance-'+width+'.png')});expect(s.posts).toEqual([]);
});
