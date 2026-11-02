import {installRenderDiagnostics} from './runtime/render-diagnostics';
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

installRenderDiagnostics(test);
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id='61000000-0000-4000-8000-000000000001',typeId='61000000-0000-4000-8000-000000000002';
const definitions=[
  {id:'weight',code:'weight',name:'Khối lượng',data_type:'NUMBER',unit:'kg',required:true},
  {id:'fragile',code:'fragile',name:'Dễ vỡ',data_type:'BOOLEAN',required:true},
  {id:'color',code:'color',name:'Màu',data_type:'STRING',variant_axis:true,required:true,allowed_values:['red','blue']},
  {id:'extra',code:'legacy_code',name:'Mã phụ',data_type:'NUMBER',variant_axis:true,required:false},
];
async function setup(page:Page,withAxes=true){
  let product={id,store_id:'store',product_type_id:typeId,title:'Sản phẩm thuộc tính',description:'Mô tả',status:'DRAFT',moderation_status:'VISIBLE',version:7,attributes:{weight:1.5,fragile:false,color:'red'},variants:[
    {id:'v1',sku:'RED',price_vnd:10000,variant_values:{color:'red',legacy_code:2},is_default:true,status:'ACTIVE'},
    {id:'v2',sku:'BLUE',price_vnd:20000,variant_values:{color:'blue',legacy_code:3},is_default:false,status:'STOPPED'},
  ],images:[]};
  const writes:any[]=[];
  const context={user_id:'user',roles:['CUSTOMER','STORE_OWNER'],role_permissions:[],token_version:0,store_membership:{store_id:'store',role:'OWNER',status:'ACTIVE',permissions:[]}};
  await page.route('**/api/v1/**',route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname.replace('/api/v1','');
    if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:{...fixtures.login.response,context},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
    if(path==='/product-types')return route.fulfill({json:{items:[{id:typeId,name:'Hàng gia dụng',status:'ACTIVE',attribute_definitions:withAxes?definitions:[]}],total:1,page:1,size:100}});
    if(path==='/store/inventory')return route.fulfill({json:{items:product.variants.map(v=>({variant_id:v.id,quantity:0,reserved_quantity:0,available_quantity:0,version:0})),total:product.variants.length,page:1,size:100}});
    if(path===`/store/products/${id}`){
      if(request.method()==='PATCH'){
        const body=request.postDataJSON();writes.push(body);
        if(body.expected_version!==product.version)return route.fulfill({status:409,json:{code:'VERSION_CONFLICT',message:'Dữ liệu đã thay đổi',details:[]}});
        product={...product,...body,version:product.version+1};
      }
      return route.fulfill({json:product});
    }
    return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture chưa cấu hình '+path,details:[]}});
  });
  await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('owner@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();
  await page.goto(`/seller/products/${id}/edit`);
  return writes;
}

test('product taxonomy fields preserve numeric and boolean values when saved',async({page})=>{
  const writes=await setup(page),section=page.getByRole('region',{name:'Thuộc tính sản phẩm'});
  await section.getByLabel('Khối lượng (kg) *').fill('2.75');
  await section.getByLabel('Dễ vỡ *').selectOption('true');
  await section.getByLabel('Màu *').selectOption('blue');
  await section.getByRole('button',{name:'Lưu thuộc tính'}).click();
  await expect(section.getByRole('status')).toContainText('Đã lưu thuộc tính sản phẩm.');
  expect(writes[0]).toEqual({expected_version:7,attributes:{weight:2.75,fragile:true,color:'blue'}});
});

test('variant attribute edits retain other variants and existing typed values',async({page})=>{
  const writes=await setup(page),section=page.getByRole('region',{name:'Chỉnh sửa biến thể'});
  await section.getByLabel('Màu *').first().selectOption('blue');
  await section.getByRole('button',{name:'Lưu biến thể'}).click();
  await expect(section.getByRole('status')).toContainText('Đã lưu biến thể.');
  expect(writes[0].expected_version).toBe(7);
  expect(writes[0].variants).toHaveLength(2);
  expect(writes[0].variants[0].variant_values).toEqual({color:'blue',legacy_code:2});
  expect(writes[0].variants[1]).toMatchObject({sku:'BLUE',status:'STOPPED',variant_values:{color:'blue',legacy_code:3}});
});

test('a taxonomy rejection refreshes choices while preserving the unsent SKU price and typed draft',async({page})=>{
 await setup(page);let changed=false,reads=0;await page.route('**/api/v1/product-types**',r=>{reads++;return r.fulfill({json:{items:[{id:typeId,name:'Updated taxonomy',status:'ACTIVE',attribute_definitions:definitions.map(d=>d.code==='color'?{...d,allowed_values:changed?['red']:['red','blue']}:d)}],page:1,size:100,total:1}});});const posts:any[]=[];await page.route('**/api/v1/store/products/'+id+'/variants',r=>{posts.push(r.request().postDataJSON());if(posts.length===1){changed=true;return r.fulfill({status:422,json:{code:'INVALID_VARIANT_ATTRIBUTES',message:'Cấu hình đã thay đổi'}});}return r.fulfill({status:201,json:{id:'new',...r.request().postDataJSON(),status:'ACTIVE'}});});
 const section=page.getByRole('heading',{name:'Biến thể',exact:true}).locator('..');await section.getByLabel('SKU mới',{exact:true}).fill('KEEP-009264');await section.getByLabel('Giá bán (VNĐ)',{exact:true}).fill('100501');await section.getByRole('combobox',{name:'Màu *',exact:true}).selectOption('blue');await section.getByRole('button',{name:'Thêm biến thể',exact:true}).click();await expect.poll(()=>reads).toBeGreaterThan(0);await expect(section.getByRole('alert')).toContainText('không còn trong lựa chọn');await expect(section.getByLabel('SKU mới',{exact:true})).toHaveValue('KEEP-009264');await expect(section.getByLabel('Giá bán (VNĐ)',{exact:true})).toHaveValue('100501');expect(posts).toHaveLength(1);await section.getByRole('combobox',{name:'Màu *',exact:true}).selectOption('red');await section.getByRole('button',{name:'Thêm biến thể',exact:true}).click();await expect.poll(()=>posts.length).toBe(2);expect(posts[1]).toEqual({sku:'KEEP-009264',price_vnd:100501,variant_values:{color:'red'}});
});

test('an active Variant with undeclared attributes needs an explicit correction instead of silently dropping data',async({page})=>{
 const writes=await setup(page);await page.route('**/api/v1/store/products/'+id,async route=>{if(route.request().method()==='PATCH'){writes.push(route.request().postDataJSON());return route.fulfill({json:{id,version:8,attributes:{},variants:route.request().postDataJSON().variants}});}return route.fulfill({json:{id,product_type_id:typeId,title:'Legacy axes',attributes:{weight:1.5,fragile:false,color:'red'},version:7,status:'DRAFT',variants:[{id:'v1',sku:'LEGACY',price_vnd:10,variant_values:{color:'red',obsolete_axis:'Giữ cho tới khi xác nhận'},status:'ACTIVE'}],images:[]}});});await page.reload();const editor=page.getByRole('region',{name:'Chỉnh sửa biến thể',exact:true});await expect(editor).toContainText('Giữ cho tới khi xác nhận');await expect(editor.getByRole('button',{name:'Lưu biến thể',exact:true})).toBeDisabled();await editor.getByRole('button',{name:'Xóa thuộc tính obsolete_axis',exact:true}).click();await editor.getByRole('button',{name:'Lưu biến thể',exact:true}).click();await expect.poll(()=>writes.length).toBe(1);expect(writes[0].variants[0].variant_values).toEqual({color:'red'});
});

test('an out-of-range legacy option is identified and cannot be resubmitted unchanged',async({page})=>{
 await setup(page);await page.route('**/api/v1/store/products/'+id,route=>route.fulfill({json:{id,product_type_id:typeId,title:'Old choice',attributes:{weight:1.5,fragile:false,color:'red'},version:7,status:'DRAFT',variants:[{id:'v1',sku:'OLD',price_vnd:10,variant_values:{color:'green'},status:'ACTIVE'}],images:[]}}));await page.reload();const editor=page.getByRole('region',{name:'Chỉnh sửa biến thể',exact:true});await expect(editor.getByRole('alert')).toContainText('không còn trong lựa chọn');expect(await editor.locator('form').evaluate((form:HTMLFormElement)=>form.checkValidity())).toBe(false);await editor.getByRole('combobox',{name:'Màu *',exact:true}).selectOption('blue');expect(await editor.locator('form').evaluate((form:HTMLFormElement)=>form.checkValidity())).toBe(true);
});

test('a stopped unchanged historical Variant can remain stopped while active rows are corrected',async({page})=>{
 const writes=await setup(page);await page.route('**/api/v1/store/products/'+id,route=>{if(route.request().method()==='PATCH'){writes.push(route.request().postDataJSON());return route.fulfill({json:{id,version:8,attributes:{},variants:route.request().postDataJSON().variants}});}return route.fulfill({json:{id,product_type_id:typeId,title:'Stopped legacy',attributes:{weight:1.5,fragile:false,color:'red'},version:7,status:'DRAFT',variants:[{id:'v1',sku:'LIVE',price_vnd:10,variant_values:{color:'red'},status:'ACTIVE'},{id:'v2',sku:'OLD',price_vnd:10,variant_values:{old_key:2},status:'STOPPED'}],images:[]}});});await page.reload();const editor=page.getByRole('region',{name:'Chỉnh sửa biến thể',exact:true});await editor.getByLabel('Giá bán (VNĐ)').first().fill('20');expect(await editor.locator('form').evaluate((form:HTMLFormElement)=>form.checkValidity())).toBe(true);await editor.getByRole('button',{name:'Lưu biến thể',exact:true}).click();await expect.poll(()=>writes.length).toBe(1);expect(writes[0].variants[1]).toMatchObject({status:'STOPPED',variant_values:{old_key:2}});
});
test('adding a variant with an axis submits the visible SKU, integer price and selected values',async({page})=>{
 await setup(page);const writes:any[]=[];await page.route('**/api/v1/store/products/'+id+'/variants',route=>{writes.push(route.request().postDataJSON());return route.fulfill({status:201,json:{id:'new-variant',sku:'009264',price_vnd:100500,variant_values:{color:'blue'},status:'ACTIVE'}});});
 const section=page.getByRole('heading',{name:'Biến thể',exact:true}).locator('..');await section.getByLabel('SKU mới',{exact:true}).fill('009264');await section.getByLabel('Giá bán (VNĐ)',{exact:true}).fill('100500');await section.getByRole('combobox',{name:'Màu *',exact:true}).selectOption('blue');expect(await section.locator('form').evaluate((form:HTMLFormElement)=>form.checkValidity())).toBe(true);await section.getByRole('button',{name:'Thêm biến thể',exact:true}).click();await expect.poll(()=>writes.length).toBe(1);expect(writes[0]).toEqual({sku:'009264',price_vnd:100500,variant_values:{color:'blue'}});
});
test('adding a new variant refreshes the stock checklist without reloading or dropping the new SKU',async({page})=>{
 await setup(page);let product:any={id,store_id:'store',product_type_id:typeId,title:'Sản phẩm thuộc tính',status:'DRAFT',moderation_status:'VISIBLE',version:7,attributes:{weight:1.5,fragile:false,color:'red'},variants:[{id:'v1',sku:'RED',price_vnd:10000,variant_values:{color:'red'},is_default:true,status:'ACTIVE'}],images:[]};
 let reads=0;await page.route('**/api/v1/store/products/'+id,route=>route.fulfill({json:product}));await page.route('**/api/v1/store/inventory?*',route=>{reads++;return route.fulfill({json:{items:product.variants.map((v:any)=>({variant_id:v.id,quantity:0,reserved_quantity:0,available_quantity:0,version:0})),total:product.variants.length,page:1,size:100}});});await page.reload();const checklist=page.getByRole('region',{name:'Hoàn thiện sản phẩm để bán',exact:true});await expect(checklist).toContainText('Các phân loại đang bán chưa có tồn khả dụng');const before=reads;
 await page.route('**/api/v1/store/products/'+id+'/variants',route=>{const input=route.request().postDataJSON(),variant={...input,id:'v-new',status:'ACTIVE'};product={...product,version:8,variants:[...product.variants,variant]};return route.fulfill({status:201,json:variant});});const section=page.getByRole('heading',{name:'Biến thể',exact:true}).locator('..');await section.getByLabel('SKU mới',{exact:true}).fill('NEW-BLUE');await section.getByLabel('Giá bán (VNĐ)',{exact:true}).fill('100500');await section.getByRole('combobox',{name:'Màu *',exact:true}).selectOption('blue');await section.getByRole('button',{name:'Thêm biến thể',exact:true}).click();await expect(checklist).toContainText('2 phân loại đang bán có SKU và giá hợp lệ');await expect(checklist).not.toContainText('Chưa đủ dữ liệu');await expect.poll(()=>reads).toBeGreaterThan(before);await expect(checklist).toContainText('Các phân loại đang bán chưa có tồn khả dụng');
});

test('saving another section preserves a dirty variant draft and asks for a fresh read',async({page})=>{
  await setup(page);
  const variants=page.getByRole('region',{name:'Chỉnh sửa biến thể'}),attributes=page.getByRole('region',{name:'Thuộc tính sản phẩm'});
  await variants.getByLabel('Giá bán (VNĐ)').first().fill('18000');
  await attributes.getByLabel('Khối lượng (kg) *').fill('2');
  await attributes.getByRole('button',{name:'Lưu thuộc tính'}).click();
  await expect(variants.getByLabel('Giá bán (VNĐ)').first()).toHaveValue('18000');
  await expect(variants.getByRole('button',{name:'Lưu biến thể'})).toBeDisabled();
  await variants.getByRole('button',{name:'Tải lại dữ liệu'}).click();
  await expect(variants.getByLabel('Giá bán (VNĐ)').first()).toHaveValue('10000');
  await expect(variants.getByRole('button',{name:'Lưu biến thể'})).toBeEnabled();
});

test('attribute forms remain usable across desktop, tablet and phone widths',async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await setup(page);
  for(const width of (process.env.CORE_FIX_DESKTOP_ONLY==='1'?[1440,768]:[1440,768,390])){
    await page.setViewportSize({width,height:900});
    await expect(page.getByRole('region',{name:'Thuộc tính sản phẩm'}).getByLabel('Khối lượng (kg) *')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({path:testInfo.outputPath(`seller-attributes-${width}.png`),fullPage:true});
  }
  expect(errors).toEqual([]);
});

test('missing variant taxonomy disables adding variants instead of requesting raw attribute codes',async({page})=>{
  await setup(page,false);await expect(page.getByText('Loại này không có trục phân loại. Sản phẩm dùng một phân loại tiêu chuẩn; sửa dòng hiện có thay vì tạo dòng trùng.')).toBeVisible();await expect(page.getByRole('button',{name:'Thêm biến thể',exact:true})).toBeDisabled();await expect(page.getByLabel('Tên thuộc tính biến thể',{exact:true})).toHaveCount(0);
});
