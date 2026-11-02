import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'81000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function model(page:Page,{missing=false}={}){
 let fail=missing;const reads:string[]=[],writes:string[]=[];
 const products=[0,1].map(i=>({...fixtures.getProduct.response,id:id(1+i),store_id:id(11+i),title:'Áo thun cùng tên',status:'ACTIVE',moderation_status:'VISIBLE',images:[],variants:[{id:id(21+i),sku:'OPAQUE-000001',status:'ACTIVE',price_vnd:100000,variant_values:{color:'Đỏ',size:'M'},is_default:true}]}));
 await page.route('**/api/v1/**',route=>{
  const request=route.request(),path=new URL(request.url()).pathname.replace('/api/v1','');if(request.method()!=='GET')writes.push(path);
  if(path.startsWith('/auth/'))return route.fulfill({status:401,json:{code:'UNAUTHENTICATED',message:'Guest fixture'}});
  if(path==='/products')return route.fulfill({json:{items:products,total:2,page:1,size:20}});
  const product=products.find(p=>path==='/products/'+p.id);if(product)return route.fulfill({json:product});
  const store=products.find(p=>path==='/stores/'+p.store_id);
  if(store){reads.push(store.store_id);if(fail&&store.store_id===id(11))return route.fulfill({status:503,json:{code:'UNAVAILABLE',message:'Không đọc được gian hàng'}});return route.fulfill({json:{id:store.store_id,name:store.store_id===id(11)?'Áo Việt Huế':'Áo Việt Đà Nẵng',shipping_fee_vnd:20000}});}
  return route.fulfill({json:{items:[],total:0,page:1,size:20}});
 });return {products,reads,writes,recover:()=>{fail=false;}};
}
test('same-title same-SKU catalog cards identify the Store before the Customer chooses a product',async({page})=>{
 const f=await model(page);await page.goto('/?q=Áo');await expect(page.locator('.product-card')).toHaveCount(2);
 for(const [name,store,product] of [['Áo Việt Huế',id(11),id(1)],['Áo Việt Đà Nẵng',id(12),id(2)]] as const){
  const card=page.locator('.product-card').filter({has:page.getByRole('link',{name:name,exact:true})});await expect(card).toHaveCount(1);await expect(card.getByRole('link',{name:name,exact:true})).toHaveAttribute('href','/stores/'+store);await expect(card.locator('.market-product-link')).toHaveAttribute('href','/products/'+product);
 }
});
test('detail Store identity loads independently and an unavailable name has an explicit read-only recovery',async({page})=>{
 const f=await model(page,{missing:true});await page.goto('/products/'+id(1));await expect(page.getByRole('heading',{name:'Áo thun cùng tên',exact:true})).toBeVisible();await expect(page.getByText('Chưa đọc được tên gian hàng',{exact:false})).toBeVisible();
 f.recover();await page.getByRole('button',{name:'Đọc lại tên gian hàng',exact:true}).focus();await page.keyboard.press('Enter');const recovered=page.getByRole('link',{name:'Gian hàng: Áo Việt Huế',exact:true});await expect(recovered).toHaveAttribute('href','/stores/'+id(11));await expect(recovered).toBeFocused();
 expect(f.writes.filter(path=>!path.startsWith('/auth/'))).toEqual([]);
});

test('a variant label keeps the same axis order for both JSON key orders and preserves valid zero or false values',async({page})=>{
 const f=await model(page);const product={...f.products[0],variants:[{...f.products[0].variants[0],variant_values:{size:'M',color:'Đỏ',width:0,coated:false}}]};
 await page.route('**/api/v1/products/'+id(1),route=>route.fulfill({json:product}));await page.goto('/products/'+id(1));
 const choice=page.locator('.product-selection-summary');await expect(choice).toHaveCount(1);await expect(choice).toContainText('false / Đỏ / M / 0');
 product.variants[0].variant_values={coated:false,width:0,color:'Đỏ',size:'M'};await page.reload();await expect(choice).toHaveCount(1);await expect(choice).toContainText('false / Đỏ / M / 0');
});
