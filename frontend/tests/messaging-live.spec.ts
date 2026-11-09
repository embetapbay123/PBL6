import { test, expect, type Page } from '@playwright/test';

// This writes test messages. Enable only against a disposable integration deployment.
test.skip(process.env.E2E_REAL_MESSAGING!=='1','Requires a disposable M1/M3 deployment.');
async function login(page:Page,email:string){await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill(process.env.SEED_PASSWORD!);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đăng nhập'})).toBeVisible();}
test('buyer and Store owner exchange persisted messages through real APIs',async({page,browser,baseURL})=>{
  await login(page,'customer1@pbl6.test');
  await page.goto('/stores/10000000-0000-4000-8000-000000000061');
  await page.getByRole('button',{name:'Nhắn tin',exact:true}).click();
  await page.getByRole('button',{name:'Mở trang Tin nhắn',exact:true}).click();
  await expect(page).toHaveURL(/\/customer\/messages\/[0-9a-f-]+$/);
  const thread=page.url().split('/').at(-1)!;
  const text='Kiểm thử trao đổi '+Date.now();
  await page.getByRole('textbox',{name:'Nội dung tin nhắn',exact:true}).fill(text);await page.getByRole('button',{name:'Gửi',exact:true}).click();await expect(page.getByRole('log')).toContainText(text);
  const ownerContext=await browser.newContext({baseURL});
  try{
    const owner=await ownerContext.newPage();await login(owner,'owner@pbl6.test');await owner.goto('/seller/messages/'+thread);
    await expect(owner.getByRole('log')).toContainText(text);
    const answer='Gian hàng đã nhận '+Date.now();
    await owner.getByRole('textbox',{name:'Nội dung tin nhắn',exact:true}).fill(answer);await owner.getByRole('button',{name:'Gửi',exact:true}).click();await expect(owner.getByRole('log')).toContainText(answer);
    await page.bringToFront();await expect(page.getByRole('log')).toContainText(answer,{timeout:15000});
    await page.reload();await expect(page.getByRole('log')).toContainText(answer);
  }finally{await ownerContext.close();}
});
