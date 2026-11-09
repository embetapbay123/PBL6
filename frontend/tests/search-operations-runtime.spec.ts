import {test, expect, type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {afterSaleMarket} from './runtime/after-sale-market';

test.skip(process.env.CORE_FIX_SEARCH_OPERATIONS !== '1', 'Tagged pbl6-fe-verify only, real API order creation.');
test.use({viewport: {width: 1440, height: 900}});

test('Customer Seller and Admin search hundred-order datasets by Vietnamese snapshot data without losing context or scope', async ({page, browser}, info) => {
  test.setTimeout(600000); page.setDefaultTimeout(15000);
  const a = await afterSaleMarket(), b = await afterSaleMarket(50000, 10000), markets = [a, b];
  const checks: unknown[] = [], orders: any[] = [], products: any[] = [], errors: string[] = [], contexts: any[] = [];
  let target: any, original: any;
  const title = a.tag + ' Điện thoại Đỏ %_', sku = a.tag + '-TARGET-009264';
  const record = (step: string, data: Record<string, unknown>) => {
    checks.push({step, ...data});
    writeFileSync(info.outputPath('search-operations-checkpoints.json'), JSON.stringify({tags: markets.map(m => m.tag), runtime: 'Node56/AI56/frontend59', evidence: 'REAL_UI_HTTP_DATABASE_WORKER', setup: 'Private verified M3 identities; all102orders and25public search products created through real APIs, not SQL order seeds.', checkpoints: checks}, null, 2));
  };
  page.on('pageerror', e => errors.push(e.message));
  async function login(view: Page, m: typeof a, email: string, admin = false) {
    try {
      await test.step('Login private actor; credentials withheld', async () => {
        if (!admin) return m.login(view, email);
        await view.goto('/login'); await view.getByLabel('Email', {exact: true}).fill('admin@pbl6.test');
        await view.getByLabel('Mật khẩu', {exact: true}).fill(process.env.SEED_PASSWORD!);
        await view.getByRole('button', {name: 'Đăng nhập', exact: true}).click();
        await expect(view.getByRole('heading', {name: 'Đã đăng nhập', exact: true})).toBeVisible();
      }, {box: true});
    } finally {await view.evaluate(() => document.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(e => {e.value = '';})).catch(() => {});}
  }
  async function newView() {const context = await browser.newContext({viewport: {width: 1440, height: 900}}); contexts.push(context); const view = await context.newPage(); view.setDefaultTimeout(15000); view.on('pageerror', e => errors.push(e.message)); return view;}
  async function search(view: Page, text: string) {await view.getByRole('searchbox', {name: 'Tìm đơn theo mã, món, SKU hoặc người nhận', exact: true}).fill(text); await view.getByRole('button', {name: 'Tìm đơn', exact: true}).click();}
  async function customerOrders(view: Page) {await view.getByRole('button', {name: 'Menu tài khoản', exact: true}).click(); await view.getByRole('navigation', {name: 'Menu tài khoản', exact: true}).getByRole('link', {name: 'Đơn hàng', exact: true}).click();}
  const addressA = (await a.api('/me/addresses', a.buyer.access)).items[0], addressB = (await b.api('/me/addresses', b.buyer.access)).items[0];
  async function place(m: typeof a, customer: typeof a.buyer, product: any, variant: any, method: 'COD'|'SANDBOX' = 'COD') {
    const input = {source: 'BUY_NOW', buy_now: {product_id: product.id, variant_id: variant.id, quantity: 1}, address_id: customer.user === a.buyer.user ? addressA.id : addressB.id, payment_methods: {[m.store.id]: method}};
    const quote = await a.api('/checkout/quotes', customer.access, 'POST', input), key = randomUUID(), body = JSON.stringify({...input, quote_id: quote.quote_id, expected_payable_total_vnd: quote.payable_total_vnd});
    let result: any;
    await expect.poll(async () => {
      const response = await fetch('http://127.0.0.1:18080/api/v1/orders/batches', {method: 'POST', signal: AbortSignal.timeout(15000), headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + customer.access, 'Idempotency-Key': key}, body});
      const value = await response.json();
      if (response.status === 201) {result = value; return true;}
      if (response.status !== 503 || value.code !== 'ORDER_RECOVERY_PENDING') throw Error('Unexpected confirm result ' + response.status + ' ' + value.code);
      return false;
    }, {timeout: 40000, intervals: [200, 500, 1000]}).toBe(true);
    const order = result.orders[0]; orders.push(order); return order;
  }
  async function ready(m: typeof a, order: any) {await expect.poll(async () => (await m.api('/store/orders/' + order.id, m.owner.access)).status, {timeout: 20000}).toBe(order.payment_method === 'SANDBOX' ? 'AWAITING_PAYMENT' : 'PENDING');}
  async function cancel(m: typeof a, customer: typeof a.buyer, order: any) {await ready(m, order); const fresh = await a.api('/me/orders/' + order.id, customer.access); await a.api('/me/orders/' + order.id + '/cancel', customer.access, 'POST', {expected_version: fresh.version, reason: a.tag + ' search fixture cancel'});}
  async function complete(m: typeof a, order: any) {await ready(m, order); await m.ship(order.id); await m.collect(order.id); await m.transition(order.id, 'COMPLETED');}
  try {
    record('SETUP', {stores: markets.map(m => m.store.id), users: markets.map(m => m.buyer.user), base_products: markets.map(m => m.product.id), base_variants: markets.map(m => m.variant.id)});
    target = await a.api('/store/products', a.owner.access, 'POST', {product_type_id: a.product.product_type_id, title, description: 'Thông số Điện thoại Đỏ Đà Nẵng', attributes: {}, status: 'ACTIVE', variants: [{sku, price_vnd: 100000, variant_values: {}, is_default: true}]}); products.push(target);
    await a.api('/store/inventory/adjustments', a.owner.access, 'POST', {variant_id: target.variants[0].id, delta_quantity: 20, expected_version: 0, reason: a.tag + ' target search stock', operation_id: randomUUID()});
    const balance = (await a.api('/store/inventory?variant_id=' + a.variant.id, a.owner.access)).items[0];
    await a.api('/store/inventory/adjustments', a.owner.access, 'POST', {variant_id: a.variant.id, delta_quantity: 990, expected_version: balance.version, reason: a.tag + ' hundred order stock', operation_id: randomUUID()});
    for (let n = 0; n < 24; n++) products.push(await a.api('/store/products', a.owner.access, 'POST', {product_type_id: a.product.product_type_id, title: a.tag + ' Điện thoại Đỏ mẫu ' + String(n).padStart(2, '0'), attributes: {}, status: 'ACTIVE', variants: [{sku: a.tag + '-SEARCH-' + n, price_vnd: 100100 + n, variant_values: {}, is_default: true}]}));
    original = await place(a, a.buyer, target, target.variants[0]); await complete(a, original);
    for (let n = 0; n < 98; n++) {
      const order = await place(a, a.buyer, a.product, a.variant, n === 97 ? 'SANDBOX' : 'COD');
      if (n < 89) await cancel(a, a.buyer, order);
      else if (n >= 93 && n < 97) await complete(a, order);
      else await ready(a, order);
      if (n % 10 === 9) record('CREATED_' + (n + 1), {order_ids: orders.map(o => o.id), count: orders.length});
    }
    const foreign = await place(a, b.buyer, target, target.variants[0]); await ready(a, foreign);
    const otherStore = await place(b, a.buyer, b.product, b.variant); await ready(b, otherStore);
    const otherCustomer = await place(b, b.buyer, b.product, b.variant); await cancel(b, b.buyer, otherCustomer);
    expect(orders).toHaveLength(102);
    const own = await a.api('/me/orders?size=100', a.buyer.access), store = await a.api('/store/orders?size=100', a.owner.access);
    expect(own.total).toBe(100); expect(store.total).toBe(100);
    record('HUNDRED_ACTUAL_ORDERS', {orders: orders.map(o => o.id), original: original.id, foreign: foreign.id, other_store_order: otherStore.id, customer_order_count: own.total, store_order_count: store.total, products: products.map(p => p.id), target_variant: target.variants[0].id, title, sku});
    const catalogProof = [];
    for (const query of [a.tag + ' dien thoai do', (a.tag + ' ĐIỆN THOẠI ĐỎ').normalize('NFD')]) {
      const ids: string[] = [];
      for (const number of [1, 2]) {const result = await a.api('/products?q=' + encodeURIComponent(query) + '&page=' + number + '&size=20&sort=price_desc'); expect(result.total).toBe(25); ids.push(...result.items.map((p: any) => p.id));}
      expect(new Set(ids).size).toBe(25); catalogProof.push({query, ids});
    }
    expect((await a.api('/products?q=' + encodeURIComponent(a.tag + ' dien thoai do %_'))).total).toBe(1);
    expect((await a.api('/products?q=' + encodeURIComponent(a.tag + " ' OR 1=1 --"))).total).toBe(0);
    await login(page, a, a.buyer.email);
    await page.getByRole('banner').getByRole('searchbox', {name: 'Tìm kiếm toàn sàn', exact: true}).fill(a.tag + ' dien thoai do');
    await page.getByRole('banner').getByRole('button', {name: 'Tìm toàn sàn', exact: true}).click();
    await page.getByRole('combobox', {name: 'Sắp xếp', exact: true}).selectOption('price_desc');
    await page.getByRole('button', {name: 'Trang sau', exact: true}).click(); await expect(page.locator('.boot-pagination')).toContainText('Trang 2'); await expect(page.getByText('25 sản phẩm', {exact: true})).toBeVisible();
    const returnUrl = page.url(); await page.locator('.product-card').filter({has: page.getByRole('heading', {name: title, exact: true})}).locator('.market-product-link').click();
    await page.goBack(); await expect(page).toHaveURL(returnUrl); await expect(page.locator('.boot-pagination')).toContainText('Trang 2'); await expect(page.getByText('25 sản phẩm', {exact: true})).toBeVisible(); await page.reload(); await expect(page).toHaveURL(returnUrl); await expect(page.locator('.boot-pagination')).toContainText('Trang 2'); await expect(page.getByText('25 sản phẩm', {exact: true})).toBeVisible(); await expect(page.getByRole('combobox', {name: 'Sắp xếp', exact: true})).toHaveValue('price_desc');
    record('VIETNAMESE_PUBLIC_SEARCH', {catalog: catalogProof, literal_metacharacter_total: 1, empty_query_total: 0, back_reload_url: returnUrl});
    // The current catalog changes after purchase; every search must continue using the ordered snapshot.
    let current = await a.api('/store/products/' + target.id, a.owner.access);
    await a.api('/store/products/' + target.id, a.owner.access, 'PATCH', {expected_version: current.version, title: a.tag + ' Tên catalog đã đổi'});
    await customerOrders(page); await expect(page.locator('.boot-pagination')).toContainText('100 kết quả');
    for (let n = 2; n <= 5; n++) {await page.getByRole('button', {name: 'Trang sau', exact: true}).click(); await expect(page.locator('.boot-pagination')).toContainText('Trang ' + n + ' · 100 kết quả');}
    await expect(page.getByText(title, {exact: true})).toBeVisible();
    await search(page, 'dien thoai do'); await page.getByRole('combobox', {name: 'Trạng thái đơn', exact: true}).selectOption('COMPLETED');
    await page.getByRole('combobox', {name: 'Tình trạng tiền', exact: true}).selectOption('SUCCEEDED');
    await expect(page.locator('.boot-pagination')).toHaveCount(0); await expect(page.getByText(title, {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Xem chi tiết', exact: true}).click(); await expect(page).toHaveURL(new RegExp('/customer/orders/' + original.id + '$'));
    await page.getByRole('link', {name: 'Về đơn hàng', exact: true}).click(); await expect(page.getByRole('searchbox', {name: 'Tìm đơn theo mã, món, SKU hoặc người nhận', exact: true})).toHaveValue('dien thoai do');
    const customerUrl = page.url(); await page.reload(); await expect(page).toHaveURL(customerUrl); await expect(page.getByText(title, {exact: true})).toBeVisible(); await expect(page.getByRole('combobox', {name: 'Trạng thái đơn', exact: true})).toHaveValue('COMPLETED'); await expect(page.getByRole('combobox', {name: 'Tình trạng tiền', exact: true})).toHaveValue('SUCCEEDED');
    await page.screenshot({path: info.outputPath('customer-hundred-orders-desktop.png'), fullPage: true});
    const seller = await newView(); await login(seller, a, a.owner.email);
    await seller.getByRole('button', {name: 'Menu tài khoản', exact: true}).click(); await seller.getByRole('navigation', {name: 'Menu tài khoản', exact: true}).getByRole('link', {name: 'Store Portal', exact: true}).click();
    await seller.getByRole('complementary').getByRole('link', {name: 'Đơn hàng Store', exact: true}).click(); await expect(seller.locator('.boot-pagination')).toContainText('100 kết quả');
    await search(seller, 'dien thoai do'); await expect(seller.locator('tbody tr')).toHaveCount(2);
    await seller.getByRole('button', {name: 'Hoàn tất', exact: true}).click(); await expect(seller.locator('tbody tr')).toHaveCount(1);
    await seller.locator('tbody').getByRole('button', {name: 'Xem đơn', exact: true}).click(); await expect(seller.getByRole('dialog')).toContainText(sku); await expect(seller.getByRole('dialog')).toContainText(a.address.recipient_name);
    await seller.keyboard.press('Escape'); await expect(seller.getByRole('searchbox', {name: 'Tìm đơn theo mã, món, SKU hoặc người nhận', exact: true})).toHaveValue('dien thoai do');
    await seller.screenshot({path: info.outputPath('seller-hundred-orders-desktop.png'), fullPage: true});
    const admin = await newView(); await login(admin, a, '', true);
    await admin.getByRole('button', {name: 'Menu tài khoản', exact: true}).click(); await admin.getByRole('navigation', {name: 'Menu tài khoản', exact: true}).getByRole('link', {name: 'Admin Portal', exact: true}).click();
    await admin.getByRole('complementary', {name: 'Menu quản trị', exact: true}).getByRole('link', {name: 'Đơn hàng toàn sàn', exact: true}).click();
    await search(admin, a.store.id); await expect(admin.locator('.boot-pagination')).toContainText('100 kết quả');
    await search(admin, sku); await expect(admin.locator('tbody tr')).toHaveCount(2); await admin.getByRole('combobox', {name: 'Trạng thái đơn', exact: true}).selectOption('COMPLETED');
    await admin.getByRole('button', {name: 'Chi tiết đơn ' + original.id, exact: true}).click(); await expect(admin.getByRole('dialog')).toContainText(title); await expect(admin.getByRole('dialog')).toContainText(a.address.recipient_name); await admin.keyboard.press('Escape');
    const queryProof = [];
    for (const q of ['dien thoai do', 'ĐIỆN THOẠI ĐỎ'.normalize('NFD'), sku, '0900000000', original.id, original.purchase_group_id]) {
      const query = '?q=' + encodeURIComponent(q) + '&status=COMPLETED&payment_status=SUCCEEDED&size=100';
      const customer = await a.api('/me/orders' + query, a.buyer.access), merchant = await a.api('/store/orders' + query, a.owner.access), platform = await a.api('/admin/orders' + query + '&store_id=' + a.store.id, a.admin);
      for (const result of [customer, merchant, platform]) expect(result.items.some((o: any) => o.id === original.id)).toBe(true);
      queryProof.push({q, totals: [customer.total, merchant.total, platform.total], target: original.id});
    }
    expect((await b.api('/me/orders?q=' + original.id, b.buyer.access)).total).toBe(0);
    expect((await b.api('/store/orders?q=' + original.id, b.owner.access)).total).toBe(0);
    expect((await b.raw('/store/orders/' + original.id, b.owner.access)).status).toBe(404);
    expect((await a.raw('/me/orders?store_id=' + b.store.id, a.buyer.access)).status).toBe(422);
    await admin.screenshot({path: info.outputPath('admin-hundred-orders-desktop.png'), fullPage: true});
    expect(errors).toEqual([]); record('THREE_ROLE_SNAPSHOT_SEARCH', {original: original.id, customer_return_url: customerUrl, customer_count: 100, store_count: 100, filtered_queries: queryProof, foreign_customer_total: 0, foreign_store_total: 0, foreign_detail_status: 404, customer_scope_injection: 422, page_errors: errors});
  } finally {
    for (const context of contexts) await context.close();
    for (const m of markets) {
      for (const customer of [a.buyer, b.buyer]) {
        for (const order of (await a.api('/me/orders?size=100', customer.access)).items.filter((o: any) => o.store_id === m.store.id)) {
          await expect.poll(async () => ['PREPARING', 'RECOVERING'].includes((await a.api('/me/orders/' + order.id, customer.access)).status), {timeout: 30000}).toBe(false);
          const fresh = await a.api('/me/orders/' + order.id, customer.access);
          if (['AWAITING_PAYMENT', 'PENDING', 'CONFIRMED'].includes(fresh.status)) await a.api('/me/orders/' + order.id + '/cancel', customer.access, 'POST', {expected_version: fresh.version, reason: a.tag + ' withdraw search fixture'});
        }
      }
    }
    for (const p of products) {const fresh = await a.api('/store/products/' + p.id, a.owner.access); await a.api('/store/products/' + p.id, a.owner.access, 'PATCH', {expected_version: fresh.version, status: 'STOPPED'});}
    for (const m of markets) {await m.cleanup(); const store = await m.api('/store', m.owner.access); await m.api('/admin/stores/' + store.id, m.admin, 'PATCH', {expected_version: store.version, status: 'LOCKED', reason: m.tag + ' withdraw search fixture'});}
    record('CLEANUP', {stores: markets.map(m => m.store.id), products: [...markets.map(m => m.product.id), ...products.map(p => p.id)], orders: orders.map(o => o.id), original: original?.id, target_variant: target?.variants[0].id, withdrawn: true, transactions_retained: true});
  }
});
