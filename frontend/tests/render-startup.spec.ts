import {test,expect} from '@playwright/test';
import {installRenderDiagnostics} from './runtime/render-diagnostics';

installRenderDiagnostics(test);
test.use({viewport:{width:1440,height:900}});
for(let n=1;n<=12;n++)test('isolated desktop startup renders its document and modules '+n,async({page},info)=>{
 const errors:string[]=[],failed:string[]=[],modules:{path:string;status:number}[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('requestfailed',request=>{const p=new URL(request.url()).pathname;if(p.startsWith('/src/')||p.includes('/node_modules/'))failed.push(p);});
 page.on('response',response=>{const p=new URL(response.url()).pathname;if(p.startsWith('/src/')||p.includes('/node_modules/'))modules.push({path:p,status:response.status()});});
 await page.route('**/api/v1/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/v1/auth/refresh')return route.fulfill({status:401,json:{code:'UNAUTHENTICATED',message:'Guest startup fixture'}});
  if(path==='/api/v1/products'||path==='/api/v1/categories')return route.fulfill({json:{items:[],total:0,page:1,size:20}});
  if(path.startsWith('/api/v1/recommendations/'))return route.fulfill({json:{source:'BASELINE',product_ids:[],recently_viewed_product_ids:[]}});
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Startup fixture has no private data'}});
 });
 const response=await page.goto(n%2?'/login':'/');expect(response?.status()).toBe(200);
 await expect(page.getByRole('link',{name:'Trang chủ PBL6',exact:true})).toBeVisible();
 if(n%2)await expect(page.getByLabel('Email',{exact:true})).toBeVisible();else await expect(page.getByRole('button',{name:'Mở chat',exact:true})).toBeVisible();
 expect(errors).toEqual([]);expect(failed).toEqual([]);expect(modules.some(m=>m.path==='/src/main.tsx'&&m.status===200)).toBe(true);expect(modules.filter(m=>m.status>=400)).toEqual([]);
 await info.attach('startup-modules',{body:JSON.stringify({sample:n,document_status:response?.status(),module_responses:modules.length,errors,failed,limits:'Render probe only; not an operational task or proof of all startup reliability.'},null,2),contentType:'application/json'});
});
