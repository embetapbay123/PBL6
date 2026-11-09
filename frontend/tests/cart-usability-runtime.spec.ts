import {test, expect, type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {afterSaleMarket} from './runtime/after-sale-market';

test.skip(process.env.CORE_FIX_CART_USABILITY !== '1', 'Private tagged pbl6-fe-verify only.');
test.use({viewport: {width: 1440, height: 900}});

test('UX02: two-Store cart keyboard correction and a concurrent tab change are reflected in the real order', async ({page, browser}, info) => {
  test.setTimeout(240000);
  page.setDefaultTimeout(12000);
  const a = await afterSaleMarket(), b = await afterSaleMarket(50000, 10000), markets = [a, b];
  const checks: unknown[] = [], errors: string[] = [];
  const context = await browser.newContext({viewport: {width: 1440, height: 900}}), other = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  other.on('pageerror', error => errors.push(error.message));
  const record = (step: string, data: Record<string, unknown>) => {
    checks.push({step, ...data});
    writeFileSync(info.outputPath('cart-usability-checkpoints.json'), JSON.stringify({tags: markets.map(m => m.tag), runtime: 'Node54b/AI54b/frontend55', evidence: 'REAL_UI_HTTP_DATABASE_WORKER', identity_setup: 'Private verified tagged M3 seed, not signup acceptance.', checkpoints: checks}, null, 2));
  };
  async function login(view: Page) {
    try {await test.step('Login private Customer; credentials withheld', () => a.login(view, a.buyer.email), {box: true});}
    finally {await view.evaluate(() => document.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(input => {input.value = '';})).catch(() => {});}
  }
  const row = (view: Page, label: string) => view.getByRole('group', {name: 'Dòng giỏ: ' + a.product.title + ' · ' + label, exact: true});
  try {
    for (const [code, name, values] of [['color', 'Màu', ['Đỏ', 'Xanh']], ['size', 'Cỡ', ['M', 'L']]] as const) {
      await a.api('/admin/attribute-definitions', a.admin, 'POST', {product_type_id: a.product.product_type_id, code, name, data_type: 'STRING', required: true, variant_axis: true, allowed_values: values});
    }
    const product = await a.api('/store/products/' + a.product.id, a.owner.access);
    const updated = await a.api('/store/products/' + a.product.id, a.owner.access, 'PATCH', {expected_version: product.version, attributes: {color: 'Đỏ', size: 'M'}, variants: [
      {id: a.variant.id, sku: a.tag + '-OPAQUE-009264', price_vnd: 100000, variant_values: {color: 'Đỏ', size: 'M'}, is_default: true, status: 'ACTIVE'},
      {sku: a.tag + '-OPAQUE-009265', price_vnd: 150000, variant_values: {color: 'Xanh', size: 'L'}, is_default: false, status: 'ACTIVE'},
    ]});
    const blue = updated.variants.find((variant: any) => variant.variant_values.color === 'Xanh');
    await a.api('/store/inventory/adjustments', a.owner.access, 'POST', {variant_id: blue.id, delta_quantity: 10, expected_version: 0, reason: a.tag + ' cart identifiable stock', operation_id: randomUUID()});
    const add = (product_id: string, variant_id: string, quantity: number) => a.api('/cart/items', a.buyer.access, 'POST', {product_id, variant_id, quantity});
    const redItem = await add(a.product.id, a.variant.id, 3), blueItem = await add(a.product.id, blue.id, 1), otherItem = await add(b.product.id, b.variant.id, 2);
    record('SETUP', {stores: markets.map(m => m.store.id), products: markets.map(m => m.product.id), users: markets.map(m => m.buyer.user), variants: [a.variant.id, blue.id, b.variant.id], items: [redItem, blueItem, otherItem]});
    await login(page);
    await page.getByRole('banner').getByRole('link', {name: 'Giỏ hàng', exact: true}).click();
    await login(other);
    await other.getByRole('banner').getByRole('link', {name: 'Giỏ hàng', exact: true}).click();
    await expect(other.locator('.cart-store-group')).toHaveCount(2);
    const summary = page.locator('.purchase-summary');
    await expect(summary).toContainText('Tạm tính 550.000 ₫');
    const bRow = page.getByRole('group', {name: 'Dòng giỏ: ' + b.product.title + ' · Phân loại tiêu chuẩn', exact: true});
    await bRow.getByRole('checkbox').focus(); await page.keyboard.press('Space');
    await expect(summary).toContainText('Tạm tính 450.000 ₫');
    const minus = row(page, 'Đỏ / M').getByRole('button', {name: 'Giảm số lượng', exact: true});
    await expect(minus).toHaveAccessibleDescription(/Đỏ \/ M/);
    await minus.focus(); await page.keyboard.press('Enter');
    await expect(summary).toContainText('Tạm tính 350.000 ₫');
    record('KEYBOARD_BUDGET', {selected_goods_vnd: 350000, red_quantity: 2, blue_quantity: 1, other_store_unselected: true});
    await expect(bRow.getByLabel('Đổi phân loại', {exact: true})).toHaveCount(0);
    const changeBtn = row(page, 'Đỏ / M').getByRole('button', {name: 'Đổi phân loại', exact: true});
    if (await changeBtn.isVisible()) await changeBtn.click();
    await row(page, 'Đỏ / M').getByLabel('Đổi phân loại', {exact: true}).selectOption(blue.id);
    await row(page, 'Đỏ / M').getByRole('button', {name: 'Đổi', exact: true}).focus();
    await page.keyboard.press('Enter');
    await expect(row(page, 'Xanh / L')).toContainText('Thành tiền dự tính: 450.000 ₫');
    await expect(bRow.getByRole('checkbox')).not.toBeChecked();
    await expect(row(page, 'Đỏ / M')).toHaveCount(0);
    expect(await page.locator('.cart-store-group input:focus').count()).toBe(1);
    const focusGeometry = await page.locator('.cart-store-group input:focus').evaluate(input => {
      const rect = input.getBoundingClientRect(), hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return {visible_in_viewport: rect.top >= 0 && rect.bottom <= innerHeight, hit_is_input: hit === input};
    });
    expect(focusGeometry).toEqual({visible_in_viewport: true, hit_is_input: true});
    await expect(summary).toContainText('Tạm tính 450.000 ₫');
    record('CHOICE_CORRECTED', {remaining_cart: (await a.api('/cart/items?size=100', a.buyer.access)).items, selected_blue_quantity: 3, other_store_unselected: true, focus_on_remaining_choice: true, focus_geometry: focusGeometry});
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({path: info.outputPath('cart-keyboard-correction-desktop.png'), fullPage: true});
    await page.getByRole('button', {name: 'Thanh toán', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Đặt hàng', exact: true})).toBeEnabled();
    await expect(page.locator('.purchase-summary')).toContainText('470.000');
    // A second independent web session changes the same selected line after the quote.
    const [changed] = await Promise.all([other.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.endsWith('/' + blueItem.id)), row(other, 'Xanh / L').getByRole('button', {name: 'Tăng số lượng', exact: true}).click()]);
    expect(changed.status()).toBe(200); // Its original quantity1 becomes2, not the first tab's3.
    const [conflict] = await Promise.all([page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/orders/batches'), page.getByRole('button', {name: 'Đặt hàng', exact: true}).click()]);
    expect(conflict.status()).toBe(409);
    await expect(page.locator('main')).toContainText('Số lượng: 2');
    await expect(page.locator('.purchase-summary')).toContainText('320.000');
    expect((await a.api('/me/orders?size=100', a.buyer.access)).total).toBe(0);
    record('OTHER_TAB_REQUOTE', {response_status: conflict.status(), response_code: (await conflict.json()).code, current_blue_quantity: 2, old_payable_vnd: 470000, new_payable_vnd: 320000, no_order_before_reconfirmation: true});
    const [confirmed] = await Promise.all([page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/orders/batches'), page.getByRole('button', {name: 'Đặt hàng', exact: true}).click()]);
    expect(confirmed.status()).toBe(201);
    await expect(page.getByRole('heading', {name: 'Đã tạo nhóm đơn hàng', exact: true})).toBeVisible();
    const result = await confirmed.json();
    expect(result.orders).toHaveLength(1);
    const order = result.orders[0];
    expect(order.store_id).toBe(a.store.id); expect(order.amounts.payable_vnd).toBe(320000);
    expect(order.items).toEqual([expect.objectContaining({variant_id: blue.id, quantity: 2, unit_price_vnd: 150000, product_snapshot: expect.objectContaining({variant_values: {color: 'Xanh', size: 'L'}})})]);
    await expect.poll(async () => (await a.own(order.id)).status, {timeout: 20000}).toBe('PENDING');
    const remaining = (await a.api('/cart/items?size=100', a.buyer.access)).items;
    expect(remaining).toEqual([expect.objectContaining({id: otherItem.id, quantity: 2})]);
    expect((await b.api('/cart/items?size=100', b.buyer.access)).total).toBe(0);
    record('CONFIRMED_EXACT_SELECTION', {purchase_group_id: result.purchase_group_id, order: await a.own(order.id), remaining_cart: remaining, other_customer_cart_empty: true});
    // The other tab still has the old red/blue selection. Readback must stop it, not buy again.
    await other.getByRole('button', {name: 'Thanh toán', exact: true}).click();
    await expect(other.getByRole('alert')).toContainText('không còn trong giỏ hàng');
    await expect(other.getByRole('button', {name: 'Đặt hàng', exact: true})).toHaveCount(0);
    await other.getByRole('link', {name: /Quay lại giỏ hàng/}).click();
    await expect(other.locator('.cart-store-group')).toHaveCount(1);
    await expect(other.locator('.purchase-summary')).toContainText('Tạm tính 100.000 ₫');
    expect((await a.api('/me/orders?size=100', a.buyer.access)).total).toBe(1);
    expect(errors).toEqual([]);
    record('STALE_TAB_RECOVERY', {one_order_only: true, remaining_store: b.store.id, page_errors: errors});
  } finally {
    for (const view of [page, other]) await view.evaluate(() => document.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(input => {input.value = '';})).catch(() => {});
    await context.close();
    for (const item of (await a.api('/cart/items?size=100', a.buyer.access)).items) {
      if (markets.some(m => m.product.id === item.product_id)) await a.api('/cart/items/' + item.id, a.buyer.access, 'DELETE');
    }
    for (const m of markets) {
      await m.cleanup();
      const store = await m.api('/store', m.owner.access);
      await m.api('/admin/stores/' + store.id, m.admin, 'PATCH', {expected_version: store.version, status: 'LOCKED', reason: m.tag + ' withdraw private cart fixture'});
    }
    record('CLEANUP', {stores: markets.map(m => m.store.id), products: markets.map(m => m.product.id), withdrawn: true, transactions_retained: true});
  }
});
