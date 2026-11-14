import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const testerRoot = resolve(__dirname, '..');
const serverConfig = JSON.parse(readFileSync(resolve(testerRoot, 'config', 'server.config.json'), 'utf8'));
const web = serverConfig.web || {};
const stepDelay = Number(process.env.PBL6_STEP_DELAY ?? web.stepDelayMs ?? 700);
const outDir = process.env.PBL6_REPORT_DIR || resolve(testerRoot, 'reports', 'web');
mkdirSync(resolve(outDir, 'screenshots'), { recursive: true });

function readEnvPassword() {
  if (process.env.SEED_PASSWORD) return process.env.SEED_PASSWORD;
  try {
    const env = readFileSync(resolve(testerRoot, '..', 'infrastructure', '.env'), 'utf8');
    return env.match(/^SEED_PASSWORD=(.+)$/m)?.[1].trim();
  } catch {
    return undefined;
  }
}

const customer = serverConfig.accounts.customer;
const password = readEnvPassword();

/** Đi chậm có chủ đích để người xem theo dõi từng bước. */
async function pause(page: Page, ms = stepDelay) {
  await page.waitForTimeout(ms);
}

async function snap(page: Page, name: string) {
  try {
    await page.screenshot({ path: resolve(outDir, 'screenshots', `${name}.png`), fullPage: false });
  } catch {
    /* ảnh chỉ là phụ */
  }
}

test.describe.configure({ mode: 'serial' });

test('UI-HOME-01 · Trang chủ tải được danh sách sản phẩm', async ({ page }, testInfo) => {
  await test.step('Mở trang chủ', async () => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await pause(page, 1500);
    await expect(page).toHaveTitle(/PBL6/i);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await snap(page, '01-home');
  });

  await test.step('Kiểm tra có thẻ sản phẩm', async () => {
    const cards = page.locator('a[href*="/products/"]');
    await expect(cards.first()).toBeVisible({ timeout: 20000 });
    expect(await cards.count()).toBeGreaterThan(0);
    await snap(page, '02-home-products');
  });
});

test('UI-SEARCH-01 · Tìm kiếm sản phẩm theo từ khoá', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await pause(page, 1200);
  const search = page.locator('input[type="search"]').first();
  await expect(search).toBeVisible();
  await search.click();
  await search.fill('áo');
  await pause(page, 500);
  await snap(page, '03-search-typed');
  await search.press('Enter');
  await page.waitForLoadState('networkidle').catch(() => {});
  await pause(page, 1800);
  await expect(page).toHaveURL(/[?&]q=/);
  await expect(page.locator('body')).toContainText(/Kết quả|sản phẩm/i);
  await snap(page, '04-search-results');
});

test('UI-PRODUCT-01 · Mở chi tiết sản phẩm từ trang chủ', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await pause(page, 1500);
  const card = page.locator('a[href*="/products/"]').first();
  await expect(card).toBeVisible({ timeout: 20000 });
  const title = (await card.locator('h3').first().innerText().catch(() => '')).trim();
  await card.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await pause(page, 1800);
  await expect(page).toHaveURL(/\/products\//);
  if (title) await expect(page.locator('#main-content')).toContainText(title.slice(0, 24));
  await expect(page.locator('#main-content')).toContainText(/₫|Đang bán|Phân loại|Thêm vào giỏ/i, { timeout: 20000 });
  await snap(page, '05-product-detail');
});

test('UI-LOGIN-01 · Bỏ trống biểu mẫu đăng nhập bị chặn', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await pause(page, 1200);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).first().click();
  await pause(page, 1200);
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('#main-content')).toContainText(/Vui lòng|bắt buộc|không hợp lệ|Nhập/i);
  await snap(page, '06-login-empty');
});

test('UI-LOGIN-02 · Sai mật khẩu hiển thị lỗi, không đăng nhập', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await pause(page, 1200);
  await page.getByLabel('Email', { exact: true }).fill(customer.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('sai-mat-khau-123');
  await pause(page, 400);
  await snap(page, '07-login-wrong-filled');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).first().click();
  await page.waitForTimeout(2500);
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('#main-content')).toContainText(/không hợp lệ|sai|thất bại|Origin/i, { timeout: 15000 });
  await snap(page, '08-login-wrong-error');
});

test('UI-LOGIN-03 · Đăng nhập đúng và mở được menu tài khoản', async ({ page }, testInfo) => {
  test.skip(!password, 'Thiếu SEED_PASSWORD trong infrastructure/.env để đăng nhập');
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await pause(page, 1200);
  await page.getByLabel('Email', { exact: true }).fill(customer.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password!);
  await pause(page, 400);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).first().click();
  await page.waitForTimeout(3500);
  await expect(page.getByRole('button', { name: /tài khoản/i }).first()).toBeVisible({ timeout: 20000 });
  await expect(page.locator('body')).toContainText(/Đã đăng nhập/i);
  await snap(page, '09-login-success');
  await testInfo.attach('trang-thai-dang-nhap', {
    body: `Đăng nhập thành công với ${customer.email}`,
    contentType: 'text/plain',
  });
  await page.getByRole('button', { name: /tài khoản/i }).first().click();
  await pause(page, 900);
  await expect(page.getByRole('link').first()).toBeVisible();
  await snap(page, '10-account-menu');
});

test('UI-MOBILE-01 · Giao diện 390px có điều hướng và tìm kiếm dùng được', async ({ page }) => {
  await page.setViewportSize(serverConfig.web?.mobileViewport || { width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await pause(page, 1800);
  await expect(page.getByRole('navigation', { name: /điện thoại/i })).toBeVisible({ timeout: 15000 });
  const search = page.getByRole('searchbox').first();
  await expect(search).toBeVisible();
  await search.fill('áo');
  await search.press('Enter');
  await page.waitForLoadState('networkidle').catch(() => {});
  await pause(page, 1200);
  await expect(page).toHaveURL(/[?&]q=/);
  await snap(page, '11-mobile-search');
});
