import { test,expect } from '@playwright/test';
test('catalog API search, loading result and empty state',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await expect(page.getByRole('heading',{name:'Sản phẩm từ M1'})).toBeVisible();
 await expect(page.locator('article')).toHaveCount(3);
 await page.getByLabel('Tìm sản phẩm').fill('no-product-fixture-match');
 await expect(page.getByText('Chưa có sản phẩm phù hợp.')).toBeVisible();expect(errors).toEqual([]);
});
test('web login/profile survives reload and logout clears the session',async({page})=>{
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('customer1@pbl6.test');
 await page.getByLabel('Mật khẩu',{exact:true}).fill(process.env.SEED_PASSWORD!);
 await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();
 await page.getByRole('link',{name:'Hồ sơ',exact:true}).click();await expect(page.getByText('customer1@pbl6.test',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByText('customer1@pbl6.test',{exact:true})).toBeVisible();
 const cookies=await page.context().cookies();expect(cookies.find(c=>c.name==='pbl6_refresh')?.httpOnly).toBe(true);
 await page.getByRole('link',{name:'Đăng nhập',exact:true}).click();await page.getByRole('button',{name:'Đăng xuất'}).click();
 await expect(page.getByRole('heading',{name:'Đăng nhập API thật'})).toBeVisible();
 await page.getByRole('link',{name:'Hồ sơ',exact:true}).click();await expect(page.getByText('Đăng nhập để xem hồ sơ.')).toBeVisible();
});
test('legacy mock UI remains accessible',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?mode=mock');await expect(page.locator('body')).not.toContainText('Khung tích hợp API');
 await expect(page.locator('body')).not.toBeEmpty();expect(errors).toEqual([]);
});
test('catalog error retry preserves the request and recovers through the API on a phone viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const requests:string[]=[];
 await page.route('**/api/v1/products?*',async route=>{
  requests.push(route.request().url());
  if(requests.length>1){
   await new Promise(resolve=>setTimeout(resolve,500));
   await route.continue();return;
  }
  await new Promise(resolve=>setTimeout(resolve,300));
  await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:'DEPENDENCY_UNAVAILABLE',message:'Dịch vụ chưa sẵn sàng.',correlation_id:'web-correlation',details:[]})});
 });
 await page.goto('/');await expect(page.getByRole('status')).toContainText('Đang tải');
 await expect(page.getByRole('alert')).toContainText('Dịch vụ chưa sẵn sàng.');await expect(page.getByRole('alert')).toContainText('web-correlation');
 const retry=page.getByRole('button',{name:'Thử lại',exact:true});
 await expect(retry).toBeEnabled();await retry.click();
 await expect(page.getByRole('status')).toContainText('Đang tải');await expect(retry).toHaveCount(0);
 await expect(page.locator('article')).toHaveCount(3);
 await expect(page.getByRole('alert')).toHaveCount(0);
 expect(requests).toHaveLength(2);expect(requests[1]).toBe(requests[0]);
});
test('Owner edit sample writes through the real API and keeps optimistic version',async({page})=>{
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('owner@pbl6.test');await page.getByLabel('Mật khẩu',{exact:true}).fill(process.env.SEED_PASSWORD!);
 await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();
 await page.getByRole('link',{name:'Sản phẩm',exact:true}).click();await page.getByRole('link',{name:'Sửa sản phẩm',exact:true}).first().click();
 await expect(page.getByRole('heading',{name:'Sửa sản phẩm',exact:true})).toBeVisible();const input=page.getByLabel('Tên sản phẩm');const original=await input.inputValue();
 try{
  await input.fill(original+' · mẫu');await page.getByRole('button',{name:'Lưu thay đổi'}).click();await expect(page.getByRole('status')).toHaveText('Đã lưu sản phẩm.');
  await page.reload();await expect(input).toHaveValue(original+' · mẫu');
 }finally{
  await input.fill(original);await page.getByRole('button',{name:'Lưu thay đổi'}).click();await expect(page.getByRole('status')).toHaveText('Đã lưu sản phẩm.');
 }
 for(const status of [409,422,501]){
  await page.route('**/api/v1/store/products/*',route=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({code:'SAMPLE_ERROR',message:'Lỗi mẫu '+status,correlation_id:'form-'+status,details:[]})}));
  await page.getByRole('button',{name:'Lưu thay đổi'}).click();await expect(page.getByRole('alert')).toContainText('Lỗi mẫu '+status);
  await page.unroute('**/api/v1/store/products/*');
 }
});
test('protected sample route requests login without a session',async({page})=>{
 await page.goto('/seller/products/11111111-1111-4111-8111-111111111111/edit');await expect(page.getByText('Đăng nhập để tiếp tục.')).toBeVisible();
});
test('pagination changes query and shows the next result page',async({page})=>{
 await page.route('**/api/v1/products?*',async route=>{
  const url=new URL(route.request().url());const second=url.searchParams.get('page')==='2';url.searchParams.set('page','1');const response=await route.fetch({url:url.toString()});const data=await response.json();
  await route.fulfill({response,json:{...data,items:second?data.items.slice(0,1):data.items,page:second?2:1,total:21}});
 });
 await page.goto('/');await expect(page.getByRole('button',{name:'Trang trước'})).toBeDisabled();
 await page.getByRole('button',{name:'Trang sau'}).click();await expect(page.getByText('Trang 2 · 21 kết quả')).toBeVisible();await expect(page.locator('article')).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Trang sau'})).toBeDisabled();
});
