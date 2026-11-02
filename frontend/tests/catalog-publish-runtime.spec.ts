import {test, expect, type Page} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {afterSaleMarket} from './runtime/after-sale-market';

test.skip(process.env.CORE_FIX_CATALOG_PUBLISH !== '1', 'Private pbl6-fe-verify tagged catalog only.');
test.use({viewport: {width: 1440, height: 900}});

test('Owner publishes twelve UI-created variants among300products and Customer purchases the intended variant with another Store', async ({page, browser}, info) => {
  test.setTimeout(360000); page.setDefaultTimeout(15000);
  const a = await afterSaleMarket(), b = await afterSaleMarket(50000, 10000), markets = [a, b];
  const sellerContext = await browser.newContext({viewport: {width: 1440, height: 900}}), seller = await sellerContext.newPage();
  seller.setDefaultTimeout(15000);
  const checks: unknown[] = [], errors: string[] = [], orders: any[] = [];
  let category: any, type: any, product: any, target: any, seeded = false;
  const title = 'zzz ' + a.tag + ' Áo ba màu bốn cỡ';
  const record = (step: string, data: Record<string, unknown>) => {
    checks.push({step, ...data});
    writeFileSync(info.outputPath('catalog-publish-checkpoints.json'), JSON.stringify({tags: markets.map(m => m.tag), runtime: 'Node56/AI56/frontend58', evidence: 'REAL_UI_HTTP_DATABASE_WORKER', setup: 'Private verified identities;298DRAFT product readers explicitly seeded, not creation acceptance.', checkpoints: checks}, null, 2));
  };
  for (const view of [page, seller]) view.on('pageerror', error => errors.push(error.message));
  async function login(view: Page, m: typeof a, email: string) {
    try {await test.step('Login private actor; credentials withheld', () => m.login(view, email), {box: true});}
    finally {await view.evaluate(() => document.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(e => {e.value = '';})).catch(() => {});}
  }
  async function portal(view: Page) {
    await view.getByRole('button', {name: 'Menu tài khoản', exact: true}).click();
    await view.getByRole('navigation', {name: 'Menu tài khoản', exact: true}).getByRole('link', {name: 'Store Portal', exact: true}).click();
    await view.getByRole('complementary').getByRole('link', {name: 'Sản phẩm Store', exact: true}).click();
  }
  async function catalog(view: Page, query: string) {
    await view.getByRole('banner').getByRole('searchbox', {name: 'Tìm kiếm toàn sàn', exact: true}).fill(query);
    await view.getByRole('banner').getByRole('button', {name: 'Tìm toàn sàn', exact: true}).click();
  }
  try {
    record('SETUP', {stores: markets.map(m => m.store.id), users: markets.map(m => m.buyer.user), base_products: markets.map(m => m.product.id), base_variants: markets.map(m => m.variant.id)});
    category = await a.api('/admin/categories', a.admin, 'POST', {name: a.tag + ' Publish category'});
    type = await a.api('/admin/product-types', a.admin, 'POST', {name: a.tag + ' Publish axes', category_id: category.id});
    for (const [code, name, values] of [['color', 'Màu', ['Đỏ', 'Xanh', 'Đen']], ['size', 'Cỡ', ['S', 'M', 'L', 'XL']]] as const) {
      await a.api('/admin/attribute-definitions', a.admin, 'POST', {product_type_id: type.id, code, name, data_type: 'STRING', required: true, variant_axis: true, allowed_values: values});
    }
    await login(seller, a, a.owner.email); await portal(seller);
    await seller.getByRole('button', {name: 'Thêm sản phẩm mới', exact: true}).click();
    const modal = seller.getByRole('dialog');
    await modal.getByRole('combobox', {name: 'Loại sản phẩm *', exact: true}).selectOption(type.id);
    await modal.getByRole('combobox', {name: 'Màu *', exact: true}).selectOption('Đỏ');
    await modal.getByRole('combobox', {name: 'Cỡ *', exact: true}).selectOption('S');
    await modal.getByLabel('Tên sản phẩm *', {exact: true}).fill(title);
    await modal.getByLabel('SKU phân loại mặc định *', {exact: true}).fill(a.tag + '-PUBLISH-009264');
    await modal.getByLabel('Giá bán (VNĐ) *', {exact: true}).fill('100500');
    const [created] = await Promise.all([seller.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/store/products'), modal.getByRole('button', {name: 'Tạo sản phẩm', exact: true}).click()]);
    expect(created.status()).toBe(201); product = await created.json(); expect(product.status).toBe('DRAFT');
    await expect(modal).toHaveCount(0);
    await seller.locator('tbody tr').filter({hasText: title}).getByRole('link', {name: 'Sửa sản phẩm', exact: true}).click();
    const addition = seller.getByRole('heading', {name: 'Biến thể', exact: true}).locator('..');
    let index = 0;
    for (const color of ['Đỏ', 'Xanh', 'Đen']) for (const size of ['S', 'M', 'L', 'XL']) {
      if (index++ === 0) continue;
      await addition.getByLabel('SKU mới', {exact: true}).fill(a.tag + '-PUBLISH-' + String(9264 + index - 1).padStart(6, '0'));
      await addition.getByLabel('Giá bán (VNĐ)', {exact: true}).fill('100500');
      await addition.getByRole('combobox', {name: 'Màu *', exact: true}).selectOption(color);
      await addition.getByRole('combobox', {name: 'Cỡ *', exact: true}).selectOption(size);
      const [added] = await Promise.all([seller.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/variants')), addition.getByRole('button', {name: 'Thêm biến thể', exact: true}).click()]);
      expect(added.status()).toBe(201);
      await expect(addition.getByRole('button', {name: 'Thêm biến thể', exact: true})).toBeEnabled();
    }
    product = await a.api('/store/products/' + product.id, a.owner.access);
    expect(product.variants).toHaveLength(12);
    target = product.variants.find((v: any) => v.variant_values.color === 'Đen' && v.variant_values.size === 'XL');
    expect((await a.raw('/products/' + product.id)).status).toBe(404);
    const images = seller.locator('#product-images');
    await sellerContext.route('**/__catalog-publish/**', route => route.fulfill({contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#215846"/></svg>'}));
    for (const name of ['front', 'back']) {
      await images.getByLabel('Đường dẫn ảnh', {exact: true}).fill('http://127.0.0.1:3109/__catalog-publish/' + a.tag + '-' + name + '.svg');
      const [added] = await Promise.all([seller.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/images')), images.getByRole('button', {name: 'Thêm ảnh', exact: true}).click()]); expect(added.status()).toBe(201);
    }
    await images.getByRole('button', {name: 'Đưa ảnh 2 lên trước', exact: true}).click();
    await expect(images.locator('img').first()).toHaveAttribute('src', /-back\.svg$/);
    record('UI_DRAFT_TWELVE_VARIANTS', {product_id: product.id, title, target, variants: product.variants, images_reordered: true, draft_public_status: 404});
    // Reader-size fixture only, scoped to the exact private Store/category and never public.
    const seedCode = `const {Client}=require('pg');(async()=>{let t='';for await(const b of process.stdin)t+=b;const x=JSON.parse(t);if(!/^corecheckout-[0-9]+$/.test(x.tag))throw Error('Tagged fixture only');const c=new Client({connectionString:process.env.M1_DATABASE_URL});await c.connect();try{await c.query('BEGIN');const guard=await c.query('SELECT id FROM product WHERE id=$1 AND store_id=$2 AND title=$3',[x.product,x.store,x.title]);if(guard.rowCount!==1)throw Error('Wrong fixture');const products=await c.query("INSERT INTO product(store_id,product_type_id,title,attributes_json,status,moderation_status) SELECT $1,$2,'000 '||$3||' reader '||n,$4,'DRAFT','VISIBLE' FROM generate_series(1,298)n RETURNING id",[x.store,x.type,x.tag,JSON.stringify({color:'Đỏ',size:'S'})]);for(const p of products.rows){const v=await c.query("INSERT INTO product_variant(product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status) VALUES($1,$2,$3,100500,$4,'reader-fixture',true,'ACTIVE') RETURNING id",[p.id,x.store,x.tag+'-'+p.id,JSON.stringify({color:'Đỏ',size:'S'})]);await c.query('INSERT INTO inventory(variant_id,store_id,quantity) VALUES($1,$2,0)',[v.rows[0].id,x.store]);}await c.query('COMMIT');console.log(JSON.stringify({created:products.rowCount,public:0}));}catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}})();`;
    expect(JSON.parse(execFileSync('docker', ['exec', '-i', 'pbl6-fe-verify-m1-1', 'node', '-e', seedCode], {input: JSON.stringify({tag: a.tag, product: product.id, title, store: a.store.id, type: type.id}), encoding: 'utf8'}))).toEqual({created: 298, public: 0}); seeded = true;
    await seller.getByRole('link', {name: '← Quay lại danh sách sản phẩm', exact: true}).click();
    await seller.getByRole('button', {name: 'Làm mới', exact: true}).click();
    await expect(seller.locator('.boot-pagination')).toContainText('300 kết quả');
    await expect(seller.locator('tbody')).not.toContainText(title);
    await seller.getByRole('searchbox', {name: 'Tìm tên hoặc SKU trong Store', exact: true}).fill(target.sku);
    await seller.locator('tbody tr').filter({hasText: title}).getByRole('link', {name: 'Sửa sản phẩm', exact: true}).click();
    const checklist = seller.getByRole('region', {name: 'Hoàn thiện sản phẩm để bán', exact: true});
    await expect(checklist).toContainText('Các phân loại đang bán chưa có tồn khả dụng.');
    await checklist.getByText('Đối chiếu 12 phân loại theo món / SKU', {exact: true}).click();
    const choice = checklist.locator('li').filter({hasText: 'SKU ' + target.sku});
    await expect(choice.locator('strong')).toHaveText('Đen / XL');
    await choice.getByRole('link', {name: 'Nhập / kiểm kho phân loại này', exact: true}).click();
    await expect(seller.locator('tbody').first().locator('tr')).toHaveCount(1);
    await expect(seller.locator('tbody').first()).toContainText('Đen / XL');
    await seller.getByRole('button', {name: 'Điều chỉnh', exact: true}).click();
    const adjustment = seller.getByRole('dialog'); await adjustment.getByLabel('Số lượng', {exact: true}).fill('3');
    await adjustment.getByLabel('Lý do', {exact: true}).fill(a.tag + ' Nhập đúng Đen XL');
    await adjustment.getByRole('button', {name: 'Lưu điều chỉnh', exact: true}).click(); await expect(adjustment).toHaveCount(0);
    await seller.goBack(); await expect(checklist).toContainText('1/12 phân loại đang bán còn tồn khả dụng');
    await expect(seller.getByRole('link', {name: 'Xem trang khách', exact: true})).toHaveCount(0);
    await seller.getByRole('combobox', {name: 'Trạng thái bán', exact: true}).selectOption('ACTIVE');
    await seller.getByRole('button', {name: 'Lưu thay đổi', exact: true}).click();
    await expect(seller.getByRole('status').filter({hasText: 'Đã lưu sản phẩm.'})).toBeVisible();
    await expect(checklist).toContainText('Sản phẩm đang mở bán và không bị ẩn.');
    await seller.screenshot({path: info.outputPath('publish-readiness-desktop.png'), fullPage: true});
    record('FOUND_STOCKED_PUBLISHED', {product_id: product.id, total_products: 300, reader_seed_products: 298, target_variant: target.id, stock: 3, public: (await a.api('/products/' + product.id)).status});
    expect((await a.raw('/store/products/' + product.id, b.owner.access)).status).toBe(404);
    await login(page, a, a.buyer.email);
    for (const [p, variant, quantity] of [[product, target, 2], [b.product, b.variant, 1]] as const) {
      await catalog(page, p.title);
      await page.locator('.product-card a.market-product-link[href="/products/' + p.id + '"]').click();
      if (p.id === product.id) {
        await page.locator('[data-variant-axis="color"] button').filter({hasText:/^Đen$/}).click();const selected = page.locator('[data-variant-axis="size"] button').filter({hasText:/^XL$/}); await selected.click();
        await expect(selected).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('[data-variant-axis="color"] button').filter({hasText:/^Đỏ/})).toBeDisabled();
      }
      await page.getByRole('spinbutton', {name: 'Số lượng', exact: true}).fill(String(quantity));
      const [added] = await Promise.all([page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/cart/items'), page.getByRole('button', {name: 'Thêm vào giỏ hàng', exact: true}).click()]);
      expect(added.status()).toBe(201); expect((await added.json()).variant_id).toBe(variant.id);
    }
    await page.getByRole('banner').getByRole('link', {name: 'Giỏ hàng', exact: true}).click();
    await expect(page.locator('.cart-store-group')).toHaveCount(2); await expect(page.locator('main')).toContainText('Đen / XL');
    await page.getByRole('button', {name: 'Tiến hành thanh toán', exact: true}).click();
    await expect(page.locator('.purchase-summary')).toContainText('281.000');
    await expect(page.getByRole('img', {name: 'Không tải được ảnh của ' + title, exact: true})).toBeVisible();
    await expect(page.locator('.market-cart-image img[src*="/__catalog-publish/"]')).toHaveCount(0);
    await page.screenshot({path: info.outputPath('published-multistore-checkout-desktop.png'), fullPage: true});
    const [confirmed] = await Promise.all([page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/orders/batches'), page.getByRole('button', {name: 'Xác nhận đặt hàng', exact: true}).click()]);
    expect(confirmed.status()).toBe(201); const group = await confirmed.json(); orders.push(...group.orders); expect(orders).toHaveLength(2);
    const chosenOrder = orders.find(o => o.store_id === a.store.id);
    expect(chosenOrder.items).toEqual([expect.objectContaining({variant_id: target.id, quantity: 2, unit_price_vnd: 100500, product_snapshot: expect.objectContaining({title, variant_values: {color: 'Đen', size: 'XL'}})})]);
    for (const order of orders) await expect.poll(async () => (await a.own(order.id)).status, {timeout: 20000}).toBe('PENDING');
    const stock = (await a.api('/store/inventory?variant_id=' + target.id, a.owner.access)).items[0]; expect(stock.quantity).toBe(1); expect(stock.reserved_quantity).toBe(0);
    record('PURCHASED_EXACT_VARIANT_TWO_STORES', {purchase_group_id: group.purchase_group_id, orders, total_vnd: 281000, target_quantity_after_consume: stock.quantity, foreign_product_status: 404, page_errors: errors});
    expect(errors).toEqual([]);
  } finally {
    for (const view of [page, seller]) await view.evaluate(() => document.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(e => {e.value = '';})).catch(() => {});
    await sellerContext.close();
    for (const order of orders) {
      const fresh = await a.own(order.id);
      if (['PENDING', 'CONFIRMED', 'AWAITING_PAYMENT'].includes(fresh.status)) await a.api('/me/orders/' + order.id + '/cancel', a.buyer.access, 'POST', {expected_version: fresh.version, reason: a.tag + ' publish fixture cleanup'});
    }
    for (const item of (await a.api('/cart/items?size=100', a.buyer.access)).items) if ([product?.id, b.product.id].includes(item.product_id)) await a.api('/cart/items/' + item.id, a.buyer.access, 'DELETE');
    if (product) {const fresh = await a.api('/store/products/' + product.id, a.owner.access); await a.api('/store/products/' + product.id, a.owner.access, 'PATCH', {expected_version: fresh.version, status: 'STOPPED'});}
    if (type && category) {
      const cleanup = `const {Client}=require('pg');(async()=>{let t='';for await(const b of process.stdin)t+=b;const x=JSON.parse(t);if(!/^corecheckout-[0-9]+$/.test(x.tag))throw Error('Tagged only');const c=new Client({connectionString:process.env.M1_DATABASE_URL});await c.connect();try{await c.query('BEGIN');const g=await c.query('SELECT id FROM product_type WHERE id=$1 AND name=$2 AND category_id=$3',[x.type,x.tag+' Publish axes',x.category]);if(g.rowCount!==1)throw Error('Wrong type');await c.query("UPDATE product SET status='STOPPED',version=version+1 WHERE store_id=$1 AND product_type_id=$2 AND title LIKE $3",[x.store,x.type,'000 '+x.tag+' reader %']);await c.query("UPDATE product_type SET status='STOPPED',version=version+1 WHERE id=$1",[x.type]);await c.query("UPDATE category SET status='STOPPED',version=version+1 WHERE id=$1 AND name=$2",[x.category,x.tag+' Publish category']);await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}})();`;
      execFileSync('docker', ['exec', '-i', 'pbl6-fe-verify-m1-1', 'node', '-e', cleanup], {input: JSON.stringify({tag: a.tag, type: type.id, category: category.id, store: a.store.id}), encoding: 'utf8'});
    }
    for (const m of markets) {
      await m.cleanup(); const store = await m.api('/store', m.owner.access);
      await m.api('/admin/stores/' + store.id, m.admin, 'PATCH', {expected_version: store.version, status: 'LOCKED', reason: m.tag + ' withdraw private catalog fixture'});
    }
    record('CLEANUP', {stores: markets.map(m => m.store.id), products: [...markets.map(m => m.product.id), ...(product ? [product.id] : [])], target_variant: target?.id, type: type?.id, category: category?.id, reader_seed_products: seeded ? 298 : 0, orders: orders.map(o => o.id), withdrawn: true, transactions_retained: true});
  }
});
