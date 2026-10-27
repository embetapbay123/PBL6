import { test,expect,Page } from '@playwright/test';

/**
 * Seller create/edit forms for #9 and #10.
 *
 * The API is stubbed so the assertions are about the form: which fields it builds from the selected
 * Product type, what payload it sends, and how it reports a rejection. Creating real rows here would
 * also change what the catalogue suites expect to see.
 */
async function loginAsOwner(page:Page){
  await page.goto('/login');
  await page.getByLabel('Email',{exact:true}).fill('owner@pbl6.test');
  await page.getByLabel('Mật khẩu',{exact:true}).fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();
}

const productType = {
  id:'10000000-0000-4000-8000-000000000071', category_id:'10000000-0000-4000-8000-000000000070',
  name:'Loại có thuộc tính', status:'ACTIVE', version:0,
  attribute_definitions:[{ id:'attr-1', product_type_id:'10000000-0000-4000-8000-000000000071',
    name:'Kích thước', data_type:'STRING', required:true, variant_axis:true, allowed_values:['S','M'], version:0 }],
};

test('the create form builds attribute fields from the Product type and sends them',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/v1/product-types?*',route=>route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({items:[productType],total:1,page:1,size:50})}));
  let sent:any;
  await page.route('**/api/v1/store/products',async route=>{
    if(route.request().method()!=='POST')return route.continue();
    sent=route.request().postDataJSON();
    await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({
      id:'11111111-1111-4111-8111-111111111111', store_id:'10000000-0000-4000-8000-000000000061',
      product_type_id:productType.id, title:sent.title, attributes:sent.attributes, status:'DRAFT',
      moderation_status:'VISIBLE', version:0, variants:[], images:[]})});
  });

  await loginAsOwner(page);
  await page.goto('/seller/products/new');
  await expect(page.getByRole('heading',{name:'Tạo sản phẩm'})).toBeVisible();

  // No attribute field before a type is chosen: the fields come from the taxonomy, not a fixed form.
  await expect(page.getByLabel('Kích thước')).toHaveCount(0);
  await page.getByLabel('Loại sản phẩm').selectOption(productType.id);
  await expect(page.getByLabel(/Kích thước/)).toBeVisible();

  await page.getByLabel('Tên sản phẩm').fill('Sản phẩm từ form');
  await page.getByLabel(/Kích thước/).fill('M');
  await page.getByLabel('SKU').fill('FORM-SKU-1');
  await page.getByLabel('Giá (VND)').fill('150000');
  await page.getByRole('button',{name:'Lưu thay đổi'}).click();

  await expect.poll(()=>sent&&sent.title).toBe('Sản phẩm từ form');
  // The attribute key is the definition's snake_case code, which is what the server validates.
  expect(sent.attributes).toEqual({kich_thuoc:'M'});
  expect(sent.variants).toEqual([{sku:'FORM-SKU-1',price_vnd:150000,variant_values:{},is_default:true}]);
  expect(sent.status).toBe('DRAFT');
  expect(errors).toEqual([]);
});

test('the create form shows a server rejection instead of pretending it saved',async({page})=>{
  await page.route('**/api/v1/product-types?*',route=>route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({items:[productType],total:1,page:1,size:50})}));
  await page.route('**/api/v1/store/products',async route=>{
    if(route.request().method()!=='POST')return route.continue();
    await route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({
      code:'INVALID_ATTRIBUTES', message:'Thuộc tính không khớp taxonomy của Product type.',
      correlation_id:'form-create', details:[]})});
  });

  await loginAsOwner(page);
  await page.goto('/seller/products/new');
  await page.getByLabel('Loại sản phẩm').selectOption(productType.id);
  await page.getByLabel('Tên sản phẩm').fill('Sẽ bị từ chối');
  // The attribute is required by the taxonomy, so fill it and let the server answer instead of the
  // browser blocking the submit.
  await page.getByLabel(/Kích thước/).fill('L');
  await page.getByRole('button',{name:'Lưu thay đổi'}).click();
  await expect(page.getByRole('alert')).toContainText('Thuộc tính không khớp taxonomy');
  // A failed create must not navigate to an editor for a Product that does not exist.
  await expect(page.getByRole('heading',{name:'Tạo sản phẩm'})).toBeVisible();
});

test('the edit form adds a Variant and an image through their own operations',async({page})=>{
  const product = { id:'10000000-0000-4000-8000-000000000080', store_id:'10000000-0000-4000-8000-000000000061',
    product_type_id:productType.id, title:'Sản phẩm mẫu 1', description:'x', attributes:{},
    status:'ACTIVE', moderation_status:'VISIBLE', version:0, variants:[], images:[] };
  let variantBody:any, imageBody:any;
  await page.route('**/api/v1/products/10000000-0000-4000-8000-000000000080',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(product)}));
  await page.route('**/api/v1/store/products/10000000-0000-4000-8000-000000000080/variants',async route=>{
    if(route.request().method()!=='POST')return route.continue();
    variantBody=route.request().postDataJSON();
    await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({id:'var-1',...variantBody,status:'ACTIVE'})});
  });
  await page.route('**/api/v1/store/products/10000000-0000-4000-8000-000000000080/images',async route=>{
    if(route.request().method()!=='POST')return route.continue();
    imageBody=route.request().postDataJSON();
    await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({id:'img-1',
      product_id:product.id,image_url:imageBody.image_url,position:0})});
  });

  await loginAsOwner(page);
  await page.goto('/seller/products/10000000-0000-4000-8000-000000000080/edit');
  await expect(page.getByRole('heading',{name:'Biến thể'})).toBeVisible();
  await expect(page.getByText('Chưa có biến thể nào.')).toBeVisible();

  await page.getByLabel('SKU').fill('FORM-SKU-2');
  await page.getByLabel('Giá (VND)').fill('99000');
  await page.getByRole('button',{name:'Thêm biến thể'}).click();
  await expect(page.getByText('Đã thêm biến thể.')).toBeVisible();
  expect(variantBody).toEqual({sku:'FORM-SKU-2',price_vnd:99000,variant_values:{}});

  await page.getByLabel('URL ảnh').fill('https://cdn.example.test/form.jpg');
  await page.getByRole('button',{name:'Thêm ảnh'}).click();
  await expect(page.getByText('Đã thêm ảnh.')).toBeVisible();
  expect(imageBody).toEqual({image_url:'https://cdn.example.test/form.jpg'});
});
