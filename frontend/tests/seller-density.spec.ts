import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'e9000000-0000-4000-8000-'+String(n).padStart(12,'0');
test.use({viewport:{width:1440,height:900}});
async function setup(page:Page){
 const reads:string[]=[];
 const auth={user_id:id(1),roles:['CUSTOMER','STORE_OWNER'],role_permissions:[],token_version:0,store_membership:{store_id:id(2),role:'OWNER',status:'ACTIVE',permissions:[]}};
 const products=Array.from({length:26},(_,n)=>({...f.getProduct.response,id:id(100+n),store_id:id(2),title:'Áo quản lý '+String(n).padStart(2,'0'),status:n%2?'DRAFT':'ACTIVE',moderation_status:'VISIBLE',version:0,images:[],variants:[{id:id(200+n),sku:'SKU-'+n,price_vnd:100000+n*1000,variant_values:{size:'M'},status:'ACTIVE',is_default:true}]}));
 await page.route('**/api/v1/**',r=>{const req=r.request(),url=new URL(req.url()),p=url.pathname.replace('/api/v1','');reads.push(url.pathname+url.search);
  if(p==='/auth/login'||p==='/auth/refresh')return r.fulfill({json:{...f.login.response,context:auth},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(p==='/me/context')return r.fulfill({json:auth});
  if(p==='/store')return r.fulfill({json:{id:id(2),name:'Gian hàng kiểm tra',status:'ACTIVE',shipping_fee_vnd:20000,version:0,return_address:{recipient_name:'Kho',phone:'0900000000',line1:'1 Đường A',ward:'Phường B',district:'Quận C',city:'Huế'}}});
  const pageNumber=Number(url.searchParams.get('page')??1),size=Number(url.searchParams.get('size')??20);
  if(p==='/store/products'){let items=products.filter(v=>!url.searchParams.get('status')||v.status===url.searchParams.get('status'));const sort=url.searchParams.get('sort');items=[...items].sort((a,b)=>sort==='PRICE_ASC'?a.variants[0].price_vnd-b.variants[0].price_vnd:sort==='PRICE_DESC'?b.variants[0].price_vnd-a.variants[0].price_vnd:sort==='NAME_DESC'?b.title.localeCompare(a.title):a.title.localeCompare(b.title));return r.fulfill({json:{items:items.slice((pageNumber-1)*size,pageNumber*size),total:items.length,page:pageNumber,size}});}
  if(p==='/store/inventory'){let items=products.map((v,n)=>({variant_id:v.variants[0].id,product_id:v.id,product_title:v.title,sku:v.variants[0].sku,variant_values:{size:'M'},quantity:n,reserved_quantity:0,available_quantity:n,version:0}));const stock=url.searchParams.get('stock');if(stock==='LOW')items=items.filter(v=>v.quantity>0&&v.quantity<5);if(stock==='OUT')items=items.filter(v=>!v.quantity);if(stock==='IN_STOCK')items=items.filter(v=>v.quantity>0);return r.fulfill({json:{items:items.slice((pageNumber-1)*size,pageNumber*size),total:items.length,page:pageNumber,size}});}
  return r.fulfill({json:{items:[],total:0,page:pageNumber,size,unread_total:0}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('owner@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();return {reads,products};
}
test('product status tabs and column sort query the full list; table scroll is bounded and details are directly accessible',async({page},info)=>{
 const {reads}=await setup(page);await page.goto('/seller/products');const region=page.getByRole('region',{name:'Bảng sản phẩm Store, cuộn ngang để xem đủ cột'});await expect(region.locator('tbody tr')).toHaveCount(20);expect(await region.evaluate(e=>e.scrollHeight>e.clientHeight&&e.clientHeight<=520)).toBe(true);
 await page.getByRole('button',{name:'Sắp xếp Giá bán tăng dần'}).click();await expect.poll(()=>reads.some(v=>v.includes('sort=PRICE_ASC'))).toBe(true);
 await page.getByRole('navigation',{name:'Lọc nhanh sản phẩm'}).getByRole('button',{name:'Bản nháp'}).click();await expect(region.locator('tbody tr')).toHaveCount(13);await expect(page).toHaveURL(/status=DRAFT/);
 await region.getByRole('button',{name:'Chi tiết Áo quản lý 01',exact:true}).click();await expect(page.getByRole('dialog').getByRole('columnheader',{name:'Phân loại'})).toBeVisible();await page.screenshot({path:info.outputPath('product-details.png')});
});
test('stock tabs and headers preserve URL state and rows link to actual products',async({page},info)=>{
 const {reads,products}=await setup(page);await page.goto('/seller/inventory');await expect(page.locator('tbody tr')).toHaveCount(20);
 await page.getByRole('button',{name:'Sắp xếp Có thể bán tăng dần'}).click();await expect.poll(()=>reads.some(v=>v.includes('sort=AVAILABLE_ASC'))).toBe(true);
 await page.getByRole('navigation',{name:'Lọc nhanh tồn kho'}).getByRole('button',{name:'Sắp hết (1–4)'}).click();await expect(page.locator('tbody tr')).toHaveCount(4);await expect(page).toHaveURL(/stock=LOW/);await expect(page.getByRole('link',{name:'Xem sản phẩm'}).first()).toHaveAttribute('href','/products/'+products[1].id);await page.screenshot({path:info.outputPath('inventory-1440.png')});
});
test('overview offers compact clickable work tiles and collapsed guides',async({page},info)=>{
 await setup(page);await page.goto('/seller');await expect(page.locator('.seller-overview-tile')).toHaveCount(3);await expect(page.locator('.seller-overview-guides details[open]')).toHaveCount(0);await page.screenshot({path:info.outputPath('overview-1440.png')});
});
