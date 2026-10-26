import {test,expect,Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
async function setup(page:Page,{failure=false}={}){
 const calls:{path:string;body:any}[]=[];
 await page.route('**/api/v1/**',route=>{const req=route.request(),path=new URL(req.url()).pathname,body=req.postData()?req.postDataJSON():undefined;calls.push({path,body});
  if(failure)return route.fulfill({status:503,json:{code:'EMAIL_DELIVERY_UNAVAILABLE',message:'Email delivery unavailable',details:[]}});
  if(path.endsWith('/auth/login')||path.endsWith('/auth/refresh'))return route.fulfill({json:{...f.login.response,context:{user_id:'44000000-0000-4000-8000-000000000001',roles:['CUSTOMER'],role_permissions:[],token_version:0}},headers:{'set-cookie':'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
  if(path.endsWith('/auth/register'))return route.fulfill({status:201,json:{user_id:'44000000-0000-4000-8000-000000000001',email_verified:false,message:'Check your actual email to verify'}});
  return route.fulfill({json:{status:'SUCCESS'}});
 });return calls;
}
test('login calls the backend and only then changes the authenticated UI',async({page})=>{
 const calls=await setup(page);await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('actual@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Test-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();expect(calls[0]).toEqual({path:'/api/v1/auth/login',body:{email:'actual@example.test',password:'Test-password-123',client_type:'WEB'}});
});
test('registration uses the entered email and does not log in or invent verification success',async({page})=>{
 const calls=await setup(page);await page.goto('/register');await page.getByLabel('Email',{exact:true}).fill('actual@example.test');await page.getByLabel('Tên hiển thị').fill('Actual customer');await page.getByLabel('Mật khẩu',{exact:true}).fill('Test-password-123');await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await expect(page.getByRole('status')).toContainText('Check your actual email');expect(calls).toEqual([{path:'/api/v1/auth/register',body:{email:'actual@example.test',password:'Test-password-123',display_name:'Actual customer'}}]);await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toHaveCount(0);
});
test('verification reads the email token, removes it from the URL and sends it only on explicit submit',async({page})=>{
 const calls=await setup(page);await page.goto('/verify-email?token=fixture-email-token');await expect(page.getByLabel('Mã xác thực')).toHaveValue('fixture-email-token');await expect(page).toHaveURL(/\/verify-email$/);expect(calls).toHaveLength(0);await page.getByRole('button',{name:'Xác thực email',exact:true}).click();await expect(page.getByRole('status')).toContainText('Email đã được xác thực');expect(calls).toEqual([{path:'/api/v1/auth/verify-email',body:{token:'fixture-email-token'}}]);
});
test('request and confirm reset use separate endpoints and the server token',async({page})=>{
 const calls=await setup(page);await page.goto('/forgot-password');await page.getByLabel('Email',{exact:true}).fill('actual@example.test');await page.getByRole('button',{name:'Gửi yêu cầu đặt lại'}).click();await expect(page.getByRole('status')).toBeVisible();await page.goto('/reset-password?token=fixture-reset-token');await page.getByLabel('Mật khẩu mới',{exact:true}).fill('New-password-123');await page.getByLabel('Xác nhận mật khẩu',{exact:true}).fill('New-password-123');await page.getByRole('button',{name:'Đặt lại mật khẩu',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã đặt lại mật khẩu');expect(calls).toEqual([{path:'/api/v1/auth/reset-password',body:{email:'actual@example.test'}},{path:'/api/v1/auth/reset-password/confirm',body:{token:'fixture-reset-token',new_password:'New-password-123'}}]);
});
test('delivery error remains an error with no success message',async({page})=>{
 await setup(page,{failure:true});await page.goto('/forgot-password');await page.getByLabel('Email',{exact:true}).fill('actual@example.test');await page.getByRole('button',{name:'Gửi yêu cầu đặt lại'}).click();await expect(page.getByRole('alert')).toContainText('Email delivery unavailable');await expect(page.getByRole('status')).toHaveCount(0);
});
test('changing a password sends current/new values and clears the revoked local session',async({page})=>{
 const calls=await setup(page);await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('actual@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('Test-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();await page.getByRole('link',{name:'Đổi mật khẩu',exact:true}).click();await page.getByLabel('Mật khẩu hiện tại').fill('Test-password-123');await page.getByLabel('Mật khẩu mới',{exact:true}).fill('New-password-123');await page.getByRole('button',{name:'Đổi mật khẩu',exact:true}).click();await expect(page.getByText('Đăng nhập để tiếp tục.')).toBeVisible();expect(calls.find(c=>c.path.endsWith('/auth/change-password'))?.body).toEqual({current_password:'Test-password-123',new_password:'New-password-123'});expect(calls.some(c=>c.path.endsWith('/auth/logout'))).toBe(true);
});
