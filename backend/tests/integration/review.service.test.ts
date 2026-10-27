import { randomUUID } from 'node:crypto';
import { initializeDatabase, database } from '../../shared/src/database';
import { ReviewService } from '../../catalog-service/src/review/review.service';
import { ApiError } from '../../shared/src/errors';

process.env.SERVICE_ID = 'M1';

/**
 * Product review list and author edit against real PostgreSQL, exercised through the service and
 * without HTTP: the integration run shares a 30-per-minute login budget that main already spends.
 */
const service = new ReviewService();
const OWNER = '10000000-0000-4000-8000-000000000002';
const OTHER = '10000000-0000-4000-8000-000000000005';
const STORE = '10000000-0000-4000-8000-000000000061';
const PRODUCT_TYPE = '10000000-0000-4000-8000-000000000071';

let productId = '';
let visibleA = '';
let visibleB = '';
let hidden = '';
let otherOwned = '';
let correlations: string[] = [];

function correlation() {
  const id = 'review-svc-' + randomUUID();
  correlations.push(id);
  return id;
}

async function rejected(run: Promise<unknown>): Promise<ApiError> {
  try { await run; } catch (error) { return error as ApiError; }
  throw new Error('expected the call to be rejected');
}

async function seedReview(id: string, customer: string, rating: number, status: string, body: string, createdAt: string) {
  await database.query(
    `INSERT INTO review(id,product_id,order_item_id,customer_user_id,rating,body,status,updated_at,created_at,version)
     VALUES($1,$2,$3,$4,$5,$6,$7,now(),$8::timestamptz,0)`,
    [id, productId, randomUUID(), customer, rating, body, status, createdAt]);
}

beforeAll(async () => {
  await initializeDatabase();
  productId = randomUUID();
  await database.query(
    `INSERT INTO product(id,store_id,product_type_id,title,description,attributes_json,status,moderation_status,version)
     VALUES($1,$2,$3,'Product REV-01','x','{}','ACTIVE','VISIBLE',0)`, [productId, STORE, PRODUCT_TYPE]);
});
beforeEach(async () => {
  await database.query('DELETE FROM review WHERE product_id=$1', [productId]);
  visibleA = randomUUID(); visibleB = randomUUID(); hidden = randomUUID(); otherOwned = randomUUID();
  await seedReview(visibleA, OWNER, 5, 'VISIBLE', 'Rất tốt', '2026-10-01T00:00:00Z');
  await seedReview(visibleB, OTHER, 4, 'VISIBLE', 'Ổn', '2026-10-02T00:00:00Z');
  await seedReview(hidden, OTHER, 1, 'HIDDEN', 'Bị ẩn', '2026-10-03T00:00:00Z');
  await seedReview(otherOwned, OTHER, 3, 'VISIBLE', 'Của người khác', '2026-10-04T00:00:00Z');
});
afterAll(async () => {
  await database.query('DELETE FROM review WHERE product_id=$1', [productId]);
  await database.query('DELETE FROM product WHERE id=$1', [productId]);
  for (const id of correlations) await database.query('DELETE FROM m1_audit WHERE request_id=$1', [id]);
  if (database?.isInitialized) await database.destroy();
});

test('listProductReviews exposes only visible reviews, newest first, and pages them', async () => {
  const page = await service.listProductReviews(productId, { page: 1, size: 20 });
  expect(page.total).toBe(3); // visibleA, visibleB and otherOwned; the hidden one is excluded
  expect(page.items.map((item: any) => item.id)).toEqual([otherOwned, visibleB, visibleA]);
  for (const item of page.items) expect(item).not.toHaveProperty('customer_user_id');

  const first = await service.listProductReviews(productId, { page: 1, size: 2 });
  expect(first.items).toHaveLength(2);
  expect(first.total).toBe(3);
  const second = await service.listProductReviews(productId, { page: 2, size: 2 });
  expect(second.items).toHaveLength(1);
  expect(second.items[0].id).toBe(visibleA);

  // An unknown Product is an empty page, not an error.
  expect((await service.listProductReviews(randomUUID(), { page: 1, size: 20 })).total).toBe(0);
});

test('the author edits their own review and the version advances', async () => {
  const id = correlation();
  const updated = await service.updateReview(visibleA, { rating: 4, body: 'Đã sửa', expected_version: 0 },
    { user_id: OWNER }, id);
  expect(updated).toMatchObject({ id: visibleA, rating: 4, body: 'Đã sửa', version: 1, status: 'VISIBLE' });

  expect(await database.query("SELECT action, actor_user_id FROM m1_audit WHERE request_id=$1", [id]))
    .toEqual([{ action: 'REVIEW_UPDATED', actor_user_id: OWNER }]);

  // The new text is what the public list now serves.
  const page = await service.listProductReviews(productId, { page: 1, size: 20 });
  expect(page.items.find((item: any) => item.id === visibleA)?.body).toBe('Đã sửa');
});

test('editing is scoped to the author and honours expected_version', async () => {
  const foreign = await rejected(service.updateReview(otherOwned, { rating: 5, expected_version: 0 }, { user_id: OWNER }, correlation()));
  // Another customer's review is reported as missing, so the id is never confirmed.
  expect(foreign.getStatus()).toBe(404);

  const stale = await rejected(service.updateReview(visibleA, { rating: 5, expected_version: 7 }, { user_id: OWNER }, correlation()));
  expect(stale.getStatus()).toBe(409);
  expect((stale.getResponse() as any).code).toBe('VERSION_CONFLICT');

  const empty = await rejected(service.updateReview(visibleA, { expected_version: 0 }, { user_id: OWNER }, correlation()));
  expect(empty.getStatus()).toBe(422);
  expect(await database.query('SELECT rating, version FROM review WHERE id=$1', [visibleA]))
    .toEqual([{ rating: 5, version: 0 }]);
});

test('an author edit never unhides a moderated review', async () => {
  const updated = await service.updateReview(hidden, { body: 'Tác giả sửa', expected_version: 0 },
    { user_id: OTHER }, correlation());
  expect(updated).toMatchObject({ status: 'HIDDEN', version: 1 });
  const page = await service.listProductReviews(productId, { page: 1, size: 20 });
  expect(page.items.some((item: any) => item.id === hidden)).toBe(false);
});

test('an explicit empty body clears the text, while omitting it keeps it', async () => {
  const cleared = await service.updateReview(visibleA, { body: '', expected_version: 0 }, { user_id: OWNER }, correlation());
  expect(cleared.body).toBe('');

  const kept = await service.updateReview(visibleA, { rating: 2, expected_version: 1 }, { user_id: OWNER }, correlation());
  expect(kept.rating).toBe(2);
  expect(await database.query('SELECT body FROM review WHERE id=$1', [visibleA])).toEqual([{ body: '' }]);
});
