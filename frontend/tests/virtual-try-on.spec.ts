import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const fixtures = JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json', import.meta.url), 'utf8'));
const id = (n: number) => '96000000-0000-4000-8000-' + String(n).padStart(12, '0');
const productPath = '/products/' + id(1);
const fixtureDemoPassword = 'fixture-demo-access';

async function model(page: Page, options: { guest?: boolean; unavailable?: boolean; remaining?: number; unknown?: boolean; title?: string; demo?: boolean } = {}) {
  const state = { jobs: [] as any[], uploads: 0, creates: 0, deletes: 0, bodies: [] as any[], headers: [] as Record<string, string>[], errors: [] as string[], photoReads: 0 };
  const product = { ...fixtures.getProduct.response, id: id(1), store_id: id(2), product_type_id: id(3), title: options.title ?? 'Áo sơ mi linen cổ đứng', status: 'ACTIVE',
    variants: [{ id: id(4), sku: 'LINEN-BE-M', status: 'ACTIVE', price_vnd: 329000, quantity: 8, reserved_quantity: 0, available_quantity: 8, is_default: true, variant_values: { color: 'Be', size: 'M' } }],
    images: [{ id: id(5), variant_id: id(4), image_url: '/catalog/simple-beige-mens-shirt.webp', position: 0 }],
  };
  if (!options.guest) await page.context().addCookies([{ name: 'pbl6_csrf', value: 'fixture', url: new URL('/', process.env.WEB_TEST_URL ?? 'http://localhost:8080').href }]);
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/api/v1/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname.replace('/api/v1', '');
    if (path.startsWith('/auth/')) return route.fulfill(options.guest ? { status: 401, json: { code: 'UNAUTHENTICATED' } } : { json: { ...fixtures.login.response, expires_at: new Date(Date.now() + 3600000).toISOString(), context: { user_id: id(9), roles: ['CUSTOMER'], role_permissions: [], token_version: 0 } } });
    if (path === '/me/context') return route.fulfill({ json: { user_id: id(9), roles: ['CUSTOMER'], role_permissions: [], token_version: 0 } });
    if (path === productPath) return route.fulfill({ json: product });
    if (path === '/product-types') return route.fulfill({ json: { items: [{ id: id(3), name: options.title ? 'Khác' : 'Áo', category_id: id(6) }], total: 1 } });
    if (path === '/stores/' + id(2)) return route.fulfill({ json: { id: id(2), name: 'Linen Studio', shipping_fee_vnd: 20000 } });
    if (path === '/me/favorites') return route.fulfill({ json: { items: [], total: 0 } });
    if (path === '/ai/try-on/capabilities') return route.fulfill(options.unavailable ? { status: 404, json: { code: 'NOT_FOUND' } } : { json: {
      enabled: true, demo_password_required: options.demo ?? false, quota: { remaining: options.remaining ?? Math.max(0, 3 - state.creates), limit: 3, reset_at: '2026-11-14T00:00:00+07:00' },
      consent_version: 'try-on-v1', privacy: { provider_label: 'OpenAI', retention_hours: 24 },
    } });
    if (path === '/ai/try-on/photos') {
      state.uploads++; state.headers.push(req.headers());
      if (options.demo && req.headers()['x-try-on-demo-password'] !== fixtureDemoPassword) return route.fulfill({ status: 403, json: { code: 'DEMO_PASSWORD_INVALID', message: 'Mật khẩu demo chưa đúng.' } });
      expect(req.postDataBuffer()?.toString()).toContain('name="photo"');
      return route.fulfill({ status: 201, json: { id: id(10) } });
    }
    if (path === '/ai/try-on/jobs' && req.method() === 'POST') {
      if (options.demo && req.headers()['x-try-on-demo-password'] !== fixtureDemoPassword) return route.fulfill({ status: 403, json: { code: 'DEMO_PASSWORD_INVALID', message: 'Mật khẩu demo chưa đúng.' } });
      state.creates++; state.bodies.push(req.postDataJSON()); state.headers.push(req.headers());
      const job = { id: id(11), product_id: product.id, variant_id: id(4), idempotency_key: req.headers()['idempotency-key'], status: 'PROCESSING' };
      if (options.unknown) return route.fulfill({ status: 504, json: { code: 'UPSTREAM_TIMEOUT', message: 'Timeout' } });
      state.jobs = [job]; return route.fulfill({ status: 202, json: job });
    }
    if (path === '/ai/try-on/jobs') return route.fulfill({ json: { items: state.jobs } });
    if (path === '/ai/try-on/jobs/' + id(11)) {
      if (req.method() === 'DELETE') { state.deletes++; state.jobs = []; return route.fulfill({ status: 204 }); }
      return route.fulfill({ json: state.jobs[0] });
    }
    if (path === '/cart/items' && req.method() === 'POST') return route.fulfill({ status: 201, json: { id: id(20) } });
    return route.fulfill({ json: { items: [], total: 0, page: 1, size: 20 } });
  });
  await page.goto(productPath);
  await expect(page.getByRole('heading', { name: product.title, exact: true })).toBeVisible();
  return { state, product };
}

async function open(page: Page) {
  await page.getByRole('button', { name: /Thử với ảnh của bạn/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Phòng thử đồ', exact: true });
  await expect(dialog).toBeVisible(); return dialog;
}

async function photo(page: Page) {
  const bytes = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 960;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#dedfd1'; ctx.fillRect(0, 0, 720, 960);
    ctx.fillStyle = '#a9b19a'; ctx.beginPath(); ctx.arc(360, 230, 100, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(215, 355, 290, 380); ctx.fillRect(240, 730, 95, 230); ctx.fillRect(385, 730, 95, 230);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Chọn ảnh cá nhân', { exact: true }).setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: Buffer.from(bytes, 'base64') });
  await expect(page.getByAltText('Ảnh cá nhân đã chọn', { exact: true })).toBeVisible();
}

for (const [width, height] of [[1440, 900], [1366, 768], [768, 900], [390, 844]]) test(`try-on layout and keyboard at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height });
  const { state } = await model(page); const dialog = await open(page);
  await expect(dialog.locator('.try-on-quota strong')).toHaveText('3 / 3');
  await expect(dialog.getByRole('button', { name: /Tạo ảnh thử đồ/ })).toBeDisabled();
  await expect(dialog.getByRole('heading', { name: 'Bắt đầu với ảnh của bạn' })).toBeVisible();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await dialog.getByRole('button', { name: 'Đóng phòng thử đồ', exact: true }).focus();
  await page.keyboard.press('Shift+Tab'); await expect(dialog.getByRole('checkbox')).toBeFocused();
  await page.screenshot({ path: info.outputPath(`try-on-empty-${width}.png`) });
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: /Thử với ảnh của bạn/ })).toBeFocused();
  expect(state.creates).toBe(0); expect(state.errors).toEqual([]);
});

test('photo stays local until explicit consent; one request preserves product/variant and auth multipart', async ({ page }, info) => {
  const { state } = await model(page); const dialog = await open(page);
  await photo(page); expect(state.uploads).toBe(0);
  const create = dialog.getByRole('button', { name: /Tạo ảnh thử đồ/ });
  await expect(create).toBeDisabled();
  await dialog.getByRole('checkbox').check(); await expect(create).toBeEnabled();
  await page.screenshot({ path: info.outputPath('try-on-photo.png') });
  await create.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(dialog.getByText('Đang phối đồ cho bạn', { exact: true })).toBeVisible();
  expect(state.uploads).toBe(1); expect(state.creates).toBe(1);
  expect(state.headers[0]['content-type']).toMatch(/^multipart\/form-data; boundary=/);
  expect(state.headers[0].authorization).toMatch(/^Bearer /);
  expect(state.bodies[0]).toEqual({ photo_id: id(10), product_id: id(1), variant_id: id(4), consent_version: 'try-on-v1' });
  expect(state.headers[1]['idempotency-key']).toBeTruthy();
  await page.screenshot({ path: info.outputPath('try-on-processing.png') });
  state.jobs[0] = { ...state.jobs[0], status: 'SUCCEEDED', result_url: '/catalog/simple-beige-mens-shirt.webp', expires_at: new Date(Date.now() + 86400000).toISOString() };
  await dialog.getByRole('button', { name: 'Kiểm tra kết quả', exact: true }).click();
  await expect(dialog.getByAltText('Ảnh AI thử Áo sơ mi linen cổ đứng')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Thêm vào giỏ', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Ảnh gốc', exact: true }).click(); await expect(dialog.getByAltText('Ảnh cá nhân đã chọn')).toBeVisible();
  await dialog.getByRole('button', { name: 'Kết quả', exact: true }).click();
  await page.screenshot({ path: info.outputPath('try-on-result.png') });
  await dialog.getByRole('button', { name: 'Xóa ảnh kết quả', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Xóa ảnh kết quả', exact: true })).toHaveCount(0);
  expect(state.deletes).toBe(1); expect(state.errors).toEqual([]);
});

test('unavailable backend never invents quota or sends a photo', async ({ page }) => {
  const { state } = await model(page, { unavailable: true }); const dialog = await open(page);
  await photo(page);
  await expect(dialog.getByText(/Tạo ảnh thử đồ chưa sẵn sàng/)).toBeVisible();
  await expect(dialog.getByText('Chưa có thông tin hạn mức', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Tạo ảnh thử đồ/ })).toBeDisabled();
  expect(state.uploads).toBe(0); expect(state.creates).toBe(0);
});

test('exhausted quota keeps reset time visible and blocks creation', async ({ page }) => {
  const { state } = await model(page, { remaining: 0 }); const dialog = await open(page);
  await photo(page); await dialog.getByRole('checkbox').check();
  await expect(dialog.getByText('Bạn đã dùng hết lượt thử hôm nay.', { exact: true })).toBeVisible();
  await expect(dialog.getByText(/Làm mới lúc/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Tạo ảnh thử đồ/ })).toBeDisabled(); expect(state.creates).toBe(0);
});

test('uncertain submission survives closing and reopening without automatic paid retry', async ({ page }) => {
  const { state } = await model(page, { unknown: true }); let dialog = await open(page);
  await photo(page); await dialog.getByRole('checkbox').check(); await dialog.getByRole('button', { name: /Tạo ảnh thử đồ/ }).click();
  await expect(dialog.getByText('Đang kiểm tra yêu cầu', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Đóng phòng thử đồ', exact: true }).click(); dialog = await open(page);
  await expect(dialog.getByText('Đang kiểm tra yêu cầu', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Kiểm tra kết quả', exact: true }).click();
  expect(state.creates).toBe(1); expect(state.uploads).toBe(1);
});

test('guest can preview but must sign in; invalid images stay local', async ({ page }) => {
  const { state } = await model(page, { guest: true }); const dialog = await open(page);
  await page.getByLabel('Chọn ảnh cá nhân', { exact: true }).setInputFiles({ name: 'unsafe.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
  await expect(dialog.getByRole('alert')).toContainText('Chọn ảnh JPG, PNG hoặc WebP.');
  await photo(page); await expect(dialog.getByRole('link', { name: /Đăng nhập để thử/ })).toBeVisible();
  expect(state.uploads).toBe(0); expect(state.creates).toBe(0); expect(state.errors).toEqual([]);
});

test('unrelated product does not show a clothing try-on entry', async ({ page }) => {
  await model(page, { title: 'Máy xay sinh tố' }); await expect(page.getByRole('button', { name: /Thử với ảnh của bạn/ })).toHaveCount(0);
});

test('signing out in another tab clears the personal preview and private quota', async ({ page }) => {
  const { state } = await model(page); let dialog = await open(page); await photo(page);
  await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', {
    key: 'pbl6_auth_signal', newValue: JSON.stringify({ kind: 'SIGNED_OUT', nonce: crypto.randomUUID() }),
  })));
  // The application remounts its complete query scope on sign-out.
  await expect(page.getByRole('dialog', { name: 'Phòng thử đồ', exact: true })).toHaveCount(0);
  dialog = await open(page);
  await expect(dialog.getByAltText('Ảnh cá nhân đã chọn')).toHaveCount(0);
  await expect(dialog.getByRole('link', { name: /Đăng nhập để thử/ })).toBeVisible();
  await expect(dialog.getByText('Đăng nhập để xem lượt còn lại', { exact: true })).toBeVisible();
  expect(state.uploads).toBe(0); expect(state.creates).toBe(0); expect(state.errors).toEqual([]);
});

test('demo mode requires a password for each generation and never stores it', async ({ page }) => {
  const { state } = await model(page, { demo: true }); const dialog = await open(page);
  await photo(page); await dialog.getByRole('checkbox').check();
  const password = dialog.getByLabel('Mật khẩu demo', { exact: true });
  await expect(password).toHaveAttribute('type', 'password');
  const create = dialog.getByRole('button', { name: /Tạo ảnh thử đồ/ });
  await expect(create).toBeDisabled(); expect(state.uploads).toBe(0);
  await password.fill('incorrect'); await create.click();
  await expect(dialog.getByRole('alert')).toContainText('Mật khẩu demo chưa đúng.');
  await expect(password).toHaveValue(''); await expect(password).toHaveAttribute('aria-invalid', 'true');
  expect(state.creates).toBe(0);
  await password.fill(fixtureDemoPassword); await password.press('Enter');
  await expect(dialog.getByText('Đang phối đồ cho bạn', { exact: true })).toBeVisible();
  expect(state.creates).toBe(1);
  expect(state.headers.at(-1)?.['x-try-on-demo-password']).toBe(fixtureDemoPassword);
  expect(JSON.stringify(state.bodies)).not.toContain(fixtureDemoPassword);
  expect(await page.evaluate(value => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }).includes(value), fixtureDemoPassword)).toBe(false);
  state.jobs[0] = { ...state.jobs[0], status: 'SUCCEEDED', result_url: '/catalog/simple-beige-mens-shirt.webp', expires_at: new Date(Date.now() + 86400000).toISOString() };
  await dialog.getByRole('button', { name: 'Kiểm tra kết quả', exact: true }).click();
  await expect(dialog.getByLabel('Mật khẩu demo', { exact: true })).toHaveValue('');
  await expect(dialog.getByRole('button', { name: /Tạo ảnh khác/ })).toBeDisabled();
  expect(state.errors).toEqual([]);
});

for (const [width, height] of [[1366, 768], [390, 844]]) test(`demo password stays usable at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height }); await model(page, { demo: true }); const dialog = await open(page);
  const password = dialog.getByLabel('Mật khẩu demo', { exact: true }); await expect(password).toBeVisible();
  await password.focus(); await expect(password).toBeFocused();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  expect(await password.evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })).toBe(true);
  await page.screenshot({ path: info.outputPath('try-on-demo-' + width + '.png') });
});
