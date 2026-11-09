import {test,expect,type Page,type Route} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id=(n:number)=>'88000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function model(page:Page,role:'CUSTOMER'|'OWNER'|'SELLER'='CUSTOMER'){
 const s={role,permissions:role==='SELLER'?['product.store.read_write']:[] as string[],apps:[] as any[],posts:[] as any[],reads:0,pickup:false,failPickup:false,failReads:false,failStoreReads:false,failContext:false,lost:false,hold:false,pending:undefined as Route|undefined,store:{id:id(2),name:'Gian hàng cần thiết lập',status:'ACTIVE',shipping_fee_vnd:0,version:0,return_address:undefined as any,logo_url:undefined as string|undefined}};
 const auth=()=>({...fixtures.login.response,context:{user_id:id(1),roles:['CUSTOMER',...(s.role==='CUSTOMER'?[]:[s.role==='OWNER'?'STORE_OWNER':'SELLER'])],role_permissions:[],token_version:0,...(s.role==='CUSTOMER'?{}:{store_membership:{store_id:id(2),role:s.role,status:'ACTIVE',permissions:s.permissions}})}});
 await page.route('**/api/v1/**',async r=>{const q=r.request(),path=new URL(q.url()).pathname.replace('/api/v1','');
  if(path==='/auth/login'||path==='/auth/refresh')return r.fulfill({json:auth(),headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/me/context')return s.failContext?r.fulfill({status:503,json:{code:'UNAVAILABLE',message:'Chưa đọc được quyền hiện hành'}}):r.fulfill({json:auth().context});
  if(path==='/me')return r.fulfill({json:{user_id:id(1),email:'onboarding@example.test',display_name:'Người mở Store'}});
  if(path==='/me/store-applications'){
   if(q.method()==='POST'){s.posts.push(q.postDataJSON());if(s.hold){s.pending=r;return;}const created={id:id(10+s.posts.length),...q.postDataJSON(),status:'PENDING',version:0};s.apps.unshift(created);return s.lost?r.fulfill({status:503,json:{code:'LOST_ACK',message:'Chưa rõ kết quả gửi hồ sơ'}}):r.fulfill({status:201,json:created});}
   s.reads++;if(s.failReads)return r.fulfill({status:503,json:{code:'UNAVAILABLE',message:'Không đọc được lịch sử hồ sơ'}});const page=Number(new URL(q.url()).searchParams.get('page')??1),size=10;return r.fulfill({json:{items:s.apps.slice((page-1)*size,page*size),total:s.apps.length,page,size,status_counts:{ALL:s.apps.length,PENDING:s.apps.filter(a=>a.status==='PENDING').length,APPROVED:s.apps.filter(a=>a.status==='APPROVED').length,REJECTED:s.apps.filter(a=>a.status==='REJECTED').length}}});
  }
  if(path==='/store'){if(q.method()==='PATCH'){s.posts.push(q.postDataJSON());s.store={...s.store,...q.postDataJSON(),version:s.store.version+1};delete (s.store as any).expected_version;if(s.hold){s.pending=r;return;}return s.lost?r.fulfill({status:503,json:{code:'LOST_ACK',message:'Chưa rõ kết quả lưu Store'}}):r.fulfill({json:s.store});}return s.failStoreReads?r.fulfill({status:503,json:{code:'UNAVAILABLE',message:'Không đọc được Store'}}):r.fulfill({json:s.store});}
  if(path==='/store/shipping/pickup-status')return s.failPickup?r.fulfill({status:503,json:{code:'UNAVAILABLE',message:'Không đọc được điểm lấy hàng'}}):r.fulfill({json:{configured:s.pickup}});
  return r.fulfill({status:404,json:{code:'NOT_FOUND',message:'Unconfigured fixture'}});
 });await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('onboarding@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();return s;
}
const app=(status='PENDING')=>({id:id(3),proposed_name:'Gian hàng đề nghị',contact:'onboarding@example.test',status,version:0});

test('shipping fee dialog stays above the header, restores focus on cancel, and saves only the fee',async({page},info)=>{
 const s=await model(page,'OWNER');s.store.shipping_fee_vnd=20000;
 await page.goto('/seller/settings');
 const opener=page.getByRole('button',{name:'Sửa phí giao hàng',exact:true});
 const dialog=page.getByRole('dialog',{name:'Sửa phí giao hàng',exact:true});
 const fee=dialog.getByLabel('Phí giao hàng (VND)',{exact:true});
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:800});
  await opener.focus();await page.keyboard.press('Enter');
  await expect(fee).toBeFocused();await expect(fee).toHaveValue('20000');
  await expect(dialog).toBeInViewport({ratio:1});
  const save=dialog.getByRole('button',{name:'Lưu',exact:true});
  expect(await save.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  await page.screenshot({path:info.outputPath('shipping-fee-'+width+'.png')});
  await fee.fill('25000');
  if(width===1280)await dialog.getByRole('button',{name:'Hủy',exact:true}).click();
  else await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
 }
 expect(s.posts).toHaveLength(0);
 await opener.click();await fee.fill('0');await dialog.getByRole('button',{name:'Lưu',exact:true}).click();
 await expect(dialog).toHaveCount(0);
 expect(s.posts).toEqual([{shipping_fee_vnd:0,expected_version:0}]);
 await expect(page.getByRole('status')).toContainText('Đã cập nhật gian hàng');
});

test('pickup setup distinguishes missing, unavailable, and configured for a seller with no order permission',async({page})=>{
 const s=await model(page,'SELLER');
 s.store.return_address={recipient_name:'Kho nhận trả',phone:'0901234567',line1:'123 Đường A',ward:'Phường B',district:'Quận C',city:'Huế'};
 await page.goto('/seller');
 const setup=page.getByRole('region',{name:'Chuẩn bị nhận đơn mới',exact:true});
 await expect(setup).toContainText('Đã có địa chỉ nhận trả');
 await expect(setup).toContainText('Chưa có điểm lấy hàng · Liên hệ quản trị');
 s.failPickup=true;await page.reload();
 await expect(setup).toContainText('Chưa đọc được trạng thái');
 await expect(setup).not.toContainText('Chưa có điểm lấy hàng');
 s.failPickup=false;s.pickup=true;
 await setup.getByRole('button',{name:'Thử lại',exact:true}).click();
 await expect(setup).toContainText('Điểm lấy hàng: Đã cấu hình');
 expect(s.posts).toEqual([]);
});

test('Owner edits the Store name independently without overwriting shipping or return address',async({page})=>{
 const s=await model(page,'OWNER');await page.goto('/seller/settings');
 await page.getByRole('button',{name:'Sửa tên gian hàng'}).click();
 await page.getByLabel('Tên gian hàng',{exact:true}).fill('Tên Store mới');
 await page.getByRole('button',{name:'Lưu thông tin',exact:true}).click();
 await expect.poll(()=>s.posts.length).toBe(1);
 expect(s.posts[0]).toEqual({name:'Tên Store mới',expected_version:0});
 await expect(page.locator('.seller-store-identity').getByText('Tên Store mới',{exact:true})).toBeVisible();
});
test('Store settings uses the existing Store logo when available',async({page})=>{
 const s=await model(page,'OWNER');s.store.logo_url='https://example.test/store-logo.png';
 await page.route('https://example.test/store-logo.png',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>'}));
 await page.goto('/seller/settings');await expect(page.getByRole('img',{name:'Ảnh đại diện Gian hàng cần thiết lập'})).toHaveAttribute('src',s.store.logo_url);
});
test('Owner can change the Store logo URL without changing other settings',async({page})=>{
 const s=await model(page,'OWNER');await page.goto('/seller/settings');
 await page.getByRole('button',{name:'Sửa ảnh đại diện'}).click();
 await page.getByLabel('Đường dẫn ảnh đại diện').fill('https://example.test/logo.png');
 await page.getByRole('button',{name:'Lưu thông tin',exact:true}).click();
 await expect.poll(()=>s.posts.length).toBe(1);
 expect(s.posts[0]).toEqual({logo_url:'https://example.test/logo.png',expected_version:0});
});

test('S04 approval while page is open has a read-only refresh and explicit current-rights entry',async({page})=>{
 const s=await model(page);s.apps=[app()];await page.goto('/customer/store-applications');await expect(page.getByRole('article')).toContainText('Chờ duyệt');s.apps[0].status='APPROVED';s.role='OWNER';await page.getByRole('button',{name:'Đọc lại trạng thái hồ sơ',exact:true}).click();await expect(page.getByRole('article')).toContainText('Đã duyệt');await page.getByRole('button',{name:'Mở shop',exact:true}).click();await expect(page).toHaveURL(/\/seller$/);await expect(page.getByRole('heading',{name:s.store.name,exact:true})).toBeVisible();expect(s.posts).toEqual([]);
});
test('S06 product-only employee understands missing work permissions and who can grant them',async({page})=>{
 await model(page,'SELLER');await page.goto('/seller');const rights=page.getByRole('region',{name:'Quyền công việc hiện tại',exact:true});await expect(rights).toContainText('Xem và điều chỉnh kho');await expect(rights).toContainText('Chưa được cấp');await expect(rights).toContainText('chủ Store');await expect(rights.getByRole('link',{name:'Mở kho',exact:true})).toHaveCount(0);await expect(rights.getByRole('link',{name:'Mở sản phẩm',exact:true})).toBeVisible();
});
test('S05 Owner sees missing return address and a zero shipping fee as separate facts',async({page})=>{
 const s=await model(page,'OWNER');await page.goto('/seller');const setup=page.getByRole('region',{name:'Chuẩn bị nhận đơn mới',exact:true});await expect(setup).toContainText('chưa thể nhận đơn mới');await expect(setup.getByRole('link',{name:'Hoàn thiện địa chỉ nhận trả',exact:true})).toHaveAttribute('href','/seller/settings');await expect(setup).toContainText('0');expect(s.posts).toEqual([]);
});

test('pending application explains who acts next and disables duplicate submission',async({page})=>{
 const s=await model(page);s.apps=[app()];await page.goto('/customer/store-applications');await expect(page.getByRole('region',{name:'Trạng thái và bước tiếp'})).toContainText('đang chờ Admin');await expect(page.getByRole('button',{name:'Gửi hồ sơ',exact:true})).toBeDisabled();expect(s.posts).toEqual([]);
});
test('rejection preserves history, prefills a new request and focuses the name for correction',async({page})=>{
 const s=await model(page);s.apps=[{...app('REJECTED'),decision_reason:'Bổ sung số điện thoại'}];await page.goto('/customer/store-applications');await expect(page.getByRole('article')).toContainText('Bổ sung số điện thoại');await page.getByRole('button',{name:'Sửa hồ sơ',exact:true}).click();const name=page.getByRole('textbox',{name:'Tên cửa hàng',exact:false});await expect(name).toHaveValue('Gian hàng đề nghị');await expect(name).toBeFocused();await page.getByRole('textbox',{name:'Email hoặc số điện thoại liên hệ',exact:false}).fill('0901234567');await page.getByRole('button',{name:'Gửi hồ sơ',exact:true}).click();await expect(page.getByRole('article')).toHaveCount(2);expect(s.posts).toEqual([{proposed_name:'Gian hàng đề nghị',contact:'0901234567'}]);expect(s.apps[1].status).toBe('REJECTED');await expect(page.getByRole('button',{name:'Gửi hồ sơ',exact:true})).toBeDisabled();
});
test('slow submission freezes body and prevents a second submission',async({page})=>{
 const s=await model(page);await page.goto('/customer/store-applications');await page.getByRole('textbox',{name:'Tên cửa hàng',exact:false}).fill('Store đang gửi');await page.getByRole('textbox',{name:'Email hoặc số điện thoại liên hệ',exact:false}).fill('0901234567');s.hold=true;await page.getByRole('button',{name:'Gửi hồ sơ',exact:true}).click();await expect.poll(()=>!!s.pending).toBe(true);await expect(page.getByRole('textbox',{name:'Tên cửa hàng',exact:false})).toBeDisabled();await page.locator('.store-app-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(s.posts).toHaveLength(1);s.apps=[{...app(),proposed_name:'Store đang gửi',contact:'0901234567'}];await s.pending!.fulfill({status:201,json:s.apps[0]});await expect(page.getByRole('article')).toContainText('Store đang gửi');expect(s.posts).toHaveLength(1);
});
test('lost POST acknowledgement and failed readback never cause another POST',async({page})=>{
 const s=await model(page);await page.goto('/customer/store-applications');await page.getByRole('textbox',{name:'Tên cửa hàng',exact:false}).fill('Store mất phản hồi');await page.getByRole('textbox',{name:'Email hoặc số điện thoại liên hệ',exact:false}).fill('0901234567');s.lost=true;await page.getByRole('button',{name:'Gửi hồ sơ',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Chưa rõ kết quả'})).toBeVisible();await expect(page.getByRole('button',{name:'Gửi hồ sơ',exact:true})).toBeDisabled();s.failReads=true;await page.getByRole('button',{name:'Đọc lại trạng thái hồ sơ',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Không đọc được'}).first()).toBeVisible();await expect(page.getByRole('button',{name:'Gửi hồ sơ',exact:true})).toBeDisabled();s.failReads=false;await page.getByRole('button',{name:'Đọc lại trạng thái hồ sơ',exact:true}).click();await expect(page.getByRole('article')).toContainText('Chờ duyệt');expect(s.posts).toHaveLength(1);
});
test('history errors are recoverable reads and do not claim an empty application list',async({page})=>{
 const s=await model(page);s.failReads=true;await page.goto('/customer/store-applications');await expect(page.getByRole('alert')).toContainText('Không đọc được');await expect(page.getByRole('button',{name:'Gửi hồ sơ',exact:true})).toBeDisabled();await expect(page.locator('main')).not.toContainText('Chưa có hồ sơ đăng ký.');s.failReads=false;await page.getByRole('button',{name:'Đọc lại trạng thái hồ sơ',exact:true}).click();await expect(page.getByRole('button',{name:'Gửi hồ sơ',exact:true})).toBeEnabled();expect(s.posts).toEqual([]);
});
test('an old approved application is insufficient to grant current Store access',async({page})=>{
 const s=await model(page);s.apps=[app('APPROVED')];await page.goto('/customer/store-applications');await page.getByRole('button',{name:'Mở shop',exact:true}).click();await expect(page.getByRole('status')).toContainText('chưa cho phép');await expect(page).toHaveURL(/\/customer\/store-applications$/);expect(s.posts).toEqual([]);
});
test('failed rights refresh can be retried explicitly without resubmitting an application',async({page})=>{
 const s=await model(page);s.apps=[app('APPROVED')];s.failContext=true;await page.goto('/customer/store-applications');await page.getByRole('button',{name:'Mở shop',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Chưa đọc được quyền');await expect(page).toHaveURL(/\/customer\/store-applications$/);s.failContext=false;s.role='OWNER';await page.getByRole('button',{name:'Mở shop',exact:true}).click();await expect(page).toHaveURL(/\/seller$/);expect(s.posts).toEqual([]);
});
test('ready return configuration does not claim the catalog is ready for checkout',async({page})=>{
 const s=await model(page,'OWNER');s.store.return_address={recipient_name:'Kho nhận trả',phone:'0901234567',line1:'123 Đường A',ward:'Phường B',district:'Quận C',city:'Huế'};await page.goto('/seller');await expect(page.getByRole('region',{name:'Chuẩn bị nhận đơn mới'})).toContainText('Sản phẩm vẫn cần đủ thông tin');await expect(page.getByRole('link',{name:'Hoàn thiện địa chỉ nhận trả',exact:true})).toHaveCount(0);
});
test('COD permission without order permission explains the missing prerequisite',async({page})=>{
 const s=await model(page,'SELLER');s.permissions=['cod.store.collect'];await page.goto('/seller');const rights=page.getByRole('region',{name:'Quyền công việc hiện tại'});await expect(rights).toContainText('cần thêm quyền xem và xử lý đơn hàng');await expect(rights.getByRole('link',{name:'Mở đơn để ghi nhận COD',exact:true})).toHaveCount(0);await expect(rights).toContainText('không có quyền xác nhận hoàn COD');
});
test('explicit refresh reflects granted work without implying a setup problem',async({page})=>{
 const s=await model(page,'SELLER');s.permissions=[];await page.goto('/seller');const rights=page.getByRole('region',{name:'Quyền công việc hiện tại'});await expect(rights.getByRole('link',{name:'Mở kho',exact:true})).toHaveCount(0);await expect(page.getByRole('complementary',{name:'Menu Store'}).getByRole('link',{name:'Sản phẩm Store',exact:true})).toHaveCount(0);s.permissions=['inventory.store.read_adjust'];await rights.getByRole('button',{name:'Làm mới quyền',exact:true}).click();await expect(rights.getByRole('link',{name:'Mở kho',exact:true})).toBeVisible();await expect(rights.getByRole('link',{name:'Mở sản phẩm',exact:true})).toHaveCount(0);expect(s.posts).toEqual([]);
});
test('pending counts outside the visible history page still block another application',async({page})=>{
 const s=await model(page);s.apps=[app(),...Array.from({length:11},(_,n)=>({...app('REJECTED'),id:id(100+n)}))];await page.goto('/customer/store-applications');await page.getByRole('button',{name:'Trang sau',exact:true}).click();await expect(page.getByRole('article')).toHaveCount(2);await expect(page.getByRole('button',{name:'Gửi hồ sơ',exact:true})).toBeDisabled();expect(s.posts).toEqual([]);
});


test('saving return settings updates the overview cache and preserves the successful acknowledgement',async({page})=>{
 const s=await model(page,'OWNER');await page.goto('/seller');await page.getByRole('link',{name:'Hoàn thiện địa chỉ nhận trả',exact:true}).click();for(const [label,value] of Object.entries({'Người nhận hàng trả':'Kho nhận trả','Điện thoại nhận trả':'0901234567','Địa chỉ nhận trả':'123 Đường A','Phường / xã nhận trả':'Phường B','Quận / huyện nhận trả':'Quận C','Tỉnh / thành nhận trả':'Huế'}))await page.getByLabel(label,{exact:true}).fill(value);await page.getByRole('button',{name:'Lưu thông tin',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Đã cập nhật gian hàng.'})).toBeVisible();await page.getByRole('complementary',{name:'Menu Store'}).getByRole('link',{name:'Tổng quan',exact:true}).click();await expect(page.getByRole('region',{name:'Chuẩn bị nhận đơn mới'})).toContainText('Đã có địa chỉ nhận trả');expect(s.posts).toHaveLength(1);
});

test('application form and long rejection history remain operable at supported widths',async({page},info)=>{
 const s=await model(page);s.apps=[{...app('REJECTED'),proposed_name:'Gian hàng vật dụng gia đình và quần áo nhiều phân loại '.repeat(4).slice(0,200),contact:'lien-he-rat-dai-'+('x'.repeat(100))+'@example.test',decision_reason:'Bổ sung thông tin liên hệ và kiểm tra tên Store trước khi gửi lại. '.repeat(3).slice(0,200)}];await page.goto('/customer/store-applications');await page.getByRole('button',{name:'Sửa hồ sơ',exact:true}).click();
 for(const width of (process.env.CORE_FIX_DESKTOP_ONLY==='1'?[1440,1024,768]:[1440,1024,768,390])){await page.setViewportSize({width,height:950});const button=page.getByRole('button',{name:'Gửi hồ sơ',exact:true});await button.scrollIntoViewIfNeeded();await expect(button).toBeEnabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(await button.evaluate(e=>{const b=e.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return hit===e||e.contains(hit);})).toBe(true);await page.screenshot({path:info.outputPath('application-'+width+'.png'),fullPage:true});}
 await page.getByRole('textbox',{name:'Email hoặc số điện thoại liên hệ',exact:false}).focus();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Gửi hồ sơ',exact:true})).toBeFocused();expect(s.posts).toEqual([]);
});


async function addressForm(page:Page){for(const [label,value] of Object.entries({'Người nhận hàng trả':'Kho nhận trả','Điện thoại nhận trả':'0901234567','Địa chỉ nhận trả':'123 Đường A','Phường / xã nhận trả':'Phường B','Quận / huyện nhận trả':'Quận C','Tỉnh / thành nhận trả':'Huế'}))await page.getByLabel(label,{exact:true}).fill(value);}

test('a slow Store settings command freezes all fields and blocks another submit',async({page})=>{
 const s=await model(page,'OWNER');await page.goto('/seller/settings');await addressForm(page);s.hold=true;await page.getByRole('button',{name:'Lưu thông tin',exact:true}).click();await expect.poll(()=>!!s.pending).toBe(true);for(const label of ['Tên gian hàng','Phí giao hàng (VND)','Người nhận hàng trả','Điện thoại nhận trả'])await expect(page.getByLabel(label,{exact:true})).toBeDisabled();await page.locator('main form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(s.posts).toHaveLength(1);await s.pending!.fulfill({json:s.store});await expect(page.getByRole('status').filter({hasText:'Đã cập nhật gian hàng.'})).toBeVisible();expect(s.posts).toHaveLength(1);
});

test('uncertain Store save and failed GET only permit read recovery, then synchronize the overview',async({page})=>{
 const s=await model(page,'OWNER');await page.goto('/seller');await page.getByRole('link',{name:'Hoàn thiện địa chỉ nhận trả',exact:true}).click();await addressForm(page);s.lost=true;await page.getByRole('button',{name:'Lưu thông tin',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Chưa rõ kết quả');await expect(page.getByRole('button',{name:'Lưu thông tin',exact:true})).toBeDisabled();await expect(page.getByLabel('Tên gian hàng',{exact:true})).toBeDisabled();s.failStoreReads=true;await page.getByRole('button',{name:'Thử lại',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Không đọc được Store');expect(s.posts).toHaveLength(1);s.failStoreReads=false;await page.getByRole('button',{name:'Thử lại',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Đã đọc lại thông tin gian hàng'})).toBeVisible();await expect(page.getByRole('button',{name:'Lưu thông tin',exact:true})).toBeEnabled();await page.getByRole('complementary',{name:'Menu Store'}).getByRole('link',{name:'Tổng quan',exact:true}).click();await expect(page.getByRole('region',{name:'Chuẩn bị nhận đơn mới'})).toContainText('Đã có địa chỉ nhận trả');expect(s.posts).toHaveLength(1);
});
