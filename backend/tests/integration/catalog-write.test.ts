import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';

const base = process.env.TEST_API_URL ?? 'http://gateway/api/v1';
const STORE_A = '10000000-0000-4000-8000-000000000061';       // Demo Store from seed
const PRODUCT_TYPE = '10000000-0000-4000-8000-000000000071';  // Demo type, ACTIVE
const STORE_B = '00000000-0000-4000-8000-0000000000b1';       // a Store the caller does not belong to
const OWNER_MEMBERSHIP = '10000000-0000-4000-8000-000000000062';

let m1: DataSource;
let m3: DataSource;
let owner = '';
let attributeDefinition = '';
let foreignProduct = '';
let foreignVariant = '';
let ownOtherProduct = '';
let ownOtherVariant = '';
let strictProductType = '';
let strictAttribute = '';
let createdProducts: string[] = [];
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

const createBody = (over: Record<string, unknown> = {}) => ({
  product_type_id: PRODUCT_TYPE,
  title: 'Sản phẩm mới',
  description: 'Mô tả sản phẩm mới',
  attributes: { color: 'red' },
  variants: [{ sku: 'NEW-' + randomUUID().slice(0, 8), price_vnd: 123000, variant_values: {}, is_default: true }],
  ...over,
});

async function createProduct(over: Record<string, unknown> = {}) {
  const response = await call('POST', '/store/products', createBody(over), owner);
  expect(response.status).toBe(201);
  const product = await response.json() as any;
  createdProducts.push(product.id);
  return product;
}

async function seed() {
  attributeDefinition = randomUUID();
  await m1.query(`INSERT INTO attribute_definition(id,product_type_id,code,name,data_type,required,variant_factor,allowed_values,unit)
    VALUES($1,$2,'color','Màu','STRING',true,false,NULL,NULL)`, [attributeDefinition, PRODUCT_TYPE]);
  foreignProduct = randomUUID();
  await m1.query(`INSERT INTO product(id,store_id,product_type_id,title,description,attributes_json,status,moderation_status,version)
    VALUES($1,$2,$3,'Sản phẩm Store khác','other','{}','ACTIVE','VISIBLE',0)`, [foreignProduct, STORE_B, PRODUCT_TYPE]);
  // Two Variant rows that a hijacked `variants[].id` would target: one owned by another Store, one
  // owned by another Product of the same Store.
  foreignVariant = randomUUID();
  await m1.query(`INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status)
    VALUES($1,$2,$3,'FOREIGN-SKU',777000,'{}','sig-foreign',true,'ACTIVE')`, [foreignVariant, foreignProduct, STORE_B]);
  ownOtherProduct = randomUUID();
  ownOtherVariant = randomUUID();
  await m1.query(`INSERT INTO product(id,store_id,product_type_id,title,description,attributes_json,status,moderation_status,version)
    VALUES($1,$2,$3,'Sản phẩm khác cùng Store','other','{}','ACTIVE','VISIBLE',0)`, [ownOtherProduct, STORE_A, PRODUCT_TYPE]);
  await m1.query(`INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status)
    VALUES($1,$2,$3,'OWN-OTHER-SKU',888000,'{}','sig-own-other',true,'ACTIVE')`, [ownOtherVariant, ownOtherProduct, STORE_A]);
  // A second Product type that requires an attribute the demo type does not have.
  strictProductType = randomUUID();
  await m1.query(`INSERT INTO product_type(id,category_id,name,status)
    VALUES($1,'10000000-0000-4000-8000-000000000070','Strict type','ACTIVE')`, [strictProductType]);
  strictAttribute = randomUUID();
  await m1.query(`INSERT INTO attribute_definition(id,product_type_id,code,name,data_type,required,variant_factor,allowed_values,unit)
    VALUES($1,$2,'required_review','Duyệt','STRING',true,false,NULL,NULL)`, [strictAttribute, strictProductType]);
}

async function reset() {
  if (correlations.length) {
    await m1.query('DELETE FROM m1_audit WHERE request_id = ANY($1::text[])', [correlations]);
    await m1.query('DELETE FROM outbox WHERE correlation_id = ANY($1::text[])', [correlations]);
  }
  if (createdProducts.length) {
    await m1.query('DELETE FROM inventory WHERE variant_id IN (SELECT id FROM product_variant WHERE product_id = ANY($1::uuid[]))', [createdProducts]);
    await m1.query('DELETE FROM product_variant WHERE product_id = ANY($1::uuid[])', [createdProducts]);
    await m1.query('DELETE FROM product WHERE id = ANY($1::uuid[])', [createdProducts]);
  }
  if (attributeDefinition) await m1.query('DELETE FROM attribute_definition WHERE id=$1', [attributeDefinition]);
  if (strictAttribute) await m1.query('DELETE FROM attribute_definition WHERE id=$1', [strictAttribute]);
  if (foreignVariant) await m1.query('DELETE FROM product_variant WHERE id=$1', [foreignVariant]);
  if (ownOtherVariant) await m1.query('DELETE FROM product_variant WHERE id=$1', [ownOtherVariant]);
  if (foreignProduct) await m1.query('DELETE FROM product WHERE id=$1', [foreignProduct]);
  if (ownOtherProduct) await m1.query('DELETE FROM product WHERE id=$1', [ownOtherProduct]);
  if (strictProductType) await m1.query('DELETE FROM product_type WHERE id=$1', [strictProductType]);
  createdProducts = []; correlations = []; attributeDefinition = ''; foreignProduct = '';
  foreignVariant = ''; ownOtherProduct = ''; ownOtherVariant = ''; strictProductType = ''; strictAttribute = '';
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

test('createProduct writes the Product, its Variant, stock, audit and outbox together', async () => {
  const product = await createProduct({ status: 'ACTIVE', variants: [
    { sku: 'SKU-A', price_vnd: 150000, variant_values: { color: 'red' }, is_default: true },
    { sku: 'SKU-B', price_vnd: 170000, variant_values: { color: 'blue' } }] });

  // Read-back is truthful: the store scope, the status the caller asked for and both Variants.
  expect(product).toMatchObject({ store_id: STORE_A, status: 'ACTIVE', moderation_status: 'VISIBLE', version: 0,
    product_type_id: PRODUCT_TYPE, attributes: { color: 'red' } });
  expect(product.variants.map((variant: any) => variant.sku).sort()).toEqual(['SKU-A', 'SKU-B']);
  expect(product.variants.find((variant: any) => variant.sku === 'SKU-A')).toMatchObject({ price_vnd: 150000, is_default: true });

  // A new Variant is immediately visible to inventory with zero stock.
  expect(await m1.query(
    `SELECT i.quantity, i.reserved_quantity FROM inventory i
       JOIN product_variant v ON v.id=i.variant_id WHERE v.product_id=$1 ORDER BY v.sku`, [product.id]))
    .toEqual([{ quantity: 0, reserved_quantity: 0 }, { quantity: 0, reserved_quantity: 0 }]);

  const correlation = correlations[correlations.length - 1];
  expect(await m1.query('SELECT action, target_type FROM m1_audit WHERE request_id=$1', [correlation]))
    .toEqual([{ action: 'CREATE', target_type: 'Product' }]);
  const events = await m1.query('SELECT event_type, payload FROM outbox WHERE correlation_id=$1', [correlation]);
  expect(events).toHaveLength(1);
  expect(events[0].event_type).toBe('ProductChanged');
  expect(events[0].payload).toMatchObject({ store_id: STORE_A, version: 0, sale_status: 'ACTIVE', moderation_status: 'VISIBLE' });
});

test('createProduct defaults to DRAFT and an omitted single Variant becomes the default', async () => {
  const product = await createProduct({ status: undefined,
    variants: [{ sku: 'SKU-DRAFT', price_vnd: 1000, variant_values: {} }] });
  expect(product.status).toBe('DRAFT');
  expect(product.variants[0]).toMatchObject({ sku: 'SKU-DRAFT', is_default: true });
});

test('createProduct rejects an unknown Product type and attributes outside the taxonomy', async () => {
  const unknownType = await call('POST', '/store/products', createBody({ product_type_id: randomUUID() }), owner);
  expect(unknownType.status).toBe(422);
  expect((await unknownType.json() as any).code).toBe('INVALID_PRODUCT_TYPE');

  const extraAttribute = await call('POST', '/store/products', createBody({ attributes: { color: 'red', weight: 3 } }), owner);
  expect(extraAttribute.status).toBe(422);
  expect((await extraAttribute.json() as any).code).toBe('INVALID_ATTRIBUTES');

  // `color` is a required attribute definition of this Product type.
  const missingRequired = await call('POST', '/store/products', createBody({ attributes: {} }), owner);
  expect(missingRequired.status).toBe(422);
  expect((await missingRequired.json() as any).code).toBe('INVALID_ATTRIBUTES');

  // Nothing was persisted by any rejected attempt.
  expect(await m1.query("SELECT id FROM product WHERE title='Sản phẩm mới'")).toHaveLength(0);
});

test('createProduct rolls back the Product, audit and outbox when a SKU already exists', async () => {
  await createProduct({ variants: [{ sku: 'DUP-SKU', price_vnd: 1000, variant_values: {} }] });
  const before = correlations.length;
  const duplicate = await call('POST', '/store/products', createBody({
    variants: [{ sku: 'DUP-SKU', price_vnd: 2000, variant_values: {} }] }), owner);
  expect(duplicate.status).toBe(409);
  expect((await duplicate.json() as any).code).toBe('SKU_CONFLICT');

  // Only the first attempt persisted; the rejected duplicate left nothing behind in this Store.
  expect(await m1.query("SELECT count(*)::int AS n FROM product WHERE store_id=$1 AND title='Sản phẩm mới'", [STORE_A]))
    .toEqual([{ n: 1 }]);
  const correlation = correlations[before];
  expect(await m1.query('SELECT id FROM m1_audit WHERE request_id=$1', [correlation])).toHaveLength(0);
  expect(await m1.query('SELECT id FROM outbox WHERE correlation_id=$1', [correlation])).toHaveLength(0);
});

test('updateProduct applies the full payload, bumps the version and emits ProductChanged', async () => {
  const product = await createProduct();
  const response = await call('PATCH', `/store/products/${product.id}`, {
    title: 'Tên đã sửa', description: 'Mô tả đã sửa', attributes: { color: 'blue' }, status: 'ACTIVE',
    expected_version: 0 }, owner);
  expect(response.status).toBe(200);
  const updated = await response.json() as any;
  expect(updated).toMatchObject({ id: product.id, title: 'Tên đã sửa', description: 'Mô tả đã sửa',
    attributes: { color: 'blue' }, status: 'ACTIVE', version: 1 });

  const correlation = correlations[correlations.length - 1];
  expect(await m1.query('SELECT action FROM m1_audit WHERE request_id=$1', [correlation])).toEqual([{ action: 'UPDATE' }]);
  expect(await m1.query('SELECT payload FROM outbox WHERE correlation_id=$1', [correlation]))
    .toEqual([{ payload: expect.objectContaining({ product_id: product.id, version: 1, sale_status: 'ACTIVE' }) }]);
});

test('updateProduct refuses a stale version and another Store Product', async () => {
  const product = await createProduct();
  const stale = await call('PATCH', `/store/products/${product.id}`,
    { title: 'x', expected_version: 99 }, owner);
  expect(stale.status).toBe(409);
  expect((await stale.json() as any).code).toBe('VERSION_CONFLICT');

  // The caller owns Store A, so a Store B Product is simply not found for them.
  const foreign = await call('PATCH', `/store/products/${foreignProduct}`, { title: 'x', expected_version: 0 }, owner);
  expect(foreign.status).toBe(404);
  expect(await m1.query('SELECT title, version FROM product WHERE id=$1', [foreignProduct]))
    .toEqual([{ title: 'Sản phẩm Store khác', version: 0 }]);

  // A bad Product type on update is rejected the same way as on create.
  const badType = await call('PATCH', `/store/products/${product.id}`,
    { product_type_id: randomUUID(), expected_version: 0 }, owner);
  expect(badType.status).toBe(422);
  expect((await badType.json() as any).code).toBe('INVALID_PRODUCT_TYPE');
});

test('updateProduct treats variants as a replacement set and stops the removed ones', async () => {
  const product = await createProduct({ variants: [
    { sku: 'KEEP', price_vnd: 1000, variant_values: { color: 'red' }, is_default: true },
    { sku: 'DROP', price_vnd: 2000, variant_values: { color: 'green' } }] });
  const keep = product.variants.find((variant: any) => variant.sku === 'KEEP');

  const response = await call('PATCH', `/store/products/${product.id}`, {
    expected_version: 0,
    variants: [
      { id: keep.id, sku: 'KEEP', price_vnd: 1500, variant_values: { color: 'red' }, is_default: true },
      { sku: 'NEW', price_vnd: 3000, variant_values: { color: 'blue' } }] }, owner);
  expect(response.status).toBe(200);
  const updated = await response.json() as any;

  const bySku = Object.fromEntries(updated.variants.map((variant: any) => [variant.sku, variant]));
  expect(Object.keys(bySku).sort()).toEqual(['DROP', 'KEEP', 'NEW']);
  expect(bySku.KEEP).toMatchObject({ id: keep.id, price_vnd: 1500, status: 'ACTIVE' });
  expect(bySku.NEW).toMatchObject({ price_vnd: 3000, status: 'ACTIVE' });
  // A Variant missing from the payload is stopped, never deleted: stock history still references it.
  expect(bySku.DROP.status).toBe('STOPPED');
  expect(await m1.query('SELECT count(*)::int AS n FROM product_variant WHERE product_id=$1', [product.id]))
    .toEqual([{ n: 3 }]);
  expect(await m1.query(
    'SELECT count(*)::int AS n FROM inventory i JOIN product_variant v ON v.id=i.variant_id WHERE v.product_id=$1',
    [product.id])).toEqual([{ n: 3 }]);
});

test('a rejected Variant id does not touch the Product', async () => {
  const product = await createProduct();
  const response = await call('PATCH', `/store/products/${product.id}`, { expected_version: 0,
    variants: [{ id: randomUUID(), sku: 'X', price_vnd: 1, variant_values: {} }] }, owner);
  expect(response.status).toBe(404);
  expect((await response.json() as any).code).toBe('VARIANT_NOT_FOUND');
  expect(await m1.query('SELECT version FROM product WHERE id=$1', [product.id])).toEqual([{ version: 0 }]);
});

test('writing needs a Store member with product permission', async () => {
  expect((await call('POST', '/store/products', createBody(), undefined)).status).toBe(401);
  // The role guard still admits a SELLER, so demoting the owner membership exercises the permission
  // check itself, with the same still-valid token.
  await m3.query("UPDATE store_membership SET role='SELLER' WHERE id=$1", [OWNER_MEMBERSHIP]);
  const denied = await call('POST', '/store/products', createBody(), owner);
  expect(denied.status).toBe(403);
  expect((await denied.json() as any).code).toBe('FORBIDDEN');
  // A contract-valid body on purpose: the runtime DTO check runs before the handler and would answer
  // 422 for an empty change, which would hide the permission check this test is about.
  const patchResponse = await call('PATCH', `/store/products/${foreignProduct}`,
    { title: 'Không được phép', expected_version: 0 }, owner);
  const patchBody = await patchResponse.json() as any;
  expect({ status: patchResponse.status, code: patchBody.code }).toEqual({ status: 403, code: 'FORBIDDEN' });
  await m3.query("UPDATE store_membership SET role='OWNER' WHERE id=$1", [OWNER_MEMBERSHIP]);
});

test('createProduct refuses a Variant id and cannot rewrite a foreign Variant', async () => {
  const before = correlations.length;
  // `ProductCreate.variants` reuses the ProductVariant schema, so the contract accepts an id here.
  const response = await call('POST', '/store/products', createBody({
    variants: [{ id: foreignVariant, sku: 'FOREIGN-SKU', price_vnd: 1, variant_values: {} }] }), owner);
  expect(response.status).toBe(422);
  expect((await response.json() as any).code).toBe('VARIANT_ID_NOT_ALLOWED');

  // The other Store's Variant keeps its price, owner and Product.
  expect(await m1.query('SELECT price_vnd::text AS price, store_id, product_id FROM product_variant WHERE id=$1', [foreignVariant]))
    .toEqual([{ price: '777000', store_id: STORE_B, product_id: foreignProduct }]);
  // The rejected create wrote nothing: no Product, no audit, no outbox.
  expect(await m1.query("SELECT count(*)::int AS n FROM product WHERE title='Sản phẩm mới'")).toEqual([{ n: 0 }]);
  const correlation = correlations[before];
  expect(await m1.query('SELECT id FROM m1_audit WHERE request_id=$1', [correlation])).toHaveLength(0);
  expect(await m1.query('SELECT id FROM outbox WHERE correlation_id=$1', [correlation])).toHaveLength(0);
});

test('createProduct refuses a Variant id of another Product in the same Store', async () => {
  const response = await call('POST', '/store/products', createBody({
    variants: [{ id: ownOtherVariant, sku: 'OWN-OTHER-SKU', price_vnd: 1, variant_values: {} }] }), owner);
  expect(response.status).toBe(422);
  expect((await response.json() as any).code).toBe('VARIANT_ID_NOT_ALLOWED');
  expect(await m1.query('SELECT price_vnd::text AS price FROM product_variant WHERE id=$1', [ownOtherVariant]))
    .toEqual([{ price: '888000' }]);
});

test('updateProduct validates the final attributes when the Product type changes', async () => {
  const product = await createProduct();               // attributes { color: 'red' } on the demo type
  const before = correlations.length;
  // Switching type alone would keep { color } and drop the required attribute of the new type.
  const rejected = await call('PATCH', `/store/products/${product.id}`,
    { product_type_id: strictProductType, expected_version: 0 }, owner);
  expect(rejected.status).toBe(422);
  expect((await rejected.json() as any).code).toBe('INVALID_ATTRIBUTES');
  expect(await m1.query('SELECT product_type_id, version, attributes_json FROM product WHERE id=$1', [product.id]))
    .toEqual([{ product_type_id: PRODUCT_TYPE, version: 0, attributes_json: { color: 'red' } }]);
  const correlation = correlations[before];
  expect(await m1.query('SELECT id FROM m1_audit WHERE request_id=$1', [correlation])).toHaveLength(0);
  expect(await m1.query('SELECT id FROM outbox WHERE correlation_id=$1', [correlation])).toHaveLength(0);

  // Supplying the final attribute map is accepted, so the rule rejects invalid state, not the change.
  const accepted = await call('PATCH', `/store/products/${product.id}`,
    { product_type_id: strictProductType, attributes: { required_review: 'yes' }, expected_version: 0 }, owner);
  expect(accepted.status).toBe(200);
  expect(await accepted.json() as any).toMatchObject({ product_type_id: strictProductType,
    attributes: { required_review: 'yes' }, version: 1 });
});
