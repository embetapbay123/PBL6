import { test, expect, Page } from '@playwright/test';

const application = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  proposed_name: 'API Store', contact: 'seller@example.test', status: 'PENDING', version: 0,
};
const fixtureRun = process.env.WEB_TEST_API_MODE === 'fixture';

async function signInAs(page: Page, role: 'CUSTOMER' | 'ADMIN') {
  await page.route('**/api/v1/**', route => route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Unconfigured fixture',details:[]}}));
  await page.route('**/api/v1/auth/login', route => route.fulfill({ json: {
    access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'Bearer', expires_in: 900,
    context: { user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', roles: [role], token_version: 0 },
  } }));
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(`${role.toLowerCase()}@example.test`);
  await page.locator('input[type="password"]').fill('test-password');
  const loginResponse = page.waitForResponse(response => response.url().endsWith('/api/v1/auth/login'));
  await page.locator('form button').click();
  expect((await loginResponse).status()).toBe(200);
  await expect(page.getByText(role, { exact: true })).toBeVisible();
}

 (fixtureRun ? test.skip : test)('customer submission and history use the API and display the server response', async ({ page }) => {
  await signInAs(page, 'CUSTOMER');
  const submitted: unknown[] = [];
  await page.route('**/api/v1/me/store-applications*', async route => {
    if (route.request().method() === 'POST') {
      submitted.push(route.request().postDataJSON());
      await route.fulfill({ json: { ...application, id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }, status: 201 });
    } else {
      await route.fulfill({ json: { items: [application], total: 1, page: 1, size: 10 } });
    }
  });
  await page.getByRole('navigation',{name:'Điều hướng chính'}).locator('a[href="/customer/store-applications"]').click();
  const inputs = page.locator('.store-app-form input');
  await inputs.nth(0).fill('API Store');
  await inputs.nth(1).fill('seller@example.test');
  await page.locator('.store-app-form button').click();
  await expect(page.locator('.store-app-notice')).toContainText('API Store');
  await expect.poll(() => submitted.length).toBe(1);
  expect(submitted[0]).toEqual({ proposed_name: 'API Store', contact: 'seller@example.test' });
  await expect(page.locator('.store-app-row')).toContainText('API Store');
  expect(await page.evaluate(() => localStorage.getItem('pbl6_mock_store_applications'))).toBeNull();
});

 (fixtureRun ? test.skip : test)('API 409 is shown and never falls back to browser storage', async ({ page }) => {
  await signInAs(page, 'CUSTOMER');
  await page.route('**/api/v1/me/store-applications*', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 409, json: { code: 'DUPLICATE_APPLICATION', message: 'An application is already pending', details: [], correlation_id: 'store-409' } });
    } else {
      await route.fulfill({ json: { items: [], total: 0, page: 1, size: 10 } });
    }
  });
  await page.getByRole('navigation',{name:'Điều hướng chính'}).locator('a[href="/customer/store-applications"]').click();
  const inputs = page.locator('.store-app-form input');
  await inputs.nth(0).fill('API Store');
  await inputs.nth(1).fill('seller@example.test');
  await page.locator('.store-app-form button').click();
  await expect(page.getByRole('alert')).toContainText('An application is already pending');
  await expect(page.getByRole('alert')).toContainText('store-409');
  expect(await page.evaluate(() => localStorage.getItem('pbl6_mock_store_applications'))).toBeNull();
});

 (fixtureRun ? test.skip : test)('Admin review uses API operations and reports the server decision', async ({ page }) => {
  await signInAs(page, 'ADMIN');
  const requests: Array<{ method: string; path: string; body?: unknown }> = [];
  await page.route(url => new URL(url).pathname.startsWith('/api/v1/admin/store-applications'), async route => {
    const request = route.request();
    requests.push({ method: request.method(), path: new URL(request.url()).pathname,
      ...(request.method() === 'PATCH' ? { body: request.postDataJSON() } : {}) });
    if (request.method() === 'PATCH') {
      await route.fulfill({ json: { ...application, status: 'APPROVED', version: 1 } });
    } else {
      await route.fulfill({ json: { items: [application], total: 1, page: 1, size: 10 } });
    }
  });
  await page.getByRole('link',{name:'Admin Portal',exact:true}).click();
  await page.getByRole('complementary',{name:'Menu quản trị'}).locator('a[href="/admin/store-applications"]').click();
  await page.locator('.store-app-icon-button--approve').first().click();
  await page.locator('.store-app-dialog-actions .store-app-button--primary').click();
  await expect(page.locator('.store-app-notice')).toContainText('API Store');
  expect(requests.some(request => request.method === 'GET')).toBe(true);
  expect(requests).toContainEqual({
    method: 'PATCH', path: `/api/v1/admin/store-applications/${application.id}`,
    body: { status: 'APPROVED', expected_version: 0 },
  });
  expect(await page.evaluate(() => localStorage.getItem('pbl6_mock_store_applications'))).toBeNull();
});

 (fixtureRun ? test : test.skip)('explicit fixture mode writes a clearly labeled browser fixture', async ({ page }) => {
  await signInAs(page, 'CUSTOMER');
  let apiWrites = 0;
  await page.route('**/api/v1/me/store-applications*', route => { apiWrites += 1; return route.continue(); });
  await page.getByRole('navigation',{name:'Điều hướng chính'}).locator('a[href="/customer/store-applications"]').click();
  const inputs = page.locator('.store-app-form input');
  await inputs.nth(0).fill('Fixture Store');
  await inputs.nth(1).fill('fixture@example.test');
  await page.locator('.store-app-form button').click();
  await expect(page.locator('.store-app-notice')).toContainText('fixture');
  expect(await page.evaluate(() => localStorage.getItem('pbl6_mock_store_applications'))).not.toBeNull();
  expect(apiWrites).toBe(0);
});

 (fixtureRun ? test : test.skip)('fixture approval is not reported as a persisted Store creation', async ({ page }) => {
  await signInAs(page, 'ADMIN');
  let reviewCalls = 0;
  await page.route(url => new URL(url).pathname.startsWith('/api/v1/admin/store-applications'), route => { reviewCalls += 1; return route.continue(); });
  await page.getByRole('link',{name:'Admin Portal',exact:true}).click();
  await page.getByRole('complementary',{name:'Menu quản trị'}).locator('a[href="/admin/store-applications"]').click();
  await page.locator('.store-app-icon-button--approve').first().click();
  await page.locator('.store-app-dialog-actions .store-app-button--primary').click();
  await expect(page.locator('.store-app-notice')).toContainText('No real Store or membership was created');
  expect(await page.evaluate(() => localStorage.getItem('pbl6_mock_store_applications'))).not.toBeNull();
  expect(reviewCalls).toBe(0);
});
