import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id='ORDER_STATUS:63000000-0000-4000-8000-000000000001',order='63000000-0000-4000-8000-000000000002';
async function setup(page:Page,{failure=false,empty=false}={}){
  let read=false;const writes:string[]=[];
  await page.route('**/api/v1/**',route=>{
    const req=route.request(),path=decodeURIComponent(new URL(req.url()).pathname.replace('/api/v1',''));
    if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:{...fixtures.login.response,context:{user_id:order,roles:['CUSTOMER'],role_permissions:[],token_version:0}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
    if(path==='/me/notifications'&&empty)return route.fulfill({json:{items:[],total:0,unread:0,page:1,size:20}});
    if(path==='/me/notifications')return failure?route.fulfill({status:503,json:{code:'DOWN',message:'Không tải được thông báo',details:[]}}):route.fulfill({json:{items:[{id,order_id:order,kind:'ORDER_STATUS',event_status:'SHIPPED',created_at:'2026-10-28T00:00:00Z',read},{id:'PAYMENT_EVENT:'+order,order_id:order,kind:'PAYMENT_EVENT',event_status:'SUCCESS',created_at:'2026-10-28T00:00:00Z',read:true}],total:2,unread:read?0:1,page:1,size:20}});
    if(path==='/me/notifications/'+id+'/read'||path==='/me/notifications/read-group'){expect(req.method()).toBe('POST');writes.push(path);read=true;return route.fulfill({json:{id,updated:1}});}
    return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture chưa cấu hình',details:[]}});
  });
  await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('customer@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();return writes;
}
test('notifications use real event states, mark read through the API and link to the owned order',async({page})=>{
  const writes=await setup(page);await page.getByRole('banner').getByRole('link',{name:/^Thông báo/}).click();
  await expect(page.getByText('Đang giao hàng',{exact:true})).toBeVisible();
  await expect(page.getByText('Mở đơn hàng để xem trạng thái thanh toán hiện tại.')).toBeVisible();
  await expect(page.getByText('Đã thanh toán thành công',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Đánh dấu đã đọc',exact:true}).click();await expect(page.getByRole('button',{name:'Đánh dấu tất cả đã đọc',exact:true})).toHaveCount(0);await expect(page.getByText('0 thông báo chưa đọc')).toHaveCount(0);expect(writes).toHaveLength(1);
  await expect(page.getByRole('link',{name:'Xem đơn hàng'}).first()).toHaveAttribute('href','/customer/orders/'+order);
});
test('notification failures remain errors and do not become an empty successful feed',async({page})=>{
  await setup(page,{failure:true});await page.goto('/customer/notifications');await expect(page.getByRole('alert')).toContainText('Không tải được thông báo');await expect(page.getByText('Chưa có thông báo.',{exact:true})).toHaveCount(0);
});
test('the bell and the old settings URL both lead directly to the empty notification list',async({page})=>{
  await setup(page,{empty:true});
  await page.setViewportSize({width:320,height:800});
  const bell=page.getByRole('banner').getByRole('link',{name:'Thông báo',exact:true});
  await expect(bell).toBeInViewport();await bell.click();
  await expect(page).toHaveURL(/\/customer\/notifications$/);
  await expect(page.getByText('Chưa có thông báo.',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.getByRole('button',{name:'Đánh dấu tất cả đã đọc',exact:true})).toHaveCount(0);
  await expect(page.getByText(/0 thông báo chưa đọc/)).toHaveCount(0);
  await page.goto('/customer/settings?section=notifications');
  await expect(page).toHaveURL(/\/customer\/notifications$/);
  await expect(page.getByText('Chưa có thông báo.',{exact:true})).toBeVisible();
});

test('grouped notifications expand history and mark group read bounded by up_to', async({page}) => {
  let groupReadCalled = false;
  let historyCalled = false;
  await page.route('**/api/v1/**', route => {
    const req = route.request(), path = decodeURIComponent(new URL(req.url()).pathname.replace('/api/v1',''));
    if(path === '/auth/login' || path === '/auth/refresh') {
      return route.fulfill({json: {...fixtures.login.response, context: {user_id: order, roles: ['CUSTOMER'], role_permissions: [], token_version: 0}}, headers: {'set-cookie': 'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
    }
    if(path === '/me/notifications') {
      return route.fulfill({
        json: {
          items: [{
            id,
            order_id: order,
            kind: 'ORDER_STATUS',
            event_status: 'SHIPPED',
            created_at: '2026-10-28T12:00:00Z',
            read: groupReadCalled,
            update_count: 3,
            unread_count: groupReadCalled ? 0 : 2
          }],
          total: 1,
          unread: groupReadCalled ? 0 : 2,
          page: 1,
          size: 20
        }
      });
    }
    if(path === '/me/notifications/group') {
      historyCalled = true;
      const url = new URL(req.url());
      const excludePrimary = url.searchParams.get('exclude_primary') === 'true';
      return route.fulfill({
        json: {
          items: excludePrimary ? [
            { id: id + '-2', order_id: order, kind: 'ORDER_STATUS', event_status: 'PROCESSING', created_at: '2026-10-28T10:00:00Z', read: false, update_count: 3, unread_count: groupReadCalled ? 0 : 2 },
            { id: id + '-1', order_id: order, kind: 'ORDER_STATUS', event_status: 'CONFIRMED', created_at: '2026-10-28T08:00:00Z', read: true, update_count: 3, unread_count: groupReadCalled ? 0 : 2 }
          ] : [
            { id, order_id: order, kind: 'ORDER_STATUS', event_status: 'SHIPPED', created_at: '2026-10-28T12:00:00Z', read: groupReadCalled, update_count: 3, unread_count: groupReadCalled ? 0 : 2 },
            { id: id + '-2', order_id: order, kind: 'ORDER_STATUS', event_status: 'PROCESSING', created_at: '2026-10-28T10:00:00Z', read: false, update_count: 3, unread_count: groupReadCalled ? 0 : 2 },
            { id: id + '-1', order_id: order, kind: 'ORDER_STATUS', event_status: 'CONFIRMED', created_at: '2026-10-28T08:00:00Z', read: true, update_count: 3, unread_count: groupReadCalled ? 0 : 2 }
          ],
          total: excludePrimary ? 2 : 3,
          unread: groupReadCalled ? 0 : 2,
          page: 1,
          size: 10
        }
      });
    }
    if(path === '/me/notifications/read-group') {
      expect(req.method()).toBe('POST');
      const postBody = req.postDataJSON();
      expect(postBody.kind).toBe('ORDER_STATUS');
      expect(postBody.order_id).toBe(order);
      expect(postBody.up_to).toBe('2026-10-28T12:00:00Z');
      groupReadCalled = true;
      return route.fulfill({ json: { updated: 2 } });
    }
    return route.fulfill({status: 404, json: {code: 'NOT_FOUND', message: 'Fixture chưa cấu hình', details: []}});
  });

  await page.goto('/login');
  await page.getByLabel('Email', {exact: true}).fill('customer@example.test');
  await page.getByLabel('Mật khẩu', {exact: true}).fill('Fixture-password-123');
  await page.getByRole('button', {name: 'Đăng nhập', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Đã đăng nhập'})).toBeVisible();

  await page.getByRole('banner').getByRole('link', {name: /^Thông báo/}).click();
  await expect(page.getByText('2 chưa đọc')).toBeVisible();

  const summary = page.locator('summary', { hasText: 'Xem 2 cập nhật trước của đơn' });
  await expect(summary).toBeVisible();
  await summary.click();

  await expect(page.getByText('Đang chuẩn bị')).toBeVisible();
  await expect(page.getByText('Đã xác nhận')).toBeVisible();
  expect(historyCalled).toBe(true);

  const markReadBtn = page.locator('.notification-actions').getByRole('button', { name: 'Đánh dấu đã đọc', exact: true });
  await markReadBtn.click();
  expect(groupReadCalled).toBe(true);
  await expect(page.getByText('Đã đọc', { exact: true })).toBeVisible();
});
