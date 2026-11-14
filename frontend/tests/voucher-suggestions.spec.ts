import {test,expect,type Page,type Route} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'b1020000-0000-4000-8000-'+String(n).padStart(12,'0');
const user=id(1),store=id(2),product=id(3),variant=id(4),line=id(5);
async function model(page:Page){
 const state={requests:[] as any[],errors:[] as string[],reject:false,limited:false,hold:false,pending:undefined as Route|undefined};
 const paged=(items:any[])=>({items,total:items.length,page:1,size:20});
 const p={...f.getProduct.response,id:product,store_id:store,title:'Áo sơ mi xanh',status:'ACTIVE',moderation_status:'VISIBLE',variants:[{id:variant,status:'ACTIVE',sku:'SKU',price_vnd:100000,available_quantity:5,variant_values:{size:'M'}}]};
 await page.context().addCookies([{name:'pbl6_csrf',value:'fixture',url:process.env.WEB_TEST_URL!}]);
 await page.route('**/api/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname.replace('/api/v1','');
  const reply=(json:any)=>route.fulfill({json});
  if(path.startsWith('/auth/'))return reply({...f.login.response,context:{user_id:user,roles:['CUSTOMER'],role_permissions:[],token_version:0}});
  if(path==='/me')return reply({...f.getProfile.response,user_id:user});
  if(path==='/cart/items')return reply(paged([{id:line,store_id:store,product_id:product,variant_id:variant,quantity:2}]));
  if(path==='/products')return reply(paged([p]));
  if(path==='/products/'+product)return reply(p);
  if(path==='/stores/'+store)return reply({id:store,name:'Gian hàng áo',shipping_fee_vnd:20000});
  if(path==='/me/vouchers')return reply(paged([{id:id(9),code:'SMALL',scope:'STORE',store_id:store,discount_type:'FIXED',discount_value:20000,min_goods_vnd:0,ends_at:'2030-01-01T00:00:00Z'}]));
  if(path==='/checkout/voucher-suggestions'){
   const body=req.postDataJSON();state.requests.push(body);
   if(state.hold){state.pending=route;return;}
   if(state.reject||body.code==='INVALID')return route.fulfill({status:422,json:{code:'VOUCHER_OUT_OF_QUOTA',message:'Mã vừa hết lượt. Hãy chọn mã khác.',details:[]}});
   const selected=body.mode==='AUTO'?{store_vouchers:{[store]:'SMALL'},platform_voucher_code:'PLATFORM'}:body.code?{store_vouchers:{[store]:body.code}}:{...(body.store_vouchers&&Object.keys(body.store_vouchers).length?{store_vouchers:body.store_vouchers}:{}),...(body.platform_voucher_code?{platform_voucher_code:body.platform_voucher_code}:{})};
   const discount=selected.platform_voucher_code?70000:selected.store_vouchers?20000:0;
   return reply({selected,goods_total_vnd:200000,discount_total_vnd:discount,net_goods_total_vnd:200000-discount,optimality:body.mode==='AUTO'?(state.limited?'LIMITED':'OPTIMAL'):'MANUAL'});
  }
  return reply(paged([]));
 });
 page.on('pageerror',e=>state.errors.push(e.message));await page.goto('/cart');await page.getByRole('button',{name:/Mã giảm giá/}).click();
 return state;
}
test('first open auto-selects for selected cart lines and shows savings excluding shipping',async({page})=>{
 const s=await model(page);const dialog=page.getByRole('dialog');await expect(dialog).toContainText('Ưu đãi tốt nhất');await expect(dialog).toContainText('70.000');await expect(dialog).toContainText('130.000');await expect(dialog).toContainText('chưa gồm phí giao hàng');expect(s.requests).toEqual([{cart_item_ids:[line],mode:'AUTO'}]);
 await dialog.getByRole('button',{name:'Áp dụng',exact:true}).click();await expect(dialog).toHaveCount(0);expect(s.requests.at(-1)).toMatchObject({mode:'MANUAL',store_vouchers:{[store]:'SMALL'},platform_voucher_code:'PLATFORM'});
 await page.getByRole('button',{name:/Mã giảm giá/}).click();await expect(page.getByRole('dialog')).toContainText('Ưu đãi đã chọn');expect(s.requests.at(-1).mode).toBe('MANUAL');expect(s.errors).toEqual([]);
});
test('typed code outside current page is resolved by server and rejection keeps input and old selection',async({page})=>{
 const s=await model(page),dialog=page.getByRole('dialog');await expect(dialog).toContainText('Ưu đãi tốt nhất');
 await dialog.getByLabel('Mã giảm giá',{exact:true}).fill('OFF-PAGE-STORE');await dialog.getByRole('button',{name:'Chọn mã',exact:true}).click();await expect(dialog).toContainText('Đã chọn mã OFF-PAGE-STORE.');expect(s.requests.at(-1)).toMatchObject({mode:'MANUAL',code:'OFF-PAGE-STORE'});await expect(dialog).toContainText('Shop: OFF-PAGE-STORE');
 await dialog.getByLabel('Mã giảm giá',{exact:true}).fill('INVALID');await dialog.getByRole('button',{name:'Chọn mã',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('Mã vừa hết lượt');await expect(dialog.getByLabel('Mã giảm giá',{exact:true})).toHaveValue('INVALID');await expect(dialog).toContainText('Shop: OFF-PAGE-STORE');await expect(dialog.getByRole('button',{name:'Áp dụng',exact:true})).toBeDisabled();
 await dialog.getByRole('button',{name:'Bỏ tất cả',exact:true}).click();await expect(dialog).toContainText('200.000');await expect(dialog.getByRole('button',{name:'Áp dụng',exact:true})).toBeEnabled();expect(s.errors).toEqual([]);
});
test('late response after closing cannot overwrite a newly opened manual selection',async({page})=>{
 const s=await model(page),dialog=page.getByRole('dialog');await expect(dialog).toContainText('Ưu đãi tốt nhất');s.hold=true;await dialog.getByRole('button',{name:'Tự chọn lại',exact:true}).click();await expect.poll(()=>Boolean(s.pending)).toBe(true);await dialog.getByRole('button',{name:'TRỞ LẠI',exact:true}).click();s.hold=false;
 await page.getByRole('button',{name:/Mã giảm giá/}).click();await expect(page.getByRole('dialog')).toContainText('Ưu đãi tốt nhất');
 await s.pending!.fulfill({json:{selected:{},goods_total_vnd:200000,discount_total_vnd:0,net_goods_total_vnd:200000,optimality:'OPTIMAL'}}).catch(()=>{});await expect(page.getByRole('dialog')).toContainText('130.000');expect(s.errors).toEqual([]);
});
for(const width of [320,390,1366])test(`limited suggestion is honestly labelled and dialog fits ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:844});const s=await model(page);await expect(page.getByRole('dialog')).toContainText('Ưu đãi tốt nhất');s.limited=true;await page.getByRole('button',{name:'Tự chọn lại',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Gợi ý ưu đãi');await expect(page.getByRole('dialog')).not.toContainText('Ưu đãi tốt nhất');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('voucher.png'),fullPage:true});expect(s.errors).toEqual([]);
});
