import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json',import.meta.url),'utf8'));
test('demo selection authenticates once and never sends a password to the browser API',async({page})=>{
 const commands:unknown[]=[];let release:(()=>void)|undefined;
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/auth/demo-login')){commands.push(route.request().postDataJSON());await new Promise<void>(resolve=>{release=resolve});return route.fulfill({json:fixtures.login.response});}
  if(path.endsWith('/products'))return route.fulfill({json:{items:[],total:0,page:1,size:20}});
  return route.fulfill({json:{items:[],total:0,page:1,size:20}});
 });
 await page.goto('/login');const section=page.getByRole('region',{name:'Đăng nhập nhanh demo'});
 await expect(section.getByRole('button')).toHaveCount(7);
 await section.getByRole('button',{name:'Khách hàng A'}).click();
 await expect(section.getByRole('button',{name:'Khách hàng B'})).toBeDisabled();
 await expect(page.getByRole('status').filter({hasText:'Đang đăng nhập tài khoản demo'})).toBeVisible();
 expect(commands).toEqual([{account:'customerA'}]);release!();await expect(page).toHaveURL('/');
 expect(commands).toHaveLength(1);
});
test('demo login failure leaves the form available and does not claim success',async({page})=>{
 await page.route('**/api/v1/**',route=>route.fulfill({status:404,json:{code:'DEMO_LOGIN_UNAVAILABLE',message:'Tài khoản demo chưa sẵn sàng',details:[]}}));
 await page.goto('/login');await page.getByRole('button',{name:'Quản trị viên Quản trị toàn sàn demo'}).click();
 await expect(page.getByRole('alert')).toContainText('Tài khoản demo chưa sẵn sàng');
 await expect(page).toHaveURL('/login');await expect(page.getByRole('button',{name:'Khách hàng A'})).toBeEnabled();
});
test('demo login preserves a pending buying journey',async({page})=>{
 await page.addInitScript(()=>sessionStorage.setItem('pbl6_auth_return',JSON.stringify({path:'/cart',expires:Date.now()+60000})));
 await page.route('**/api/v1/**',route=>route.fulfill({json:new URL(route.request().url()).pathname.endsWith('/auth/demo-login')?fixtures.login.response:{items:[],total:0,page:1,size:20}}));
 await page.goto('/login');await page.getByRole('button',{name:'Khách hàng A'}).click();await expect(page).toHaveURL('/cart');
});
