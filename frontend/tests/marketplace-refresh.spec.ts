import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
test('malformed optional recommendations cannot crash product selection or invent a successful empty feed',async({page})=>{
 const product={...f.getProduct.response,title:'Áo chọn cỡ an toàn',status:'ACTIVE',images:[],variant_axes:[{code:'color',name:'Màu sắc'},{code:'size',name:'Kích cỡ'}],variants:[{id:'a1000000-0000-4000-8000-000000000001',sku:'SHIRT-RED-M',price_vnd:149000,variant_values:{color:'Đỏ',size:'M'},is_default:true,status:'ACTIVE',available_quantity:2}]};
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/api/v1/**',route=>{const url=new URL(route.request().url());if(url.pathname.endsWith('/related'))return route.fulfill({json:{product_ids:['unknown'],mode:'mock'}});if(url.pathname==='/api/v1/products/'+product.id)return route.fulfill({json:product});return route.fulfill({json:{items:[],total:0,page:1,size:20}});});
 await page.goto('/products/'+product.id);await expect(page.getByRole('heading',{name:product.title,exact:true})).toBeVisible();await expect(page.getByRole('region',{name:'Sản phẩm liên quan'}).getByRole('alert')).toContainText('Chưa tải được gợi ý sản phẩm');await expect(page.getByRole('button',{name:'Kích cỡ M',exact:true})).toBeEnabled();await expect(page.locator('.product-selection-summary')).toContainText('Đỏ / M');expect(errors).toEqual([]);
});
