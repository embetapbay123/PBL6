import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'fc100000-0000-4000-8000-'+String(n).padStart(12,'0');
const store=id(100),user=id(101);
async function model(page:Page,{batchFailure=false}={}){
 const products=Array.from({length:40},(_,i)=>({...fixtures.getProduct.response,id:id(i+1),store_id:store,title:'Áo '+String(i+1).padStart(2,'0'),status:'ACTIVE',images:[],review_summary:{average:i===20?5:3,count:1},
  variants:[{id:id(i+200),sku:'INTERNAL-'+i,price_vnd:i===20?1000:100000+i*1000,variant_values:{},is_default:true,status:'ACTIVE',available_quantity:5}]}));
 const calls={personal:0,batches:[] as string[][],details:[] as string[],store:[] as URL[],errors:[] as string[]};
 const paged=(items:unknown[],size=20,total=items.length,page=1)=>({items,total,page,size});let failed=false;
 await page.context().addCookies([{name:'pbl6_csrf',value:'fixture',url:process.env.WEB_TEST_URL||'http://127.0.0.1:3000'}]);
 await page.context().route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url()),p=url.pathname.replace('/api/v1','');
  if(p.startsWith('/auth/'))return route.fulfill({json:{...fixtures.login.response,context:{user_id:user,roles:['CUSTOMER'],role_permissions:[],token_version:0}}});
  if(p==='/me')return route.fulfill({json:{...fixtures.getProfile.response,user_id:user}});
  if(p==='/products'){
   const ids=url.searchParams.get('ids');
   if(ids){calls.batches.push(ids.split(','));if(batchFailure&&!failed){failed=true;return route.fulfill({status:503,json:{code:'DOWN',message:'Gợi ý đang tạm lỗi.',details:[]}});}return route.fulfill({json:paged(products.filter(x=>ids.split(',').includes(x.id)),100)});}
   await new Promise(r=>setTimeout(r,180));return route.fulfill({json:paged(batchFailure?[]:products.slice(0,20),20,batchFailure?0:40)});
  }
  if(p==='/recommendations/for-you'){calls.personal++;return route.fulfill({json:{source:'BASELINE',product_ids:(batchFailure?products.slice(20,22):products).map(p=>p.id),recently_viewed_product_ids:[]}});}
  if(p.startsWith('/products/')){calls.details.push(p);return route.fulfill({json:products.find(x=>p.endsWith(x.id))});}
  if(p==='/stores/'+store)return route.fulfill({json:{id:store,name:'Gian hàng thử sort',shipping_fee_vnd:15000}});
  if(p==='/stores/'+store+'/products'){
   calls.store.push(url);let items=products.slice(0,21);const sort=url.searchParams.get('sort');
   if(sort==='price_asc')items.sort((a,b)=>a.variants[0].price_vnd-b.variants[0].price_vnd);
   if(sort==='price_desc')items.sort((a,b)=>b.variants[0].price_vnd-a.variants[0].price_vnd);
   if(sort==='rating')items.sort((a,b)=>b.review_summary.average-a.review_summary.average);
   const page=Number(url.searchParams.get('page')||1);return route.fulfill({json:paged(items.slice((page-1)*20,page*20),20,21,page)});
  }
  return route.fulfill({json:paged([])});
 });
 page.on('pageerror',e=>calls.errors.push(e.message));return calls;
}

test('Store sort resets page, keeps search, persists in URL and uses server order across pages',async({page})=>{
 const calls=await model(page);await page.goto('/stores/'+store+'?page=2&q=Áo');
 await expect(page.locator('.market-product-grid .product-card')).toHaveCount(1);
 await page.getByRole('button',{name:'Giá thấp đến cao',exact:true}).click();
 await expect(page).toHaveURL(/sort=price_asc/);expect(new URL(page.url()).searchParams.has('page')).toBe(false);expect(new URL(page.url()).searchParams.get('q')).toBe('Áo');
 await expect(page.locator('.market-product-grid .product-card').first()).toContainText('Áo 21');
 expect(calls.store.at(-1)?.searchParams.get('sort')).toBe('price_asc');
 await page.getByRole('button',{name:'2',exact:true}).click();await expect(page.locator('.market-product-grid .product-card')).toHaveCount(1);await expect(page.locator('.market-product-grid')).toContainText('Áo 20');
 await page.reload();await expect(page.getByRole('button',{name:'Giá thấp đến cao',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.market-product-grid')).toContainText('Áo 20');
 await page.getByRole('button',{name:'Đánh giá cao',exact:true}).click();await expect(page.locator('.market-product-grid .product-card').first()).toContainText('Áo 21');
 await page.getByRole('button',{name:'Giá cao đến thấp',exact:true}).click();await expect(page.locator('.market-product-grid .product-card').first()).toContainText('Áo 20');expect(calls.errors).toEqual([]);
});

test('Home batches recommendations, avoids per-product fanout and does not reload feed when catalog exclusions arrive',async({page})=>{
 const calls=await model(page);await page.goto('/');const feed=page.getByRole('region',{name:'Dành cho bạn',exact:true});await expect(feed).toContainText('Áo 21');
 await expect.poll(()=>calls.personal).toBe(1);expect(calls.details).toHaveLength(0);expect(calls.batches.length).toBeLessThanOrEqual(2);expect(calls.batches.every(ids=>ids.length<=100)).toBe(true);
 await expect(feed).not.toContainText('Áo 01');
 await page.locator('a[href="/stores/'+store+'"]').first().click();await expect(page.getByRole('heading',{name:'Gian hàng thử sort',exact:true})).toBeVisible();
 await page.locator('a[href="/"]').first().click();await expect(feed).toContainText('Áo 21');expect(calls.personal).toBe(2);expect(calls.details).toHaveLength(0);expect(calls.errors).toEqual([]);
});

test('failed recommendation batch stays an error and explicit retry recovers without refetching personal IDs',async({page})=>{
 const calls=await model(page,{batchFailure:true});await page.goto('/');const feed=page.getByRole('region',{name:'Dành cho bạn',exact:true});await expect(feed.getByRole('alert')).toContainText('Gợi ý đang tạm lỗi.');
 await feed.getByRole('button',{name:'Thử lại',exact:true}).click();await expect(feed).toContainText('Áo 21');expect(calls.personal).toBe(1);expect(calls.details).toHaveLength(0);expect(calls.errors).toEqual([]);
});
