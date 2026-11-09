import {test, expect, type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures = JSON.parse(readFileSync(new URL('../src/api/fixtures.generated.json', import.meta.url), 'utf8'));
const id = (n: number) => '68000000-0000-4000-8000-' + String(n).padStart(12, '0');
async function model(page: Page, lostAck = false) {
  const row = {variant_id: id(1), product_id: id(2), product_title: 'Áo thứ 300', sku: 'OPAQUE-299-11', variant_values: {color: 'Đen', size: 'XL'}, quantity: 10, reserved_quantity: 3, available_quantity: 7, version: 0};
  const state = {row, movements: [] as any[], posts: [] as any[], catalogReads: 0, movementReads: 0, movementUrls: [] as string[], applied: false};
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '');
    if (path === '/auth/login' || path === '/auth/refresh') return route.fulfill({json: {...fixtures.login.response, access_token: 'inventory-fixture', context: {user_id: id(3), roles: ['CUSTOMER','SELLER'], role_permissions: [], token_version: 0, store_membership: {store_id: id(4), role: 'SELLER', status: 'ACTIVE', permissions: ['inventory.store.read_adjust']}}}, headers: {'set-cookie': 'pbl6_csrf=fixture; Path=/; SameSite=Strict'}});
    if (path === '/store/products') {state.catalogReads++; return route.fulfill({status: 403, json: {code: 'FORBIDDEN', message: 'No product permission'}});}
    if (path === '/store/inventory') return route.fulfill({json: {items: [row], page: 1, size: 20, total: 1}});
    if (path === '/store/inventory/movements') {state.movementReads++; state.movementUrls.push(request.url()); const page = Number(new URL(request.url()).searchParams.get('page') ?? 1); return route.fulfill({json: {items: state.movements.slice((page - 1) * 10, page * 10), page, size: 10, total: state.movements.length}});}
    if (path === '/store/inventory/adjustments') {
      const body = request.postDataJSON(); state.posts.push(body);
      if (!state.applied) {
        state.applied = true; const before = row.quantity; row.quantity += body.delta_quantity; row.available_quantity = row.quantity - row.reserved_quantity; row.version++;
        state.movements.unshift({...row, id: id(5), operation_id: body.operation_id, actor_user_id: id(3), delta_quantity: body.delta_quantity, delta_reserved: 0, reason: body.reason, quantity_before: before, quantity_after: row.quantity, reserved_before: 3, reserved_after: 3, inventory_version: row.version, occurred_at: new Date().toISOString()});
        if (lostAck) return route.fulfill({status: 503, json: {code: 'UNKNOWN', message: 'Chưa xác định kết quả'}});
      }
      return route.fulfill({status: 201, json: row});
    }
    return route.fulfill({status: 404, json: {code: 'NOT_FOUND', message: 'Fixture not configured'}});
  });
  await page.goto('/login'); await page.getByLabel('Email', {exact: true}).fill('employee@example.test'); await page.getByLabel('Mật khẩu', {exact: true}).fill('Fixture-password-123'); await page.getByRole('button', {name: 'Đăng nhập', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Đã đăng nhập', exact: true})).toBeVisible();
  await page.goto('/seller/inventory'); await expect(page.getByRole('button', {name: 'Điều chỉnh', exact: true})).toBeEnabled();
  return state;
}
test('inventory-only employee identifies the item, previews a reduction and immediately sees its history', async ({page}, info) => {
  const s = await model(page); await expect(page.locator('main')).toContainText('Áo thứ 300 · Đen / XL · SKU: OPAQUE-299-11'); expect(s.catalogReads).toBe(0);
  const inventoryUrl = page.url();
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button', {name: 'Điều chỉnh', exact: true}).click(); const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Loại điều chỉnh').selectOption('REMOVE'); await dialog.getByLabel('Số lượng', {exact: true}).fill('8'); await expect(dialog.getByRole('button', {name: 'Lưu điều chỉnh', exact: true})).toBeDisabled();
  await expect(dialog.getByLabel('Số lượng', {exact: true})).toHaveAccessibleDescription(/thấp hơn 3 đang giữ/);
  await dialog.getByLabel('Số lượng', {exact: true}).fill('2'); await dialog.getByLabel('Lý do', {exact: true}).fill('Hàng hỏng đã kiểm tra'); await expect(dialog).toContainText('Có thể bán 7 → 5 · Đang giữ 3');
  await dialog.screenshot({path:info.outputPath('adjustment-mobile.png')});
  const reads = s.movementReads; await dialog.getByRole('button', {name: 'Lưu điều chỉnh', exact: true}).click(); await expect(dialog).toHaveCount(0); await expect(page.locator('main')).toContainText('Hàng hỏng đã kiểm tra'); await expect.poll(() => s.movementReads).toBeGreaterThan(reads); expect(s.posts).toHaveLength(1); expect(s.posts[0]).toMatchObject({delta_quantity: -2, expected_version: 0});
  await expect(page).toHaveURL(inventoryUrl);
});
test('unknown adjustment outcome freezes input and retries the exact same operation without double stock', async ({page}) => {
  const s = await model(page, true); await page.getByRole('button', {name: 'Điều chỉnh', exact: true}).click(); const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Số lượng', {exact: true}).fill('4'); await dialog.getByLabel('Lý do', {exact: true}).fill('Nhập bổ sung'); await dialog.getByRole('button', {name: 'Lưu điều chỉnh', exact: true}).click();
  await expect(dialog.getByLabel('Loại điều chỉnh')).toBeDisabled(); await expect(dialog.getByLabel('Số lượng', {exact: true})).toBeDisabled(); await expect(dialog.getByRole('button', {name: 'Đóng', exact: true})).toBeDisabled();
  await dialog.getByRole('button', {name: 'Thử lại điều chỉnh', exact: true}).click(); await expect(dialog).toHaveCount(0); expect(s.posts).toHaveLength(2); expect(s.posts[0]).toEqual(s.posts[1]); expect(s.row.quantity).toBe(14);
});

test('adjusting from an older history page returns to the newest movement and preserves the inventory filter', async ({page}) => {
  const s = await model(page);
  for (let n = 0; n < 11; n++) s.movements.push({...s.row, id: id(100 + n), reason: 'Bút toán cũ ' + n, delta_quantity: 0, delta_reserved: 0, occurred_at: '2026-10-30T00:00:00Z'});
  await page.goto('/seller/inventory?variant_id=' + id(1) + '&history_page=2');
  await expect(page.locator('#stock-history')).toContainText('Bút toán cũ 10');
  await expect(page.locator('#stock-history')).not.toContainText('Bút toán cũ 0');
  await page.getByRole('button', {name: 'Điều chỉnh', exact: true}).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Lý do', {exact: true}).fill('Nhập mới từ trang lịch sử cũ');
  await dialog.getByRole('button', {name: 'Lưu điều chỉnh', exact: true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp('variant_id=' + id(1) + '&history_page=1'));
  await expect(page.locator('#stock-history')).toContainText('Nhập mới từ trang lịch sử cũ');
  expect(s.posts).toHaveLength(1);
});

test('history date filter sends a bounded Vietnam period and can be cleared',async({page})=>{
 const s=await model(page);const history=page.getByRole('link',{name:'Xem biến động',exact:true});await expect(history).toHaveCount(0);await page.getByRole('button',{name:/^Thêm thao tác cho /}).press('Enter');await expect(history).toBeVisible();await history.click();const form=page.locator('.stock-period-filter');await form.getByLabel('Từ ngày',{exact:true}).fill('2026-11-01');await form.getByLabel('Đến hết ngày',{exact:true}).fill('2026-11-02');await form.getByRole('button',{name:'Lọc lịch sử',exact:true}).click();await expect.poll(()=>s.movementUrls.some(value=>new URL(value).searchParams.get('from')==='2026-10-31T17:00:00.000Z'&&new URL(value).searchParams.get('to')==='2026-11-02T17:00:00.000Z')).toBe(true);await form.getByRole('button',{name:'Bỏ lọc ngày'}).click();await expect(page).not.toHaveURL(/stock_from=/);
});
