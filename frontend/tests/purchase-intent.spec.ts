import {test,expect,type Page,type Route} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'67000000-0000-4000-8000-'+String(n).padStart(12,'0');
const store=id(1),product=id(2),red=id(3),blue=id(4),item=id(5),address=id(6),user=id(7),group=id(8);
const shirt={...fixtures.getProduct.response,id:product,store_id:store,title:'Áo công sở kiểm thử',status:'ACTIVE',moderation_status:'VISIBLE',images:[],attributes:{material:'Cotton'},variants:[{id:red,sku:'TS-9264',variant_values:{color:'Đỏ',size:'M'},status:'ACTIVE',is_default:true,price_vnd:100000},{id:blue,sku:'TS-9265',variant_values:{color:'Xanh',size:'L'},status:'ACTIVE',is_default:false,price_vnd:150000}]};
async function model(p:Page,{lostAck=false,guest=false}={}){
 const s={addresses:[{id:address,recipient_name:'Nguyễn Người Nhận',phone:'0901234567',line1:'123 Đường Kiểm Thử, tầng 15 khu nhận hàng sau cổng B',ward:'Phường A',district:'Quận B',city:'Đà Nẵng',is_default:true}],profile:{user_id:user,email:'fixture@example.test',display_name:'Tên hồ sơ cũ',phone:'0901234567'},cart:[{id:item,product_id:product,variant_id:red,store_id:store,quantity:5}],calls:[] as any[],quotes:[] as any[],confirmed:new Map<string,any>(),unit:100000,patch:undefined as Route|undefined,holdPatch:false};
 const paged=(items:any[])=>({items,page:1,size:100,total:items.length});
 function quote(body:any){const lines=body.source==='BUY_NOW'?[{...body.buy_now,store_id:store}]:s.cart.filter(x=>body.cart_item_ids.includes(x.id));const items=lines.map(x=>{const v=shirt.variants.find(v=>v.id===x.variant_id)!;const price=v.id===red?s.unit:v.price_vnd;return {product_id:x.product_id,variant_id:x.variant_id,quantity:x.quantity,product_title:shirt.title,variant_title:Object.values(v.variant_values).join(' / '),variant_values:v.variant_values,sku:v.sku,unit_price_vnd:price,line_total_vnd:price*x.quantity};});const goods=items.reduce((sum,x)=>sum+x.line_total_vnd,0),amounts={goods_vnd:goods,store_discount_vnd:0,platform_discount_vnd:0,shipping_vnd:20000,payable_vnd:goods+20000};return {quote_id:id(30+s.quotes.length),stores:[{store_id:store,items,amounts}],payable_total_vnd:amounts.payable_vnd,expires_at:new Date(Date.now()+600000).toISOString()};}
 await p.route('**/api/v1/**',async r=>{const q=r.request(),path=new URL(q.url()).pathname.replace('/api/v1',''),body=q.postData()?q.postDataJSON():undefined;s.calls.push({path,method:q.method(),body,key:q.headers()['idempotency-key']});
  if(path==='/auth/login'||path==='/auth/refresh')return r.fulfill({json:{...fixtures.login.response,access_token:'fixture-purchase',context:{user_id:user,roles:['CUSTOMER'],role_permissions:[],token_version:0}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/products')return r.fulfill({json:paged([shirt])});
  if(path==='/products/'+product)return r.fulfill({json:{...shirt,variants:shirt.variants.map(v=>({...v,price_vnd:v.id===red?s.unit:v.price_vnd}))}});
  if(path==='/categories'||path==='/product-types'||path.endsWith('/reviews')||path.endsWith('/related')||path==='/me/favorites'||path.endsWith('/products'))return r.fulfill({json:paged([])});
  if(path.startsWith('/recommendations/'))return r.fulfill({json:{source:'BASELINE',product_ids:[],recently_viewed_product_ids:[]}});
  if(path==='/stores/'+store)return r.fulfill({json:{id:store,name:'Store kiểm thử',status:'ACTIVE',shipping_fee_vnd:20000}});
  if(path==='/cart/items'&&q.method()==='GET')return r.fulfill({json:paged(s.cart)});
  if(path==='/me/addresses')return r.fulfill({json:paged(s.addresses)});
  if(path==='/me/addresses/'+address&&q.method()==='PATCH'){s.addresses[0]={...s.addresses[0],...body};return r.fulfill({json:s.addresses[0]});}
  if(path==='/me'){if(q.method()==='PATCH')s.profile={...s.profile,...body};return r.fulfill({json:s.profile});}
  if(path==='/cart/items/'+item&&q.method()==='PATCH'){if(s.holdPatch){s.patch=r;return;}s.cart[0].quantity=body.quantity;return r.fulfill({json:s.cart[0]});}
  if(path==='/cart/items/'+item&&q.method()==='DELETE'){s.cart=[];return r.fulfill({json:{status:'SUCCESS'}});}
  if(path==='/checkout/quotes'||path==='/vouchers/validate'){s.quotes.push(body);return r.fulfill({json:quote(body)});}
  if(path==='/orders/batches'&&q.method()==='POST'){
   const key=q.headers()['idempotency-key'];if(s.confirmed.has(key))return r.fulfill({status:201,json:s.confirmed.get(key)});
   const latest=quote(body);if(body.expected_payable_total_vnd!==latest.payable_total_vnd)return r.fulfill({status:409,json:{code:'QUOTE_CHANGED',message:'Giá thay đổi, hãy kiểm tra báo giá mới.'}});
   const order={id:id(9),purchase_group_id:group,store_id:store,status:'PENDING',version:0,payment_method:'COD',payment_status:'PENDING',amounts:latest.stores[0].amounts,items:latest.stores[0].items},result={purchase_group_id:group,order_ids:[order.id],orders:[order],payable_total_vnd:latest.payable_total_vnd};s.confirmed.set(key,result);if(body.source!=='BUY_NOW')s.cart=s.cart.filter(x=>!body.cart_item_ids.includes(x.id));return lostAck?r.fulfill({status:503,json:{code:'ORDER_RECOVERY_PENDING',message:'Chưa xác định kết quả.'}}):r.fulfill({status:201,json:result});
  }
  if(path==='/orders/batches/'+group)return r.fulfill({json:[...s.confirmed.values()][0]});
  return r.fulfill({status:404,json:{code:'NOT_FOUND',message:'Not configured: '+path}});
 });if(guest){await p.goto('/');return s;}await p.goto('/login');await p.getByLabel('Email',{exact:true}).fill('fixture@example.test');await p.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await p.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(p.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();return s;
}
async function detail(p:Page){await p.getByRole('link',{name:'Trang chủ PBL6',exact:true}).click();await p.locator('a[href="/products/'+product+'"]').first().click();await expect(p.getByRole('heading',{name:shirt.title,exact:true})).toBeVisible();}
async function cart(p:Page){await p.locator('header').getByRole('link',{name:'Giỏ hàng',exact:true}).click();await expect(p.getByRole('button',{name:'Thanh toán',exact:true})).toBeEnabled();}

async function changeFixtureAccount(p:Page){
 const next=id(99);await p.route('**/api/v1/auth/login',r=>r.fulfill({json:{...fixtures.login.response,access_token:'fixture-account-B',context:{user_id:next,roles:['CUSTOMER'],role_permissions:[],token_version:0}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}}));
 await p.evaluate(async()=>{const path=performance.getEntriesByType('resource').map(r=>r.name).find(url=>new URL(url).pathname==='/src/api/client.ts')!,c=await import(/* @vite-ignore */path);await c.api.login('b@example.test','Fixture-password-123');});return next;
}

test('an account switch while checkout is open cannot quote the previous account buy-now intent',async({page:p})=>{
 const s=await model(p);await detail(p);await p.getByLabel('Số lượng',{exact:true}).fill('2');await p.getByRole('button',{name:'Mua ngay',exact:true}).click();await expect(p.getByRole('button',{name:'Đặt hàng',exact:true})).toBeEnabled();
 let bQuotes=0;await p.route('**/api/v1/checkout/quotes',r=>{if(r.request().headers().authorization==='Bearer fixture-account-B')bQuotes++;return r.fallback();});await changeFixtureAccount(p);
 await expect(p.locator('main')).toContainText('Chưa có sản phẩm nào được chọn');expect(bQuotes).toBe(0);expect(s.confirmed.size).toBe(0);
});

for(const rejectionCode of ['INSUFFICIENT_STOCK','VARIANT_CONFIGURATION_INVALID'])test('a certain '+rejectionCode+' rejection releases the frozen attempt so the buyer can correct the purchase',async({page:p})=>{
 const s=await model(p);await cart(p);await p.getByRole('button',{name:'Thanh toán',exact:true}).click();await expect(p.getByRole('button',{name:'Đặt hàng',exact:true})).toBeEnabled();
 await p.route('**/api/v1/orders/batches',r=>r.fulfill({status:409,json:{code:rejectionCode,message:'Không đủ tồn khả dụng hoặc cấu hình đã thay đổi.'}}));await p.getByRole('button',{name:'Đặt hàng',exact:true}).click();await expect(p.getByRole('combobox',{name:'Địa chỉ nhận hàng',exact:true})).toBeVisible();await expect(p.getByRole('alert')).toContainText('Không đủ tồn');expect(await p.evaluate(user=>sessionStorage.getItem('pbl6_checkout_attempt_'+user),user)).toBeNull();expect(s.confirmed.size).toBe(0);
});

test('changing account during a submitted checkout retains the original user attempt for reconciliation',async({page:p})=>{
 await model(p);await detail(p);await p.getByRole('button',{name:'Mua ngay',exact:true}).click();await expect(p.getByRole('button',{name:'Đặt hàng',exact:true})).toBeEnabled();let route:Route|undefined;await p.route('**/api/v1/orders/batches',r=>{route=r;});await p.getByRole('button',{name:'Đặt hàng',exact:true}).click();await expect.poll(()=>!!route).toBe(true);
 const before=await p.evaluate(user=>sessionStorage.getItem('pbl6_checkout_attempt_'+user),user);expect(before).not.toBeNull();await changeFixtureAccount(p);await expect.poll(()=>p.evaluate(user=>sessionStorage.getItem('pbl6_checkout_attempt_'+user),user)).toBe(before);await route!.fulfill({status:503,json:{code:'ORDER_RECOVERY_PENDING',message:'Unknown'}}).catch(()=>{});await expect.poll(()=>p.evaluate(user=>sessionStorage.getItem('pbl6_checkout_attempt_'+user),user)).toBe(before);
});

for(const cartQuantity of [0,2,5])test('direct checkout buys exactly two and leaves cart quantity '+cartQuantity+' intact',async({page:p})=>{
 const s=await model(p);s.cart=cartQuantity?[{id:item,product_id:product,variant_id:red,store_id:store,quantity:cartQuantity}]:[];await detail(p);await p.getByLabel('Số lượng',{exact:true}).fill('2');await p.getByRole('button',{name:'Mua ngay',exact:true}).click();await expect(p.getByRole('button',{name:'Đặt hàng',exact:true})).toBeEnabled();await p.getByRole('button',{name:'Đặt hàng',exact:true}).click();await expect(p.getByRole('heading',{name:'Đã tạo nhóm đơn hàng',exact:true})).toBeVisible();expect([...s.confirmed.values()][0].orders[0].items[0].quantity).toBe(2);expect(s.cart.reduce((n,row)=>n+row.quantity,0)).toBe(cartQuantity);expect(s.calls.filter(x=>x.path==='/cart/items'&&x.method==='POST')).toHaveLength(0);
});

test('an expired unsent buy-now intent is not silently restored after reload',async({page:p})=>{
 const s=await model(p);await detail(p);await p.getByRole('button',{name:'Mua ngay',exact:true}).click();await expect(p.getByRole('button',{name:'Đặt hàng',exact:true})).toBeEnabled();const before=s.quotes.length;await p.clock.setFixedTime(new Date(Date.now()+31*60*1000));await p.reload();await expect(p.locator('main')).toContainText('Chưa có sản phẩm nào được chọn');expect(s.quotes.length).toBe(before);expect(s.confirmed.size).toBe(0);
});

test('a submitted uncertain attempt outlives the ordinary draft TTL and retries its exact original key',async({page:p})=>{
 const s=await model(p,{lostAck:true});await detail(p);await p.getByRole('button',{name:'Mua ngay',exact:true}).click();await expect(p.getByRole('button',{name:'Đặt hàng',exact:true})).toBeEnabled();await p.getByRole('button',{name:'Đặt hàng',exact:true}).click();await expect(p.getByRole('alert')).toContainText('Chưa xác định');const original=s.calls.find(x=>x.path==='/orders/batches'&&x.method==='POST');await p.clock.setFixedTime(new Date(Date.now()+31*60*1000));await p.reload();await expect(p.locator('main')).toContainText('Có một lần xác nhận đặt hàng trước đó chưa rõ kết quả');await p.getByRole('button',{name:'Đặt hàng',exact:true}).click();await expect(p.getByRole('heading',{name:'Đã tạo nhóm đơn hàng',exact:true})).toBeVisible();const posts=s.calls.filter(x=>x.path==='/orders/batches'&&x.method==='POST');expect(posts).toHaveLength(2);expect(posts[1].key).toBe(original.key);expect(posts[1].body).toEqual(original.body);expect(s.confirmed.size).toBe(1);
});
test('two-Store checkout lets the buyer read each payable and the total without header or purchase controls covering it',async({page:p},info)=>{
 const s=await model(p),otherStore=id(91),otherProduct=id(92),otherVariant=id(93);s.cart.push({id:id(94),product_id:otherProduct,variant_id:otherVariant,store_id:otherStore,quantity:1});
 const other={...shirt,id:otherProduct,store_id:otherStore,title:'Món thứ hai có tên dài để kiểm tra đầy đủ thông tin',variants:[{...shirt.variants[1],id:otherVariant,price_vnd:100000}]};await p.route('**/api/v1/products/'+otherProduct,route=>route.fulfill({json:other}));await p.route('**/api/v1/stores/'+otherStore,route=>route.fulfill({json:{id:otherStore,name:'Store thứ hai',shipping_fee_vnd:30000}}));
 const stores=[store,otherStore].map((storeId,index)=>{const quantity=index?1:5,goods=quantity*100000,shipping=index?30000:20000;return {store_id:storeId,items:[{product_id:index?otherProduct:product,variant_id:index?otherVariant:red,product_title:index?other.title:shirt.title,variant_values:index?{color:'Xanh',size:'L'}:{color:'Đỏ',size:'M'},sku:index?'SECOND-009264':'TS-9264',quantity,unit_price_vnd:100000,line_total_vnd:goods}],amounts:{goods_vnd:goods,store_discount_vnd:0,platform_discount_vnd:0,shipping_vnd:shipping,payable_vnd:goods+shipping},return_policy_snapshot:{version:'PLATFORM_2026_10_30',window_hours:168,full_refund_includes_original_shipping:true,fault_fee_rule:'STORE_IF_STORE_FAULT_CUSTOMER_IF_CHANGE_OF_MIND_ADMIN_IF_DISPUTED',return_address:{recipient_name:index?'Kho nhận trả miền Trung':'Kho nhận trả phía Bắc',phone:'0900000000',line1:index?'456 Đường Nhận Trả, cửa sau khu kiểm hàng số 2':'123 Đường Kiểm Thử, cổng B tầng 15 nhận hàng trả',ward:'Phường có tên dài để kiểm tra đầy đủ',district:'Quận Kiểm Thử',city:'Đà Nẵng'}}};});
 await p.route('**/api/v1/checkout/quotes',route=>route.fulfill({json:{quote_id:id(95),stores,payable_total_vnd:650000,expires_at:new Date(Date.now()+600000).toISOString()}}));await cart(p);await p.getByRole('button',{name:'Thanh toán',exact:true}).click();await expect(p.getByRole('button',{name:'Đặt hàng',exact:true})).toBeEnabled();const summary=p.locator('.purchase-summary');await expect(summary).toContainText('650.000');
 for(const width of (process.env.CORE_FIX_DESKTOP_ONLY==='1'?[1440,1024,768]:[1440,1024,768,390])){await p.setViewportSize({width,height:900});expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const targets=[...await summary.locator('p').filter({hasText:/^Phải trả:/}).all(),summary.locator('div.font-bold.text-base')];expect(targets).toHaveLength(3);for(const [n,target] of targets.entries()){await target.evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant'}));await expect.poll(()=>target.evaluate(element=>{const box=element.getBoundingClientRect(),x=box.left+box.width/2,y=box.top+box.height/2;return y>=0&&y<innerHeight&&x>=0&&x<innerWidth&&element.contains(document.elementFromPoint(x,y));})).toBe(true);if(n===0||n===2)await p.screenshot({path:info.outputPath('checkout-money-'+width+'-'+n+'.png')});}}
 expect(s.calls.filter(row=>row.path==='/orders/batches')).toHaveLength(0);
});
test('CR-001 direct buy uses two selected units, preserves five in the cart, and survives reload',async({page:p})=>{
 const s=await model(p);await detail(p);await expect(p.getByRole('button',{name:/Đỏ \/ M/})).toBeVisible();await p.getByLabel('Số lượng',{exact:true}).fill('2');await p.getByRole('button',{name:'Mua ngay',exact:true}).click();const confirm=p.getByRole('button',{name:'Đặt hàng',exact:true});await expect(confirm).toBeEnabled();await expect(p.locator('.purchase-summary')).toContainText('220.000');await expect(p.locator('main')).toContainText('Đỏ / M');expect(s.calls.filter(x=>x.path==='/cart/items'&&x.method==='POST')).toHaveLength(0);expect(s.cart[0].quantity).toBe(5);
 await p.reload();await expect(confirm).toBeEnabled();await confirm.click();await expect(p.getByRole('heading',{name:'Đã tạo nhóm đơn hàng',exact:true})).toBeVisible();expect(s.cart[0].quantity).toBe(5);const command=s.calls.find(x=>x.path==='/orders/batches'&&x.method==='POST');expect(command.body).toMatchObject({source:'BUY_NOW',buy_now:{product_id:product,variant_id:red,quantity:2},expected_payable_total_vnd:220000});expect(command.body).not.toHaveProperty('cart_item_ids');
 await p.reload();await expect(p.getByRole('heading',{name:'Đã tạo nhóm đơn hàng',exact:true})).toBeVisible();expect(s.calls.filter(x=>x.path==='/orders/batches'&&x.method==='POST')).toHaveLength(1);
});
test('CR-018 checkout is blocked until a cart PATCH has a known result',async({page:p})=>{
 const s=await model(p);await cart(p);s.holdPatch=true;await p.getByRole('button',{name:'Tăng số lượng',exact:true}).click();await expect.poll(()=>!!s.patch).toBe(true);await expect(p.getByRole('button',{name:'Thanh toán',exact:true})).toBeDisabled();expect(s.quotes).toHaveLength(0);s.cart[0].quantity=6;await s.patch!.fulfill({json:s.cart[0]});await expect(p.getByRole('button',{name:'Thanh toán',exact:true})).toBeEnabled();await p.getByRole('button',{name:'Thanh toán',exact:true}).click();await expect(p.getByRole('button',{name:'Đặt hàng',exact:true})).toBeEnabled();await expect(p.locator('main')).toContainText('Số lượng: 6');
});
test('CR-020 explicit cart deselection remains deselected on return and reload',async({page:p})=>{
 await model(p);await cart(p);await p.getByRole('checkbox',{name:'Chọn tất cả',exact:true}).uncheck();await p.getByRole('link',{name:'Trang chủ PBL6',exact:true}).click();await p.locator('header').getByRole('link',{name:'Giỏ hàng',exact:true}).click();await expect(p.getByRole('checkbox',{name:'Chọn tất cả',exact:true})).not.toBeChecked();await p.reload();await expect(p.getByRole('checkbox',{name:'Chọn tất cả',exact:true})).not.toBeChecked();await expect(p.getByRole('button',{name:'Thanh toán',exact:true})).toBeDisabled();
});
test('CR-022 repricing refreshes the displayed unit, line and total before confirming again',async({page:p})=>{
 const s=await model(p);await cart(p);await expect(p.locator('.purchase-summary')).toContainText('500.000');await p.getByRole('button',{name:'Thanh toán',exact:true}).click();const confirm=p.getByRole('button',{name:'Đặt hàng',exact:true});await expect(confirm).toBeEnabled();s.unit=110000;await confirm.click();await expect(confirm).toBeEnabled();await expect(p.locator('main')).toContainText('Đơn giá báo giá: 110.000');await expect(p.locator('main')).toContainText('Thành tiền: 550.000');await expect(p.locator('.purchase-summary')).toContainText('570.000');await expect(p.locator('address[aria-label="Địa chỉ đang chọn đầy đủ"]')).toContainText('sau cổng B');expect(s.confirmed.size).toBe(0);
});
test('a lost commit ACK keeps the exact direct payload/key until reconciliation',async({page:p})=>{
 const s=await model(p,{lostAck:true});await detail(p);await p.getByRole('button',{name:'Mua ngay',exact:true}).click();const confirm=p.getByRole('button',{name:'Đặt hàng',exact:true});await expect(confirm).toBeEnabled();await confirm.click();await expect(p.getByRole('alert')).toContainText('Chưa xác định');expect(s.confirmed.size).toBe(1);await p.evaluate(({user,addressId})=>history.replaceState({...history.state,usr:{checkoutUserId:user,checkoutExpiresAt:Date.now()+600000,checkoutAddressId:addressId}},'',location.href),{user,addressId:id(90)});await p.reload();await expect(confirm).toBeEnabled();await confirm.click();await expect(p.getByRole('heading',{name:'Đã tạo nhóm đơn hàng',exact:true})).toBeVisible();const commands=s.calls.filter(x=>x.path==='/orders/batches'&&x.method==='POST');expect(commands).toHaveLength(2);expect(commands[0]).toEqual(commands[1]);expect(s.confirmed.size).toBe(1);expect(s.cart[0].quantity).toBe(5);
});
test('CR-010 address edit keeps its ID/default and restores checkout payment and voucher drafts',async({page:p})=>{
 const s=await model(p);await cart(p);await p.getByRole('button',{name:'Thanh toán',exact:true}).click();await expect(p.getByRole('button',{name:'Đặt hàng',exact:true})).toBeEnabled();await p.getByLabel('Thanh toán cửa hàng '+store,{exact:true}).selectOption('SANDBOX');await p.getByLabel('Voucher toàn sàn',{exact:true}).fill('CHUAAP');await p.getByRole('link',{name:'Quản lý địa chỉ',exact:true}).click();await p.getByRole('button',{name:'Sửa địa chỉ',exact:true}).click();await expect(p.getByLabel('Số điện thoại',{exact:true})).toHaveValue('0901234567');await p.getByLabel('Số điện thoại',{exact:true}).fill('0901234568');await p.getByRole('button',{name:'Lưu địa chỉ',exact:true}).click();await expect(p.locator('main')).toContainText('0901234568');expect(s.addresses[0]).toMatchObject({id:address,is_default:true,phone:'0901234568'});await p.getByRole('link',{name:'Quay lại thanh toán',exact:true}).click();await expect(p.getByRole('button',{name:'Đặt hàng',exact:true})).toBeEnabled();await expect(p.getByLabel('Thanh toán cửa hàng '+store,{exact:true})).toHaveValue('SANDBOX');await expect(p.getByLabel('Voucher toàn sàn',{exact:true})).toHaveValue('CHUAAP');await expect(p.locator('address')).toContainText('0901234568');expect(s.confirmed.size).toBe(0);
});
test('CR-011 saving profile invalidates the cached account overview',async({page:p})=>{
 const s=await model(p);await p.getByRole('button',{name:'Menu tài khoản',exact:true}).click();await p.getByRole('navigation',{name:'Menu tài khoản',exact:true}).getByRole('link',{name:'Hồ sơ',exact:true}).click();await expect(p.locator('main')).toContainText('Tên hồ sơ cũ');const nav=p.getByRole('complementary',{name:'Điều hướng tài khoản',exact:true});await nav.getByRole('link',{name:'Thông tin cá nhân',exact:true}).click();await p.getByLabel('Tên hiển thị',{exact:true}).fill('Tên hồ sơ mới');await p.getByRole('button',{name:'Lưu',exact:true}).click();await expect(p.getByRole('status')).toContainText('thành công');await nav.getByRole('link',{name:'Tổng quan',exact:true}).click();await expect(p.locator('main')).toContainText('Tên hồ sơ mới');expect(s.profile.display_name).toBe('Tên hồ sơ mới');
});
test('guest authentication resumes the chosen variant and quantity without placing an order',async({page:p})=>{
 const s=await model(p,{guest:true});await detail(p);await p.getByRole('button',{name:/Xanh \/ L/}).click();await p.getByLabel('Số lượng',{exact:true}).fill('2');await p.getByRole('link',{name:'Đăng nhập để mua ngay',exact:true}).click();await p.getByLabel('Email',{exact:true}).fill('fixture@example.test');await p.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await p.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(p.getByRole('heading',{name:shirt.title,exact:true})).toBeVisible();await expect(p.getByRole('button',{name:/Xanh \/ L/})).toHaveAttribute('aria-pressed','true');await expect(p.getByLabel('Số lượng',{exact:true})).toHaveValue('2');expect(s.calls.filter(x=>x.path==='/cart/items'&&x.method==='POST')).toHaveLength(0);expect(s.confirmed.size).toBe(0);await p.getByRole('button',{name:'Mua ngay',exact:true}).click();await expect(p.getByRole('button',{name:'Đặt hàng',exact:true})).toBeEnabled();await expect(p.locator('.purchase-summary')).toContainText('320.000');
});


test('CR-008: reading back a committed DELETE after a lost ACK reconciles both the cart and header badge',async({page})=>{
 const s=await model(page);let deletes=0;
 await expect(page.getByRole('link',{name:'Giỏ hàng',exact:true}).locator('b')).toHaveText('1');
 await page.getByRole('link',{name:'Giỏ hàng',exact:true}).click();
 await page.route('**/api/v1/cart/items/'+item,async route=>{
  if(route.request().method()!=='DELETE')return route.fallback();
  deletes++;s.cart=[];await route.fulfill({status:503,json:{code:'ACK_LOST',message:'Delete committed; response lost.'}});
 });
 await page.getByRole('button',{name:'Xóa',exact:true}).click();
 await expect(page.getByRole('button',{name:'Thanh toán',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Làm mới',exact:true}).click();
 await expect(page.getByText('Giỏ hàng của bạn đang trống.',{exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Giỏ hàng',exact:true}).locator('b')).toHaveCount(0,{timeout:2000});
 expect(deletes).toBe(1);expect(s.confirmed.size).toBe(0);
});


test('UX-02: line and selected goods follow quantity and selection; unavailable prices stay unknown',async({page})=>{
 await model(page);await page.getByRole('link',{name:'Giỏ hàng',exact:true}).click();
 const summary=page.locator('.purchase-summary');await expect(page.getByText('Thành tiền dự tính: 500.000 ₫',{exact:true})).toBeVisible();await expect(summary).toContainText('Tạm tính 500.000 ₫');
 await page.getByRole('button',{name:'Giảm số lượng',exact:true}).click();await expect(summary).toContainText('Tạm tính 400.000 ₫');
 const selected=page.getByRole('checkbox',{name:'Chọn Áo công sở kiểm thử · Đỏ / M',exact:true});await selected.uncheck();await expect(summary).toContainText('Tạm tính 0 ₫');await selected.check();await expect(summary).toContainText('Tạm tính 400.000 ₫');
 await expect(summary).toContainText('chưa gồm phí giao hàng và ưu đãi');
 await page.route('**/api/v1/products/'+product,r=>r.fulfill({status:503,json:{code:'DEPENDENCY_UNAVAILABLE',message:'Price unavailable.'}}));await page.reload();await expect(page.locator('.purchase-summary')).toContainText('Tạm tính Chưa đủ thông tin để tính');await expect(page.locator('.purchase-summary')).not.toContainText('Tạm tính 0 ₫');
});
