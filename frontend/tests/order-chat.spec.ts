import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'7e000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function model(page:Page,{seller=false,lostAck=false,wrongContext=false,getAfterAckFails=false,deliveryFailure=false}={}){
 const sends:any[]=[],starts:any[]=[],messages:any[]=[];let failed=false;
 const order={...f.getOwnOrder.response,id:id(1),store_id:id(2),purchase_group_id:id(3),status:'COMPLETED',version:3,payment_method:'COD',payment_status:'SUCCEEDED',amounts:{goods_vnd:200000,store_discount_vnd:0,platform_discount_vnd:0,shipping_vnd:20000,payable_vnd:220000},items:[{id:id(4),product_id:id(5),variant_id:id(6),product_snapshot:{title:'Áo đặt trước đây',variant_values:{size:'M',color:'Đỏ'}},sku_snapshot:'009264',quantity:2,unit_price_vnd:100000,line_total_vnd:200000}]};
 const context={user_id:id(seller?9:8),roles:seller?['CUSTOMER','STORE_OWNER']:['CUSTOMER'],role_permissions:[],token_version:0,...(seller?{store_membership:{store_id:id(2),role:'OWNER',status:'ACTIVE',permissions:[]}}:{})};
 if(deliveryFailure)order.status='SHIPPED';
 if(seller)messages.push({id:id(20),conversation_id:id(7),sender_side:'CUSTOMER',content:'Tôi cần hỗ trợ đúng đơn này',order_id:order.id,created_at:'2026-10-31T00:00:00Z'});
 await page.route('**/api/v1/**',async route=>{const req=route.request(),url=new URL(req.url()),path=url.pathname.replace('/api/v1','');
  if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:{...f.login.response,context},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/me/context')return route.fulfill({json:context});
  if(deliveryFailure&&path==='/me/orders/'+order.id+'/delivery-return')return route.fulfill({json:{id:id(40),order_id:order.id,store_id:order.store_id,status:'OPEN',version:0,reason:'Khách từ chối, chờ kiện về',inventory_status:'PENDING',money_settled:false,payment_method:'COD',payment_status:'SUCCEEDED',amount_vnd:220000,inspection:[],items:order.items.map(item=>({...item,order_item_id:item.id})),created_at:'2026-11-01T00:00:00Z',updated_at:'2026-11-01T00:00:00Z'}});
  if(path==='/me/orders/'+order.id||path==='/store/orders/'+order.id)return route.fulfill({json:order});
  if(path==='/store/orders'||path==='/me/orders')return route.fulfill({json:{items:[order],total:1,page:1,size:20}});
  if(path==='/stores/'+id(2))return route.fulfill({json:{id:id(2),name:'Store đúng đơn',shipping_fee_vnd:20000}});
  if(path==='/products'||path==='/stores/'+id(2)+'/products')return route.fulfill({json:{items:[],total:0,page:1,size:20}});
  if(path==='/me/conversations'&&req.method()==='POST'){const body=req.postDataJSON();starts.push(body);return route.fulfill({status:201,json:{id:id(7),store_name:'Store đúng đơn',...(body.order_id?{order_context:{order_id:wrongContext?id(99):body.order_id,store_id:id(2),status:'COMPLETED',items:[{title:'Áo đặt trước đây',quantity:2}]}}:{})}});}
  if(path==='/me/conversations'||path==='/store/conversations')return route.fulfill({json:{items:[{id:id(7),store_id:id(2),store_name:'Store đúng đơn',customer_name:'Khách đúng đơn',updated_at:'2026-10-31T00:00:00Z'}],total:1,page:1,size:20}});
  if(path.endsWith('/conversations/'+id(7)+'/messages')){
   if(req.method()==='POST'){const body=req.postDataJSON();sends.push(body);let message=messages.find(row=>row.client_message_id===body.client_message_id);if(!message){message={id:id(30+sends.length),conversation_id:id(7),sender_side:seller?'STORE':'CUSTOMER',created_at:'2026-10-31T01:00:00Z',...body};messages.push(message);}if(lostAck&&!failed){failed=true;return route.fulfill({status:503,json:{code:'UNKNOWN',message:'Chưa rõ kết quả gửi'}});}return route.fulfill({status:201,json:message});}
   if(getAfterAckFails&&sends.length)return route.fulfill({status:503,json:{code:'HISTORY_UNAVAILABLE',message:'Lịch sử tạm lỗi'}});
   return route.fulfill({json:{conversation_id:id(7),items:[...messages].reverse(),page:1,size:20,total:messages.length}});
  }
  if(path==='/me/returns')return route.fulfill({json:{items:[],total:0,page:1,size:20}});
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture chưa cấu hình'}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();return {sends,starts,messages,order};
}
async function fromOrder(page:Page){await page.goto('/customer/orders/'+id(1));await page.getByRole('button',{name:'Hỏi Store về đơn này',exact:true}).click();return page.getByRole('dialog',{name:'Trung tâm chat',exact:true});}

test('delivery-return contact opens the exact Store and order without losing the unfinished case',async({page})=>{
 const m=await model(page,{deliveryFailure:true});await page.goto('/customer/orders/'+m.order.id);
 const region=page.getByRole('region',{name:'Giao thất bại và hoàn về',exact:true});
 await region.getByRole('button',{name:'Hỏi Store về đơn này',exact:true}).focus();await page.keyboard.press('Enter');
 const chat=page.getByRole('dialog',{name:'Trung tâm chat',exact:true});await expect(chat.getByRole('region',{name:'Đơn hàng tham chiếu khi gửi',exact:true})).toContainText('Áo đặt trước đây');
 expect(m.starts).toEqual([{store_id:id(2),order_id:id(1)}]);expect(m.sends).toEqual([]);await expect(page).toHaveURL(new RegExp('/customer/orders/'+m.order.id+'$'));
 await chat.getByRole('button',{name:'Đóng chat',exact:true}).click();
 for(const width of (process.env.CORE_FIX_DESKTOP_ONLY==='1'?[1440]:[1440,390])){
  await page.setViewportSize({width,height:900});const cta=region.getByRole('button',{name:'Hỏi Store về đơn này',exact:true});await cta.scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await cta.evaluate(element=>{const r=element.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===element;})).toBe(true);
  await page.screenshot({path:test.info().outputPath('delivery-order-contact-'+width+'.png'),fullPage:true});await page.screenshot({path:test.info().outputPath('delivery-order-contact-viewport-'+width+'.png')});
 }
});
test('Customer opens a verified order context without sending, composes explicitly and persists the association',async({page},info)=>{
 const m=await model(page),dialog=await fromOrder(page);await expect(dialog.getByRole('region',{name:'Đơn hàng tham chiếu khi gửi',exact:true})).toContainText('Áo đặt trước đây');expect(m.starts).toEqual([{store_id:id(2),order_id:id(1)}]);expect(m.sends).toEqual([]);await dialog.getByRole('textbox',{name:'Nội dung tin nhắn',exact:true}).fill('Tôi cần đổi size của đơn này');await dialog.getByRole('button',{name:'Gửi tin nhắn',exact:true}).click();await expect(dialog.getByRole('log')).toContainText('Tôi cần đổi size của đơn này');expect(m.sends).toHaveLength(1);expect(m.sends[0]).toMatchObject({order_id:id(1),content:'Tôi cần đổi size của đơn này'});await expect(dialog.getByRole('log').getByRole('link',{name:'Xem đơn #00000001',exact:true})).toHaveAttribute('href','/customer/orders/'+id(1));
 for(const width of (process.env.CORE_FIX_DESKTOP_ONLY==='1'?[1440]:[1440,390])){await page.setViewportSize({width,height:900});const actions=dialog.locator('.message-order-actions');await expect(actions.getByRole('button',{name:'Trả lời về đơn này',exact:true})).toBeVisible();expect(await actions.evaluate(element=>parseFloat(getComputedStyle(element).columnGap))).toBeGreaterThanOrEqual(8);await page.screenshot({path:info.outputPath('order-chat-actions-'+width+'.png')});}
});
test('pending retry freezes both message body and order ID across minimize/reopen',async({page})=>{
 const m=await model(page,{lostAck:true}),dialog=await fromOrder(page);await dialog.getByRole('textbox',{name:'Nội dung tin nhắn',exact:true}).fill('Tin có kết quả chưa rõ');await dialog.getByRole('button',{name:'Gửi tin nhắn',exact:true}).click();await expect(dialog.getByRole('button',{name:'Bỏ tham chiếu đơn',exact:true})).toBeDisabled();await dialog.getByRole('button',{name:'Thu nhỏ chat',exact:true}).click();await page.getByRole('button',{name:'Khôi phục chat',exact:true}).click();await dialog.getByRole('button',{name:'Thử gửi lại',exact:true}).click();await expect(dialog.getByRole('status')).toContainText('Đã gửi tin nhắn');expect(m.sends).toHaveLength(2);expect(m.sends[1]).toEqual(m.sends[0]);expect(m.messages).toHaveLength(1);
});
test('a generic draft is retained instead of being silently retagged to an order',async({page})=>{
 const m=await model(page);let dialog=page.getByRole('dialog',{name:'Trung tâm chat',exact:true}); await page.goto('/stores/'+id(2));await page.getByRole('button',{name:'Nhắn tin gian hàng',exact:true}).click();dialog=page.getByRole('dialog',{name:'Trung tâm chat',exact:true});await dialog.getByRole('textbox',{name:'Nội dung tin nhắn',exact:true}).fill('Bản nháp cho trao đổi khác');await dialog.getByRole('button',{name:'Đóng chat',exact:true}).click();await page.getByRole('button',{name:'Menu tài khoản',exact:true}).click();await page.getByRole('navigation',{name:'Menu tài khoản',exact:true}).getByRole('link',{name:'Đơn hàng',exact:true}).click();await page.getByRole('link',{name:'Xem chi tiết',exact:true}).click();await page.getByRole('button',{name:'Hỏi Store về đơn này',exact:true}).click();await expect(dialog.getByRole('textbox',{name:'Nội dung tin nhắn',exact:true})).toHaveValue('Bản nháp cho trao đổi khác');await expect(dialog.getByRole('alert')).toContainText('ngữ cảnh khác');await expect(dialog.getByRole('region',{name:'Đơn hàng tham chiếu khi gửi',exact:true})).toHaveCount(0);expect(m.sends).toEqual([]);
});
test('Seller follows the verified message back to its Store order queue and can reply with the same reference',async({page})=>{
 const m=await model(page,{seller:true});await page.goto('/seller/messages/'+id(7));await page.getByRole('button',{name:'Trả lời về đơn này',exact:true}).click();await expect(page.getByRole('region',{name:'Đơn hàng tham chiếu khi gửi',exact:true})).toBeVisible();await page.getByRole('textbox',{name:'Nội dung tin nhắn',exact:true}).fill('Store đã kiểm tra đúng đơn');await page.getByRole('button',{name:'Gửi tin nhắn',exact:true}).click();await expect(page.getByRole('log')).toContainText('Store đã kiểm tra đúng đơn');expect(m.sends[0].order_id).toBe(id(1));await page.getByRole('log').getByRole('link',{name:'Xem đơn #00000001',exact:true}).first().click();await expect(page).toHaveURL(new RegExp('/seller/orders\\?q='+id(1)));await expect(page.locator('tbody')).toContainText('Áo đặt trước đây');
});
test('an invalid lookup response does not open an unrelated order composer',async({page})=>{
 const m=await model(page,{wrongContext:true});await page.goto('/customer/orders/'+id(1));await page.getByRole('button',{name:'Hỏi Store về đơn này',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Chưa đọc được ngữ cảnh đúng đơn hàng');await expect(page.getByRole('dialog',{name:'Trung tâm chat',exact:true})).not.toBeVisible();expect(m.sends).toEqual([]);
});
test('a failed history GET after send acknowledgement does not turn a confirmed send into an UNKNOWN retry',async({page})=>{
 const m=await model(page,{getAfterAckFails:true}),dialog=await fromOrder(page);await dialog.getByRole('textbox',{name:'Nội dung tin nhắn',exact:true}).fill('Tin đã được xác nhận');await dialog.getByRole('button',{name:'Gửi tin nhắn',exact:true}).click();await expect(dialog.getByRole('status')).toContainText('Đã gửi tin nhắn');await expect(dialog.getByRole('alert')).toContainText('Lịch sử tạm lỗi');await expect(dialog.getByRole('button',{name:'Thử gửi lại',exact:true})).toHaveCount(0);expect(m.sends).toHaveLength(1);
});
