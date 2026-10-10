import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';

const base = process.env.TEST_API_URL ?? 'http://gateway/api/v1';
const STORE = '10000000-0000-4000-8000-000000000061';       // Demo Store from seed
const CATEGORY = '10000000-0000-4000-8000-000000000070';    // Demo category
const PRODUCT_TYPE = '10000000-0000-4000-8000-000000000071'; // Demo type, price seed 100000/150000/200000
const PRODUCTS = ['10000000-0000-4000-8000-000000000080',
  '10000000-0000-4000-8000-000000000081',
  '10000000-0000-4000-8000-000000000082'];
const [PRODUCT_A] = PRODUCTS;
const IMAGE = 'https://example.test/demo-0.png';

let source: DataSource;
let m3: DataSource;
let customer = '';
let correlations: string[] = [];

async function login(email: string): Promise<string> {
  const response = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: process.env.SEED_PASSWORD, client_type: 'MOBILE' }) });
  expect(response.status).toBe(200);
  return (await response.json() as any).access_token as string;
}

function api(path: string, token?: string) {
  const correlation = randomUUID();
  correlations.push(correlation);
  const headers: Record<string, string> = { 'X-Correlation-Id': correlation };
  if (token) headers.Authorization = 'Bearer ' + token;
  return fetch(base + path, { headers });
}

const json = async (path: string, token?: string) => (await api(path, token)).json() as Promise<any>;

/** Restore seed state and drop telemetry this suite produced. */
async function reset() {
  if (correlations.length) await source.query('DELETE FROM outbox WHERE correlation_id = ANY($1::text[])', [correlations]);
  await source.query("DELETE FROM product_image WHERE url=$1", [IMAGE]);
  await source.query("UPDATE product SET moderation_status='VISIBLE' WHERE id = ANY($1::uuid[])", [PRODUCTS]);
  await source.query("UPDATE store SET status='ACTIVE' WHERE id=$1", [STORE]).catch(() => undefined);
  correlations = [];
}

beforeAll(async () => {
  source = new DataSource({ type: 'postgres', url: process.env.M1_DATABASE_URL });
  await source.initialize();
  customer = await login('customer1@pbl6.test');
  // M3 owns the store row; use a second connection only to lock/unlock it for the visibility test.
  m3 = new DataSource({ type: 'postgres', url: process.env.M3_DATABASE_URL });
  await m3.initialize();
});
beforeEach(reset);
afterAll(async () => { await reset(); await m3.destroy(); await source.destroy(); });

test('listCategories and listProductTypes serve paged public taxonomy', async () => {
  const categories = await json('/categories');
  expect(categories.page).toBe(1);
  expect(categories.size).toBe(20);
  expect(categories.total).toBeGreaterThanOrEqual(1);
  const demo = categories.items.find((item: any) => item.id === CATEGORY);
  expect(demo).toMatchObject({ id: CATEGORY, name: 'Demo', status: 'ACTIVE' });
  // The seed category has no parent, and a null parent must be absent rather than null.
  expect('parent_id' in demo).toBe(false);

  const types = await json('/product-types');
  expect(types.total).toBeGreaterThanOrEqual(1);
  const type = types.items.find((item: any) => item.id === PRODUCT_TYPE);
  expect(type).toMatchObject({ id: PRODUCT_TYPE, name: 'Demo type', status: 'ACTIVE', category_id: CATEGORY });
  expect(Array.isArray(type.attribute_definitions)).toBe(true);

  const paged = await json('/product-types?page=1&size=1');
  expect(paged.items).toHaveLength(1);
  expect(paged.size).toBe(1);
  expect((await api('/categories?size=101')).status).toBe(422);
});

test('listProducts returns public products with variants and images', async () => {
  await source.query('INSERT INTO product_image(id,product_id,url,position,status) VALUES($1,$2,$3,0,\'ACTIVE\')',
    [randomUUID(), PRODUCT_A, IMAGE]);

  const page = await json('/products');
  expect(page.total).toBe(3);
  expect(page.page).toBe(1);
  expect(page.size).toBe(20);
  const product = page.items.find((item: any) => item.id === PRODUCT_A);
  expect(product.images).toEqual([{ id: expect.any(String), product_id: PRODUCT_A, image_url: IMAGE, position: 0 }]);
  expect(Array.isArray(product.variants)).toBe(true);
  expect(product.variants[0].price_vnd).toBe(100000);
  expect(page.items.map((item: any) => item.id).sort()).toEqual([...PRODUCTS].sort());
});

test('listProducts filters by query, category and product type, and sorts by price', async () => {
  expect((await json('/products?q=mẫu 3')).items.map((item: any) => item.id)).toEqual([PRODUCTS[2]]);
  // Description is searched too, so a term only present in the description still matches.
  expect((await json('/products?q=luồng tích hợp')).total).toBe(3);
  expect((await json('/products?q=không-tồn-tại')).total).toBe(0);

  expect((await json(`/products?category_id=${CATEGORY}`)).total).toBe(3);
  expect((await json(`/products?category_id=${randomUUID()}`)).total).toBe(0);
  expect((await json(`/products?product_type_id=${PRODUCT_TYPE}`)).total).toBe(3);
  expect((await json(`/products?product_type_id=${randomUUID()}`)).total).toBe(0);

  const ascending = await json('/products?sort=price_asc');
  expect(ascending.items[0].id).toBe(PRODUCTS[0]);
  const descending = await json('/products?sort=price_desc');
  expect(descending.items[0].id).toBe(PRODUCTS[2]);

  // `sort` is a closed enum, so an unknown value is rejected rather than silently ignored.
  expect((await api('/products?sort=cheapest')).status).toBe(422);
  expect((await api('/products?category_id=not-a-uuid')).status).toBe(422);
});

test('getProduct returns detail and hides unknown, hidden or locked products', async () => {
  const detail = await json(`/products/${PRODUCT_A}`);
  expect(detail).toMatchObject({ id: PRODUCT_A, store_id: STORE, status: 'ACTIVE', moderation_status: 'VISIBLE' });
  expect(Array.isArray(detail.images)).toBe(true);
  expect((await api(`/products/${randomUUID()}`)).status).toBe(404);
  expect((await api('/products/not-a-uuid')).status).toBe(422);

  await source.query("UPDATE product SET moderation_status='HIDDEN' WHERE id=$1", [PRODUCT_A]);
  expect((await json('/products')).items.some((item: any) => item.id === PRODUCT_A)).toBe(false);
  expect((await api(`/products/${PRODUCT_A}`)).status).toBe(404);
  await source.query("UPDATE product SET moderation_status='VISIBLE' WHERE id=$1", [PRODUCT_A]);

  // A Store that M3 no longer reports as active disappears from both list and detail.
  await m3.query("UPDATE store SET status='LOCKED' WHERE id=$1", [STORE]);
  expect((await json('/products')).total).toBe(0);
  expect((await api(`/products/${PRODUCT_A}`)).status).toBe(404);
  await m3.query("UPDATE store SET status='ACTIVE' WHERE id=$1", [STORE]);
});

test('search and view telemetry is written only for an authenticated caller', async () => {
  const guestCorrelation = correlations.length;
  await api('/products?q=mẫu');
  const guestSearch = correlations[guestCorrelation];
  expect(await source.query('SELECT id FROM outbox WHERE correlation_id=$1', [guestSearch])).toHaveLength(0);

  await api('/products?q=mẫu', customer);
  const search = await source.query('SELECT event_type, payload FROM outbox WHERE correlation_id=$1',
    [correlations[correlations.length - 1]]);
  expect(search).toHaveLength(1);
  expect(search[0].event_type).toBe('SearchRecorded');
  expect(search[0].payload.query).toBe('mẫu');
  expect(search[0].payload.user_id).toMatch(/^[0-9a-f-]{36}$/);

  // An empty query is a browse, not a search, so nothing personal is recorded.
  await api('/products', customer);
  expect(await source.query('SELECT id FROM outbox WHERE correlation_id=$1', [correlations[correlations.length - 1]]))
    .toHaveLength(0);
  // Guests browsing detail produce no behaviour either.
  await api(`/products/${PRODUCT_A}`);
  expect(await source.query('SELECT id FROM outbox WHERE correlation_id=$1', [correlations[correlations.length - 1]]))
    .toHaveLength(0);

  await api(`/products/${PRODUCT_A}`, customer);
  const view = await source.query('SELECT event_type, payload FROM outbox WHERE correlation_id=$1',
    [correlations[correlations.length - 1]]);
  expect(view).toHaveLength(1);
  expect(view[0].event_type).toBe('InteractionRecorded');
  expect(view[0].payload).toMatchObject({ product_id: PRODUCT_A, event_type: 'VIEW' });
});

test('an invalid token degrades to an anonymous read instead of failing the catalog', async () => {
  const response = await api('/products?q=mẫu', 'not-a-real-token');
  expect(response.status).toBe(200);
  expect(await source.query('SELECT id FROM outbox WHERE correlation_id=$1', [correlations[correlations.length - 1]]))
    .toHaveLength(0);
});
