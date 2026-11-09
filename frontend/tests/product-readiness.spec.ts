import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'7f000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function model(page:Page,{productOnly=false,stockError=false,soldOutDraft=false}={}){
 const variants=Array.from({length:12},(_,n)=>({id:id(10+n),sku:'OPAQUE-299-'+n,price_vnd:100500,variant_values:{color:['Đỏ','Xanh','Đen'][n%3],size:['S','M','L','XL'][Math.floor(n/3)]},status:'ACTIVE',is_default:n===0}));
 const product={...f.getProduct.response,id:id(1),store_id:id(2),product_type_id:id(3),title:'Áo thứ 300 có tên dài để kiểm tra đúng món',status:soldOutDraft?'DRAFT':'ACTIVE',moderation_status:'VISIBLE',version:3,attributes:{},variants,images:[]};
 const products=Array.from({length:299},(_,n)=>({...product,id:id(1000+n),title:'A món ở trang trước '+n,variants:[{...variants[0],id:id(2000+n),sku:'OTHER-'+n}]})).concat(product);
 const reads:any[]=[],context={user_id:id(4),roles:productOnly?['CUSTOMER','SELLER']:['CUSTOMER','STORE_OWNER'],role_permissions:[],token_version:0,store_membership:{store_id:id(2),role:productOnly?'SELLER':'OWNER',status:'ACTIVE',permissions:productOnly?['product.store.read_write']:[]}};
 let failed=stockError;
 await page.route('**/api/v1/**',route=>{const url=new URL(route.request().url()),path=url.pathname.replace('/api/v1',''),query=Object.fromEntries(url.searchParams);reads.push({path,query});
  if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:{...f.login.response,context},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/me/context')return route.fulfill({json:context});
  if(path==='/product-types')return route.fulfill({json:{items:[{id:id(3),name:'Áo',status:'ACTIVE',attribute_definitions:[{id:'color',code:'color',name:'Màu',data_type:'STRING',required:true,variant_axis:true,allowed_values:['Đỏ','Xanh','Đen']},{id:'size',code:'size',name:'Cỡ',data_type:'STRING',required:true,variant_axis:true,allowed_values:['S','M','L','XL']}]}],total:1,page:1,size:100}});
  if(path==='/store/products/'+product.id)return route.fulfill({json:product});
  if(path==='/store/products'){const rows=query.q?products.filter(p=>p.variants.some(v=>v.sku===query.q)):products;return route.fulfill({json:{items:rows.slice(0,20),total:rows.length,page:1,size:20}});}
  if(path==='/store/inventory'){
   if(failed)return route.fulfill({status:503,json:{code:'INVENTORY_UNAVAILABLE',message:'Kho chưa phản hồi'}});
   const selected=variants.filter(v=>!query.variant_id||v.id===query.variant_id),rows=selected.map(v=>({variant_id:v.id,product_id:product.id,product_title:product.title,sku:v.sku,variant_values:v.variant_values,quantity:v.id===variants[0].id?0:5,reserved_quantity:soldOutDraft&&v.id!==variants[0].id?5:0,available_quantity:soldOutDraft||v.id===variants[0].id?0:5,version:0}));return route.fulfill({json:{items:rows,total:rows.length,page:1,size:Number(query.size??20)}});
  }
  if(path==='/store/inventory/movements')return route.fulfill({json:{items:[],total:0,page:1,size:10}});
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture chưa cấu hình'}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();return {product,variants,reads,recover:()=>{failed=false;}};
}
test('sold-out draft warns next to the sale status while publish remains available',async({page},info)=>{
 const m=await model(page,{soldOutDraft:true});
 await page.goto('/seller/products/'+m.product.id+'/edit');
 const status=page.getByRole('combobox',{name:'Trạng thái bán',exact:true}),note=page.locator('#product-sale-stock');
 await expect(status).toHaveValue('DRAFT');
 await expect(note).toHaveCount(0);
 await status.selectOption('ACTIVE');
 await expect(page.locator('.product-readiness-disclosure')).not.toHaveAttribute('open','');
 await expect(note).toBeVisible();
 await expect(note).toContainText('Chưa có tồn khả dụng');
 await expect(note).toContainText('Tạm hết hàng');
 await expect(note.getByRole('link',{name:'Nhập kho sản phẩm này'})).toHaveAttribute('href','/seller/inventory?product_id='+m.product.id);
 await expect(page.getByRole('button',{name:'Lưu',exact:true})).toBeEnabled();
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:800});
  await note.scrollIntoViewIfNeeded();
  await expect(note).toBeInViewport({ratio:1});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.screenshot({path:info.outputPath('sale-status-'+width+'.png')});
 }
 await status.selectOption('DRAFT');
 await expect(note).toHaveCount(0);
});
test('Owner finds the 300th product by its 12th SKU and follows the checklist to precisely that inventory variant',async({page},info)=>{
 const m=await model(page);await page.goto('/seller/products');await expect(page.locator('tbody')).not.toContainText(m.product.title);await page.getByRole('searchbox',{name:'Tìm tên hoặc SKU trong Store',exact:true}).fill('OPAQUE-299-11');await page.locator('tbody tr').filter({hasText:m.product.title}).getByRole('link',{name:'Sửa sản phẩm',exact:true}).click();const checklist=page.getByRole('region',{name:'Hoàn thiện sản phẩm để bán',exact:true});await expect(checklist).toContainText('11/12 phân loại đang bán còn tồn khả dụng');await checklist.getByText('Đối chiếu 12 phân loại theo món / SKU',{exact:true}).click();
 for(const width of process.env.CORE_FIX_DESKTOP_ONLY==='1'?[1440]:[1440,1024,768,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('product-readiness-'+width+'.png'),fullPage:true});}
 await checklist.locator('li').filter({hasText:'SKU OPAQUE-299-11'}).getByRole('link',{name:'Nhập / kiểm kho phân loại này',exact:true}).click();await expect(page).toHaveURL(new RegExp('variant_id='+m.variants[11].id));await expect(page.locator('tbody').first()).toContainText('Đen / XL');await expect(page.locator('tbody').first().locator('tr')).toHaveCount(1);expect(m.reads.some(r=>r.path==='/store/inventory'&&r.query.variant_id===m.variants[11].id)).toBe(true);expect(m.reads.some(r=>r.path==='/store/inventory/movements'&&r.query.variant_id===m.variants[11].id)).toBe(true);await page.getByRole('button',{name:/^Thêm thao tác cho /}).click();await page.getByRole('link',{name:'Xem biến động',exact:true}).click();await expect(page.getByRole('heading',{name:'Lịch sử biến động kho',exact:true})).toBeFocused();await page.goBack();await page.goBack();await expect(page).toHaveURL(/\/edit$/);await expect(checklist).toBeVisible();
});
test('a product-only Seller sees the stock handoff and does not gain inventory access',async({page})=>{
 const m=await model(page,{productOnly:true});await page.goto('/seller/products/'+m.product.id+'/edit');const checklist=page.getByRole('region',{name:'Hoàn thiện sản phẩm để bán',exact:true});await expect(checklist).toContainText('Nhờ Owner hoặc nhân viên kho nhập đúng SKU');await expect(checklist.getByRole('link',{name:'Mở kho đúng sản phẩm',exact:true})).toHaveCount(0);expect(m.reads.filter(r=>r.path==='/store/inventory')).toHaveLength(0);
});
test('failed inventory read does not claim zero stock or readiness, and explicit retry reads current data',async({page})=>{
 const m=await model(page,{stockError:true});await page.goto('/seller/products/'+m.product.id+'/edit');const checklist=page.getByRole('region',{name:'Hoàn thiện sản phẩm để bán',exact:true});await expect(checklist.getByRole('alert')).toContainText('Kho chưa phản hồi');await expect(checklist).toContainText('Chưa đọc được tồn; chưa kết luận mua được');m.recover();await checklist.getByRole('button',{name:'Thử lại',exact:true}).click();await expect(checklist).toContainText('11/12 phân loại đang bán còn tồn khả dụng');
});


test('readiness identifies invalid saved axes instead of claiming the active variants are valid',async({page})=>{
 const m=await model(page);m.variants[0].variant_values.color='Tím';await page.goto('/seller/products/'+m.product.id+'/edit');const checklist=page.getByRole('region',{name:'Hoàn thiện sản phẩm để bán',exact:true});await expect(checklist).toContainText('Cần sửa trục phân loại của OPAQUE-299-0');await expect(checklist).not.toContainText('12 phân loại đang bán có SKU và giá hợp lệ');
});

test('readiness identifies a variant consistently when response object keys arrive in a different order',async({page})=>{
 const m=await model(page);m.variants[11].variant_values={size:'XL',color:'Đen'};await page.goto('/seller/products/'+m.product.id+'/edit');const checklist=page.getByRole('region',{name:'Hoàn thiện sản phẩm để bán',exact:true});await checklist.getByText('Đối chiếu 12 phân loại theo món / SKU',{exact:true}).click();await expect(checklist.locator('li').filter({hasText:'SKU OPAQUE-299-11'}).locator('strong')).toHaveText('Đen / XL');
});
