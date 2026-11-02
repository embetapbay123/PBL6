import { test, expect } from '@playwright/test';

const store = '10000000-0000-4000-8000-000000000061';
const item = {id:'10000000-0000-4000-8000-000000000080',store_id:store,product_type_id:'10000000-0000-4000-8000-000000000071',title:'Sản phẩm gian hàng',attributes:{},status:'ACTIVE',variants:[{id:'10000000-0000-4000-8000-000000000091',sku:'SKU-1',price_vnd:99000,variant_values:{},status:'ACTIVE'}],images:[]};

test('public store shows server products and paginates', async ({page}) => {
  await page.route(`**/api/v1/stores/${store}`,route=>route.fulfill({json:{id:store,name:'Gian hàng thực từ API',description:'Thông tin do gian hàng cung cấp',shipping_fee_vnd:25000}}));
  await page.route(`**/api/v1/stores/${store}/products?*`, route => {
    const number = Number(new URL(route.request().url()).searchParams.get('page'));
    return route.fulfill({json:{items:number === 1 ? [item] : [],page:number,size:20,total:21}});
  });
  await page.goto(`/stores/${store}`);
  await expect(page.getByRole('heading',{name:'Gian hàng thực từ API'})).toBeVisible();await expect(page.getByText('Thông tin do gian hàng cung cấp')).toBeVisible();await expect(page.getByText(/Phí giao hàng cơ bản: 25.000 ₫/)).toBeVisible();
  await expect(page.getByRole('link',{name:/Sản phẩm gian hàng/})).toHaveAttribute('href', `/products/${item.id}`);
  await page.getByRole('button',{name:'Trang sau'}).click();
  await expect(page.getByText('Gian hàng chưa có sản phẩm đang bán.')).toBeVisible();
});

test('public store surfaces unavailable errors and can retry', async ({page}) => {
  await page.route(`**/api/v1/stores/${store}`,route=>route.fulfill({json:{id:store,name:'Gian hàng thử lại',shipping_fee_vnd:0}}));
  let recovered = false;
  await page.route(`**/api/v1/stores/${store}/products?*`, route => {
    return !recovered ? route.fulfill({status:503,json:{code:'UNAVAILABLE',message:'Không thể tải gian hàng',details:[]}}) : route.fulfill({json:{items:[item],page:1,size:20,total:1}});
  });
  await page.goto(`/stores/${store}`);
  await expect(page.getByRole('alert')).toContainText('Không thể tải gian hàng');
  recovered = true;
  await page.getByRole('button',{name:'Thử lại'}).click();
  await expect(page.getByText('Sản phẩm gian hàng')).toBeVisible();
});

test('unavailable public profile does not invent a Store name or enable messaging',async({page})=>{
  await page.route(`**/api/v1/stores/${store}`,route=>route.fulfill({status:503,json:{code:'UNAVAILABLE',message:'Thông tin gian hàng chưa sẵn sàng',details:[]}}));
  await page.route(`**/api/v1/stores/${store}/products?*`,route=>route.fulfill({json:{items:[],page:1,size:20,total:0}}));
  await page.goto('/stores/'+store);await expect(page.getByRole('alert')).toContainText('Thông tin gian hàng chưa sẵn sàng');await expect(page.getByText('Demo Store',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Nhắn tin với gian hàng'})).toHaveCount(0);
});
