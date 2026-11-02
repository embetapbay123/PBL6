import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'65000000-0000-4000-8000-'+String(n).padStart(12,'0'),type=id(1),attribute=id(2),review=id(3),product=id(4);
async function setup(page:Page){
  const writes:{path:string;body:any}[]=[];let version=7,reviewStatus='VISIBLE',productStatus='HIDDEN';
  await page.route('**/api/v1/**',route=>{
    const req=route.request(),path=new URL(req.url()).pathname.replace('/api/v1','');
    if(path==='/auth/login'||path==='/auth/refresh')return route.fulfill({json:{...fixtures.login.response,context:{user_id:id(5),roles:['ADMIN'],role_permissions:['platform.admin'],token_version:0}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
    if(path==='/admin/stores')return route.fulfill({json:{items:[{id:fixtures.getProduct.response.store_id,name:'Store kiểm duyệt',status:'ACTIVE',version:1,shipping_fee_vnd:20000}],total:1,page:1,size:100}});
    if(path==='/categories')return route.fulfill({json:{items:[],total:0,page:1,size:100}});
    if(path==='/admin/products')return route.fulfill({json:{items:[{...fixtures.getProduct.response,id:product,title:'Áo đang chờ kiểm tra',status:'DRAFT',moderation_status:productStatus,version:9}],total:1,page:1,size:20}});
    if(path==='/admin/products/'+product+'/restore'){writes.push({path,body:req.postDataJSON()});productStatus='VISIBLE';return route.fulfill({json:{...fixtures.getProduct.response,id:product,status:'DRAFT',moderation_status:'VISIBLE',version:10}});}
    if(path==='/product-types')return route.fulfill({json:{items:[{id:type,name:'Áo',status:'ACTIVE',version:0,attribute_definitions:[{id:attribute,product_type_id:type,name:'Kích thước',code:'size',data_type:'STRING',required:true,variant_axis:true,allowed_values:['S','M'],version}]}],total:1,page:1,size:100}});
    if(path==='/admin/attribute-definitions/'+attribute){const body=req.postDataJSON();writes.push({path,body});version++;return route.fulfill({json:{id:attribute,product_type_id:type,code:'size',...body,version}});}
    if(path==='/admin/reviews')return route.fulfill({json:{items:[{id:review,product_id:product,order_item_id:id(6),rating:2,body:'Cần kiểm tra nội dung',version:4,status:reviewStatus}],total:1,page:1,size:20}});
    if(path==='/admin/reviews/'+review+'/hide'){writes.push({path,body:req.postDataJSON()});reviewStatus='HIDDEN';return route.fulfill({json:{id:review,product_id:product,order_item_id:id(6),rating:2,version:5,status:'HIDDEN'}});}
    return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Fixture chưa cấu hình',details:[]}});
  });
  await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();await page.goto('/admin?tab=catalog');return writes;
}
test('Admin edits an attribute chosen from taxonomy and sends its actual version',async({page})=>{
  const writes=await setup(page);await page.getByRole('link',{name:'Thuộc tính',exact:true}).click();await page.getByLabel('Loại sản phẩm chứa thuộc tính').selectOption(type);await page.getByLabel('Thuộc tính cần sửa').selectOption(attribute);await expect(page.getByLabel('Mã thuộc tính',{exact:true})).toHaveValue('size');await expect(page.getByLabel('Mã thuộc tính',{exact:true})).toHaveAttribute('readonly','');await page.getByLabel('Tên thuộc tính',{exact:true}).fill('Cỡ áo');await page.getByRole('button',{name:'Lưu thuộc tính',exact:true}).click();
  await expect.poll(()=>writes.length).toBe(1);expect(writes[0]).toMatchObject({path:'/admin/attribute-definitions/'+attribute,body:{name:'Cỡ áo',expected_version:7,data_type:'STRING',variant_axis:true,required:true,allowed_values:['S','M']}});await expect(page.getByLabel('Attribute ID sửa')).toHaveCount(0);
});
test('Admin moderates a listed review without entering its ID or version',async({page})=>{
  const writes=await setup(page);await page.getByRole('link',{name:'Kiểm duyệt đánh giá',exact:true}).click();const section=page.getByRole('region',{name:'Kiểm duyệt đánh giá'});await section.getByLabel('Lý do kiểm duyệt').fill('Nội dung cần xác minh');await section.getByRole('button',{name:'Ẩn đánh giá',exact:true}).click();await expect(section.getByRole('button',{name:'Hiện lại đánh giá',exact:true})).toBeVisible();expect(writes).toEqual([{path:'/admin/reviews/'+review+'/hide',body:{expected_version:4,reason:'Nội dung cần xác minh'}}]);await expect(page.getByLabel('Review ID',{exact:true})).toHaveCount(0);
});

test('restoring a selected hidden Product sends its version and leaves sale status DRAFT',async({page})=>{
  const writes=await setup(page);await page.getByRole('link',{name:'Kiểm duyệt sản phẩm',exact:true}).click();const section=page.getByRole('region',{name:'Kiểm duyệt sản phẩm'});await expect(section.getByRole('heading',{name:'Áo đang chờ kiểm tra'})).toBeVisible();await section.getByLabel('Lý do kiểm duyệt sản phẩm').fill('Đã xem xét nội dung');await section.getByRole('button',{name:'Bỏ ẩn sản phẩm',exact:true}).click();await expect(section.getByRole('button',{name:'Ẩn sản phẩm',exact:true})).toBeVisible();await expect(section.getByText('Trạng thái bán: DRAFT · Kiểm duyệt: Được hiển thị')).toBeVisible();expect(writes).toEqual([{path:'/admin/products/'+product+'/restore',body:{expected_version:9,reason:'Đã xem xét nội dung'}}]);await expect(page.getByLabel('Product ID',{exact:true})).toHaveCount(0);
});
