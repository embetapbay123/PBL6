import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { initializeDatabase, database } from '../../shared/src/database';
import { ModerationService } from '../../catalog-service/src/moderation/moderation.service';
import { CatalogRepository } from '../../catalog-service/src/catalog/catalog.repository';
import { ApiError } from '../../shared/src/errors';

process.env.SERVICE_ID = 'M1';

/**
 * Product and Review moderation against real PostgreSQL, through the service and without HTTP:
 * the integration run shares a 30-per-minute login budget that main already spends, and the Admin
 * routing itself is guarded by @Roles('ADMIN') on the controller.
 */
const service = new ModerationService();
const actor = '10000000-0000-4000-8000-000000000021'; // seeded ADMIN user
const STORE = '10000000-0000-4000-8000-000000000061';
const PRODUCT_TYPE = '10000000-0000-4000-8000-000000000071';

let m3: DataSource;
let productId = '';
let reviewId = '';
let correlate: string[] = [];

function correlation() {
  const id = 'moderation-svc-' + randomUUID();
  correlate.push(id);
  return id;
}

async function rejected(run: Promise<unknown>): Promise<ApiError> {
  try { await run; } catch (error) { return error as ApiError; }
  throw new Error('expected the call to be rejected');
}

async function seedProduct(status = 'ACTIVE') {
  const variantId = randomUUID();
  await database.query(
    `INSERT INTO product(id,store_id,product_type_id,title,description,attributes_json,status,moderation_status,version)
     VALUES($1,$2,$3,'Product MOD-01','x','{}',$4,'VISIBLE',0)`, [productId, STORE, PRODUCT_TYPE, status]);
  await database.query(
    `INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status)
     VALUES($1,$2,$3,$4,120000,'{}',$5,true,'ACTIVE')`,
    [variantId, productId, STORE, 'MOD-' + randomUUID().slice(0, 8), 'sig-mod-' + variantId]);
}

async function seedReview() {
  await database.query(
    `INSERT INTO review(id,product_id,order_item_id,customer_user_id,rating,body,status,updated_at,version)
     VALUES($1,$2,$3,'10000000-0000-4000-8000-000000000002',5,'Rất tốt','VISIBLE',now(),0)`,
    [reviewId, productId, randomUUID()]);
}

beforeAll(async () => {
  await initializeDatabase();
  m3 = new DataSource({ type: 'postgres', url: process.env.M3_DATABASE_URL });
  await m3.initialize();
});
beforeEach(async () => {
  productId = randomUUID();
  reviewId = randomUUID();
  await seedProduct();
  await seedReview();
});
afterAll(async () => {
  await database.query('DELETE FROM review WHERE id=$1', [reviewId]);
  await database.query('DELETE FROM product_variant WHERE product_id=$1', [productId]);
  await database.query('DELETE FROM product WHERE id=$1', [productId]);
  for (const id of correlate) {
    await database.query('DELETE FROM m1_audit WHERE request_id=$1', [id]);
    await database.query('DELETE FROM outbox WHERE correlation_id=$1', [id]);
  }
  // Restore the Store in case the locked-Store case failed before its own cleanup.
  await m3.query("UPDATE store SET status='ACTIVE' WHERE id=$1", [STORE]);
  await m3.destroy();
  if (database?.isInitialized) await database.destroy();
});

test('hideProduct answers the full Product projection and publishes ProductChanged', async () => {
  const id = correlation();
  const hidden = await service.hideProduct(productId, { reason: 'Hàng giả', expected_version: 0 }, actor, id);

  // The contract response is Product, so variants and images must be present.
  expect(hidden).toMatchObject({ id: productId, moderation_status: 'HIDDEN', version: 1, status: 'ACTIVE' });
  expect(Array.isArray((hidden as any).variants)).toBe(true);
  expect((hidden as any).variants).toHaveLength(1);
  expect(Array.isArray((hidden as any).images)).toBe(true);

  expect(await database.query("SELECT action, reason FROM m1_audit WHERE request_id=$1", [id]))
    .toEqual([{ action: 'PRODUCT_HIDDEN', reason: 'Hàng giả' }]);
  expect(await database.query('SELECT payload FROM outbox WHERE correlation_id=$1', [id]))
    .toEqual([{ payload: expect.objectContaining({ product_id: productId, store_id: STORE,
      version: 1, sale_status: 'ACTIVE', moderation_status: 'HIDDEN' }) }]);

  // A hidden Product must disappear from the public read even though its sale status is unchanged.
  expect(await new CatalogRepository(database.manager).publicProduct(productId, [STORE])).toBeUndefined();
});

test('moderation refuses stale versions, a repeated state and a missing reason', async () => {
  const stale = await rejected(service.hideProduct(productId, { reason: 'x', expected_version: 9 }, actor, correlation()));
  expect(stale.getStatus()).toBe(409);
  expect((stale.getResponse() as any).code).toBe('VERSION_CONFLICT');

  const noReason = await rejected(service.hideProduct(productId, { expected_version: 0 }, actor, correlation()));
  expect(noReason.getStatus()).toBe(422);

  const missing = await rejected(service.hideProduct(randomUUID(), { reason: 'x', expected_version: 0 }, actor, correlation()));
  expect(missing.getStatus()).toBe(404);

  await service.hideProduct(productId, { reason: 'Lần đầu', expected_version: 0 }, actor, correlation());
  const again = await rejected(service.hideProduct(productId, { reason: 'Lần hai', expected_version: 1 }, actor, correlation()));
  expect(again.getStatus()).toBe(409);
  expect((again.getResponse() as any).code).toBe('NO_STATE_CHANGE');
});

test('restoreProduct keeps the sale status, so a stopped Product stays out of the catalogue', async () => {
  await database.query("UPDATE product SET status='STOPPED' WHERE id=$1", [productId]);
  await service.hideProduct(productId, { reason: 'Tạm ẩn', expected_version: 0 }, actor, correlation());

  const restored = await service.restoreProduct(productId, { reason: 'Đã kiểm tra', expected_version: 1 }, actor, correlation());
  expect(restored).toMatchObject({ moderation_status: 'VISIBLE', status: 'STOPPED', version: 2 });
  // Restoring visibility must not put a stopped Product back on sale.
  expect(await new CatalogRepository(database.manager).publicProduct(productId, [STORE])).toBeUndefined();
});

test('restoring is refused while the Store is locked', async () => {
  await service.hideProduct(productId, { reason: 'Ẩn trước', expected_version: 0 }, actor, correlation());
  await m3.query("UPDATE store SET status='LOCKED' WHERE id=$1", [STORE]);
  try {
    const blocked = await rejected(service.restoreProduct(productId, { reason: 'Mở lại', expected_version: 1 }, actor, correlation()));
    expect(blocked.getStatus()).toBe(409);
    expect((blocked.getResponse() as any).code).toBe('STORE_UNAVAILABLE');
    // Nothing was written: the Product is still hidden at the version it had.
    expect(await database.query('SELECT moderation_status, version FROM product WHERE id=$1', [productId]))
      .toEqual([{ moderation_status: 'HIDDEN', version: 1 }]);
  } finally {
    await m3.query("UPDATE store SET status='ACTIVE' WHERE id=$1", [STORE]);
  }
});

test('hideReview and restoreReview move the status, keep the reason and audit both changes', async () => {
  const hideId = correlation();
  const hidden = await service.hideReview(reviewId, { reason: 'Spam', expected_version: 0 }, actor, hideId);
  expect(hidden).toMatchObject({ id: reviewId, status: 'HIDDEN', version: 1 });
  expect(await database.query('SELECT hidden_reason FROM review WHERE id=$1', [reviewId]))
    .toEqual([{ hidden_reason: 'Spam' }]);
  expect(await database.query('SELECT action FROM m1_audit WHERE request_id=$1', [hideId]))
    .toEqual([{ action: 'REVIEW_HIDDEN' }]);

  const restoreId = correlation();
  const restored = await service.restoreReview(reviewId, { reason: 'Khiếu nại đúng', expected_version: 1 }, actor, restoreId);
  expect(restored).toMatchObject({ status: 'VISIBLE', version: 2 });
  // The reason belongs to the hide, so a restore clears it.
  expect(await database.query('SELECT hidden_reason FROM review WHERE id=$1', [reviewId]))
    .toEqual([{ hidden_reason: null }]);
  expect(await database.query('SELECT action FROM m1_audit WHERE request_id=$1', [restoreId]))
    .toEqual([{ action: 'REVIEW_RESTORED' }]);

  const stale = await rejected(service.hideReview(reviewId, { reason: 'x', expected_version: 0 }, actor, correlation()));
  expect(stale.getStatus()).toBe(409);
  const missing = await rejected(service.hideReview(randomUUID(), { reason: 'x', expected_version: 0 }, actor, correlation()));
  expect(missing.getStatus()).toBe(404);
});
