import {test, expect, type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'8a000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function model(page:Page,{lostAck=false,rejectRetry=false}={}){
 const threads=Array.from({length:21},(_,n)=>({id:id(n+1),store_id:id(n+101),store_name:'Store riêng '+(n+1),customer_name:'Khách kiểm thử',updated_at:'2026-11-02T00:00:00Z'}));
 const reads:{id:string;page:number}[]=[],sends:any[]=[],messages=new Map<string,any[]>();
 const order={...fixtures.getOwnOrder.response,id:id(900),store_id:threads[1].store_id,status:'COMPLETED',items:[]};
 for(const thread of threads)messages.set(thread.id,Array.from({length:thread===threads[0]?22:1},(_,n)=>({id:id(1000+Number(thread.id.slice(-3))*100+n),conversation_id:thread.id,sender_side:'STORE',content:thread.store_name+' tin '+(n+1),created_at:new Date(Date.UTC(2026,10,2,0,n)).toISOString()})).reverse());
 let sendFailures=0;
 await page.route('**/api/v1/**',route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace('/api/v1','');
  if(path.startsWith('/auth/'))return route.fulfill({json:{...fixtures.login.response,access_token:'fixture-messaging-recovery',context:{user_id:id(999),roles:['CUSTOMER'],role_permissions:[],token_version:0}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  const store=threads.find(t=>path==='/stores/'+t.store_id);if(store)return route.fulfill({json:{id:store.store_id,name:store.store_name,shipping_fee_vnd:0}});
  if(path==='/me/conversations'){
   if(req.method()==='POST'){const body=req.postDataJSON(),chosen=threads.find(t=>t.store_id===body.store_id)!;return route.fulfill({status:201,json:{id:chosen.id,store_name:chosen.store_name,...(body.order_id?{order_context:{order_id:body.order_id,store_id:chosen.store_id,status:'COMPLETED',items:[]}}:{})}});}
   const p=Number(url.searchParams.get('page')??1);return route.fulfill({json:{items:threads.slice((p-1)*20,p*20),total:21,page:p,size:20}});
  }
  if(path==='/me/orders')return route.fulfill({json:{items:[order],total:1,page:1,size:20}});
  if(path==='/me/orders/'+order.id)return route.fulfill({json:order});
  const thread=threads.find(t=>path==='/me/conversations/'+t.id+'/messages');
  if(thread){
   if(req.method()==='POST'){
    const body=req.postDataJSON();sends.push(body);
    if(lostAck&&sendFailures++===0)return route.fulfill({status:503,json:{code:'ACK_LOST',message:'Kết quả chưa rõ'}});
    if(rejectRetry&&sendFailures===2)return route.fulfill({status:409,json:{code:'STORE_UNAVAILABLE',message:'Store tạm khóa khi đối chiếu'}});
    const row={id:id(9999),conversation_id:thread.id,sender_side:'CUSTOMER',content:body.content,created_at:'2026-11-02T00:30:00Z'};
    if(!messages.get(thread.id)!.some(m=>m.id===row.id))messages.get(thread.id)!.unshift(row);
    return route.fulfill({status:201,json:row});
   }
   const p=Number(url.searchParams.get('page')??1),rows=messages.get(thread.id)!;reads.push({id:thread.id,page:p});
   return route.fulfill({json:{conversation_id:thread.id,conversation:thread,items:rows.slice((p-1)*20,p*20),total:rows.length,page:p,size:20}});
  }
  if(path.startsWith('/recommendations/'))return route.fulfill({json:{source:'BASELINE',product_ids:[],recently_viewed_product_ids:[]}});
  return route.fulfill({json:{items:[],total:0,page:1,size:20}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();
 return {threads,reads,sends,messages};
}

test('a different Store opened through contact never inherits the previous Store message page',async({page})=>{
 const f=await model(page);await page.goto('/stores/'+f.threads[0].store_id);await page.getByRole('button',{name:'Nhắn tin gian hàng',exact:true}).click();
 const chat=page.getByRole('dialog',{name:'Trung tâm chat',exact:true});await expect(chat.getByRole('log')).toContainText('Store riêng 1 tin 22');
 await chat.getByRole('button',{name:'Trang sau',exact:true}).last().click();await expect(chat.getByRole('log')).toContainText('Store riêng 1 tin 1');
 await chat.getByRole('button',{name:'Đóng chat',exact:true}).click();
 await page.getByRole('button',{name:'Menu tài khoản',exact:true}).click();await page.getByRole('navigation',{name:'Menu tài khoản',exact:true}).getByRole('link',{name:'Đơn hàng',exact:true}).click();
 await page.getByRole('link',{name:'Xem chi tiết',exact:true}).click();await page.getByRole('button',{name:'Hỏi Store về đơn này',exact:true}).click();
 await expect(chat.getByRole('log')).toContainText('Store riêng 2 tin 1');
 expect(f.reads.filter(r=>r.id===f.threads[1].id).map(r=>r.page)).toEqual([1]);
});

test('a direct conversation outside the first list page identifies its actual Store independently of that list',async({page})=>{
 const f=await model(page);await page.goto('/customer/messages/'+f.threads[20].id);
 await expect(page.getByRole('main').getByRole('heading',{name:'Store riêng 21',exact:true})).toBeVisible();
 await expect(page.getByRole('log')).toContainText('Store riêng 21 tin 1');
 expect(f.reads).toEqual([{id:f.threads[20].id,page:1}]);
});

test('an uncertain message keeps its exact key and body after a retry meets a temporary Store conflict',async({page})=>{
 const f=await model(page,{lostAck:true,rejectRetry:true});await page.goto('/customer/messages/'+f.threads[0].id);
 const input=page.getByRole('textbox',{name:'Nội dung tin nhắn',exact:true});await input.fill('Giữ mã gửi khi chưa rõ kết quả');await page.getByRole('button',{name:'Gửi tin nhắn',exact:true}).click();
 await page.getByRole('button',{name:'Thử gửi lại',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Store tạm khóa');
 await expect(input).toBeDisabled();await expect(page.getByRole('button',{name:'Thử gửi lại',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Thử gửi lại',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã gửi tin nhắn');
 expect(f.sends).toHaveLength(3);expect(f.sends[1]).toEqual(f.sends[0]);expect(f.sends[2]).toEqual(f.sends[0]);
});

test('hidden-document polling pauses, resumes by reading and preserves the unsent draft',async({page})=>{
 await page.clock.install();const f=await model(page);await page.goto('/customer/messages/'+f.threads[0].id);
 await expect(page.getByRole('log')).toContainText('Store riêng 1 tin 22');
 await page.getByRole('textbox',{name:'Nội dung tin nhắn',exact:true}).fill('Bản nháp chưa gửi khi đổi tab');
 const before=f.reads.length;
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange',{bubbles:true}));});
 await page.clock.fastForward(31000);expect(f.reads).toHaveLength(before);expect(f.sends).toHaveLength(0);
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange',{bubbles:true}));});
 await expect.poll(()=>f.reads.length).toBeGreaterThan(before);
 await expect(page.getByRole('textbox',{name:'Nội dung tin nhắn',exact:true})).toHaveValue('Bản nháp chưa gửi khi đổi tab');expect(f.sends).toHaveLength(0);
});

test('a mismatched history response is an error and cannot enable a message to another conversation',async({page})=>{
 const f=await model(page);await page.route('**/api/v1/me/conversations/'+f.threads[0].id+'/messages*',route=>route.fulfill({json:{conversation_id:f.threads[0].id,conversation:f.threads[1],items:[],total:0,page:1,size:20}}));
 await page.goto('/customer/messages/'+f.threads[0].id);await expect(page.getByRole('alert')).toContainText('không khớp hội thoại');
 await expect(page.getByRole('textbox',{name:'Nội dung tin nhắn',exact:true})).toBeDisabled();expect(f.sends).toHaveLength(0);
});

test('order-reference chat retains a readable history instead of shrinking it below its messages',async({page})=>{
 const f=await model(page);await page.goto('/customer/orders/'+id(900));await page.getByRole('button',{name:'Hỏi Store về đơn này',exact:true}).click();
 const chat=page.getByRole('dialog',{name:'Trung tâm chat',exact:true}),log=chat.getByRole('log');
 await expect(chat.getByRole('region',{name:'Đơn hàng tham chiếu khi gửi',exact:true})).toBeVisible();
 await expect.poll(()=>log.evaluate(element=>element.clientHeight)).toBeGreaterThanOrEqual(160);
 await log.scrollIntoViewIfNeeded();await expect(log.getByText('Store riêng 2 tin 1',{exact:true})).toBeInViewport();
});

test('polling while reading older messages preserves position and draft, with an explicit route to the new message',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.clock.install();const f=await model(page);await page.goto('/customer/messages/'+f.threads[0].id);
 const log=page.getByRole('log');await expect(log).toContainText('Store riêng 1 tin 22');await log.scrollIntoViewIfNeeded();
 await expect(log.getByText('Store riêng 1 tin 22',{exact:true})).toBeInViewport();
 const input=page.getByRole('textbox',{name:'Nội dung tin nhắn',exact:true});await input.fill('Đang viết, vẫn đọc phần cũ');
 await log.evaluate(element=>{element.scrollTop=0;element.dispatchEvent(new Event('scroll'));});
 f.messages.get(f.threads[0].id)!.unshift({id:id(9990),conversation_id:f.threads[0].id,sender_side:'STORE',content:'Tin mới cần đọc sau',created_at:'2026-11-02T00:40:00Z'});
 await page.clock.fastForward(11000);const latest=page.getByRole('button',{name:'Có tin nhắn mới · Xem cuối hội thoại',exact:true});await expect(latest).toBeVisible();
 expect(await log.evaluate(element=>element.scrollTop)).toBe(0);await expect(input).toBeFocused();await expect(input).toHaveValue('Đang viết, vẫn đọc phần cũ');
 await latest.focus();await page.keyboard.press('Enter');await expect(log.getByText('Tin mới cần đọc sau',{exact:true})).toBeInViewport();expect(f.sends).toHaveLength(0);
});

test('an older history page is not shifted by automatic polling or returning to the tab',async({page})=>{
 await page.clock.install();const f=await model(page);await page.goto('/customer/messages/'+f.threads[0].id);
 const history=page.getByRole('main').locator('.market-messages>div');await expect(history.getByRole('log')).toContainText('Store riêng 1 tin 22');
 await history.getByRole('button',{name:'Trang sau',exact:true}).click();await expect(history.getByRole('log')).toContainText('Store riêng 1 tin 1');
 const before=f.reads.length;await page.clock.fastForward(21000);
 await page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange',{bubbles:true}));});
 expect(f.reads).toHaveLength(before);await expect(history.getByRole('log')).toContainText('Store riêng 1 tin 1');
 await history.getByRole('button',{name:'Trang trước',exact:true}).click();await expect(history.getByRole('log')).toContainText('Store riêng 1 tin 22');
});
