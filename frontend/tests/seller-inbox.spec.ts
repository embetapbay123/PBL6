import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'e7000000-0000-4000-8000-'+String(n).padStart(12,'0');
test.use({viewport:{width:1440,height:900}});
async function setup(page:Page){
 const state={archived:false,unread:2,reads:[] as string[],archives:[] as boolean[],loseArchiveAck:false};
 const context={user_id:id(1),roles:['CUSTOMER','STORE_OWNER'],role_permissions:[],token_version:0,store_membership:{store_id:id(2),role:'OWNER',status:'ACTIVE',permissions:[]}};
 const thread={id:id(3),store_id:id(2),store_name:'Cửa hàng',customer_name:'Nguyễn An',updated_at:'2026-11-03T01:00:00Z',last_message:'Hỏi đơn hàng',last_order_id:id(9),last_product_mention:'Áo thun quà tặng'};
 const messages=[{id:id(5),conversation_id:id(3),sender_side:'CUSTOMER',content:'Tin mới',created_at:'2026-11-03T01:00:00Z'},{id:id(4),conversation_id:id(3),sender_side:'CUSTOMER',content:'Tin trước',created_at:'2026-11-02T01:00:00Z'}];
 await page.route('**/api/v1/**',route=>{const req=route.request(),u=new URL(req.url()),p=u.pathname.replace('/api/v1','');
  if(p==='/auth/login'||p==='/auth/refresh')return route.fulfill({json:{...fixtures.login.response,context},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(p==='/me/context')return route.fulfill({json:context});
  if(p==='/store/conversations'&&req.method()==='GET'){const visible=(u.searchParams.get('archived')==='true')===state.archived;return route.fulfill({json:{items:visible?[{...thread,unread_count:state.unread,archived:state.archived}]:[],total:visible?1:0,page:1,size:Number(u.searchParams.get('size')??20),unread_total:state.archived?0:state.unread}});}
  if(p==='/store/conversations/'+id(3)+'/messages')return route.fulfill({json:{conversation_id:id(3),conversation:thread,items:messages,total:messages.length,page:1,size:20}});
  if(p==='/store/conversations/'+id(3)+'/read'){const body=req.postDataJSON();state.reads.push(body.message_id);state.unread=0;return route.fulfill({json:{id:id(3),archived:state.archived,unread_count:0}});}
  if(p==='/store/conversations/'+id(3)+'/archive'){const body=req.postDataJSON();state.archived=body.archived;state.archives.push(body.archived);if(state.loseArchiveAck){state.loseArchiveAck=false;return route.fulfill({status:503,json:{code:'UNKNOWN',message:'Chưa rõ kết quả'}});}return route.fulfill({json:{id:id(3),archived:state.archived,unread_count:state.unread}});}
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture chưa cấu hình'}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();await page.goto('/seller/messages');return state;
}
test('inbox shows server unread, marks only displayed newest message, and archives/reopens without deleting',async({page})=>{
 const state=await setup(page);const contacts=page.getByRole('navigation',{name:'Hội thoại'});await expect(contacts.getByLabel('2 tin nhắn chưa đọc')).toBeVisible();await expect(contacts).toContainText('Đơn được nhắc tới: #00000009');await expect(contacts).toContainText('Khách nhắc sản phẩm: Áo thun quà tặng');await expect(page.getByRole('complementary',{name:'Menu Store'}).getByRole('link',{name:'Tin nhắn khách hàng · 2 tin chưa đọc'})).toBeVisible();
 await contacts.getByRole('link',{name:/Nguyễn An/}).click();await expect.poll(()=>state.reads).toEqual([id(5)]);await expect(contacts.getByLabel('2 tin nhắn chưa đọc')).toHaveCount(0);
 await page.getByRole('button',{name:'Lưu trữ hội thoại',exact:true}).click();await expect(page).toHaveURL(/\/seller\/messages$/);expect(state.archives).toEqual([true]);
 await page.getByRole('button',{name:'Xem hội thoại đã lưu trữ',exact:true}).click();await page.getByRole('navigation',{name:'Hội thoại'}).getByRole('link',{name:/Nguyễn An/}).click();await page.getByRole('button',{name:'Mở lại hội thoại',exact:true}).click();expect(state.archives).toEqual([true,false]);await expect(page).toHaveURL(/\/seller\/messages$/);
});
test('uncertain archive acknowledgement blocks another write until explicit readback',async({page})=>{
 const state=await setup(page);state.loseArchiveAck=true;await page.getByRole('navigation',{name:'Hội thoại'}).getByRole('link',{name:/Nguyễn An/}).click();await expect.poll(()=>state.reads.length).toBe(1);
 await page.getByRole('button',{name:'Lưu trữ hội thoại',exact:true}).click();await expect(page.getByRole('button',{name:'Đọc lại hội thoại trước khi tiếp tục',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Lưu trữ hội thoại',exact:true})).toBeDisabled();expect(state.archives).toEqual([true]);
 await page.getByRole('button',{name:'Đọc lại hội thoại trước khi tiếp tục',exact:true}).click();await expect(page.getByRole('button',{name:'Lưu trữ hội thoại',exact:true})).toHaveCount(0);expect(state.archives).toEqual([true]);
});
test('Seller can minimize the inbox and return to an unsent draft without leaving the current task',async({page})=>{
 await setup(page); await page.goto('/seller/inventory');
 const launch=page.getByRole('button',{name:/Tin nhắn khách hàng/});
 await expect(launch).toBeVisible(); await launch.click();
 const panel=page.getByRole('region',{name:'Hộp thư Store'});
 await panel.getByRole('link',{name:/Nguyễn An/}).click();
 await panel.getByLabel('Nội dung tin nhắn').fill('Tôi đang kiểm tra đơn của bạn.');
 await panel.getByRole('button',{name:'Thu nhỏ tin nhắn'}).click();
 await expect(panel).toBeHidden(); await expect(page).toHaveURL(/\/seller\/inventory$/);
 await launch.click(); await expect(panel.getByLabel('Nội dung tin nhắn')).toHaveValue('Tôi đang kiểm tra đơn của bạn.');
});
