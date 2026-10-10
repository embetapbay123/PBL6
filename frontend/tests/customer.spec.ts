import { test, expect, Page } from '@playwright/test';
const STORE='10000000-0000-4000-8000-000000000061';
const ITEM='11111111-1111-4111-8111-111111111111';
const ADDRESS='22222222-2222-4222-8222-222222222222';
const QUOTE='33333333-3333-4333-8333-333333333333';
const cart={items:[{id:ITEM,variant_id:'10000000-0000-4000-8000-000000000090',product_id:'10000000-0000-4000-8000-000000000080',store_id:STORE,quantity:1}],page:1,size:100,total:1};
async function login(page:Page){
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('customer1@pbl6.test');
 await page.getByLabel('Mật khẩu',{exact:true}).fill(process.env.SEED_PASSWORD!);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();
}
async function prepareCheckout(page:Page){
 await login(page);
 await page.route('**/api/v1/cart/items?*',route=>route.fulfill({json:cart}));
 await page.route('**/api/v1/me/addresses?*',route=>route.fulfill({json:{items:[{id:ADDRESS,recipient_name:'Customer',phone:'0900000000',line1:'Street',ward:'Ward',district:'District',city:'City',is_default:true}],page:1,size:100,total:1}}));
 await page.goto('/cart');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Tiến hành thanh toán'}).click();
}
test('product dependency failures remain retryable and are not displayed as 404',async({page})=>{
 await page.route('**/api/v1/products/*',route=>route.fulfill({status:503,json:{code:'DEPENDENCY_UNAVAILABLE',message:'Catalog temporarily unavailable',details:[],correlation_id:'detail-error'}}));
 await page.goto('/products/10000000-0000-4000-8000-000000000080');
 await expect(page.getByRole('alert')).toContainText('Catalog temporarily unavailable');await expect(page.getByRole('alert')).toContainText('detail-error');
 await expect(page.getByRole('heading',{name:/404/})).toHaveCount(0);await expect(page.getByRole('button',{name:'Thử lại'})).toBeEnabled();
});
test('cart and checkout routes require a session',async({page})=>{
 for(const path of ['/cart','/checkout']){await page.goto(path);await expect(page.getByText('Đăng nhập để tiếp tục.')).toBeVisible();}
});
test('cart load failure is shown as error rather than an empty cart',async({page})=>{
 await login(page);await page.route('**/api/v1/cart/items?*',route=>route.fulfill({status:503,json:{code:'UNAVAILABLE',message:'Cart unavailable',details:[]}}));
 await page.goto('/cart');await expect(page.getByRole('alert')).toContainText('Cart unavailable');await expect(page.getByText('Giỏ hàng của bạn đang trống.')).toHaveCount(0);
});
test('checkout sends Store-keyed COD methods and preserves confirm key and payload after 503',async({page})=>{
 const confirms:{key:string|undefined,body:unknown}[]=[];
 await page.route('**/api/v1/checkout/quotes',async route=>{
  expect(route.request().postDataJSON().payment_methods).toEqual({[STORE]:'COD'});
  await route.fulfill({json:{quote_id:QUOTE,stores:[],payable_total_vnd:100000,expires_at:new Date(Date.now()+60000).toISOString()}});
 });
 await page.route('**/api/v1/orders/batches',async route=>{
  confirms.push({key:route.request().headers()['idempotency-key'],body:route.request().postDataJSON()});
  await route.fulfill({status:503,json:{code:'UNAVAILABLE',message:'Confirm unavailable',details:[]}});
 });
 await prepareCheckout(page);const button=page.getByRole('button',{name:'Xác nhận đặt hàng'});await expect(button).toBeEnabled();
 await button.click();await expect(page.getByRole('alert')).toContainText('Confirm unavailable');await button.click();
 await expect.poll(()=>confirms.length).toBe(2);expect(confirms[0]).toEqual(confirms[1]);expect(confirms[0].key).toMatch(/^[0-9a-f-]{36}$/);
 expect(confirms[0].body).toEqual({cart_item_ids:[ITEM],address_id:ADDRESS,payment_methods:{[STORE]:'COD'},quote_id:QUOTE,expected_payable_total_vnd:100000});
 await expect(page.getByRole('heading',{name:'Đã tạo nhóm đơn hàng'})).toHaveCount(0);
});
test('quote 501 disables confirmation and does not invent a successful checkout',async({page})=>{
 await page.route('**/api/v1/checkout/quotes',route=>route.fulfill({status:501,json:{code:'NOT_IMPLEMENTED',message:'Checkout implementation pending',details:[]}}));
 await prepareCheckout(page);await expect(page.getByRole('alert')).toContainText('Checkout implementation pending');
 await expect(page.getByRole('button',{name:'Xác nhận đặt hàng'})).toBeDisabled();
});

test('detail handles missing products and unavailable variants on a phone viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});await login(page);
 await page.route('**/api/v1/products/*',route=>route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Product missing',details:[]}}));
 await page.goto('/products/10000000-0000-4000-8000-000000000080');await expect(page.getByRole('heading',{name:'404 - Không tìm thấy sản phẩm'})).toBeVisible();
 await page.unroute('**/api/v1/products/*');
 await page.route('**/api/v1/products/*',route=>route.fulfill({json:{id:'10000000-0000-4000-8000-000000000080',title:'Unavailable',status:'ACTIVE',variants:[]}}));
 await page.reload();await expect(page.getByRole('button',{name:'Thêm vào giỏ hàng'})).toBeDisabled();
});
test('detail adds the selected active variant through the real Cart API',async({page})=>{
 await login(page);const productId='10000000-0000-4000-8000-000000000080';
  const session=await page.request.post('/api/v1/auth/login',{data:{email:'customer1@pbl6.test',password:process.env.SEED_PASSWORD,client_type:'MOBILE'}});
  expect(session.status()).toBe(200);const token=(await session.json()).access_token;
  const headers={Authorization:'Bearer '+token};
  const previous=(await (await page.request.get('/api/v1/cart/items?page=1&size=100',{headers})).json()).items;
 await page.goto('/products/'+productId);await expect(page.getByRole('button',{name:'Thêm vào giỏ hàng'})).toBeEnabled();
 const responsePromise=page.waitForResponse(response=>response.url().endsWith('/api/v1/cart/items')&&response.request().method()==='POST');
 await page.getByRole('button',{name:'Thêm vào giỏ hàng'}).click();const response=await responsePromise;
  expect(response.status()).toBe(201);const item=await response.json();
  try {
    expect(response.request().postDataJSON()).toMatchObject({product_id:productId,quantity:1});
    await expect(page.getByRole('status')).toContainText('Đã thêm sản phẩm vào giỏ hàng.');
  } finally {
    const old=previous.find((value:{id:string})=>value.id===item.id);
    const cleanup=old ? await page.request.patch('/api/v1/cart/items/'+item.id,{headers,data:{quantity:old.quantity}})
      : await page.request.delete('/api/v1/cart/items/'+item.id,{headers});
    expect(cleanup.status()).toBe(200);
  }
});
