import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'b1030000-0000-4000-8000-'+String(n).padStart(12,'0');
const user=id(1),store=id(2),product=id(3),small=id(4),medium=id(5),line=id(6),orderId=id(7);

async function model(page:Page,{rejectVariant=false,lostDelete=false}:{rejectVariant?:boolean;lostDelete?:boolean}={}){
 const state={items:[{id:line,product_id:product,store_id:store,variant_id:small,quantity:2}],adds:[] as any[],deletes:[] as string[],errors:[] as string[],addresses:[
  {id:id(30),recipient_name:'Nguyễn Minh An có tên rất dài để kiểm tra bố cục',phone:'0900000000',line1:'123 Đường mẫu có tên dài, tòa nhà có nhiều tầng',ward:'Phường A',district:'Quận B',city:'Huế',is_default:true},
  {id:id(31),recipient_name:'Nguyễn Mai',phone:'0900000001',line1:'456 Đường mẫu',ward:'Phường A',district:'Quận B',city:'Huế',is_default:false},
 ],orderStatus:'COMPLETED'};
 const variants=[{id:small,sku:'INTERNAL-S',price_vnd:100000,variant_values:{size:'S'},is_default:true,status:'ACTIVE',available_quantity:5},{id:medium,sku:'INTERNAL-M',price_vnd:120000,variant_values:{size:'M'},is_default:false,status:'ACTIVE',available_quantity:4}];
 const p={...fixtures.getProduct.response,id:product,store_id:store,title:'Áo sơ mi xanh',status:'ACTIVE',product_type_id:id(22),variant_axes:['size'],variants,images:[{id:id(50),image_url:'/catalog/red-plaid-shirt.webp',position:0}]};
 const paged=(items:unknown[])=>({items,total:items.length,size:100,page:1});
 await page.context().addCookies([{name:'pbl6_csrf',value:'fixture',url:process.env.WEB_TEST_URL!}]);
 await page.route('**/api/v1/**',async route=>{
  const r=route.request(),url=new URL(r.url()),path=url.pathname.replace('/api/v1',''),method=r.method();let body:any;try{body=r.postDataJSON()}catch{}
  const reply=(json:any)=>route.fulfill({json});
  if(path.startsWith('/auth/'))return reply({...fixtures.login.response,context:{user_id:user,roles:['CUSTOMER'],role_permissions:[],token_version:0}});
  if(path==='/me')return reply({...fixtures.getProfile.response,user_id:user,email:'fixture@example.test',display_name:'Khách kiểm thử'});
  if(path==='/cart/items'&&method==='GET')return reply(paged(state.items));
  if(path==='/cart/items'&&method==='POST'){
   state.adds.push(body);
   if(rejectVariant&&state.adds.length===1)return route.fulfill({status:422,json:{code:'VALIDATION_FAILED',message:'Chưa đổi được phân loại. Hãy thử lại.',details:[]}});
   const item={...state.items[0],id:id(8),variant_id:body.variant_id,quantity:body.quantity};state.items.push(item);return reply(item);
  }
  if(path.startsWith('/cart/items/')&&method==='DELETE'){
   state.deletes.push(path);state.items=state.items.filter(i=>i.id!==path.split('/')[3]);
   if(lostDelete)return route.fulfill({status:503,json:{code:'ACK_UNKNOWN',message:'Chưa rõ kết quả.',details:[]}});
   return route.fulfill({status:204});
  }
  if(path==='/products')return reply(paged([p]));
  if(path==='/products/'+product)return reply(p);
  if(path==='/categories')return reply(paged([{id:id(21),name:'Thời trang',status:'ACTIVE'}]));
  if(path==='/product-types')return reply(paged([{id:id(22),category_id:id(21),name:'Áo',status:'ACTIVE'}]));
  if(path==='/stores/'+store)return reply({id:store,name:'Gian hàng mẫu',shipping_fee_vnd:20000});
  if(path==='/stores/'+store+'/products')return reply(paged([p]));
  if(path==='/me/addresses'&&method==='GET')return reply(paged(state.addresses));
  if(path.startsWith('/me/addresses/')&&method==='DELETE'){state.addresses=state.addresses.filter(a=>a.id!==path.split('/')[3]);return route.fulfill({status:204});}
  if(path.startsWith('/me/addresses/')&&method==='PATCH'){state.addresses=state.addresses.map(a=>({...a,is_default:a.id===path.split('/')[3]}));return reply(state.addresses.find(a=>a.is_default));}
  if(path==='/me/orders'||path==='/me/orders/'+orderId){const order={...fixtures.getOwnOrder.response,id:orderId,store_id:store,status:state.orderStatus,payment_method:'COD',payment_status:'SUCCEEDED',shipping_mode:'LEGACY_MANUAL',
   items:[{id:id(40),product_id:product,variant_id:small,quantity:2,unit_price_vnd:100000,line_total_vnd:200000,sku_snapshot:'INTERNAL-S',product_snapshot:{title:'Áo sơ mi xanh',variant_values:{size:'S'}}}],amounts:{goods_vnd:200000,shipping_vnd:20000,payable_vnd:220000},created_at:'2026-11-14T00:00:00Z'};return reply(path==='/me/orders'?paged([order]):order);}
  if(path.startsWith('/recommendations/'))return reply({source:'BASELINE',product_ids:[],recently_viewed_product_ids:[]});
  return reply(paged([]));
 });
 page.on('pageerror',e=>state.errors.push(e.message));return state;
}

test('variant name opens the in-row editor, Escape restores focus and success preserves quantity',async({page})=>{
 const state=await model(page);await page.goto('/cart');const row=page.getByRole('group',{name:/Dòng giỏ:/});
 const trigger=row.getByRole('button',{name:'Đổi phân loại: S',exact:true});await expect(trigger).toHaveText(/S/);await trigger.focus();await page.keyboard.press('Enter');
 const select=row.getByRole('combobox',{name:'Đổi phân loại',exact:true});await expect(select).toBeFocused();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
 await trigger.click();await select.selectOption(medium);await row.getByRole('button',{name:'Đổi',exact:true}).click();await expect(row.getByRole('button',{name:'Đổi phân loại: M',exact:true})).toBeVisible();
 expect(state.adds).toEqual([{product_id:product,variant_id:medium,quantity:2}]);expect(state.deletes).toHaveLength(1);expect(state.items).toHaveLength(1);expect(state.items[0].quantity).toBe(2);expect(state.errors).toEqual([]);
});

test('rejected variant leaves original line and choice available for retry',async({page})=>{
 const state=await model(page,{rejectVariant:true});await page.goto('/cart');await page.getByRole('button',{name:'Đổi phân loại: S',exact:true}).click();
 const select=page.getByRole('combobox',{name:'Đổi phân loại',exact:true});await select.selectOption(medium);await page.getByRole('button',{name:'Đổi',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Chưa đổi được phân loại');await expect(select).toHaveValue(medium);expect(state.deletes).toHaveLength(0);expect(state.items[0].variant_id).toBe(small);
 await page.getByRole('button',{name:'Đổi',exact:true}).click();await expect(page.getByRole('button',{name:'Đổi phân loại: M',exact:true})).toBeVisible();expect(state.items).toHaveLength(1);
});

test('uncertain variant swap blocks another mutation and requests reconciliation',async({page})=>{
 const state=await model(page,{lostDelete:true});await page.goto('/cart');await page.getByRole('button',{name:'Đổi phân loại: S',exact:true}).click();await page.getByRole('combobox',{name:'Đổi phân loại',exact:true}).selectOption(medium);await page.getByRole('button',{name:'Đổi',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('chưa xác nhận xóa được dòng cũ');await expect(page.getByRole('button',{name:'Đổi',exact:true})).toBeDisabled();expect(state.adds).toHaveLength(1);expect(state.errors).toEqual([]);
});

test('default discovery is compact, filtered count remains and route navigation stays available',async({page})=>{
 await model(page);await page.goto('/');await expect(page.locator('.catalog-total')).toHaveCount(0);await expect(page.getByRole('option',{name:'Mặc định',exact:true})).toHaveAttribute('value','title');
 const navigation=page.getByRole('navigation',{name:'Điều hướng chính',exact:true});await expect(navigation.getByRole('link',{name:'Tin nhắn',exact:true})).toHaveCount(0);
 await page.goto('/?q=áo');await expect(page.locator('.catalog-result-count')).toHaveText('1 sản phẩm');await expect(page.getByRole('option',{name:'Liên quan nhất'})).toHaveCount(0);
 await page.goto('/products/'+product);await expect(page.getByRole('heading',{name:'Áo sơ mi xanh',exact:true})).toBeVisible();await expect(page.locator('main').getByRole('link',{name:'Giỏ hàng',exact:true})).toHaveCount(0);await expect(page.getByRole('navigation',{name:'Điều hướng chính',exact:true})).toHaveCount(0);
});

test('account shortcuts keep secondary actions in details and menus restore keyboard focus',async({page})=>{
 await model(page);await page.goto('/profile');const details=page.locator('.account-additional-links');await expect(details).not.toHaveAttribute('open','');await expect(details.getByRole('link',{name:/Tin nhắn/})).toBeHidden();await details.locator('summary').click();await expect(details.getByRole('link',{name:/Tin nhắn/})).toBeVisible();
 await page.getByRole('button',{name:'Menu tài khoản',exact:true}).click();const menu=page.locator('#account-dropdown');await expect(menu).not.toContainText('Tài khoản của bạn');await expect(menu.locator('a[href="/customer/wallet"]')).toHaveCount(0);
 await page.goto('/customer/orders');const more=page.locator('.account-sidebar-more');await more.locator('summary').click();await expect(more).toHaveAttribute('open','');await page.keyboard.press('Escape');await expect(more.locator('summary')).toBeFocused();await expect(more).not.toHaveAttribute('open','');
});

for(const width of [320,390,768,1366])test(`long address and in-row variant choices fit ${width}px`,async({page},info)=>{
 const state=await model(page);await page.setViewportSize({width,height:844});await page.goto('/customer/addresses');await expect(page.locator('.shopee-address-card')).toHaveCount(2);
 await expect(page.locator('.shopee-address-side-actions .shopee-default-badge')).toHaveText('Mặc định');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('addresses.png'),fullPage:true});await page.goto('/cart');await page.getByRole('button',{name:'Đổi phân loại: S',exact:true}).click();await expect(page.getByRole('combobox',{name:'Đổi phân loại',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(state.errors).toEqual([]);await page.screenshot({path:info.outputPath('variant-editor.png'),fullPage:true});
});

test('order quantity remains next to price, total counts units and routine guidance is not duplicated',async({page})=>{
 const state=await model(page);await page.goto('/customer/orders');await expect(page.locator('.order-card-item-price')).toContainText('x2');await expect(page.locator('.order-history-total-row')).toContainText('2 sản phẩm');await expect(page.locator('.order-delivery-milestone')).toHaveCount(0);
 await page.goto('/customer/orders/'+orderId);await expect(page.getByRole('heading',{name:'Địa chỉ nhận hàng',exact:true})).toHaveCount(1);await expect(page.getByRole('region',{name:'Bước tiếp theo'})).toHaveCount(0);await expect(page.locator('main')).toContainText('220.000');expect(state.errors).toEqual([]);
});
