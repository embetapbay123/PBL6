import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';

const base = process.env.TEST_API_URL ?? 'http://gateway/api/v1';
const STORE_A = '10000000-0000-4000-8000-000000000061';
const STORE_B = '00000000-0000-4000-8000-0000000000c3';
const PRODUCT_TYPE = '10000000-0000-4000-8000-000000000071';
const OWNER_MEMBERSHIP = '10000000-0000-4000-8000-000000000062';

let m1: DataSource;
let m3: DataSource;
let owner = '';
let product = '';        // DRAFT Product of Store A that already has one Variant
let emptyProduct = '';   // DRAFT Product of Store A with no Variant at all
let foreignProduct = ''; // DRAFT Product of another Store
let correlations: string[] = [];

async function login(email: string): Promise<string> {
  const response = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: process.env.SEED_PASSWORD, client_type: 'MOBILE' }) });
  expect(response.status).toBe(200);
  return (await response.json() as any).access_token as string;
}

function call(method: string, path: string, body?: unknown, token?: string) {
  const correlation = randomUUID();
  correlations.push(correlation);
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Correlation-Id': correlation };
  if (token) headers.Authorization = 'Bearer ' + token;
  return fetch(base + path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

const variantBody = (over: Record<string, unknown> = {}) => ({
  sku: 'SKU-' + randomUUID().slice(0, 8), price_vnd: 99000, variant_values: { color: 'red' }, ...over,
});

async function addVariant(over: Record<string, unknown> = {}, token = owner) {
  const response = await call('POST', `/store/products/${product}/variants`, variantBody(over), token);
  return { status: response.status, body: await response.json() as any };
}

async function insertProduct(id: string, storeId: string, title: string) {
  await m1.query(`INSERT INTO product(id,store_id,product_type_id,title,description,attributes_json,status,moderation_status,version)
    VALUES($1,$2,$3,$4,'test','{}','DRAFT','VISIBLE',0)`, [id, storeId, PRODUCT_TYPE, title]);
}

async function seed() {
  product = randomUUID(); emptyProduct = randomUUID(); foreignProduct = randomUUID();
  // DRAFT so the seeded rows never change what the public catalogue suites expect to see.
  await insertProduct(product, STORE_A, 'Product CAT-03');
  await insertProduct(emptyProduct, STORE_A, 'Product CAT-03 empty');
  await insertProduct(foreignProduct, STORE_B, 'Product CAT-03 foreign');
  await m1.query(`INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status)
    VALUES($1,$2,$3,'BASE-CAT03',50000,'{}','sig-base',true,'ACTIVE')`, [randomUUID(), product, STORE_A]);
}

async function reset() {
  if (correlations.length) {
    await m1.query('DELETE FROM m1_audit WHERE request_id = ANY($1::text[])', [correlations]);
    await m1.query('DELETE FROM outbox WHERE correlation_id = ANY($1::text[])', [correlations]);
  }
  const ids = [product, emptyProduct, foreignProduct].filter(Boolean);
  if (ids.length) {
    await m1.query('DELETE FROM product_image WHERE product_id = ANY($1::uuid[])', [ids]);
    await m1.query('DELETE FROM inventory WHERE variant_id IN (SELECT id FROM product_variant WHERE product_id = ANY($1::uuid[]))', [ids]);
    await m1.query('DELETE FROM product_variant WHERE product_id = ANY($1::uuid[])', [ids]);
    await m1.query('DELETE FROM product WHERE id = ANY($1::uuid[])', [ids]);
  }
  product = ''; emptyProduct = ''; foreignProduct = ''; correlations = [];
  // A failed permission assertion must not leave the owner demoted for the next test.
  await m3.query("UPDATE store_membership SET role='OWNER' WHERE id=$1 AND role<>'OWNER'", [OWNER_MEMBERSHIP]);
}

beforeAll(async () => {
  m1 = new DataSource({ type: 'postgres', url: process.env.M1_DATABASE_URL });
  m3 = new DataSource({ type: 'postgres', url: process.env.M3_DATABASE_URL });
  await m1.initialize();
  await m3.initialize();
  // One login only: the integration suite shares a 30-per-minute login budget with every other
  // suite, so a second account here pushes the whole run into 429s.
  owner = await login('owner@pbl6.test');
});
beforeEach(async () => { await reset(); await seed(); });
afterAll(async () => { await reset(); await m3.destroy(); await m1.destroy(); });

test('createVariant adds the Variant, zero stock, audit, outbox and a new Product version', async () => {
  const { status, body } = await addVariant({ is_default: true });
  expect(status).toBe(201);
  expect(body).toMatchObject({ price_vnd: 99000, variant_values: { color: 'red' }, status: 'ACTIVE', is_default: true });
  expect(body.id).toBeTruthy();
  // The response is ProductVariant: it must not leak the Product id or an internal signature.
  expect(Object.keys(body).sort()).toEqual(['id', 'is_default', 'price_vnd', 'sku', 'status', 'variant_values']);

  expect(await m1.query('SELECT quantity, reserved_quantity FROM inventory WHERE variant_id=$1', [body.id]))
    .toEqual([{ quantity: 0, reserved_quantity: 0 }]);

  // A Variant change is a price/availability change, so the Product version advances.
  expect(await m1.query('SELECT version FROM product WHERE id=$1', [product])).toEqual([{ version: 1 }]);

  const correlation = correlations[correlations.length - 1];
  expect(await m1.query('SELECT action, target_id FROM m1_audit WHERE request_id=$1', [correlation]))
    .toEqual([{ action: 'VARIANT_ADD', target_id: product }]);
  expect(await m1.query('SELECT payload FROM outbox WHERE correlation_id=$1', [correlation]))
    .toEqual([{ payload: expect.objectContaining({ product_id: product, store_id: STORE_A, version: 1,
      sale_status: 'DRAFT', moderation_status: 'VISIBLE' }) }]);
});

test('the first Variant becomes the default and a later default replaces it', async () => {
  const first = await call('POST', `/store/products/${emptyProduct}/variants`, variantBody(), owner);
  expect(first.status).toBe(201);
  expect((await first.json() as any).is_default).toBe(true);

  const second = await call('POST', `/store/products/${emptyProduct}/variants`,
    variantBody({ variant_values: { color: 'blue' }, is_default: true }), owner);
  expect(second.status).toBe(201);
  // variant_default_unique allows exactly one default per Product.
  expect(await m1.query(
    'SELECT count(*)::int AS n FROM product_variant WHERE product_id=$1 AND is_default', [emptyProduct]))
    .toEqual([{ n: 1 }]);
  expect(await m1.query(
    'SELECT sku FROM product_variant WHERE product_id=$1 AND is_default', [emptyProduct]))
    .toEqual([{ sku: (await second.json() as any).sku }]);
});

test('createVariant refuses a duplicate SKU in the Store', async () => {
  const duplicate = await addVariant({ sku: 'BASE-CAT03' });
  expect(duplicate.status).toBe(409);
  expect(duplicate.body.code).toBe('SKU_CONFLICT');
  // Nothing was written, including the Product version.
  expect(await m1.query('SELECT version FROM product WHERE id=$1', [product])).toEqual([{ version: 0 }]);
  expect(await m1.query('SELECT count(*)::int AS n FROM product_variant WHERE product_id=$1', [product]))
    .toEqual([{ n: 1 }]);
});

test('createVariant refuses the same attribute set twice, whatever the key order', async () => {
  const created = await addVariant({ variant_values: { size: 'M', color: 'red' } });
  expect(created.status).toBe(201);
  const reordered = await addVariant({ variant_values: { color: 'red', size: 'M' } });
  expect(reordered.status).toBe(409);
  expect(reordered.body.code).toBe('VARIANT_DUPLICATE');
});

test('createVariant is scoped to the caller Store', async () => {
  const foreign = await call('POST', `/store/products/${foreignProduct}/variants`, variantBody(), owner);
  expect(foreign.status).toBe(404);
  expect((await foreign.json() as any).code).toBe('NOT_FOUND');

  expect((await call('POST', `/store/products/${randomUUID()}/variants`, variantBody(), owner)).status).toBe(404);
  expect((await call('POST', `/store/products/${product}/variants`, variantBody())).status).toBe(401);
});

test('a Store member without the product permission is refused', async () => {
  // The role guard still admits a SELLER, so this exercises the permission check itself. It also
  // proves a withdrawn grant takes effect on the very next call with the same still-valid token.
  await m3.query("UPDATE store_membership SET role='SELLER' WHERE id=$1", [OWNER_MEMBERSHIP]);
  const response = await call('POST', `/store/products/${product}/variants`, variantBody(), owner);
  expect(response.status).toBe(403);
  expect((await response.json() as any).code).toBe('FORBIDDEN');
  await m3.query("UPDATE store_membership SET role='OWNER' WHERE id=$1", [OWNER_MEMBERSHIP]);
});

test('addProductImage appends by position and does not bump the Product version', async () => {
  const first = await call('POST', `/store/products/${product}/images`,
    { image_url: 'https://cdn.example.test/a.jpg' }, owner);
  expect(first.status).toBe(201);
  const image = await first.json() as any;
  expect(image).toMatchObject({ product_id: product, image_url: 'https://cdn.example.test/a.jpg', position: 0 });

  const second = await call('POST', `/store/products/${product}/images`,
    { image_url: 'https://cdn.example.test/b.jpg' }, owner);
  expect((await second.json() as any).position).toBe(1);

  // An explicit position is respected for reordering.
  const explicit = await call('POST', `/store/products/${product}/images`,
    { image_url: 'https://cdn.example.test/c.jpg', position: 0 }, owner);
  expect(explicit.status).toBe(201);
  expect((await explicit.json() as any).position).toBe(0);

  // An image is not a price or availability change: no version bump and no ProductChanged event.
  expect(await m1.query('SELECT version FROM product WHERE id=$1', [product])).toEqual([{ version: 0 }]);
  expect(await m1.query('SELECT count(*)::int AS n FROM outbox WHERE correlation_id = ANY($1::text[])', [correlations]))
    .toEqual([{ n: 0 }]);
  const correlation = correlations[2];
  expect(await m1.query('SELECT action FROM m1_audit WHERE request_id=$1', [correlation])).toEqual([{ action: 'IMAGE_ADD' }]);
});

test('addProductImage only accepts a Variant of the same Product', async () => {
  const own = await m1.query('SELECT id FROM product_variant WHERE product_id=$1', [product]);
  const attached = await call('POST', `/store/products/${product}/images`,
    { image_url: 'https://cdn.example.test/v.jpg', variant_id: own[0].id }, owner);
  expect(attached.status).toBe(201);

  // A Variant id from another Product is rejected rather than silently attached.
  const other = await call('POST', `/store/products/${emptyProduct}/images`,
    { image_url: 'https://cdn.example.test/x.jpg', variant_id: own[0].id }, owner);
  expect(other.status).toBe(404);
  expect((await other.json() as any).code).toBe('VARIANT_NOT_FOUND');

  expect((await call('POST', `/store/products/${foreignProduct}/images`,
    { image_url: 'https://cdn.example.test/y.jpg' }, owner)).status).toBe(404);
});

test('the DTO rejects an image url that is not a URI', async () => {
  const invalid = await call('POST', `/store/products/${product}/images`, { image_url: 'not a url' }, owner);
  expect(invalid.status).toBe(422);
  expect(await m1.query('SELECT count(*)::int AS n FROM product_image WHERE product_id=$1', [product]))
    .toEqual([{ n: 0 }]);
});

/* ----------------------------------------------------------------- concurrency */

async function post(path: string, body: unknown) {
  const response = await call('POST', path, body, owner);
  return { status: response.status, body: await response.json() as any };
}

test('concurrent default Variants never surface a unique violation', async () => {
  const before = correlations.length;
  const [first, second] = await Promise.all([
    post(`/store/products/${product}/variants`, variantBody({ is_default: true, variant_values: { color: 'a' } })),
    post(`/store/products/${product}/variants`, variantBody({ is_default: true, variant_values: { color: 'b' } })),
  ]);
  const statuses = [first.status, second.status];
  // Every answer is a business status: accepted, or the documented conflict. Never a raw 5xx.
  expect(statuses.filter(status => status !== 201 && status !== 409)).toEqual([]);
  const accepted = statuses.filter(status => status === 201).length;
  expect(accepted).toBeGreaterThanOrEqual(1);

  // The invariant the unique index enforces still holds after the race.
  expect(await m1.query('SELECT count(*)::int AS n FROM product_variant WHERE product_id=$1 AND is_default', [product]))
    .toEqual([{ n: 1 }]);
  // A rejected request left no partial write. The seeded Variant deliberately has no stock row, so
  // every inventory row here belongs to an accepted call.
  expect(await m1.query('SELECT count(*)::int AS n FROM product_variant WHERE product_id=$1', [product]))
    .toEqual([{ n: 1 + accepted }]);
  expect(await m1.query(
    'SELECT count(*)::int AS n FROM inventory i JOIN product_variant v ON v.id=i.variant_id WHERE v.product_id=$1',
    [product])).toEqual([{ n: accepted }]);
  const round = correlations.slice(before);
  expect(await m1.query(
    "SELECT count(*)::int AS n FROM m1_audit WHERE request_id = ANY($1::text[]) AND action='VARIANT_ADD'", [round]))
    .toEqual([{ n: accepted }]);
  expect(await m1.query('SELECT count(*)::int AS n FROM outbox WHERE correlation_id = ANY($1::text[])', [round]))
    .toEqual([{ n: accepted }]);
});

test('concurrent identical SKU requests answer one success and one conflict', async () => {
  const sku = 'RACE-' + randomUUID().slice(0, 8);
  const [first, second] = await Promise.all([
    post(`/store/products/${product}/variants`, variantBody({ sku, variant_values: { color: 'x' } })),
    post(`/store/products/${product}/variants`, variantBody({ sku, variant_values: { color: 'y' } })),
  ]);
  expect([first.status, second.status].sort()).toEqual([201, 409]);
  expect((first.status === 409 ? first : second).body.code).toBe('SKU_CONFLICT');
  expect(await m1.query('SELECT count(*)::int AS n FROM product_variant WHERE product_id=$1 AND sku=$2', [product, sku]))
    .toEqual([{ n: 1 }]);
});

test('concurrent identical attribute sets answer one success and one conflict', async () => {
  const values = { size: 'L', color: 'green' };
  const [first, second] = await Promise.all([
    post(`/store/products/${product}/variants`, variantBody({ variant_values: values })),
    post(`/store/products/${product}/variants`, variantBody({ variant_values: { ...values } })),
  ]);
  expect([first.status, second.status].sort()).toEqual([201, 409]);
  expect((first.status === 409 ? first : second).body.code).toBe('VARIANT_DUPLICATE');
  expect(await m1.query(
    'SELECT count(*)::int AS n FROM product_variant WHERE product_id=$1 AND variant_values_json=$2::jsonb',
    [product, JSON.stringify(values)])).toEqual([{ n: 1 }]);
});
