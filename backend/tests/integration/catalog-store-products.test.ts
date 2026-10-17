import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';

const base = process.env.TEST_API_URL ?? 'http://gateway/api/v1';
const STORE_A = '10000000-0000-4000-8000-000000000061';       // Demo Store from seed
const PRODUCT_TYPE = '10000000-0000-4000-8000-000000000071';
const PRODUCTS_A = ['10000000-0000-4000-8000-000000000080',
  '10000000-0000-4000-8000-000000000081',
  '10000000-0000-4000-8000-000000000082'];
const CUSTOMER_2 = '10000000-0000-4000-8000-000000000002';
const SELLER_PERMISSION = 'product.store.*';

// A second Store with its own Seller, created per test and removed afterwards.
const STORE_B = randomUUID();
const APPLICATION_B = randomUUID();
const MEMBERSHIP_B = randomUUID();

let m1: DataSource;
let m3: DataSource;
let owner = '';
let sellerB = '';
let productB = '';
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

/** A second active Store whose Seller is customer2, with one purchasable Product. */
async function seedStoreB() {
  productB = randomUUID();
  await m3.query(`INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status,submitted_at,version)
    VALUES($1,$2,'Second Store','second','APPROVED',now(),0)`, [APPLICATION_B, CUSTOMER_2]);
  await m3.query(`INSERT INTO store(id,application_id,name,slug,description,contact,shipping_fee_vnd,status,version)
    VALUES($1,$2,'Second Store','second-store','Test only','second',0,'ACTIVE',0)`, [STORE_B, APPLICATION_B]);
  await m3.query(`INSERT INTO store_membership(id,store_id,user_id,role,status,joined_at,version)
    VALUES($1,$2,$3,'SELLER','ACTIVE',now(),0)`, [MEMBERSHIP_B, STORE_B, CUSTOMER_2]);
  await m3.query(`INSERT INTO permission(id,code,resource,action) VALUES($1,$2,'product','store')
    ON CONFLICT (code) DO NOTHING`, [randomUUID(), SELLER_PERMISSION]);
  await grantSellerPermission();
  await m1.query(`INSERT INTO product(id,store_id,product_type_id,title,description,attributes_json,status,moderation_status,version)
    VALUES($1,$2,$3,'Sản phẩm Store B','Store B only','{}','ACTIVE','VISIBLE',0)`, [productB, STORE_B, PRODUCT_TYPE]);
}

function grantSellerPermission() {
  return m3.query(`INSERT INTO membership_permission(membership_id,permission_id,granted_at,version)
    SELECT $1,id,now(),0 FROM permission WHERE code=$2 ON CONFLICT DO NOTHING`, [MEMBERSHIP_B, SELLER_PERMISSION]);
}

async function reset() {
  if (correlations.length) await m1.query('DELETE FROM outbox WHERE correlation_id = ANY($1::text[])', [correlations]);
  await m1.query("UPDATE product SET status='ACTIVE', moderation_status='VISIBLE' WHERE id = ANY($1::uuid[])", [PRODUCTS_A]);
  await m1.query("UPDATE product_variant SET status='ACTIVE' WHERE product_id = ANY($1::uuid[])", [PRODUCTS_A]);
  if (productB) {
    await m1.query('DELETE FROM product_variant WHERE product_id=$1', [productB]);
    await m1.query('DELETE FROM product WHERE id=$1', [productB]);
  }
  await m3.query('DELETE FROM membership_permission WHERE membership_id=$1', [MEMBERSHIP_B]);
  await m3.query('DELETE FROM store_membership WHERE id=$1', [MEMBERSHIP_B]);
  await m3.query('DELETE FROM store WHERE id=$1', [STORE_B]);
  await m3.query('DELETE FROM store_application WHERE id=$1', [APPLICATION_B]);
  correlations = [];
}

beforeAll(async () => {
  m1 = new DataSource({ type: 'postgres', url: process.env.M1_DATABASE_URL });
  m3 = new DataSource({ type: 'postgres', url: process.env.M3_DATABASE_URL });
  await m1.initialize();
  await m3.initialize();
  owner = await login('owner@pbl6.test');
  sellerB = await login('customer2@pbl6.test');
});
beforeEach(async () => { await reset(); await seedStoreB(); });
afterAll(async () => {
  await reset();
  await m3.query('DELETE FROM permission WHERE code=$1', [SELLER_PERMISSION]);
  await m3.destroy(); await m1.destroy();
});

test('listStoreProducts shows only purchasable Products of that Store', async () => {
  const page = await json(`/stores/${STORE_A}/products`);
  expect(page.total).toBe(3);
  expect(page.items.map((item: any) => item.id).sort()).toEqual([...PRODUCTS_A].sort());

  // DRAFT and HIDDEN Products must not reach a shopper.
  await m1.query("UPDATE product SET status='DRAFT' WHERE id=$1", [PRODUCTS_A[0]]);
  await m1.query("UPDATE product SET moderation_status='HIDDEN' WHERE id=$1", [PRODUCTS_A[1]]);
  const filtered = await json(`/stores/${STORE_A}/products`);
  expect(filtered.total).toBe(1);
  expect(filtered.items[0].id).toBe(PRODUCTS_A[2]);

  // A stopped Variant disappears from the public list of the same Product.
  await m1.query("UPDATE product_variant SET status='STOPPED' WHERE product_id=$1", [PRODUCTS_A[2]]);
  expect((await json(`/stores/${STORE_A}/products`)).items[0].variants).toEqual([]);

  expect((await api(`/stores/${randomUUID()}/products`)).status).toBe(404);
  expect((await api('/stores/not-a-uuid/products')).status).toBe(422);
});

test('a Store that M3 no longer reports as active answers 404', async () => {
  await m3.query("UPDATE store SET status='LOCKED' WHERE id=$1", [STORE_A]);
  expect((await api(`/stores/${STORE_A}/products`)).status).toBe(404);
  await m3.query("UPDATE store SET status='ACTIVE' WHERE id=$1", [STORE_A]);
  expect((await api(`/stores/${STORE_A}/products`)).status).toBe(200);
});

test('listOwnStoreProducts returns the management view including drafts and hidden rows', async () => {
  await m1.query("UPDATE product SET status='DRAFT' WHERE id=$1", [PRODUCTS_A[0]]);
  await m1.query("UPDATE product SET moderation_status='HIDDEN' WHERE id=$1", [PRODUCTS_A[1]]);
  await m1.query("UPDATE product_variant SET status='STOPPED' WHERE product_id=$1", [PRODUCTS_A[2]]);

  const page = await json('/store/products', owner);
  expect(page.total).toBe(3);
  // The Seller must still see their own drafts and hidden rows, unlike the public list.
  expect(page.items.map((item: any) => item.id).sort()).toEqual([...PRODUCTS_A].sort());
  expect(page.items.find((item: any) => item.id === PRODUCTS_A[0]).status).toBe('DRAFT');
  expect(page.items.find((item: any) => item.id === PRODUCTS_A[1]).moderation_status).toBe('HIDDEN');
  // A stopped Variant is visible in management mode so it can be fixed.
  expect(page.items.find((item: any) => item.id === PRODUCTS_A[2]).variants).toHaveLength(1);

  const paged = await json('/store/products?page=1&size=2', owner);
  expect(paged.items).toHaveLength(2);
  expect(paged.size).toBe(2);
  expect(paged.total).toBe(3);

  expect((await api('/store/products')).status).toBe(401);
});

test('two Stores cannot read each other management list and a Seller needs the permission', async () => {
  const asSellerB = await json('/store/products', sellerB);
  expect(asSellerB.total).toBe(1);
  expect(asSellerB.items[0].id).toBe(productB);

  const asOwnerA = await json('/store/products', owner);
  expect(asOwnerA.items.some((item: any) => item.id === productB)).toBe(false);
  expect(asOwnerA.items.some((item: any) => PRODUCTS_A.includes(item.id))).toBe(true);

  // Revoking the group refuses the very next call with the same still-valid token.
  await m3.query('DELETE FROM membership_permission WHERE membership_id=$1', [MEMBERSHIP_B]);
  expect((await api('/store/products', sellerB)).status).toBe(403);
  await grantSellerPermission();
  expect((await json('/store/products', sellerB)).total).toBe(1);

  // The second Store is public data, so its purchasable Products are visible through the public route.
  const publicB = await json(`/stores/${STORE_B}/products`);
  expect(publicB.total).toBe(1);
  expect(publicB.items[0].id).toBe(productB);
});
