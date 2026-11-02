import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id='ORDER_STATUS:63000000-0000-4000-8000-000000000001',order='63000000-0000-4000-8000-000000000002';
async function setup(page:Page,{failure=false}={}){
  let read=false;const writes:string[]=[];
  await page.route('**/api/v1/**',route=>{
    const req=route.request(),path=decodeURIComponent(new URL(req.url()).pathname.replace('/api/v1',''));
    if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:{...fixtures.login.response,context:{user_id:order,roles:['CUSTOMER'],role_permissions:[],token_version:0}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
    if(path==='/me/notifications')return failure?route.fulfill({status:503,json:{code:'DOWN',message:'Không tải được thông báo',details:[]}}):route.fulfill({json:{items:[{id,order_id:order,kind:'ORDER_STATUS',event_status:'SHIPPED',created_at:'2026-10-28T00:00:00Z',read},{id:'PAYMENT_EVENT:'+order,order_id:order,kind:'PAYMENT_EVENT',event_status:'SUCCESS',created_at:'2026-10-28T00:00:00Z',read:true}],total:2,unread:read?0:1,page:1,size:20}});
    if(path==='/me/notifications/'+id+'/read'){expect(req.method()).toBe('POST');writes.push(path);read=true;return route.fulfill({json:{id}});}
    return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture chưa cấu hình',details:[]}});
  });
  await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('customer@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();return writes;
}
test('notifications use real event states, mark read through the API and link to the owned order',async({page})=>{
  const writes=await setup(page);await page.locator('header').getByRole('link',{name:'Thông báo',exact:true}).click();
  await expect(page.getByText('Đang giao hàng',{exact:true})).toBeVisible();
  await expect(page.getByText('Mở đơn hàng để xem trạng thái thanh toán hiện tại.')).toBeVisible();
  await expect(page.getByText('Đã thanh toán thành công',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Đánh dấu đã đọc',exact:true}).click();await expect(page.getByText('0 thông báo chưa đọc')).toBeVisible();expect(writes).toHaveLength(1);
  await expect(page.getByRole('link',{name:'Xem đơn hàng'}).first()).toHaveAttribute('href','/customer/orders/'+order);
});
test('notification failures remain errors and do not become an empty successful feed',async({page})=>{
  await setup(page,{failure:true});await page.goto('/customer/notifications');await expect(page.getByRole('alert')).toContainText('Không tải được thông báo');await expect(page.getByText('Chưa có cập nhật về đơn hàng hoặc thanh toán.')).toHaveCount(0);
});
