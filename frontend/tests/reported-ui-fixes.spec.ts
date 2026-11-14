import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'ba150000-0000-4000-8000-'+String(n).padStart(12,'0');
const user=id(1),store=id(2),product=id(3),variant=id(4),orderId=id(5);
async function model(page:Page,options:{lostDelete?:boolean;metadataDown?:boolean;historyDown?:boolean;overstock?:boolean}={}){
 const productData={...fixtures.getProduct.response,id:product,store_id:store,title:'Áo kiểm tra lỗi',status:'ACTIVE',images:[],variant_axes:[],
  variants:[{id:variant,sku:'INTERNAL-SKU-CUSTOMER',variant_values:{},price_vnd:100000,available_quantity:2,is_default:true,status:'ACTIVE'}]};
 const state={cart:[1,2,3].map(n=>({id:id(10+n),store_id:store,product_id:product,variant_id:variant,quantity:n===1?(options.overstock?3:2):1})),deletes:[] as string[],updates:[] as number[],deleteActive:0,maxConcurrent:0,
  sessions:Array.from({length:25},(_,n)=>({id:id(100+n),created_at:'2026-11-14T00:00:00Z'})),historyDeletes:[] as string[],sends:[] as string[],errors:[] as string[]};
 const paged=(items:unknown[],size=100)=>({items,total:items.length,page:1,size});
 await page.context().addCookies([{name:'pbl6_csrf',value:'fixture',url:process.env.WEB_TEST_URL||'http://127.0.0.1:3000'}]);
 await page.context().route('**/api/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url()),p=url.pathname.replace('/api/v1',''),method=req.method();let body:any;try{body=req.postDataJSON()}catch{}
  const reply=(json:unknown)=>route.fulfill({json});
  if(p.startsWith('/auth/'))return reply({...fixtures.login.response,context:{user_id:user,roles:['CUSTOMER'],role_permissions:[],token_version:0}});
  if(p==='/me')return reply({...fixtures.getProfile.response,user_id:user,display_name:'Khách kiểm thử',email:'fixture@example.test'});
  if(p==='/products'||p==='/products/'+product)return options.metadataDown?route.fulfill({status:503,json:{code:'DOWN',message:'Chưa tải được hàng',details:[]}}):reply(p==='/products'?paged([productData]):productData);
  if(p==='/stores/'+store)return reply({id:store,name:'Gian hàng kiểm thử',shipping_fee_vnd:20000});
  if(p==='/cart/items'&&method==='GET')return reply(paged(state.cart));
  if(p.startsWith('/cart/items/')&&method==='DELETE'){
   state.deletes.push(p);state.deleteActive++;state.maxConcurrent=Math.max(state.maxConcurrent,state.deleteActive);
   await new Promise(resolve=>setTimeout(resolve,25));state.cart=state.cart.filter(x=>x.id!==p.split('/')[3]);state.deleteActive--;
   if(options.lostDelete&&state.deletes.length===2)return route.fulfill({status:503,json:{code:'LOST_ACK',message:'Chưa rõ kết quả xóa.',details:[]}});
   return route.fulfill({status:204});
  }
  if(p.startsWith('/cart/items/')&&method==='PATCH'){state.updates.push(body.quantity);const row=state.cart.find(x=>x.id===p.split('/')[3])!;row.quantity=body.quantity;return reply(row);}
  if(p==='/me/vouchers')return reply(paged([{id:id(20),code:'SAVE30',scope:'PLATFORM',discount_type:'FIXED',discount_value:30000,min_goods_vnd:0,ends_at:'2027-01-01T00:00:00Z'}]));
  if(p==='/me/chat/sessions'&&method==='DELETE'){
   state.historyDeletes.push('all');if(options.historyDown)return route.fulfill({status:503,json:{code:'DOWN',message:'Chưa thể xóa lịch sử.',details:[]}});
   const count=state.sessions.length;state.sessions=[];return reply({deleted_count:count});
  }
  if(p.startsWith('/me/chat/sessions/')&&method==='DELETE'){const selected=p.split('/')[4];state.historyDeletes.push(selected);state.sessions=state.sessions.filter(x=>x.id!==selected);return reply({deleted_count:1});}
  if(p==='/me/chat/sessions'){
   const sid=url.searchParams.get('session_id'),number=Number(url.searchParams.get('page')||1);
   return reply(sid?{...paged(state.sessions.filter(x=>x.id===sid).map(x=>({...x,messages:paged([{id:id(99),role:'USER',content:'Nội dung cũ'}],20)}))),size:20}:{items:state.sessions.slice((number-1)*20,number*20),total:state.sessions.length,page:number,size:20});
  }
  if(p==='/chat/sessions'&&method==='POST')return reply({id:id(300),created_at:'2026-11-14T00:00:00Z'});
  if(p.startsWith('/chat/sessions/')&&method==='POST'){state.sends.push(body.content);return reply({id:id(301),session_id:id(300),role:'ASSISTANT',content:'Đã nhận câu hỏi',fallback:true,product_cards:[]});}
  if(p==='/me/conversations')return reply({...paged([],20),unread_total:0});
  if(p.startsWith('/recommendations/'))return reply({source:'BASELINE',product_ids:[],recently_viewed_product_ids:[]});
  if(p==='/me/orders'||p==='/me/orders/'+orderId){const order={...fixtures.getOwnOrder.response,id:orderId,store_id:store,status:'COMPLETED',payment_method:'COD',payment_status:'SUCCEEDED',refund_status:undefined,
   items:[{id:id(40),product_id:product,variant_id:variant,quantity:2,unit_price_vnd:100000,sku_snapshot:'INTERNAL-SNAPSHOT',product_snapshot:{title:'Áo đã mua',variant_values:{}}}],amounts:{goods_vnd:200000,shipping_vnd:20000,payable_vnd:220000},created_at:'2026-11-14T00:00:00Z'};return reply(p==='/me/orders'?paged([order],20):order);}
  if(p==='/me/notifications')return reply({...paged([{id:'ORDER_STATUS:'+orderId,order_id:orderId,kind:'ORDER_STATUS',event_status:'SHIPPED',created_at:'2026-11-14T00:00:00Z',read:false}],20),unread:1});
  if(p==='/checkout/quotes')return reply(fixtures.quoteCheckout.response);
  return reply(paged([]));
 });
 page.on('pageerror',error=>state.errors.push(error.message));
 return state;
}

for(const width of [320,390,768,1366])test(`purchase CTA remains visible and clickable at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:844});const state=await model(page);await page.goto('/cart');
 const pay=page.getByRole('button',{name:'Thanh toán',exact:true});await expect(pay).toBeEnabled();
 await pay.scrollIntoViewIfNeeded();
 expect(await pay.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&!!hit&&el.contains(hit)})).toBe(true);
 await expect(page.getByText('Miễn phí vận chuyển cho đơn hàng',{exact:true})).toHaveCount(0);
 await expect(page.getByText(/Tạm tính \(4 sản phẩm\)/)).toBeVisible();
 await expect(page.getByText('Phí giao hàng và ưu đãi được xác nhận khi thanh toán.',{exact:true})).toBeVisible();
 await expect(page.locator('main').getByText(/INTERNAL/)).toHaveCount(0);
 await page.screenshot({path:info.outputPath('cart-'+width+'.png'),fullPage:true});
 await pay.click();await expect(page).toHaveURL(/\/checkout$/);expect(state.errors).toEqual([]);
});

test('stock max blocks increment and invalid direct quantities, including stale overstock selection',async({page})=>{
 const state=await model(page,{overstock:true});await page.goto('/cart');
 await expect(page.getByRole('button',{name:'Thanh toán',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Tăng số lượng',exact:true}).first()).toBeDisabled();
 await page.getByRole('button',{name:'Giảm số lượng',exact:true}).first().click();
 await expect(page.getByRole('spinbutton',{name:'Số lượng sản phẩm',exact:true}).first()).toHaveValue('2');
 await expect(page.getByRole('button',{name:'Thanh toán',exact:true})).toBeEnabled();
 const input=page.getByRole('spinbutton',{name:'Số lượng sản phẩm',exact:true}).first();
 await input.fill('5');await input.blur();await expect(input).toHaveValue('2');
 await input.fill('1.5');await input.blur();await expect(input).toHaveValue('2');
 expect(state.updates).toEqual([2]);await expect(page.getByText('Chỉ còn 2 sản phẩm.',{exact:true}).first()).toBeVisible();
});

test('bulk removal deletes every selected row sequentially and only once',async({page})=>{
 const state=await model(page);await page.goto('/cart');const remove=page.getByRole('button',{name:'Xóa (3)',exact:true});await expect(remove).toBeVisible();
 await remove.evaluate(el=>{(el as HTMLButtonElement).click();(el as HTMLButtonElement).click()});
 await expect(page.getByText('Giỏ hàng của bạn đang trống.',{exact:true})).toBeVisible();
 expect(state.deletes).toHaveLength(3);expect(new Set(state.deletes).size).toBe(3);expect(state.maxConcurrent).toBe(1);
});

test('uncertain bulk removal stops, reads back, then removes only the remaining row',async({page})=>{
 const state=await model(page,{lostDelete:true});await page.goto('/cart');await page.getByRole('button',{name:'Xóa (3)',exact:true}).click();
 await expect(page.getByRole('button',{name:'Làm mới',exact:true})).toBeVisible();expect(state.deletes).toHaveLength(2);
 await expect(page.getByRole('button',{name:'Thanh toán',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(page.getByRole('button',{name:'Xóa (1)',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Xóa (1)',exact:true}).click();await expect(page.getByText('Giỏ hàng của bạn đang trống.',{exact:true})).toBeVisible();expect(new Set(state.deletes).size).toBe(3);
});

test('unavailable product metadata never becomes a zero payable checkout',async({page})=>{
 await model(page,{metadataDown:true});await page.goto('/cart');await expect(page.getByText('Chưa có giá',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Thanh toán',exact:true})).toBeDisabled();
});

test('voucher opens, selects, applies and restores focus using only keyboard',async({page})=>{
 await model(page);await page.goto('/cart');const opener=page.getByRole('button',{name:/Mã giảm giá/});await opener.focus();await page.keyboard.press('Enter');
 const dialog=page.getByRole('dialog',{name:'Chọn mã giảm giá',exact:true});await expect(dialog).toBeVisible();const voucher=dialog.getByRole('button',{name:'Mã SAVE30',exact:true});await voucher.focus();await page.keyboard.press('Space');await expect(voucher).toHaveAttribute('aria-pressed','true');
 await dialog.getByRole('button',{name:'Áp dụng',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();await expect(opener).toContainText('SAVE30');
});

test('password uses account navigation and Customer views hide SKU',async({page})=>{
 await model(page);await page.goto('/change-password');await expect(page.getByRole('complementary',{name:'Điều hướng tài khoản',exact:true})).toBeVisible();
 await page.goto('/products/'+product);await expect(page.locator('main').getByText(/INTERNAL|Mã hàng/)).toHaveCount(0);
 await page.goto('/customer/orders/'+orderId);await expect(page.locator('main').getByText(/INTERNAL|SKU/)).toHaveCount(0);
});

test('AI deletes server history across every page and a fresh tab stays empty',async({page})=>{
 const state=await model(page);page.on('dialog',d=>d.accept());await page.goto('/');await page.getByRole('button',{name:'Mở chat',exact:true}).first().click();
 const dialog=page.getByRole('dialog',{name:'Trung tâm chat',exact:true});await expect(dialog.getByRole('button',{name:'Xóa phiên chat',exact:true})).toHaveCount(20);
 await dialog.getByRole('button',{name:'Xóa toàn bộ lịch sử',exact:true}).click();await expect(dialog.getByText('Chưa có phiên chat.',{exact:true})).toBeVisible();expect(state.historyDeletes).toEqual(['all']);expect(state.sessions).toHaveLength(0);
 const fresh=await page.context().newPage();await fresh.goto('/');await fresh.getByRole('button',{name:'Mở chat',exact:true}).first().click();await expect(fresh.getByText('Chưa có phiên chat.',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>Object.keys(localStorage).some(x=>x.startsWith('pbl6_deleted_ai_sessions_')))).toBe(false);
});

test('failed history deletion preserves visible sessions',async({page})=>{
 const state=await model(page,{historyDown:true});page.on('dialog',d=>d.accept());await page.goto('/');await page.getByRole('button',{name:'Mở chat',exact:true}).first().click();await page.getByRole('button',{name:'Xóa toàn bộ lịch sử',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Chưa thể xóa lịch sử.');expect(state.sessions).toHaveLength(25);await expect(page.getByRole('button',{name:'Xóa phiên chat',exact:true})).toHaveCount(20);
});

test('chat exposes text support and sends a contract-sized message',async({page})=>{
 const state=await model(page);await page.goto('/');await page.getByRole('button',{name:'Mở chat',exact:true}).first().click();const dialog=page.getByRole('dialog',{name:'Trung tâm chat',exact:true});
 await expect(dialog.locator('input[type=file]')).toHaveCount(0);await expect(dialog.getByRole('button',{name:'Gửi hình ảnh',exact:true})).toHaveCount(0);await expect(dialog.getByText('Chỉ hỗ trợ tin nhắn văn bản.',{exact:true}).first()).toBeVisible();
 await dialog.getByRole('textbox',{name:'Câu hỏi',exact:true}).fill('Tìm một chiếc áo');await dialog.getByRole('button',{name:'Gửi câu hỏi',exact:true}).click();await expect(dialog.getByText('Đã nhận câu hỏi',{exact:true})).toBeVisible();expect(state.sends).toEqual(['Tìm một chiếc áo']);
});

test('single AI deletion persists in another tab without hiding other sessions',async({page})=>{
 const state=await model(page);page.on('dialog',d=>d.accept());await page.goto('/');await page.getByRole('button',{name:'Mở chat',exact:true}).first().click();
 await page.getByRole('button',{name:'Xóa phiên chat',exact:true}).first().click();await expect.poll(()=>state.sessions.length).toBe(24);
 expect(state.historyDeletes).toEqual([id(100)]);
 const fresh=await page.context().newPage();await fresh.goto('/');await fresh.getByRole('button',{name:'Mở chat',exact:true}).first().click();await expect(fresh.locator('.chat-sidebar-heading')).toContainText('24');
});

test('order summary counts units and return navigation shares the tab row',async({page})=>{
 await model(page);await page.goto('/customer/orders');await expect(page.getByText('Tổng thanh toán (2 sản phẩm):',{exact:true})).toBeVisible();await expect(page.getByText('Ảnh hiện tại của sản phẩm',{exact:true})).toHaveCount(0);
 const tabs=page.getByRole('navigation',{name:'Lọc nhanh trạng thái đơn'});await expect(tabs.getByRole('link',{name:'Đổi trả',exact:true})).toBeVisible();
 await page.setViewportSize({width:390,height:844});expect(await tabs.evaluate(el=>getComputedStyle(el).flexWrap)).toBe('nowrap');
});

test('mobile notification content retains a readable column',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await model(page);await page.goto('/customer/notifications');
 const row=page.locator('.shopee-noti-row').first();await expect(row).toBeVisible();expect(await row.locator('p').first().evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThan(170);
 await page.screenshot({path:info.outputPath('notifications-mobile.png'),fullPage:true});
});
