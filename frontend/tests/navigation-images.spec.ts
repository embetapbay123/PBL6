import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'7d000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function model(page:Page,{delay=0,status='CONFIRMED'}={}){
 let held:any[]=[],paused=!!delay;const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const order={...f.getOwnOrder.response,id:id(1),store_id:id(2),purchase_group_id:id(3),status,version:3,payment_method:'COD',payment_status:'SUCCEEDED',address_snapshot:{recipient_name:'Người nhận',phone:'0912345678',line1:'Đường dài kiểm thử',ward:'Phường',district:'Quận',city:'Huế'},items:Array.from({length:8},(_,n)=>({id:id(n+10),product_id:id(4),product_snapshot:{title:'Món đã mua có tên dài '+n,variant_values:{size:'M',color:'Đỏ'}},quantity:2,unit_price_vnd:100000,line_total_vnd:200000})),amounts:{goods_vnd:1600000,store_discount_vnd:0,platform_discount_vnd:0,shipping_vnd:20000,payable_vnd:1620000}};
 const product={...f.getProduct.response,id:id(4),store_id:id(2),title:'Áo có ảnh bị lỗi',status:'ACTIVE',moderation_status:'VISIBLE',variants:[{id:id(5),sku:'009264',price_vnd:100000,variant_values:{size:'M'},is_default:true,status:'ACTIVE'}],images:[{id:id(6),product_id:id(4),image_url:'https://image.fixture.test/broken.png',position:0},{id:id(7),product_id:id(4),image_url:'https://image.fixture.test/good.svg',position:1}]};
 let retryImage=false;
 await page.route('https://image.fixture.test/**',route=>route.request().url().endsWith('/good.svg')||retryImage?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="red"/></svg>'}):route.abort());
 await page.route('**/api/v1/**',async route=>{const req=route.request(),url=new URL(req.url()),path=url.pathname.replace('/api/v1','');
  if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:{...f.login.response,context:{user_id:id(8),roles:['CUSTOMER'],role_permissions:[],token_version:0}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/me/orders/'+id(1)){if(paused){held.push(route);return;}return route.fulfill({json:order});}
  if(path==='/me/orders')return route.fulfill({json:{items:[order],page:1,size:20,total:1}});
  if(path==='/products/'+id(4))return route.fulfill({json:product});
  if(path==='/products')return route.fulfill({json:{items:[product],total:1,page:1,size:20}});
  if(path==='/products/'+id(4)+'/reviews'||path==='/me/returns')return route.fulfill({json:{items:[],total:0,page:1,size:20}});
  if(path==='/stores/'+id(2))return route.fulfill({json:{id:id(2),name:'Store kiểm thử',shipping_fee_vnd:20000}});
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture chưa cấu hình'}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();
 return {order,product,errors,pause:()=>{paused=true;},release:async()=>{await expect.poll(()=>held.length>0).toBe(true);paused=false;const current=held;held=[];await Promise.all(current.map(route=>route.fulfill({json:order}).catch(()=>{})));},retryImage:()=>{retryImage=true;}};
}
test('cancel deep link waits for order data, scrolls to the permitted form and focuses its reason after asynchronous data',async({page})=>{
 const m=await model(page,{delay:1});await page.goto('/customer/orders/'+id(1)+'#cancel');await expect(page.getByLabel('Lý do hủy',{exact:true})).toHaveCount(0);await m.release();await expect(page.getByLabel('Lý do hủy',{exact:true})).toBeFocused();await expect.poll(async()=>{const box=await page.locator('#cancel').boundingBox();return !!box&&box.y>=0&&box.y<700;}).toBe(true);if(process.env.CORE_FIX_DESKTOP_ONLY!=='1'){await page.setViewportSize({width:390,height:844});await page.getByRole('link',{name:'Về đơn hàng',exact:true}).click();m.pause();await page.getByRole('link',{name:'Hủy đơn',exact:true}).click();await m.release();await expect(page.getByLabel('Lý do hủy',{exact:true})).toBeFocused();await expect(page.getByLabel('Lý do hủy',{exact:true})).toBeInViewport();}expect(m.errors).toEqual([]);
});
test('order items and returns anchors focus the correct heading, including Back/Forward',async({page})=>{
 await model(page,{status:'COMPLETED'});await page.goto('/customer/orders/'+id(1)+'#order-items');await expect(page.getByRole('heading',{name:'Sản phẩm trong đơn',exact:true})).toBeFocused();await page.goto('/customer/orders');await page.getByRole('link',{name:'Yêu cầu đổi trả',exact:true}).click();await expect(page.getByRole('heading',{name:'Đổi trả và hoàn tiền',exact:true})).toBeFocused();await page.goBack();await expect(page).toHaveURL(/\/customer\/orders$/);await page.goForward();await expect(page.getByRole('heading',{name:'Đổi trả và hoàn tiền',exact:true})).toBeFocused();
});
test('user interaction while an explicit target is pending cancels deferred focus',async({page})=>{
 const m=await model(page,{delay:1});await page.goto('/customer/orders/'+id(1)+'#cancel');const link=page.getByRole('link',{name:'Về đơn hàng',exact:true});await link.focus();await page.keyboard.press('Tab');const focused=await page.evaluate(()=>document.activeElement?.getAttribute('href')??document.activeElement?.getAttribute('aria-label')??document.activeElement?.tagName);await m.release();await expect(page.getByLabel('Lý do hủy',{exact:true})).not.toBeFocused();expect(await page.evaluate(()=>document.activeElement?.getAttribute('href')??document.activeElement?.getAttribute('aria-label')??document.activeElement?.tagName)).toBe(focused);
});
test('filter query updates do not reset keyboard focus or scroll back to page title',async({page})=>{
 await model(page);await page.goto('/customer/orders');const search=page.getByRole('searchbox',{name:'Tìm đơn theo mã, món, SKU hoặc người nhận',exact:true});await search.fill('Món');await search.press('Enter');await expect(search).toBeFocused();await expect(page).toHaveURL(/q=M%C3%B3n/);
});
test('new screen focuses its heading and skip link reaches main content by keyboard',async({page})=>{
 await model(page);await page.goto('/customer/orders');await page.getByRole('link',{name:'Xem chi tiết',exact:true}).click();await expect(page.getByRole('heading',{name:'Chi tiết đơn hàng',exact:true})).toBeFocused();await page.getByRole('link',{name:'Đến nội dung chính',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Chi tiết đơn hàng',exact:true})).toBeFocused();
});
test('failed product image is explicit, can be retried and switching thumbnails has independent failure state',async({page},info)=>{
 const m=await model(page);await page.goto('/products/'+id(4));await expect(page.getByRole('img',{name:'Không tải được ảnh của Áo có ảnh bị lỗi',exact:true})).toBeVisible();await page.getByRole('button',{name:'Xem ảnh 2',exact:true}).click();await expect(page.locator('.market-detail-image img')).toBeVisible();await expect.poll(()=>page.locator('.market-detail-image img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBe(600);await page.getByRole('button',{name:'Xem ảnh 1',exact:true}).click();await expect(page.getByRole('button',{name:'Thử tải lại ảnh',exact:true})).toBeVisible();m.retryImage();await page.getByRole('button',{name:'Thử tải lại ảnh',exact:true}).click();await expect(page.locator('.market-detail-image img')).toBeVisible();await expect.poll(()=>page.locator('.market-detail-image img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBe(600);await page.setViewportSize({width:process.env.CORE_FIX_DESKTOP_ONLY==='1'?1440:390,height:844});await page.screenshot({path:info.outputPath('product-image-recovered-'+(process.env.CORE_FIX_DESKTOP_ONLY==='1'?1440:390)+'.png'),fullPage:true});expect(m.errors).toEqual([]);
});

test('reviews deep link waits for product data and focuses the review section without changing its form',async({page})=>{
 await model(page,{status:'COMPLETED'});await page.goto('/customer/orders/'+id(1)+'#order-items');
 await expect(page.getByRole('heading',{name:'Sản phẩm trong đơn',exact:true})).toBeFocused();
 await page.getByRole('link',{name:'Viết đánh giá',exact:true}).first().click();
 await expect(page).toHaveURL(new RegExp('/products/'+id(4)+'#reviews$'));
 await expect(page.getByRole('heading',{name:'Đánh giá sản phẩm',exact:true})).toBeFocused();
 await page.goBack();await expect(page.getByRole('heading',{name:'Sản phẩm trong đơn',exact:true})).toBeFocused();
 await page.goForward();await expect(page.getByRole('heading',{name:'Đánh giá sản phẩm',exact:true})).toBeFocused();
});

test('all product images may fail without claiming that the product has no images',async({page})=>{
 await model(page);await page.route('https://image.fixture.test/**',route=>route.abort());await page.goto('/products/'+id(4));
 for(const index of [1,2]){
  await page.getByRole('button',{name:'Xem ảnh '+index,exact:true}).click();
  await expect(page.getByRole('img',{name:'Không tải được ảnh của Áo có ảnh bị lỗi',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Thử tải lại ảnh',exact:true})).toBeVisible();
 }
 await expect(page.getByText('Chưa có ảnh sản phẩm',{exact:true})).toHaveCount(0);
});

test('a late image failure from an earlier product does not replace the current product image',async({page})=>{
 const m=await model(page);let pending:import('@playwright/test').Route|undefined;
 await page.route('https://image.fixture.test/broken.png',route=>{pending=route;});
 const next={...m.product,id:id(40),title:'Sản phẩm ảnh mới',images:[{id:id(41),product_id:id(40),image_url:'https://image.fixture.test/good.svg',position:0}]};
 await page.route('**/api/v1/products/'+next.id,route=>route.fulfill({json:next}));
 await page.route('**/api/v1/products*',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/v1/products')return route.fulfill({json:{items:[m.product,next],total:2,page:1,size:20}});
  if(path==='/api/v1/products/'+next.id)return route.fulfill({json:next});return route.fallback();
 });
 await page.goto('/products/'+m.product.id);await expect.poll(()=>!!pending).toBe(true);
 await page.getByRole('link',{name:'← Tất cả sản phẩm',exact:true}).click();
 await page.locator('a.market-product-link[href="/products/'+next.id+'"]').click();
 await expect(page.getByRole('heading',{name:next.title,exact:true})).toBeVisible();
 await expect.poll(()=>page.locator('.market-detail-image img').evaluate((image:HTMLImageElement)=>image.naturalWidth)).toBe(600);
 await pending!.abort().catch(()=>{});
 await expect(page.locator('.market-detail-image img')).toHaveAttribute('alt',next.title);
 await expect(page.getByRole('img',{name:'Không tải được ảnh của '+next.title,exact:true})).toHaveCount(0);
});

test('phone chat entry sits in the reserved dock and never covers product content or purchase actions',async({page},info)=>{
 test.skip(process.env.CORE_FIX_DESKTOP_ONLY==='1','Mobile waived by user for this acceptance.');await model(page);await page.setViewportSize({width:390,height:844});await page.goto('/');const launcher=page.getByRole('button',{name:'Mở chat',exact:true}),dock=page.getByRole('navigation',{name:'Điều hướng nhanh trên điện thoại',exact:true});await expect(dock.getByRole('button',{name:'Mở chat',exact:true})).toBeVisible();await expect(dock).toBeVisible();await expect.poll(()=>dock.evaluate(element=>{const rail=element.getBoundingClientRect(),button=element.querySelector('button')?.getBoundingClientRect();return !!button&&rail.height>0&&button.height>0&&button.y>=rail.y&&button.bottom<=rail.bottom;})).toBe(true);const rail=(await dock.boundingBox())!;expect(await page.locator('.chat-launcher').isVisible()).toBe(false);
 for(const y of [0,200,450]){await page.evaluate(value=>scrollTo(0,value),y);const boxes=await page.locator('.market-product-content').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));const bounds=await launcher.boundingBox();for(const box of boxes){const overlap=bounds?Math.max(0,Math.min(box.right,bounds.x+bounds.width)-Math.max(box.left,bounds.x))*Math.max(0,Math.min(box.bottom,bounds.y+bounds.height)-Math.max(box.top,bounds.y)):0;if(box.bottom<rail!.y)expect(overlap).toBe(0);}}
 await launcher.click();const dialog=page.getByRole('dialog',{name:'Trung tâm chat',exact:true});await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'Đóng chat',exact:true}).click();await expect(launcher).toBeFocused();await page.goto('/products/'+id(4));await expect(page.getByRole('button',{name:'Mua ngay',exact:true})).toBeVisible();await page.mouse.wheel(0,900);await page.getByRole('button',{name:'Mua ngay',exact:true}).scrollIntoViewIfNeeded();const purchase=await page.getByRole('button',{name:'Mua ngay',exact:true}).boundingBox(),chat=await page.getByRole('button',{name:'Mở chat',exact:true}).boundingBox();await info.attach('purchase-chat-geometry.json',{body:JSON.stringify({purchase,chat,scroll:await page.evaluate(()=>scrollY)}),contentType:'application/json'});expect(purchase&&chat&&purchase.y+purchase.height<=chat.y).toBe(true);expect(await page.getByRole('button',{name:'Mua ngay',exact:true}).evaluate(element=>{const r=element.getBoundingClientRect();return element.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:info.outputPath('phone-chat-dock-390.png'),fullPage:false});
});


test('chat closing after a desktop/phone resize restores the currently visible header or dock opener',async({page})=>{
 test.skip(process.env.CORE_FIX_DESKTOP_ONLY==='1','Mobile waived by user for this acceptance.');
 await model(page);await page.goto('/');
 for(const [from,to] of [[1440,390],[390,1440]]){
  await page.setViewportSize({width:from,height:900});await page.getByRole('button',{name:'Mở chat',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Trung tâm chat',exact:true});await expect(dialog).toBeVisible();
  await page.setViewportSize({width:to,height:900});await expect.poll(()=>dialog.getAttribute('aria-modal')).toBe(to===390?'true':null);
  await dialog.getByRole('button',{name:'Đóng chat',exact:true}).click();await expect(page.getByRole('button',{name:'Mở chat',exact:true})).toBeFocused();
 }
});
