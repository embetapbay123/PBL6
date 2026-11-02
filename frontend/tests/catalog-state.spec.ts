import {test,expect} from '@playwright/test';
test('catalog sort, filters and page survive reload and browser history',async({page})=>{
  const queries:URLSearchParams[]=[];
  await page.route('**/api/v1/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/products')){queries.push(url.searchParams);return route.fulfill({json:{items:[],total:41,page:Number(url.searchParams.get('page')),size:20}});}
    return route.fulfill({json:{items:[],total:0,page:1,size:100}});
  });
  await page.goto('/?q=abc&page=2&sort=price_desc');await expect(page.getByLabel('Sắp xếp')).toHaveValue('price_desc');await expect(page.getByText('Trang 2 · 41 kết quả')).toBeVisible();await page.reload();await expect(page.getByLabel('Sắp xếp')).toHaveValue('price_desc');
  await page.getByLabel('Sắp xếp').selectOption('price_asc');await expect(page).toHaveURL(/sort=price_asc/);await expect(page.getByText('Trang 1 · 41 kết quả')).toBeVisible();await page.goBack();await expect(page.getByLabel('Sắp xếp')).toHaveValue('price_desc');await expect(page.getByText('Trang 2 · 41 kết quả')).toBeVisible();
  await page.goto('/?page=1.5');await expect(page.getByText('Trang 1 · 41 kết quả')).toBeVisible();expect(queries.at(-1)?.get('page')).toBe('1');
});
