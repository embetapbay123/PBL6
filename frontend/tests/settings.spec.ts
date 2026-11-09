import {test,expect,Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
const id='43000000-0000-4000-8000-000000000001';
async function setup(page:Page,{conflict=false,unavailable=false}={}){
 const writes:unknown[]=[];let version=0,status='GRANTED',accepted=false,contexts=0;
 const context=()=>({user_id:id,roles:accepted?['CUSTOMER','SELLER']:['CUSTOMER'],role_permissions:[],token_version:0,...(accepted?{store_membership:{store_id:id,role:'SELLER',status:'ACTIVE',permissions:['product.store.read_write']}}:{})});
 await page.route('**/api/v1/**',route=>{const req=route.request(),path=new URL(req.url()).pathname;
  if(path.endsWith('/auth/login')||path.endsWith('/auth/refresh'))return route.fulfill({json:{...f.login.response,context:context()},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path==='/api/v1/me/context'){contexts++;return route.fulfill({json:context()})}
  if(path==='/api/v1/me/personalization-consent'){
   if(unavailable)return route.fulfill({status:503,json:{code:'DOWN',message:'Consent unavailable',details:[]}});
   if(req.method()==='PATCH'){writes.push(req.postDataJSON());if(conflict)return route.fulfill({status:409,json:{code:'VERSION_CONFLICT',message:'Consent changed in another tab',details:[]}});status=req.postDataJSON().status;version++}
   return route.fulfill({json:{status,version}});
  }
  if(path==='/api/v1/me/invitations')return route.fulfill({json:{items:[{id,store_id:id,store_name:'Inviting store',invited_email:'fixture@example.test',status:accepted?'ACCEPTED':'PENDING',permissions:['product.store.read_write'],expires_at:'2099-11-01T00:00:00Z'}],total:1,page:1,size:20}});
  if(path==='/api/v1/me/invitations/'+id+'/accept'){accepted=true;return route.fulfill({json:{id,status:'ACCEPTED',invited_email:'fixture@example.test',permissions:[]}})}
  return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Unconfigured fixture',details:[]}});
 });
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Fixture-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();
 return {writes,contexts:()=>contexts};
}
test('settings are reachable and revoke/grant use the current version including zero',async({page})=>{
 const t=await setup(page);await page.goto('/customer/settings');
 await expect(page.getByRole('heading',{name:'Gợi ý cá nhân hóa',exact:true})).toBeVisible();
 await expect(page.getByText('Đang bật',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Tắt cá nhân hóa',exact:true}).click();
 await expect(page.getByText('Đang tắt',{exact:true})).toBeVisible();
 await expect(page.getByText('WITHDRAWN',{exact:true})).toBeHidden();
 await page.getByText('Thông tin kỹ thuật',{exact:true}).click();
 await expect(page.getByText('WITHDRAWN',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Cho phép cá nhân hóa',exact:true}).click();
 await expect(page.getByText('Đang bật',{exact:true})).toBeVisible();
 expect(t.writes).toEqual([{status:'WITHDRAWN',expected_version:0},{status:'GRANTED',expected_version:1}]);
});
test('409 preserves the state and blocks further writes until an explicit reload',async({page})=>{
 const t=await setup(page,{conflict:true});await page.goto('/customer/settings');await page.getByRole('button',{name:'Tắt cá nhân hóa',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Consent changed');await expect(page.getByRole('button',{name:'Tắt cá nhân hóa',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Thử lại',exact:true}).click();await expect(page.getByRole('button',{name:'Tắt cá nhân hóa',exact:true})).toBeEnabled();expect(t.writes).toHaveLength(1);
});
test('load failure does not display an actionable consent button or pretend success',async({page})=>{
 await setup(page,{unavailable:true});await page.goto('/customer/settings');await expect(page.getByRole('alert')).toContainText('Consent unavailable');await expect(page.getByRole('button',{name:'Cho phép cá nhân hóa',exact:true})).toHaveCount(0);
});
test('active sessions offer password changes in security and logout only in the account menu',async({page})=>{
 await setup(page);
 const main=page.getByRole('main');
 await expect(main.getByRole('heading',{name:'Đã đăng nhập',exact:true})).toBeVisible();
 for(const name of ['Đăng nhập','Đăng ký tài khoản','Quên mật khẩu']) await expect(main.getByRole('link',{name,exact:true})).toHaveCount(0);
 await expect(main.getByRole('button',{name:'Đăng xuất',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Menu tài khoản',exact:true}).click();
 await expect(page.getByRole('navigation',{name:'Menu tài khoản'}).getByRole('button',{name:'Đăng xuất',exact:true})).toBeVisible();
 await page.goto('/customer/settings?section=security');
 await expect(page.getByRole('link',{name:'Quản lý đăng nhập',exact:true})).toHaveCount(0);
 await expect(page.getByRole('navigation',{name:'Danh mục cài đặt'}).getByRole('link',{name:'Thông báo',exact:true})).toHaveCount(0);
 await page.getByRole('link',{name:'Đổi mật khẩu',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Đổi mật khẩu',exact:true})).toBeVisible();
});
test('invitation modal accepts via API and refreshes the authenticated context',async({page})=>{
 const t=await setup(page);await page.goto('/customer/settings');await page.getByRole('button',{name:'Xem lời mời Store'}).click();await expect(page.getByRole('dialog')).toContainText('Inviting store');await page.getByRole('button',{name:'Chấp nhận',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Đã chấp nhận');expect(t.contexts()).toBe(0);await page.getByRole('button',{name:'Mở shop',exact:true}).click();await expect(page).toHaveURL(/\/seller$/);expect(t.contexts()).toBe(1);await page.goto('/customer/settings');await page.getByRole('button',{name:'Xem lời mời Store'}).click();await expect(page.getByRole('button',{name:'Từ chối',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Đóng lời mời'}).click();await page.getByRole('button',{name:'Menu tài khoản',exact:true}).click();await page.getByTestId('account-link').click();await expect(page.getByText('CUSTOMER, SELLER',{exact:true})).toBeVisible();
});

test('invitation dialog contains keyboard focus, closes on Escape and restores the opener',async({page})=>{
 await setup(page);await page.goto('/customer/settings');const opener=page.getByRole('button',{name:'Xem lời mời Store'});await opener.click();const dialog=page.getByRole('dialog',{name:'Lời mời Store'});await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Đóng lời mời'})).toBeFocused();
 for(let index=0;index<14;index++){await page.keyboard.press('Tab');expect(await dialog.evaluate(element=>element.contains(document.activeElement))).toBe(true);}
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
});
