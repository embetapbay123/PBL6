import {test,expect,Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id='45000000-0000-4000-8000-000000000001';
async function setup(page:Page,{status='CONFIRMED',conflict=false,missing=false,unavailable=false}={}){
 let current={...f.getOwnOrder.response,id,status,version:7,payment_method:'SANDBOX',payment_status:'SUCCEEDED',items:[{id,product_id:id,product_snapshot:{title:'Actual purchased product'},quantity:2,unit_price_vnd:100000}],amounts:{goods_vnd:200000,shipping_vnd:15000,store_discount_vnd:10000,platform_discount_vnd:5000,payable_vnd:200000}};
 const writes:any[]=[],pages:string[]=[];
 await page.route('**/api/v1/**',route=>{const req=route.request(),url=new URL(req.url()),path=url.pathname;
  if(path.endsWith('/auth/login')||path.endsWith('/auth/refresh'))return route.fulfill({json:{...f.login.response,context:{user_id:id,roles:['CUSTOMER'],role_permissions:[],token_version:0}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/api/v1/me/orders'){pages.push(url.searchParams.get('page')!);return route.fulfill(unavailable?{status:503,json:{code:'DOWN',message:'Orders unavailable',details:[]}}:{json:{items:[current],page:Number(url.searchParams.get('page')),size:20,total:21}})}
  if(path==='/api/v1/me/orders/'+id)return route.fulfill(missing?{status:404,json:{code:'NOT_FOUND',message:'Order not found or outside ownership',details:[]}}:{json:current});
  if(path==='/api/v1/me/orders/'+id+'/cancel'){
   writes.push(req.postDataJSON());if(conflict)return route.fulfill({status:409,json:{code:'VERSION_CONFLICT',message:'Order version changed',details:[]}});
   current={...current,status:'CANCELLED',version:8,refund_status:'REQUESTED'};return route.fulfill({json:current});
  }
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Unconfigured fixture',details:[]}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();return {writes,pages};
}
test('owned history is reachable, paginated and links to the real Order UUID',async({page})=>{
  const t=await setup(page);await page.getByRole('navigation',{name:'Điều hướng chính'}).getByRole('link',{name:'Đơn hàng',exact:true}).click();await page.getByRole('button',{name:'Trang sau',exact:true}).click();await expect(page.getByText('Trang 2 · 21 kết quả')).toBeVisible();expect([...new Set(t.pages)]).toEqual(['1','2']);await page.getByRole('link',{name:'Xem chi tiết',exact:true}).click();await expect(page).toHaveURL(new RegExp('/customer/orders/'+id));await expect(page.getByText('Actual purchased product',{exact:true})).toBeVisible();await expect(page.getByText('ORD-001')).toHaveCount(0);
});
test('cancellation sends the server version and never claims a requested refund is complete',async({page})=>{
 const t=await setup(page);await page.goto('/customer/orders/'+id);await page.getByLabel('Lý do hủy').fill('Customer changed their mind');await page.getByRole('button',{name:'Hủy đơn hàng',exact:true}).click();await expect(page.getByText('Chưa xác nhận hoàn tiền. Trạng thái yêu cầu: REQUESTED')).toBeVisible();expect(t.writes).toEqual([{expected_version:7,reason:'Customer changed their mind'}]);await expect(page.getByRole('button',{name:'Hủy đơn hàng',exact:true})).toHaveCount(0);await expect(page.getByText('Đã hoàn tiền.',{exact:true})).toHaveCount(0);
});
test('409 keeps the cancellation reason and requires a reload before another write',async({page})=>{
 const t=await setup(page,{conflict:true});await page.goto('/customer/orders/'+id);await page.getByLabel('Lý do hủy').fill('Preserve draft');await page.getByRole('button',{name:'Hủy đơn hàng',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Order version changed');await expect(page.getByLabel('Lý do hủy')).toHaveValue('Preserve draft');await expect(page.getByRole('button',{name:'Hủy đơn hàng',exact:true})).toBeDisabled();expect(t.writes).toHaveLength(1);
});
test('missing or foreign Order remains 404 with no fabricated details',async({page})=>{
 await setup(page,{missing:true});await page.goto('/customer/orders/'+id);await expect(page.getByRole('alert')).toContainText('outside ownership');await expect(page.getByText('Actual purchased product',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Hủy đơn hàng',exact:true})).toHaveCount(0);
});
test('shipped Orders cannot be cancelled from the UI',async({page})=>{
 await setup(page,{status:'SHIPPED'});await page.goto('/customer/orders/'+id);await expect(page.getByText('Trạng thái: SHIPPED · phiên bản 7')).toBeVisible();await expect(page.getByRole('button',{name:'Hủy đơn hàng',exact:true})).toHaveCount(0);
});
test('list failure remains an error rather than an empty successful history',async({page})=>{
 await setup(page,{unavailable:true});await page.goto('/customer/orders');await expect(page.getByRole('alert')).toContainText('Orders unavailable');await expect(page.getByText('Bạn chưa có đơn hàng ở trang này.')).toHaveCount(0);
});
