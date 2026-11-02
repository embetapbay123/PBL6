import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'82000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function model(page:Page){
 const state={product:{...fixtures.getProduct.response,id:id(1),store_id:id(2),title:'Áo kiểm tồn',status:'ACTIVE',moderation_status:'VISIBLE',images:[],variant_axes:[{code:'size',name:'Kích cỡ'},{code:'color',name:'Màu sắc'}],variants:[{id:id(3),sku:'OPAQUE-1',price_vnd:100000,variant_values:{size:'S',color:'Đỏ'},status:'ACTIVE',is_default:true,available_quantity:0},{id:id(4),sku:'OPAQUE-2',price_vnd:120000,variant_values:{size:'M',color:'Đỏ'},status:'ACTIVE',is_default:false,available_quantity:2}]},reads:0,fail:false,writes:[] as unknown[]};
 await page.route('**/api/v1/**',route=>{
  const request=route.request(),path=new URL(request.url()).pathname.replace('/api/v1','');
  if(path.startsWith('/auth/'))return route.fulfill({json:{...fixtures.login.response,context:{user_id:id(9),roles:['CUSTOMER'],role_permissions:[],token_version:0}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/products/'+id(1)){state.reads++;return state.fail?route.fulfill({status:503,json:{code:'UNAVAILABLE',message:'Không đọc được tồn mới'}}):route.fulfill({json:state.product});}
  if(path==='/products')return route.fulfill({json:{items:[state.product],page:1,size:20,total:1}});
  if(path==='/stores/'+id(2))return route.fulfill({json:{id:id(2),name:'Store kiểm tồn',shipping_fee_vnd:20000}});
  if(path==='/cart/items'&&request.method()==='POST'){state.writes.push(request.postDataJSON());return route.fulfill({status:201,json:{id:id(10),...request.postDataJSON()}});}
  return route.fulfill({json:{items:[],page:1,size:100,total:0}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();return state;
}
test('detail skips a sold-out default, names axes and guards quantities without silently changing the buyer choice',async({page})=>{
 const state=await model(page);await page.goto('/products/'+id(1));const unavailable=page.getByRole('button',{name:/Đỏ \/ S/}),selected=page.getByRole('button',{name:/Đỏ \/ M/});await expect(unavailable).toBeDisabled();await expect(selected).toHaveAttribute('aria-pressed','true');await expect(selected).toContainText('Màu sắc: Đỏ');await expect(selected).toContainText('Kích cỡ: M');await expect(page.getByRole('status').filter({hasText:'Tồn khả dụng vừa đọc: 2'})).toBeVisible();
 const quantity=page.getByRole('spinbutton',{name:'Số lượng',exact:true});await quantity.fill('3');await expect(page.getByRole('button',{name:'Mua ngay',exact:true})).toBeDisabled();await expect(page.getByText('Số lượng đã chọn vượt tồn khả dụng vừa đọc.',{exact:false})).toBeVisible();expect(state.writes).toEqual([]);
 await quantity.fill('2');state.product.variants[1].available_quantity=1;await page.getByRole('button',{name:'Đọc lại giá và tồn',exact:true}).click();await expect(quantity).toHaveValue('2');await expect(selected).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'Mua ngay',exact:true})).toBeDisabled();await expect(page.getByRole('status').filter({hasText:'Tồn khả dụng vừa đọc: 1'})).toBeVisible();
 state.product.variants[1].available_quantity=0;await page.getByRole('button',{name:'Đọc lại giá và tồn',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Phân loại đã chọn hiện hết hàng'})).toBeVisible();await expect(selected).toHaveAttribute('aria-pressed','true');expect(state.writes).toEqual([]);
});
test('refresh failure does not leave stale stock actionable and retry is read-only',async({page})=>{
 const state=await model(page);await page.goto('/products/'+id(1));await expect(page.getByRole('button',{name:'Đọc lại giá và tồn',exact:true})).toBeEnabled();state.fail=true;await page.getByRole('button',{name:'Đọc lại giá và tồn',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Không đọc được tồn mới');await expect(page.getByRole('button',{name:'Thêm vào giỏ hàng',exact:true})).toBeDisabled();state.fail=false;await page.getByRole('button',{name:'Đọc lại giá và tồn',exact:true}).click();await expect(page.getByRole('button',{name:'Thêm vào giỏ hàng',exact:true})).toBeEnabled();expect(state.writes).toEqual([]);
});
test('catalog chooser labels sold-out variants and never submits one; legacy absence is explicitly unknown',async({page})=>{
 const state=await model(page);await page.goto('/');await page.locator('.product-card').getByRole('button',{name:'Thêm vào giỏ',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Chọn phân loại Áo kiểm tồn',exact:true}),choice=dialog.getByRole('combobox');await expect(choice.locator('option[value="'+id(3)+'"]')).toHaveAttribute('disabled','');await expect(choice).toHaveValue(id(4));await expect(choice).toContainText('Hết hàng');await dialog.getByRole('button',{name:'Thêm vào giỏ hàng',exact:true}).click();expect(state.writes).toEqual([{product_id:id(1),variant_id:id(4),quantity:1}]);
 for(const v of state.product.variants)delete (v as {available_quantity?:number}).available_quantity;
 await page.goto('/products/'+id(1));await expect(page.getByText('Chưa có số tồn khả dụng từ lần đọc này.',{exact:false})).toBeVisible();await expect(page.getByRole('button',{name:'Thêm vào giỏ hàng',exact:true})).toBeEnabled();
});

test('all known-zero variants disable catalog and detail purchase, with no cart mutation',async({page})=>{
 const state=await model(page);for(const v of state.product.variants)v.available_quantity=0;
 await page.goto('/');await expect(page.locator('.product-card').getByRole('button',{name:'Thêm vào giỏ',exact:true})).toBeDisabled();
 await page.locator('.product-card .market-product-link').click();await expect(page.getByRole('button',{name:'Mua ngay',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Thêm vào giỏ hàng',exact:true})).toBeDisabled();await expect(page.getByRole('status').filter({hasText:'Phân loại đã chọn hiện hết hàng'})).toBeVisible();expect(state.writes).toEqual([]);
});

test('a delayed stock refresh cannot replace another product after navigation',async({page})=>{
 const state=await model(page);await page.goto('/products/'+id(1));await expect(page.getByRole('button',{name:'Đọc lại giá và tồn',exact:true})).toBeEnabled();
 let release!:()=>void,entered!:()=>void;const waiting=new Promise<void>(r=>release=r),started=new Promise<void>(r=>entered=r);
 await page.route('**/api/v1/products/'+id(1),async route=>{entered();await waiting;await route.fulfill({json:{...state.product,title:'STALE PRODUCT RESPONSE'}});});
 await page.getByRole('button',{name:'Đọc lại giá và tồn',exact:true}).click();await started;
 const other={...state.product,id:id(11),title:'Sản phẩm mới đang xem'};await page.route('**/api/v1/products/'+id(11),route=>route.fulfill({json:other}));
 // Router navigation preserves the component instance while a GET from the previous route is pending.
 await page.evaluate(next=>{history.pushState(null,'',next);window.dispatchEvent(new PopStateEvent('popstate'));},'/products/'+id(11));
 await expect(page.getByRole('heading',{name:other.title,exact:true})).toBeVisible();release();await expect(page.getByRole('button',{name:'Đọc lại giá và tồn',exact:true})).toBeEnabled();await expect(page.getByRole('heading',{name:other.title,exact:true})).toBeVisible();await expect(page.getByText('STALE PRODUCT RESPONSE',{exact:true})).toHaveCount(0);expect(state.writes).toEqual([]);
});

for(const width of (process.env.CORE_FIX_DESKTOP_ONLY==='1'?[1440,1024,768]:[1440,1024,768,390]))test('stock controls and axis labels remain usable at '+width+'px',async({page},info)=>{
 await page.setViewportSize({width,height:900});await model(page);await page.goto('/products/'+id(1));const refresh=page.getByRole('button',{name:'Đọc lại giá và tồn',exact:true});await expect(refresh).toBeEnabled();await refresh.scrollIntoViewIfNeeded();await refresh.focus();await expect(refresh).toBeFocused();await page.keyboard.press('Enter');await expect(refresh).toBeEnabled();await expect(page.getByRole('status').filter({hasText:'Tồn khả dụng vừa đọc: 2'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('stock-controls-'+width+'.png')});
 const target=page.getByRole('button',{name:'Mua ngay',exact:true});await target.scrollIntoViewIfNeeded();expect(await target.evaluate(e=>{const r=e.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return top===e||e.contains(top);})).toBe(true);
});
