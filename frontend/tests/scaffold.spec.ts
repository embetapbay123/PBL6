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
