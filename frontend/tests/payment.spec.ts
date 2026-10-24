import { test, expect, Page } from '@playwright/test';

const ORDER_ID = '44444444-4444-4444-8444-444444444444';
const ATTEMPT_ID = '55555555-5555-4555-8555-555555555555';
const QR = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22%3E%3Crect width=%2240%22 height=%2240%22/%3E%3C/svg%3E';

const order = (over: Record<string, unknown> = {}) => ({
  id: ORDER_ID, purchase_group_id: 'g1', store_id: 's1', status: 'AWAITING_PAYMENT', version: 3,
  payment_method: 'SANDBOX',
  amounts: { goods_vnd: 100000, store_discount_vnd: 0, platform_discount_vnd: 0, shipping_vnd: 0, payable_vnd: 100000 },
  ...over,
});
const attempt = () => ({
  id: ATTEMPT_ID, status: 'PENDING', provider: 'SEPAY_TEST', payment_code: 'PBL6TEST', qr_url: QR,
  expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
});
const payment = (status: string) => ({
  id: ATTEMPT_ID, order_id: ORDER_ID, method: 'SANDBOX', status, payable_vnd: 100000, collectible_vnd: 100000,
});

type Reply = { status?: number; json: unknown };
const apiError = (status: number, message: string): Reply => ({ status, json: { code: 'ERR', message, details: [] } });

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('customer1@pbl6.test');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(process.env.SEED_PASSWORD!);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Đã đăng nhập' })).toBeVisible();
}

async function open(page: Page, o: {
  order?: Reply; attempt?: Reply; payment: (n: number) => Reply;
}) {
  const c = { attempts: 0, bodies: [] as unknown[], payments: 0 };
  await page.route('**/api/v1/me/orders/*', route => route.fulfill(o.order ?? { json: order() }));
  await page.route('**/api/v1/orders/*/payment-attempts', route => {
    c.attempts++;
    c.bodies.push(route.request().postDataJSON());
    return route.fulfill(o.attempt ?? { json: attempt() });
  });
  await page.route('**/api/v1/payments/*', route => {
    c.payments++;
    return route.fulfill(o.payment(c.payments));
  });
  await page.clock.install();
  await page.goto(`/orders/${ORDER_ID}/pay`);
  return c;
}

test('shows QR, code and amount, keeps waiting on PENDING, then shows success only on SUCCEEDED', async ({ page }) => {
  await login(page);
  const c = await open(page, { payment: n => ({ json: payment(n >= 2 ? 'SUCCEEDED' : 'PENDING') }) });
  await expect(page.getByTestId('payment-waiting')).toBeVisible();
  await expect(page.getByAltText('Mã QR thanh toán')).toBeVisible();
  await expect(page.getByText('PBL6TEST')).toBeVisible();
  await expect.poll(() => c.payments).toBe(1);
  await expect(page.getByTestId('payment-succeeded')).toHaveCount(0);
  await page.clock.runFor(4000);
  await expect(page.getByTestId('payment-succeeded')).toBeVisible();
  expect(c.attempts).toBe(1);
  expect(c.bodies[0]).toEqual({ expected_order_version: 3 });
});

test('UNKNOWN stops polling, offers no retry and is not shown as success', async ({ page }) => {
  await login(page);
  const c = await open(page, { payment: () => ({ json: payment('UNKNOWN') }) });
  await expect(page.getByTestId('payment-unknown')).toBeVisible();
  await page.clock.runFor(12000);
  expect(c.payments).toBe(1);
  await expect(page.getByTestId('payment-unknown').getByRole('button')).toHaveCount(0);
  await expect(page.getByTestId('payment-succeeded')).toHaveCount(0);
});

test('FAILED stops polling and offers a new attempt', async ({ page }) => {
  await login(page);
  const c = await open(page, { payment: () => ({ json: payment('FAILED') }) });
  await expect(page.getByTestId('payment-failed')).toBeVisible();
  await page.clock.runFor(12000);
  expect(c.payments).toBe(1);
  await expect(page.getByRole('button', { name: 'Tạo mã mới' })).toBeEnabled();
});

test('provider disabled (503) is an error with retry, not a QR', async ({ page }) => {
  await login(page);
  await open(page, { attempt: apiError(503, 'disabled'), payment: () => ({ json: payment('PENDING') }) });
  await expect(page.getByTestId('payment-setup-error')).toContainText('chưa được bật');
  await expect(page.getByRole('button', { name: 'Thử lại' })).toBeEnabled();
  await expect(page.getByAltText('Mã QR thanh toán')).toHaveCount(0);
});

test('409 requires reconciliation and offers no retry', async ({ page }) => {
  await login(page);
  await open(page, { attempt: apiError(409, 'reconcile'), payment: () => ({ json: payment('PENDING') }) });
  await expect(page.getByTestId('payment-setup-error')).toContainText('đối soát');
  await expect(page.getByRole('button', { name: 'Thử lại' })).toHaveCount(0);
});

test('order not awaiting payment does not create an attempt', async ({ page }) => {
  await login(page);
  const c = await open(page, { order: { json: order({ status: 'CANCELLED' }) }, payment: () => ({ json: payment('PENDING') }) });
  await expect(page.getByTestId('payment-not-awaiting')).toContainText('CANCELLED');
  expect(c.attempts).toBe(0);
});

test('repeated polling failures end in an error and never in success', async ({ page }) => {
  await login(page);
  const c = await open(page, { payment: () => apiError(503, 'down') });
  for (let n = 1; n <= 5; n++) {
    await expect.poll(() => c.payments).toBe(n);
    await page.clock.runFor(4000);
  }
  await expect(page.getByTestId('payment-poll-error')).toBeVisible();
  await expect(page.getByTestId('payment-succeeded')).toHaveCount(0);
});
