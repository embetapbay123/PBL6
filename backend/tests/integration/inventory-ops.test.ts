import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';

const base = process.env.TEST_API_URL ?? 'http://gateway/api/v1';
const lowStockUrl = 'http://m1:3101/internal/inventory/low-stock';
const STORE = '10000000-0000-4000-8000-000000000061';      // Demo Store from seed
const VARIANTS = ['10000000-0000-4000-8000-000000000090',  // DEMO-0
  '10000000-0000-4000-8000-000000000091',                  // DEMO-1
  '10000000-0000-4000-8000-000000000092'];                 // DEMO-2
const [VARIANT_A, VARIANT_B, VARIANT_C] = VARIANTS;
const OWNER_USER = '10000000-0000-4000-8000-000000000003'; // owner@pbl6.test, OWNER of Demo Store
const SEED_QUANTITY = 10;

let source: DataSource;
let owner = '';
let customer = '';
let operationIds: string[] = [];
let correlations: string[] = [];

async function login(email: string): Promise<string> {
  const response = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: process.env.SEED_PASSWORD, client_type: 'MOBILE' }) });
  expect(response.status).toBe(200);
  return (await response.json() as any).access_token as string;
}

function api(path: string, token?: string, init: RequestInit = {}) {
  const correlation = randomUUID();
  correlations.push(correlation);
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Correlation-Id': correlation };
  if (token) headers.Authorization = 'Bearer ' + token;
  return fetch(base + path, { ...init, headers: { ...headers, ...(init.headers as any) } });
}

const adjustBody = (variantId: string, delta: number, version: number, reason = 'Kiểm kê kho') => {
  const operationId = randomUUID();
  operationIds.push(operationId);
  return { variant_id: variantId, delta_quantity: delta, reason, operation_id: operationId, expected_version: version };
};

const adjust = (token: string, body: unknown) =>
  api('/store/inventory/adjustments', token, { method: 'POST', body: JSON.stringify(body) });

const lastCorrelation = () => correlations[correlations.length - 1];

function lowStock(body: unknown, caller = 'M2', key = process.env.M2_INTERNAL_KEY) {
  return fetch(lowStockUrl, { method: 'POST', headers: { 'Content-Type': 'application/json',
    'X-Service-Id': caller, 'X-Service-Key': key ?? '' }, body: JSON.stringify(body) });
}

/** Restore the seed baseline and drop everything the previous test created. */
async function reset() {
  if (operationIds.length) {
    await source.query('DELETE FROM stock_movement WHERE operation_id = ANY($1::uuid[])', [operationIds]);
    await source.query('DELETE FROM operation_result WHERE operation_id = ANY($1::uuid[])', [operationIds]);
  }
  if (correlations.length) await source.query('DELETE FROM m1_audit WHERE request_id = ANY($1::text[])', [correlations]);
  await source.query('UPDATE inventory SET quantity=$2, reserved_quantity=0, version=0 WHERE variant_id = ANY($1::uuid[])',
    [VARIANTS, SEED_QUANTITY]);
  operationIds = []; correlations = [];
}

beforeAll(async () => {
  source = new DataSource({ type: 'postgres', url: process.env.M1_DATABASE_URL });
  await source.initialize();
  owner = await login('owner@pbl6.test');
  customer = await login('customer1@pbl6.test');
});
beforeEach(reset);
afterAll(async () => { await reset(); await source.destroy(); });

test('stock overflow and blank adjustment reasons fail without changing stock', async () => {
  for (const body of [adjustBody(VARIANT_A, 2147483647, 0), adjustBody(VARIANT_A, 1, 0, '   ')]) {
    expect((await adjust(owner, body)).status).toBe(422);
  }
  expect(await source.query('SELECT quantity, reserved_quantity, version FROM inventory WHERE variant_id=$1', [VARIANT_A]))
    .toEqual([{ quantity: 10, reserved_quantity: 0, version: 0 }]);
  expect(await source.query('SELECT count(*)::int AS n FROM stock_movement WHERE operation_id=ANY($1::uuid[])', [operationIds])).toEqual([{ n: 0 }]);
});

test('listStoreInventory returns the caller Store stock and refuses other roles', async () => {
  const response = await api('/store/inventory', owner);
  expect(response.status).toBe(200);
  const body = await response.json() as any;
  expect(body.total).toBe(3);
  expect(body.page).toBe(1);
  expect(body.size).toBe(20);
  expect(body.items.map((item: any) => item.variant_id).sort()).toEqual([...VARIANTS].sort());
  for (const item of body.items) {
    expect(item).toMatchObject({ quantity: 10, reserved_quantity: 0, available_quantity: 10, version: 0 });
  }

  const paged = await (await api('/store/inventory?page=1&size=1', owner)).json() as any;
  expect(paged.items).toHaveLength(1);
  expect(paged.total).toBe(3);
  expect(paged.size).toBe(1);

  expect((await api('/store/inventory')).status).toBe(401);
  // A Customer holds no Store membership, so the role guard refuses before any query.
  expect((await api('/store/inventory', customer)).status).toBe(403);
});

test('adjustInventory writes stock, a movement and an audit row, and is idempotent', async () => {
  const body = adjustBody(VARIANT_A, 5, 0, 'Nhập kho kiểm kê');
  const response = await adjust(owner, body);
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ variant_id: VARIANT_A, quantity: 15, reserved_quantity: 0,
    available_quantity: 15, version: 1 });

  expect(await source.query(
    'SELECT operation_id, delta_quantity, delta_reserved, reason, actor_user_id FROM stock_movement WHERE operation_id=$1',
    [body.operation_id])).toEqual([{ operation_id: body.operation_id, delta_quantity: 5, delta_reserved: 0,
    reason: 'Nhập kho kiểm kê', actor_user_id: OWNER_USER }]);
  expect(await source.query('SELECT action, target_type, actor_user_id FROM m1_audit WHERE request_id=$1', [lastCorrelation()]))
    .toEqual([{ action: 'ADJUST', target_type: 'Inventory', actor_user_id: OWNER_USER }]);

  const replay = await adjust(owner, body);
  expect(replay.status).toBe(201);
  expect(await replay.json()).toEqual({ variant_id: VARIANT_A, quantity: 15, reserved_quantity: 0,
    available_quantity: 15, version: 1 });
  expect(await source.query('SELECT quantity, version FROM inventory WHERE variant_id=$1', [VARIANT_A]))
    .toEqual([{ quantity: 15, version: 1 }]);
  expect(await source.query('SELECT id FROM m1_audit WHERE request_id=$1', [lastCorrelation()])).toHaveLength(0);

  const conflict = await adjust(owner, { ...body, delta_quantity: 99 });
  expect(conflict.status).toBe(409);
  expect((await conflict.json() as any).code).toBe('IDEMPOTENCY_CONFLICT');
  expect(await source.query('SELECT quantity FROM inventory WHERE variant_id=$1', [VARIANT_A]))
    .toEqual([{ quantity: 15 }]);
});

test('adjustInventory enforces expected_version and the stock invariants', async () => {
  await adjust(owner, adjustBody(VARIANT_B, 5, 0));

  const stale = await adjust(owner, adjustBody(VARIANT_B, 1, 0));
  expect(stale.status).toBe(409);
  expect((await stale.json() as any).code).toBe('VERSION_CONFLICT');

  const negative = await adjust(owner, adjustBody(VARIANT_B, -100, 1));
  expect(negative.status).toBe(409);
  expect((await negative.json() as any).code).toBe('INSUFFICIENT_STOCK');

  // Stock held for Orders must survive a manual count correction.
  await source.query('UPDATE inventory SET reserved_quantity=8 WHERE variant_id=$1', [VARIANT_B]);
  expect((await adjust(owner, adjustBody(VARIANT_B, -6, 1))).status).toBe(201);
  const belowReserved = await adjust(owner, adjustBody(VARIANT_B, -2, 2));
  expect(belowReserved.status).toBe(409);
  expect((await belowReserved.json() as any).code).toBe('RESERVED_STOCK_CONFLICT');

  expect((await adjust(owner, adjustBody(randomUUID(), 1, 0))).status).toBe(404);
  expect((await api('/store/inventory/adjustments', customer, { method: 'POST',
    body: JSON.stringify(adjustBody(VARIANT_A, 1, 0)) })).status).toBe(403);
});

test('listStockMovements returns the Store history and rejects anonymous callers', async () => {
  await adjust(owner, adjustBody(VARIANT_C, 3, 0, 'Nhập bổ sung'));

  const response = await api('/store/inventory/movements', owner);
  expect(response.status).toBe(200);
  const page = await response.json() as any;
  expect(page.total).toBe(1);
  expect(page.items[0]).toMatchObject({ variant_id: VARIANT_C, delta_quantity: 3, reason: 'Nhập bổ sung' });
  expect(page.items[0].id).toBeTruthy();
  expect(page.items[0].occurred_at).toBeTruthy();
  // A manual adjustment belongs to no Order, so the optional field must be absent, not null.
  expect('order_id' in page.items[0]).toBe(false);

  const second = await (await api('/store/inventory/movements?page=2&size=1', owner)).json() as any;
  expect(second.items).toHaveLength(0);
  expect(second.total).toBe(1);
  expect((await api('/store/inventory/movements')).status).toBe(401);
});

test('ListLowStockVariants resolves the caller token with M3 and scopes to the Store', async () => {
  await source.query('UPDATE inventory SET quantity=2 WHERE variant_id=$1', [VARIANT_A]);

  const ok = await lowStock({ token: owner, store_id: STORE });
  expect(ok.status).toBe(200);
  expect(await ok.json()).toEqual({ store_id: STORE, items: [{ variant_id: VARIANT_A, available_quantity: 2 }],
    page: 1, size: 20, total: 1 });

  const narrowed = await (await lowStock({ token: owner, store_id: STORE, threshold: 1 })).json() as any;
  expect(narrowed.total).toBe(0);
  const paged = await (await lowStock({ token: owner, store_id: STORE, page: 1, size: 1 })).json() as any;
  expect(paged.items).toHaveLength(1);
  expect(paged.size).toBe(1);

  // Another Store is refused even for a Store owner, and a Customer has no Store scope at all.
  expect((await lowStock({ token: owner, store_id: randomUUID() })).status).toBe(403);
  expect((await lowStock({ token: customer, store_id: STORE })).status).toBe(403);

  expect((await lowStock({ token: owner, store_id: STORE }, 'M3', process.env.M3_INTERNAL_KEY)).status).toBe(401);
  expect((await lowStock({})).status).toBe(422);
  expect((await lowStock({ token: owner, store_id: 'not-a-uuid' })).status).toBe(422);
});
