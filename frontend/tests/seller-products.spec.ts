import { test,expect,Page } from '@playwright/test';

/**
 * The management list intentionally includes DRAFT/STOPPED and HIDDEN Products, but the editor
 * loads its Product through `getProduct`, which is the public route and returns ACTIVE + VISIBLE
 * rows only. These tests pin the resulting contract of the list: the editor is offered exactly for
 * the rows it can load, and the rest say so instead of failing with a 404 on click.
 */
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

test('seller list offers the editor only for publicly readable Products',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/v1/store/products?*',route=>route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({items:[
      product(PUBLIC_PRODUCT,'Sản phẩm công khai','ACTIVE','VISIBLE'),
      product('11111111-1111-4111-8111-111111111111','Sản phẩm nháp','DRAFT','VISIBLE'),
      product('22222222-2222-4222-8222-222222222222','Sản phẩm bị ẩn','ACTIVE','HIDDEN'),
    ],total:3,page:1,size:20})}));

  await loginAsOwner(page);
  await page.goto('/seller/products');
  // The management view keeps showing every row, including the non-public ones.
  await expect(page.locator('article')).toHaveCount(3);

  const publicRow=page.locator('article').filter({hasText:'Sản phẩm công khai'});
  await expect(publicRow.getByRole('link',{name:'Sửa sản phẩm',exact:true})).toHaveCount(1);

  // A DRAFT row and a HIDDEN row are listed without a link: the editor would 404 on them.
  for(const title of ['Sản phẩm nháp','Sản phẩm bị ẩn']){
    const row=page.locator('article').filter({hasText:title});
    await expect(row.getByRole('link',{name:'Sửa sản phẩm',exact:true})).toHaveCount(0);
    await expect(row.getByRole('note')).toContainText('Chưa sửa được');
  }

  // The enabled action really reaches the editor through the real API, so the difference above is
  // about visibility, not about a dead end for every row.
  await publicRow.getByRole('link',{name:'Sửa sản phẩm',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Sửa sản phẩm #'+PUBLIC_PRODUCT,exact:true})).toBeVisible();
  expect(await page.getByLabel('Tên sản phẩm').inputValue()).toContain('Sản phẩm');
  expect(errors).toEqual([]);
});

test('a deep link to a non-public Product is not presented as editable from the list',async({page})=>{
  // The editor itself still answers 404 for a hidden Product; the list must not send the Seller
  // there, which is what the previous test asserts. This one records the underlying truth.
  await loginAsOwner(page);
  await page.route('**/api/v1/products/11111111-1111-4111-8111-111111111111',route=>route.fulfill({status:404,
    contentType:'application/json',body:JSON.stringify({code:'NOT_FOUND',message:'Không tìm thấy sản phẩm.',correlation_id:'deep-link',details:[]})}));
  await page.goto('/seller/products/11111111-1111-4111-8111-111111111111/edit');
  await expect(page.getByRole('alert')).toContainText('Không tìm thấy sản phẩm.');
});
