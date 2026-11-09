import { test,expect,Page } from '@playwright/test';

const PUBLIC_PRODUCT = '10000000-0000-4000-8000-000000000080'; // seeded, ACTIVE + VISIBLE

async function loginAsOwner(page:Page){
  await page.goto('/login');
  await page.getByLabel('Email',{exact:true}).fill('owner@pbl6.test');
  await page.getByLabel('Mật khẩu',{exact:true}).fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();
}

const product = (id:string,title:string,status:string,moderation_status:string) => ({
  id, store_id:'10000000-0000-4000-8000-000000000061',
  product_type_id:'10000000-0000-4000-8000-000000000071',
  title, description:'Mô tả '+title, attributes:{}, status, moderation_status, version:0,
  variants:[], images:[],
});

test('seller can open the management editor for draft and hidden products',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/v1/store/products?*',route=>route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({items:[
      product(PUBLIC_PRODUCT,'Sản phẩm công khai','ACTIVE','VISIBLE'),
      product('11111111-1111-4111-8111-111111111111','Sản phẩm nháp','DRAFT','VISIBLE'),
      product('22222222-2222-4222-8222-222222222222','Sản phẩm bị ẩn','ACTIVE','HIDDEN'),
    ],total:3,page:1,size:20})}));
  await page.route('**/api/v1/store/products/11111111-1111-4111-8111-111111111111',route=>route.fulfill({json:product('11111111-1111-4111-8111-111111111111','Sản phẩm nháp','DRAFT','VISIBLE')}));

  await loginAsOwner(page);
  await page.goto('/seller/products');
  // The management view keeps showing every row, including the non-public ones.
  await expect(page.locator('tbody tr')).toHaveCount(3);

  const publicRow=page.locator('tbody tr').filter({hasText:'Sản phẩm công khai'});
  await expect(publicRow.getByRole('link',{name:'Sửa sản phẩm',exact:true})).toHaveCount(1);

  for(const title of ['Sản phẩm nháp','Sản phẩm bị ẩn']){
    const row=page.locator('tbody tr').filter({hasText:title});
    await expect(row.getByRole('link',{name:'Sửa sản phẩm',exact:true})).toHaveCount(1);
  }

  // The enabled action really reaches the editor through the real API, so the difference above is
  // about visibility, not about a dead end for every row.
  await page.locator('tbody tr').filter({hasText:'Sản phẩm nháp'}).getByRole('link',{name:'Sửa sản phẩm',exact:true}).click();
  await expect(page.getByLabel('Tên sản phẩm')).toHaveValue('Sản phẩm nháp');
  expect(errors).toEqual([]);
});

test('a deep link to another Store product shows the server error',async({page})=>{
  await loginAsOwner(page);
  await page.route('**/api/v1/store/products/11111111-1111-4111-8111-111111111111',route=>route.fulfill({status:404,
    contentType:'application/json',body:JSON.stringify({code:'NOT_FOUND',message:'Không tìm thấy sản phẩm.',correlation_id:'deep-link',details:[]})}));
  await page.goto('/seller/products/11111111-1111-4111-8111-111111111111/edit');
  await expect(page.getByRole('alert')).toContainText('Không tìm thấy sản phẩm.');
});

test('editing one variant preserves the entire set and uses the product version',async({page})=>{
  await page.route('**/api/v1/product-types**',r=>r.fulfill({json:{items:[{id:'10000000-0000-4000-8000-000000000071',name:'Typed colors',status:'ACTIVE',attribute_definitions:[{id:'color',code:'color',name:'Màu',data_type:'STRING',variant_axis:true,required:true}]}],page:1,size:100,total:1}}));
  const id='11111111-1111-4111-8111-111111111111';
  const record={...product(id,'Sản phẩm nháp','DRAFT','VISIBLE'),attributes:{color:'red'},version:3,variants:[
    {id:'11111111-1111-4111-8111-111111111112',sku:'RED',price_vnd:10000,variant_values:{color:'red'},status:'ACTIVE',is_default:true},
    {id:'11111111-1111-4111-8111-111111111113',sku:'BLUE',price_vnd:12000,variant_values:{color:'blue'},status:'STOPPED',is_default:false},
  ]};
  let sent:any;
  await page.route(`**/api/v1/store/products/${id}`,route=>{
    if(route.request().method()==='PATCH'){
      sent=route.request().postDataJSON();
      return route.fulfill({json:{...record,version:4,variants:sent.variants}});
    }
    return route.fulfill({json:record});
  });
  await loginAsOwner(page);
  await page.goto(`/seller/products/${id}/edit#product-variants`);
  const editor=page.getByRole('region',{name:'Chỉnh sửa biến thể'});
  await editor.locator('summary').first().click();
  await editor.getByLabel('Giá bán (VNĐ)').first().fill('15000');
  await editor.getByRole('button',{name:'Lưu biến thể'}).click();
  await expect.poll(()=>sent).toBeTruthy();
  expect(sent.expected_version).toBe(3);
  expect(sent.variants).toHaveLength(2);
  expect(sent.variants[0]).toMatchObject({sku:'RED',price_vnd:15000,variant_values:{color:'red'}});
  expect(sent.variants[1]).toMatchObject({sku:'BLUE',status:'STOPPED',variant_values:{color:'blue'}});
});

test('variant version conflict blocks another save until a fresh read',async({page})=>{
  await page.route('**/api/v1/product-types**',r=>r.fulfill({json:{items:[{id:'10000000-0000-4000-8000-000000000071',name:'Typed colors',status:'ACTIVE',attribute_definitions:[{id:'color',code:'color',name:'Màu',data_type:'STRING',variant_axis:true,required:true}]}],page:1,size:100,total:1}}));
  const id='11111111-1111-4111-8111-111111111111';
  let version=3;
  const variants=[{id:'11111111-1111-4111-8111-111111111112',sku:'RED',price_vnd:10000,variant_values:{color:'red'},status:'ACTIVE',is_default:true}];
  await page.route(`**/api/v1/store/products/${id}`,route=>{
    if(route.request().method()==='PATCH'){version=4;return route.fulfill({status:409,json:{code:'VERSION_CONFLICT',message:'Dữ liệu đã thay đổi.',details:[]}});}
    return route.fulfill({json:{...product(id,'Sản phẩm nháp','DRAFT','VISIBLE'),attributes:{color:'red'},version,variants}});
  });
  await loginAsOwner(page); await page.goto(`/seller/products/${id}/edit#product-variants`);
  const editor=page.getByRole('region',{name:'Chỉnh sửa biến thể'});
  await editor.locator('summary').first().click();
  await editor.getByLabel('Giá bán (VNĐ)').first().fill('15000');
  await editor.getByRole('button',{name:'Lưu biến thể'}).click();
  await expect(editor.getByRole('button',{name:'Lưu biến thể'})).toBeDisabled();
  await editor.getByRole('button',{name:'Tải lại dữ liệu'}).click();
  await expect(page.getByRole('region',{name:'Chỉnh sửa biến thể'}).getByRole('button',{name:'Lưu biến thể'})).toHaveCount(0);
});

test('seller removes an image through the scoped endpoint and refreshes the list',async({page})=>{
  const id='11111111-1111-4111-8111-111111111111';
  const imageId='11111111-1111-4111-8111-111111111114';
  let removed=false;
  await page.route(`**/api/v1/store/products/${id}`,route=>route.fulfill({json:{...product(id,'Sản phẩm nháp','DRAFT','VISIBLE'),images:removed?[]:[{id:imageId,product_id:id,image_url:'https://example.test/image.jpg',position:0}]}}));
  await page.route(`**/api/v1/store/products/${id}/images/${imageId}`,route=>{
    expect(route.request().method()).toBe('DELETE');removed=true;
    return route.fulfill({json:{id:imageId,product_id:id}});
  });
  await loginAsOwner(page);await page.goto(`/seller/products/${id}/edit#product-images`);
  await page.getByRole('button',{name:'Thêm thao tác cho ảnh 1',exact:true}).click();
  await page.getByRole('button',{name:'Bỏ ảnh sản phẩm 1'}).click();
  await page.getByRole('dialog',{name:'Bỏ ảnh sản phẩm?',exact:true}).getByRole('button',{name:'Bỏ ảnh',exact:true}).click();
  await expect(page.getByRole('button',{name:'Bỏ ảnh sản phẩm 1'})).toHaveCount(0);
  await expect(page.getByText('Đã bỏ ảnh sản phẩm.')).toBeVisible();
});

test('seller sends the current and requested image order before refreshing',async({page})=>{
  const id='11111111-1111-4111-8111-111111111111';
  const ids=['11111111-1111-4111-8111-111111111114','11111111-1111-4111-8111-111111111115'];
  let order=[...ids], sent:any;
  await page.route(`**/api/v1/store/products/${id}`,route=>route.fulfill({json:{...product(id,'Sản phẩm nháp','DRAFT','VISIBLE'),images:order.map((imageId,position)=>({id:imageId,product_id:id,image_url:`https://example.test/${imageId}.jpg`,position}))}}));
  await page.route(`**/api/v1/store/products/${id}/images/reorder`,route=>{
    sent=route.request().postDataJSON();order=sent.image_ids;
    return route.fulfill({json:{product_id:id,image_ids:order}});
  });
  await loginAsOwner(page);await page.goto(`/seller/products/${id}/edit#product-images`);
  await page.getByRole('button',{name:'Sắp xếp ảnh',exact:true}).click();
  await page.getByRole('button',{name:'Đưa ảnh 2 lên trước'}).click();
  await expect(page.getByText('Đã cập nhật thứ tự ảnh.')).toBeVisible();
  expect(sent).toEqual({expected_image_ids:ids,image_ids:[ids[1],ids[0]]});
  await expect(page.getByAltText('Ảnh sản phẩm 1')).toHaveAttribute('src',`https://example.test/${ids[1]}.jpg`);
});
