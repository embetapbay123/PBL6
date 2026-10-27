import { test,expect,Page,Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id='73000000-0000-4000-8000-000000000001',type='73000000-0000-4000-8000-000000000002',store='73000000-0000-4000-8000-000000000003',variant='73000000-0000-4000-8000-000000000004';
const product={id,store_id:store,product_type_id:type,title:'Managed Product',description:'Test',attributes:{},status:'DRAFT',moderation_status:'VISIBLE',version:0,variants:[{id:variant,sku:'SKU',price_vnd:100,variant_values:{},status:'ACTIVE',is_default:true}],images:[]};
type Call={path:string;method:string;body:any;key?:string};
async function setup(page:Page,handler?:(route:Route,c:Call)=>Promise<void>|undefined){
 const calls:Call[]=[];
 const context={user_id:id,roles:['CUSTOMER','STORE_OWNER'],role_permissions:[],token_version:0,store_membership:{store_id:store,role:'OWNER',status:'ACTIVE',permissions:[]}};
 await page.route('**/api/v1/**',route=>{
  const req=route.request(),path=new URL(req.url()).pathname.replace('/api/v1',''),c={path,method:req.method(),body:req.postData()?req.postDataJSON():undefined,key:req.headers()['idempotency-key']};calls.push(c);
  const handled=handler?.(route,c);if(handled)return handled;
  if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:{...fixtures.login.response,context},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/me/context')return route.fulfill({json:context});
  if(path==='/me')return route.fulfill({json:{...fixtures.getProfile.response,email:'fixture@example.test'}});
  if(path==='/store/products/'+id)return route.fulfill({json:product});
  if(path==='/products/'+id)return route.fulfill({json:{...product,status:'ACTIVE'}});
  if(path==='/products/'+id+'/availability')return route.fulfill({json:{product_id:id,observed_at:new Date().toISOString(),items:[{variant_id:variant,available_quantity:3}]}});
  if(path==='/product-types')return route.fulfill({json:{items:[{id:type,name:'Type',status:'ACTIVE',attribute_definitions:[]}],total:1,page:1,size:100}});
  if(path.includes('/reviews')||path.includes('/products')||path==='/categories'||path.includes('/recommendations')||path==='/me/orders')return route.fulfill({json:{items:[],total:0,page:1,size:20}});
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Unconfigured fixture '+path,details:[]}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();return calls;
}
test('uncertain Product creation survives reload with the exact body and key',async({page})=>{
 const writes:Call[]=[];
 await setup(page,(route,c)=>{
  if(c.path==='/store/products'&&c.method==='POST'){
   writes.push(c);return writes.length===1?route.abort('failed'):route.fulfill({status:201,json:{...product,title:c.body.title}});
  }
 });
 await page.goto('/seller/products/new');await page.getByLabel('Loại sản phẩm').selectOption(type);await page.getByLabel('Tên sản phẩm').fill('Frozen Product');await page.getByRole('button',{name:'Lưu thay đổi'}).click();
 await expect(page.getByText(/Lần gửi trước chưa rõ kết quả/)).toBeVisible();await page.reload();
 await expect(page.getByLabel('Tên sản phẩm')).toBeDisabled();await page.getByRole('button',{name:'Lưu thay đổi'}).click();
 await expect(page.getByRole('heading',{name:'Sửa sản phẩm #'+id})).toBeVisible();expect(writes).toHaveLength(2);expect(writes[1].body).toEqual(writes[0].body);expect(writes[1].key).toBe(writes[0].key);expect(writes[0].key).toMatch(/^[a-f0-9-]{36}$/);
});
test('management detail reaches drafts directly and never scans the first 100 Products',async({page})=>{
 const calls=await setup(page);await page.goto('/seller/products/'+id+'/edit');await expect(page.getByLabel('Tên sản phẩm')).toHaveValue('Managed Product');
 expect(calls.some(c=>c.path==='/store/products/'+id)).toBe(true);expect(calls.some(c=>c.path==='/store/products'&&c.method==='GET')).toBe(false);expect(calls.some(c=>c.path==='/products/'+id)).toBe(false);
});
test('an uncertain Variant insert is explicitly replayed with its original command after reload',async({page})=>{
 const writes:Call[]=[];
 await setup(page,(route,c)=>{if(c.path==='/store/products/'+id+'/variants'){
  writes.push(c);return writes.length===1?route.abort('failed'):route.fulfill({status:201,json:product.variants[0]});
 }});
 await page.goto('/seller/products/'+id+'/edit');await page.getByLabel('SKU',{exact:true}).fill('Frozen-SKU');await page.getByLabel('Giá (VND)').fill('100');await page.getByRole('button',{name:'Thêm biến thể',exact:true}).click();
 await expect(page.getByText(/Lần thêm trước chưa rõ kết quả/)).toBeVisible();await page.reload();await page.getByRole('button',{name:'Thêm biến thể',exact:true}).click();
 await expect(page.getByText('Đã thêm biến thể.')).toBeVisible();expect(writes).toHaveLength(2);expect(writes[1].body).toEqual(writes[0].body);expect(writes[1].key).toBe(writes[0].key);
});
test('public stock errors are visible and never interpreted as saleable stock',async({page})=>{
 await setup(page,(route,c)=>c.path==='/products/'+id+'/availability'?route.fulfill({status:503,json:{code:'DEPENDENCY_UNAVAILABLE',message:'Không đọc được tồn hiện tại',details:[]}}):undefined);
 await page.goto('/products/'+id);await expect(page.getByRole('button',{name:'Thêm vào giỏ hàng'})).toBeDisabled();await expect(page.getByRole('alert').filter({hasText:'Không đọc được tồn hiện tại'})).toBeVisible();await expect(page.getByText('Tồn khả dụng: 0')).toHaveCount(0);
});

test('Product detail selects color and size combinations and respects availability',async({page})=>{
 const variants=[
  {id:variant,sku:'RED-S',price_vnd:100,status:'ACTIVE',is_default:true,variant_values:{color:'Đỏ',size:'S'}},
  {id:'61000000-0000-4000-8000-000000000005',sku:'RED-M',price_vnd:120,status:'ACTIVE',variant_values:{color:'Đỏ',size:'M'}},
  {id:'61000000-0000-4000-8000-000000000006',sku:'BLUE-S',price_vnd:130,status:'ACTIVE',variant_values:{color:'Xanh',size:'S'}},
 ];
 await setup(page,(route,c)=>{
  if(c.path==='/products/'+id)return route.fulfill({json:{...product,status:'ACTIVE',variants}});
  if(c.path==='/products/'+id+'/availability')return route.fulfill({json:{product_id:id,observed_at:new Date().toISOString(),items:variants.map(v=>({variant_id:v.id,available_quantity:v.sku==='BLUE-S'?0:3}))}});
 });
 await page.goto('/products/'+id);await expect(page.getByRole('group',{name:'Màu sắc'})).toBeVisible();await expect(page.getByRole('group',{name:'Kích cỡ'})).toBeVisible();
 await page.getByRole('button',{name:'M',exact:true}).click();await expect(page.getByText('120 ₫')).toBeVisible();
 await page.getByLabel('Số lượng').fill('4');await expect(page.getByRole('button',{name:'Thêm vào giỏ hàng'})).toBeDisabled();
 await page.getByLabel('Số lượng').fill('1');await expect(page.getByRole('button',{name:'Thêm vào giỏ hàng'})).toBeEnabled();
 await expect(page.getByRole('button',{name:'Xanh',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'S',exact:true}).click();await page.getByRole('button',{name:'Xanh',exact:true}).click();
 await expect(page.getByText('Phân loại này hiện hết hàng.')).toBeVisible();await expect(page.getByRole('button',{name:'Thêm vào giỏ hàng'})).toBeDisabled();
});
