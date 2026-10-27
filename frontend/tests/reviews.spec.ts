import {test,expect,Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'41000000-0000-4000-8000-'+String(n).padStart(12,'0');
const product=id(1),completed=id(2),orderItem=id(3),reviewId=id(4);
async function setup(page:Page,{existing=false,unavailable=false,conflict=false}={}){
 const writes:{method:string;body:unknown;path:string}[]=[];
 let reviews=existing?[{id:reviewId,order_item_id:orderItem,product_id:product,rating:4,body:'Existing contract body',version:7,status:'VISIBLE'}]:[];
 const auth={...fixtures.login.response,access_token:'fixture-only',context:{user_id:id(5),roles:['CUSTOMER'],token_version:0}};
 await page.route('**/api/v1/**',route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(path.endsWith('/auth/login')||path.endsWith('/auth/refresh'))return route.fulfill({json:auth,headers:{'set-cookie':'pbl6_csrf=fixture-only; Path=/; SameSite=Strict'}});
  if(path==='/api/v1/products/'+product)return route.fulfill({json:{...fixtures.getProduct.response,id:product}});
  if(path==='/api/v1/products/'+product+'/availability')return route.fulfill({json:{product_id:product,observed_at:new Date().toISOString(),items:[]}});
  if(path==='/api/v1/products/'+product+'/related')return route.fulfill({json:{items:[],total:0,page:1,size:4}});
  if(path.endsWith('/reviews')&&req.method()==='GET')return route.fulfill(unavailable?{status:501,json:{code:'FEATURE_NOT_IMPLEMENTED',message:'Review backend pending',details:[]}}:{json:{items:reviews,total:reviews.length,page:1,size:20}});
  if(path==='/api/v1/me/orders')return route.fulfill({json:{items:[{...fixtures.getOwnOrder.response,id:completed,status:'COMPLETED',items:[{id:orderItem,product_id:product}]},{...fixtures.getOwnOrder.response,id:id(6),status:'PENDING',items:[{id:id(7),product_id:product}]}],total:2,page:1,size:20}});
  if(path.startsWith('/api/v1/me/reviews')){
   const body=req.postDataJSON();writes.push({method:req.method(),body,path});
   if(conflict)return route.fulfill({status:409,json:{code:'VERSION_CONFLICT',message:'Review changed; reload before editing',details:[]}});
   const value={id:reviewId,order_item_id:orderItem,product_id:product,...body,version:req.method()==='POST'?0:8,status:'VISIBLE'};delete value.expected_version;
   reviews=[value];return route.fulfill({status:req.method()==='POST'?201:200,json:value});
  }
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Unconfigured fixture',details:[]}});
 });
 return {writes,login:async()=>{await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible()}};
}
test('Guest reads the contract body without a fabricated author/date or write form',async({page})=>{
 await setup(page,{existing:true});await page.goto('/products/'+product);
 await expect(page.getByText('Existing contract body')).toBeVisible();await expect(page.getByLabel('Nội dung đánh giá')).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Đăng nhập để viết đánh giá sau mua hàng'})).toBeVisible();
});
test('create uses a real completed owned OrderItem rather than a sample ID',async({page})=>{
 const t=await setup(page);await t.login();await page.goto('/products/'+product);
 await expect(page.getByLabel('Mục đơn hàng')).toBeVisible();await expect(page.getByLabel('Mục đơn hàng').locator('option')).toHaveCount(2);
 await page.getByLabel('Mục đơn hàng').selectOption(orderItem);await page.getByLabel('Nội dung đánh giá').fill('Actual form content');await page.getByRole('button',{name:'Gửi đánh giá',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Đã lưu đánh giá qua API.'})).toBeVisible();
 expect(t.writes).toEqual([{method:'POST',path:'/api/v1/me/reviews',body:{order_item_id:orderItem,rating:5,body:'Actual form content'}}]);
 await expect(page.getByText('Actual form content',{exact:true}).first()).toBeVisible();
});
test('owned edit sends expected_version and preserves the draft on a 409',async({page})=>{
 const t=await setup(page,{existing:true,conflict:true});await t.login();await page.goto('/products/'+product);
 await page.getByRole('button',{name:'Sửa đánh giá',exact:true}).click();await page.getByLabel('Nội dung đánh giá').fill('Preserve this draft');await page.getByRole('button',{name:'Lưu đánh giá',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Review changed');await expect(page.getByLabel('Nội dung đánh giá')).toHaveValue('Preserve this draft');
 expect(t.writes[0]).toEqual({method:'PATCH',path:'/api/v1/me/reviews/'+reviewId,body:{rating:4,body:'Preserve this draft',expected_version:7}});
 await expect(page.getByText('Đã lưu đánh giá qua API.')).toHaveCount(0);
});
test('501 remains an explicit error rather than an empty/successful review list',async({page})=>{
 await setup(page,{unavailable:true});await page.goto('/products/'+product);await expect(page.getByRole('alert')).toContainText('Review backend pending');
 await expect(page.getByText('Chưa có đánh giá nào cho sản phẩm này.')).toHaveCount(0);
});
