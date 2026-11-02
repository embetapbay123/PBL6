import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const store='62000000-0000-4000-8000-000000000001',thread='62000000-0000-4000-8000-000000000002';
const time='2026-10-28T00:00:00Z';
async function setup(page:Page,{failure=false,seller=false,missing=false}={}){
  const writes:any[]=[],reads:string[]=[];
  const messages=[{id:'62000000-0000-4000-8000-000000000003',conversation_id:thread,sender_side:'STORE',content:'Gian hàng sẵn sàng hỗ trợ',created_at:time}];
  const context={user_id:'62000000-0000-4000-8000-000000000004',roles:seller?['CUSTOMER','SELLER']:['CUSTOMER'],role_permissions:[],token_version:0,...(seller?{store_membership:{store_id:store,role:'SELLER',status:'ACTIVE',permissions:[]}}:{})};
  await page.route('**/api/v1/**',route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname.replace('/api/v1','');reads.push(path);
    if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:{...fixtures.login.response,context},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
    if(path===`/stores/${store}/products`)return route.fulfill({json:{items:[],page:1,size:20,total:0}});
    if(path===`/stores/${store}`)return route.fulfill({json:{id:store,name:'Gian hàng kiểm thử',shipping_fee_vnd:0}});
    if(path==='/me/conversations'){
      if(req.method()==='POST'){expect(req.postDataJSON()).toEqual({store_id:store});return route.fulfill({status:201,json:{id:thread}});}
      return route.fulfill({json:{items:[{id:thread,store_id:store,store_name:'Gian hàng kiểm thử',customer_name:'Khách hàng',last_message:messages.at(-1)?.content,updated_at:time}],total:1,page:1,size:20}});
    }
    if(path===`/me/conversations/${thread}/messages`){
      if(missing)return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Không có quyền đọc hội thoại',details:[]}});
      if(req.method()==='POST'){
        const body=req.postDataJSON();writes.push(body);
        if(writes.length===1)messages.push({id:'62000000-0000-4000-8000-000000000005',conversation_id:thread,sender_side:'CUSTOMER',content:body.content,created_at:time});
        return failure&&writes.length===1?route.fulfill({status:503,json:{code:'UNAVAILABLE',message:'Mất phản hồi gửi tin',details:[]}}):route.fulfill({status:201,json:messages.at(-1)});
      }
      return route.fulfill({json:{conversation_id:thread,items:[...messages].reverse(),page:1,size:20,total:messages.length}});
    }
    return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture chưa cấu hình '+path,details:[]}});
  });
  await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('customer@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();
  return {writes,reads};
}
test('customer opens a persisted conversation from a public Store and sends a message',async({page})=>{
  const state=await setup(page);await page.goto(`/stores/${store}`);
  await page.getByRole('button',{name:'Nhắn tin gian hàng'}).click();await expect(page.getByRole('dialog',{name:'Trung tâm chat'})).toBeVisible();
  await expect(page.getByRole('log')).toContainText('Gian hàng sẵn sàng hỗ trợ');
  await page.getByLabel('Nội dung tin nhắn').fill('Tôi cần tư vấn');await page.getByRole('button',{name:'Gửi tin nhắn',exact:true}).click();
  await expect(page.getByRole('log')).toContainText('Tôi cần tư vấn');expect(state.writes).toHaveLength(1);expect(state.writes[0].content).toBe('Tôi cần tư vấn');expect(state.writes[0].client_message_id).toMatch(/^[0-9a-f-]{36}$/);
});
test('an uncertain send retries the exact message key without fabricating another message',async({page})=>{
  const state=await setup(page,{failure:true});await page.goto(`/customer/messages/${thread}`);
  await page.getByLabel('Nội dung tin nhắn').fill('Giữ nguyên nội dung');await page.getByRole('button',{name:'Gửi tin nhắn',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Mất phản hồi gửi tin');await expect(page.getByLabel('Nội dung tin nhắn')).toBeDisabled();
  await page.getByRole('button',{name:'Thử gửi lại',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã gửi tin nhắn.');
  expect(state.writes).toHaveLength(2);expect(state.writes[1]).toEqual(state.writes[0]);
  await expect(page.getByRole('log').getByText('Giữ nguyên nội dung',{exact:true})).toHaveCount(1);
});
test('Seller without order permissions cannot issue Store conversation requests',async({page})=>{
  const state=await setup(page,{seller:true});await page.goto('/seller/messages');await expect(page.getByRole('alert')).toContainText('chưa có quyền');expect(state.reads.some(path=>path.startsWith('/store/conversations'))).toBe(false);
});
test('foreign conversation errors disable sending and remain readable',async({page})=>{
  await setup(page,{missing:true});await page.setViewportSize({width:process.env.CORE_FIX_DESKTOP_ONLY==='1'?1440:390,height:844});await page.goto(`/customer/messages/${thread}`);
  await expect(page.getByRole('alert')).toContainText('Không có quyền đọc hội thoại');await expect(page.getByRole('button',{name:'Gửi tin nhắn',exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(process.env.CORE_FIX_DESKTOP_ONLY==='1'?1440:390);
});

test('widget and full Messages workspace share the Store draft and hide duplicate chat',async({page})=>{
 await setup(page);await page.goto('/stores/'+store);await page.getByRole('button',{name:'Nhắn tin gian hàng',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Trung tâm chat'});await expect(dialog).toBeVisible();await dialog.getByLabel('Nội dung tin nhắn').fill('Bản nháp qua các giao diện');
 await dialog.getByRole('button',{name:'Thu nhỏ chat'}).click();await page.getByRole('button',{name:'Khôi phục chat'}).click();await expect(dialog.getByLabel('Nội dung tin nhắn')).toHaveValue('Bản nháp qua các giao diện');await dialog.getByRole('button',{name:'Mở trang Tin nhắn'}).click();await expect(page).toHaveURL(new RegExp('/customer/messages/'+thread));await expect(page.getByRole('button',{name:'Mở chat',exact:true})).toHaveCount(0);await expect(page.getByRole('main').getByRole('textbox',{name:'Nội dung tin nhắn'})).toHaveValue('Bản nháp qua các giao diện');
});

test('closing Store chat during send preserves its confirmed message on reopen',async({page})=>{
 await setup(page);let waiting:any;await page.route('**/api/v1/me/conversations/*/messages',route=>route.request().method()==='POST'?(waiting=route):route.fallback());await page.goto('/stores/'+store);await page.getByRole('button',{name:'Nhắn tin gian hàng',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Trung tâm chat'});await dialog.getByLabel('Nội dung tin nhắn').fill('Tin đang gửi');await dialog.getByRole('button',{name:'Gửi tin nhắn'}).click();await expect.poll(()=>!!waiting).toBe(true);await dialog.getByRole('button',{name:'Đóng chat'}).click();await waiting.fulfill({json:{id:thread,content:'Tin đang gửi'}});await page.getByRole('button',{name:'Mở chat',exact:true}).click();await expect(dialog.getByLabel('Nội dung tin nhắn')).toHaveValue('');await expect(dialog.getByRole('status')).toContainText('Đã gửi tin nhắn.');
});
