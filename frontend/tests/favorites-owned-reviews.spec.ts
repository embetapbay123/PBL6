import {test,expect,type BrowserContext,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'77000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function model(context:BrowserContext,{count=0,reviewError=false,conflict=false,unpublic=false}={}){
 const favorites=Array.from({length:count},(_,i)=>id(i+1)),writes:any[]=[];
 const auth={...f.login.response,context:{user_id:id(90),roles:['CUSTOMER'],role_permissions:[],token_version:0}};
 let review={id:id(80),order_item_id:id(81),product_id:id(1),product_title:'Áo từng mua',rating:4,body:'Bản đã bị ẩn',status:'HIDDEN',version:7},conflicted=false;
 const product=(n:string)=>({...f.getProduct.response,id:n,title:'Áo '+n.slice(-2),status:'ACTIVE'});
 await context.route('**/api/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname.replace('/api/v1','');
  if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:auth,headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/me/context')return route.fulfill({json:auth.context});
  if(path==='/me/favorites'){const page=Number(url.searchParams.get('page')??1),size=Number(url.searchParams.get('size')??20);return route.fulfill({json:{items:favorites.slice((page-1)*size,page*size),total:favorites.length,page,size}});}
  if(path.startsWith('/me/favorites/')){const n=path.split('/').at(-1)!;writes.push({method:request.method(),id:n});if(request.method()==='PUT'&&!favorites.includes(n))favorites.push(n);if(request.method()==='DELETE'&&favorites.includes(n))favorites.splice(favorites.indexOf(n),1);return route.fulfill({json:{product_id:n}});}
  if(path==='/products')return route.fulfill({json:{items:[product(id(1))],total:1,page:1,size:20}});
  if(path==='/categories')return route.fulfill({json:{items:[],total:0,page:1,size:100}});
  if(path==='/recommendations/for-you')return route.fulfill({json:{product_ids:[id(1)],recently_viewed_product_ids:[id(1)],source:'FALLBACK'}});
  if(path.startsWith('/products/')&&path.endsWith('/reviews'))return route.fulfill({json:{items:[],total:0,page:1,size:20}});
  if(path.startsWith('/products/')&&path.endsWith('/related'))return route.fulfill({json:{items:[],total:0,page:1,size:4}});
  if(path.startsWith('/products/'))return route.fulfill(unpublic?{status:404,json:{code:'NOT_FOUND',message:'Sản phẩm đã dừng'}}:{json:product(path.split('/').at(-1)!)});
  if(path==='/cart/items')return route.fulfill({json:{items:[]}});
  if(path==='/me/orders')return route.fulfill({json:{items:[],total:0,page:1,size:20}});
  if(path==='/me/reviews')return route.fulfill(reviewError?{status:503,json:{code:'DEPENDENCY_UNAVAILABLE',message:'Không tải được đánh giá sở hữu'}}:{json:{items:[review],total:1,page:1,size:20}});
  if(path==='/me/reviews/'+id(80)&&request.method()==='PATCH'){
   const body=request.postDataJSON();writes.push({method:'PATCH',body});if(conflict&&!conflicted){conflicted=true;review.version++;return route.fulfill({status:409,json:{code:'VERSION_CONFLICT',message:'Bản đánh giá đã thay đổi'}});}
   expect(body.expected_version).toBe(review.version);review={...review,body:body.body,rating:body.rating,version:review.version+1};return route.fulfill({json:review});
  }
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture chưa cấu hình'}});
 });
 return {favorites,writes,login:async(page:Page)=>{await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();}};
}
test('all three cards share server favorite state; alternating cards never retain a local override',async({page,context})=>{
 const m=await model(context);await m.login(page);await page.goto('/');const hearts=page.getByRole('button',{name:'Yêu thích Áo 01',exact:true});await expect(hearts).toHaveCount(3);await hearts.first().click();await expect(page.getByRole('button',{name:'Bỏ yêu thích Áo 01',exact:true})).toHaveCount(3);await page.getByRole('button',{name:'Bỏ yêu thích Áo 01',exact:true}).nth(1).click();await expect(page.getByRole('button',{name:'Yêu thích Áo 01',exact:true})).toHaveCount(3);expect(m.writes).toEqual([{method:'PUT',id:id(1)},{method:'DELETE',id:id(1)}]);
});
test('detail reads existing favorite after reload and permits removing it',async({page,context})=>{
 const m=await model(context,{count:1});await m.login(page);await page.goto('/products/'+id(1));await expect(page.getByRole('button',{name:'Bỏ yêu thích',exact:true})).toHaveAttribute('aria-pressed','true');await page.reload();await page.getByRole('button',{name:'Bỏ yêu thích',exact:true}).click();await expect(page.getByRole('button',{name:'Lưu yêu thích',exact:true})).toHaveAttribute('aria-pressed','false');expect(m.favorites).toEqual([]);
});
test('a second tab receives only invalidation and refreshes favorite state',async({page,context})=>{
 const m=await model(context);await m.login(page);await page.goto('/products/'+id(1));const second=await context.newPage();await second.goto('/products/'+id(1));await expect(second.getByRole('button',{name:'Lưu yêu thích',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Lưu yêu thích',exact:true}).click();await expect(second.getByRole('button',{name:'Bỏ yêu thích',exact:true})).toHaveAttribute('aria-pressed','true');const signal=await page.evaluate(()=>localStorage.getItem('pbl6_favorites_signal'));expect(signal).toMatch(/^[a-f0-9-]{36}$/);await second.close();
});

test('a favorite signal during another tab initial GET does not accept that obsolete empty response',async({page,context})=>{
 const m=await model(context);await m.login(page);await page.goto('/products/'+id(1));await expect(page.getByRole('button',{name:'Lưu yêu thích',exact:true})).toBeEnabled();
 const second=await context.newPage();let held:import('@playwright/test').Route|undefined;
 await second.addInitScript(()=>{(window as any).__favoriteSignals=0;window.addEventListener('storage',event=>{if(event.key==='pbl6_favorites_signal')(window as any).__favoriteSignals++;});});
 await second.route('**/api/v1/me/favorites?*',route=>{if(!held){held=route;return;}return route.fallback();});
 await second.goto('/products/'+id(1));await expect.poll(()=>!!held).toBe(true);
 await page.getByRole('button',{name:'Lưu yêu thích',exact:true}).click();await expect.poll(()=>second.evaluate(()=>(window as any).__favoriteSignals)).toBeGreaterThan(0);
 await held!.fulfill({json:{items:[],total:0,page:1,size:100}}).catch(()=>{});
 await expect(second.getByRole('button',{name:'Bỏ yêu thích',exact:true})).toHaveAttribute('aria-pressed','true');expect(m.favorites).toEqual([id(1)]);await second.close();
});
test('removing the last item on page two returns to a valid page instead of claiming the list is empty',async({page,context})=>{
 const m=await model(context,{count:21});await m.login(page);await page.goto('/customer/favorites');await page.getByRole('button',{name:'Trang sau',exact:true}).click();await expect(page.getByText('Trang 2 · 21 kết quả',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Bỏ yêu thích',exact:true}).click();await expect(page.getByText('Trang 1 · 20 kết quả',{exact:true})).toBeVisible();await expect(page.getByText('Danh sách yêu thích của bạn đang trống.',{exact:true})).toHaveCount(0);
});

test('an invalidated empty page two can be opened again after another tab grows the list to twenty-one',async({page,context})=>{
 const m=await model(context,{count:21});await m.login(page);await page.goto('/customer/favorites');await page.getByRole('button',{name:'Trang sau',exact:true}).click();await expect(page.getByText('Trang 2 · 21 kết quả',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Bỏ yêu thích',exact:true}).click();await expect(page.getByText('Trang 1 · 20 kết quả',{exact:true})).toBeVisible();
 const other=await context.newPage();await other.goto('/products/'+id(22));await other.getByRole('button',{name:'Lưu yêu thích',exact:true}).click();await expect(page.getByText('Trang 1 · 21 kết quả',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Trang sau',exact:true}).click();
 await expect(page.getByText('Trang 2 · 21 kết quả',{exact:true})).toBeVisible();await expect(page.locator('.market-product-grid>div')).toHaveCount(1);await other.close();
});
test('hidden owned review remains editable when the product is no longer public and keeps moderation',async({page,context})=>{
 const m=await model(context,{unpublic:true});await m.login(page);await page.goto('/customer/reviews');await page.getByRole('button',{name:'Sửa đánh giá',exact:true}).click();await page.getByRole('textbox',{name:'Nội dung đánh giá',exact:true}).fill('Nội dung được sửa, vẫn chờ kiểm duyệt');await page.getByRole('button',{name:'Lưu đánh giá',exact:true}).click();await expect(page.getByText('Nội dung được sửa, vẫn chờ kiểm duyệt',{exact:true})).toBeVisible();await expect(page.getByText('Đang bị ẩn; sửa không tự công khai lại',{exact:false})).toBeVisible();expect(m.writes).toEqual([{method:'PATCH',body:{expected_version:7,rating:4,body:'Nội dung được sửa, vẫn chờ kiểm duyệt'}}]);
});
test('owned read failure remains an error and never becomes an empty review list',async({page,context})=>{
 const m=await model(context,{reviewError:true});await m.login(page);await page.goto('/customer/reviews');await expect(page.getByRole('alert')).toContainText('Không tải được đánh giá sở hữu');await expect(page.getByText('Chưa có đánh giá trong phạm vi này.',{exact:true})).toHaveCount(0);
});
test('409 preserves review draft and explicit readback takes a fresh version without automatic PATCH',async({page,context})=>{
 const m=await model(context,{conflict:true});await m.login(page);await page.goto('/customer/reviews');await page.getByRole('button',{name:'Sửa đánh giá',exact:true}).click();await page.getByRole('textbox',{name:'Nội dung đánh giá',exact:true}).fill('Bản nháp cần giữ');await page.getByRole('button',{name:'Lưu đánh giá',exact:true}).click();await expect(page.getByRole('textbox',{name:'Nội dung đánh giá',exact:true})).toHaveValue('Bản nháp cần giữ');await page.getByRole('button',{name:'Đối chiếu đánh giá đã lưu',exact:true}).click();expect(m.writes).toHaveLength(1);await page.getByRole('button',{name:'Lưu đánh giá',exact:true}).click();expect(m.writes[1].body.expected_version).toBe(8);
});
