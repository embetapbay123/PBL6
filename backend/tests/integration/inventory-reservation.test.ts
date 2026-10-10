import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';

// Internal routes are served without the /api/v1 prefix and are reachable only inside compose.
const reserveUrl = 'http://m1:3101/internal/inventory/reserve';
const consumeUrl = 'http://m1:3101/internal/inventory/consume';
const releaseUrl = 'http://m1:3101/internal/inventory/release';

const STORE = '10000000-0000-4000-8000-000000000061';      // Demo Store from seed
const VARIANTS = ['10000000-0000-4000-8000-000000000090',  // DEMO-0
  '10000000-0000-4000-8000-000000000091',                  // DEMO-1
  '10000000-0000-4000-8000-000000000092'];                 // DEMO-2
const [VARIANT_A, VARIANT_B, VARIANT_C] = VARIANTS;
const SEED_QUANTITY = 10;
const FUTURE = '2030-01-01T00:00:00Z';

let source: DataSource;
let operationIds: string[] = [];
let orderIds: string[] = [];

function post(url: string, body: unknown, caller = 'M2', key = process.env.M2_INTERNAL_KEY) {
  return fetch(url, { method: 'POST', headers: {
    'Content-Type': 'application/json', 'X-Service-Id': caller, 'X-Service-Key': key ?? '', 'X-Correlation-Id': randomUUID(),
  }, body: JSON.stringify(body) });
}

const reserveBody = (orderId: string, items: Array<{ variant_id: string; quantity: number }>, expiresAt = FUTURE) => {
  const body = { operation_id: randomUUID(), purchase_group_id: randomUUID(), expires_at: expiresAt,
    items: items.map(item => ({ ...item, store_id: STORE, order_id: orderId })) };
  operationIds.push(body.operation_id); orderIds.push(orderId);
  return body;
};

const commandBody = (orderId: string, reservationIds: string[], extra: Record<string, unknown> = {}) => {
  const body = { operation_id: randomUUID(), order_id: orderId, reservation_ids: reservationIds, ...extra };
  operationIds.push(body.operation_id); orderIds.push(orderId);
  return body;
};

const stock = (variantId: string) =>
  source.query('SELECT quantity, reserved_quantity, version FROM inventory WHERE variant_id=$1', [variantId]);

/** Restore the seed baseline and drop everything the previous test created, so tests stay independent. */
async function reset() {
  if (operationIds.length) await source.query('DELETE FROM stock_movement WHERE operation_id = ANY($1::uuid[])', [operationIds]);
  if (orderIds.length) {
    await source.query(`DELETE FROM reservation_item WHERE reservation_id IN
      (SELECT id FROM inventory_reservation WHERE order_id = ANY($1::uuid[]))`, [orderIds]);
    await source.query('DELETE FROM inventory_reservation WHERE order_id = ANY($1::uuid[])', [orderIds]);
  }
  if (operationIds.length) await source.query('DELETE FROM operation_result WHERE operation_id = ANY($1::uuid[])', [operationIds]);
  await source.query('UPDATE inventory SET quantity=$2, reserved_quantity=0, version=0 WHERE variant_id = ANY($1::uuid[])',
    [VARIANTS, SEED_QUANTITY]);
  operationIds = []; orderIds = [];
}

async function reserveOne(orderId: string, variantId: string, quantity: number) {
  const response = await post(reserveUrl, reserveBody(orderId, [{ variant_id: variantId, quantity }]));
  expect(response.status).toBe(200);
  const body = await response.json() as any;
  return body.reservations[0] as { id: string };
}

const reservationState = (reservationId: string) => source.query(
  `SELECT r.status, i.status AS item_status FROM inventory_reservation r
     JOIN reservation_item i ON i.reservation_id = r.id WHERE r.id=$1`, [reservationId]);

beforeAll(async () => {
  source = new DataSource({ type: 'postgres', url: process.env.M1_DATABASE_URL });
  await source.initialize();
});
beforeEach(reset);
afterAll(async () => { await reset(); await source.destroy(); });

test('ReserveInventory enforces the M2 caller allowlist and strict input', async () => {
  const body = reserveBody(randomUUID(), [{ variant_id: VARIANT_A, quantity: 1 }]);
  for (const [caller, key] of [['M3', process.env.M3_INTERNAL_KEY], ['M4', process.env.M4_INTERNAL_KEY]] as const) {
    expect((await post(reserveUrl, body, caller, key)).status).toBe(401);
  }
  const line = { variant_id: VARIANT_A, store_id: STORE, order_id: body.items[0].order_id, quantity: 0 };
  for (const bad of [{}, { ...body, items: [] }, { ...body, items: [line] },
    { ...body, expires_at: 'not-a-date' }, { ...body, extra: true }]) {
    expect((await post(reserveUrl, bad)).status).toBe(422);
  }
  // Validation runs before any stock is touched.
  expect(await stock(VARIANT_A)).toEqual([{ quantity: 10, reserved_quantity: 0, version: 0 }]);
});

test('ReserveInventory holds every line once and is idempotent per operation id', async () => {
  const orderId = randomUUID();
  const body = reserveBody(orderId, [{ variant_id: VARIANT_A, quantity: 2 }, { variant_id: VARIANT_B, quantity: 3 }]);

  const first = await post(reserveUrl, body);
  expect(first.status).toBe(200);
  const result = await first.json() as any;
  // One reservation per Order covers both Variants, so the id repeats while each line is reported.
  expect(result.reservations).toHaveLength(2);
  expect(result.reservations[0].id).toBe(result.reservations[1].id);
  expect(result.reservations[0].expires_at).toBe('2030-01-01T00:00:00.000Z');
  expect(await stock(VARIANT_A)).toEqual([{ quantity: 10, reserved_quantity: 2, version: 1 }]);
  expect(await stock(VARIANT_B)).toEqual([{ quantity: 10, reserved_quantity: 3, version: 1 }]);
  expect(await source.query('SELECT count(*)::int AS n FROM stock_movement WHERE operation_id=$1', [body.operation_id]))
    .toEqual([{ n: 2 }]);

  const replay = await post(reserveUrl, body);
  expect(replay.status).toBe(200);
  expect(await replay.json()).toEqual(result);
  expect(await stock(VARIANT_A)).toEqual([{ quantity: 10, reserved_quantity: 2, version: 1 }]);

  const conflict = await post(reserveUrl, { ...body,
    items: [{ variant_id: VARIANT_A, store_id: STORE, order_id: orderId, quantity: 9 }] });
  expect(conflict.status).toBe(409);
  expect((await conflict.json() as any).code).toBe('IDEMPOTENCY_CONFLICT');

  const otherOperation = await post(reserveUrl, reserveBody(orderId, [{ variant_id: VARIANT_A, quantity: 1 }]));
  expect(otherOperation.status).toBe(409);
  expect((await otherOperation.json() as any).code).toBe('RESERVATION_EXISTS');
});

test('ReserveInventory holds nothing when a single line is short', async () => {
  const orderId = randomUUID();
  const response = await post(reserveUrl, reserveBody(orderId, [
    { variant_id: VARIANT_A, quantity: 5 }, { variant_id: VARIANT_B, quantity: 11 }]));
  expect(response.status).toBe(409);
  expect((await response.json() as any).code).toBe('INSUFFICIENT_STOCK');
  // Atomic: the affordable line must not be held either.
  expect(await stock(VARIANT_A)).toEqual([{ quantity: 10, reserved_quantity: 0, version: 0 }]);
  expect(await stock(VARIANT_B)).toEqual([{ quantity: 10, reserved_quantity: 0, version: 0 }]);
  expect(await source.query('SELECT count(*)::int AS n FROM inventory_reservation WHERE order_id=$1', [orderId]))
    .toEqual([{ n: 0 }]);
});

test('concurrent reservations never oversell the last unit', async () => {
  await source.query('UPDATE inventory SET quantity=1, reserved_quantity=0, version=0 WHERE variant_id=$1', [VARIANT_C]);
  const first = reserveBody(randomUUID(), [{ variant_id: VARIANT_C, quantity: 1 }]);
  const second = reserveBody(randomUUID(), [{ variant_id: VARIANT_C, quantity: 1 }]);
  const statuses = (await Promise.all([post(reserveUrl, first), post(reserveUrl, second)])).map(r => r.status).sort();
  expect(statuses).toEqual([200, 409]);
  expect(await stock(VARIANT_C)).toEqual([{ quantity: 1, reserved_quantity: 1, version: 1 }]);
  const created = await source.query('SELECT id FROM inventory_reservation WHERE order_id = ANY($1::uuid[])',
    [[first.items[0].order_id, second.items[0].order_id]]);
  expect(created).toHaveLength(1);
});

test('competing commands for one Order on disjoint variants return a business conflict', async () => {
  const orderId = randomUUID();
  const first = reserveBody(orderId, [{ variant_id: VARIANT_A, quantity: 1 }]);
  const second = reserveBody(orderId, [{ variant_id: VARIANT_B, quantity: 1 }]);
  const responses = await Promise.all([post(reserveUrl, first), post(reserveUrl, second)]);
  expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
  expect((await responses.find(response => response.status === 409)!.json() as any).code).toBe('RESERVATION_EXISTS');
  expect(await source.query('SELECT count(*)::int AS n FROM inventory_reservation WHERE order_id=$1', [orderId])).toEqual([{ n: 1 }]);
  expect(await source.query('SELECT sum(reserved_quantity)::int AS n FROM inventory WHERE variant_id=ANY($1::uuid[])', [[VARIANT_A, VARIANT_B]])).toEqual([{ n: 1 }]);
});

test('a reserve replay after expiry returns the original result without another hold', async () => {
  const orderId = randomUUID();
  const expiresAt = new Date(Date.now() + 1500).toISOString();
  const body = reserveBody(orderId, [{ variant_id: VARIANT_A, quantity: 2 }], expiresAt);
  const first = await post(reserveUrl, body);
  expect(first.status).toBe(200);
  const result = await first.json();
  await new Promise(resolve => setTimeout(resolve, Math.max(0, Date.parse(expiresAt) - Date.now() + 50)));
  const replay = await post(reserveUrl, body);
  expect(replay.status).toBe(200);
  expect(await replay.json()).toEqual(result);
  expect(await stock(VARIANT_A)).toEqual([{ quantity: 10, reserved_quantity: 2, version: 1 }]);
  const conflict = await post(reserveUrl, { ...body, items: [{ ...body.items[0], quantity: 3 }] });
  expect(conflict.status).toBe(409);
  expect((await conflict.json() as any).code).toBe('IDEMPOTENCY_CONFLICT');
});

test('ConsumeReservation is applied once and reports an already applied replay', async () => {
  const orderId = randomUUID();
  const reservation = await reserveOne(orderId, VARIANT_A, 4);

  const consume = commandBody(orderId, [reservation.id]);
  const response = await post(consumeUrl, consume);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ operation_id: consume.operation_id, status: 'APPLIED' });
  // Consume ships goods: stock and hold both drop together.
  expect(await stock(VARIANT_A)).toEqual([{ quantity: 6, reserved_quantity: 0, version: 2 }]);
  expect(await reservationState(reservation.id)).toEqual([{ status: 'CONSUMED', item_status: 'CONSUMED' }]);

  expect(await (await post(consumeUrl, consume)).json()).toEqual({ operation_id: consume.operation_id, status: 'APPLIED' });
  expect(await stock(VARIANT_A)).toEqual([{ quantity: 6, reserved_quantity: 0, version: 2 }]);

  const again = commandBody(orderId, [reservation.id]);
  expect(await (await post(consumeUrl, again)).json()).toEqual({ operation_id: again.operation_id, status: 'ALREADY_APPLIED' });
  expect(await stock(VARIANT_A)).toEqual([{ quantity: 6, reserved_quantity: 0, version: 2 }]);

  const conflict = await post(releaseUrl, commandBody(orderId, [reservation.id]));
  expect(conflict.status).toBe(409);
  expect((await conflict.json() as any).code).toBe('RESERVATION_STATE_CONFLICT');
});

test('ReleaseReservation frees the hold without touching physical stock', async () => {
  const orderId = randomUUID();
  const reservation = await reserveOne(orderId, VARIANT_B, 5);
  expect(await stock(VARIANT_B)).toEqual([{ quantity: 10, reserved_quantity: 5, version: 1 }]);

  const release = commandBody(orderId, [reservation.id], { reason: 'CUSTOMER_CANCELLED' });
  expect(await (await post(releaseUrl, release)).json()).toEqual({ operation_id: release.operation_id, status: 'APPLIED' });
  expect(await stock(VARIANT_B)).toEqual([{ quantity: 10, reserved_quantity: 0, version: 2 }]);
  expect(await reservationState(reservation.id)).toEqual([{ status: 'RELEASED', item_status: 'RELEASED' }]);

  const again = commandBody(orderId, [reservation.id]);
  expect(await (await post(releaseUrl, again)).json()).toEqual({ operation_id: again.operation_id, status: 'ALREADY_APPLIED' });
  expect(await stock(VARIANT_B)).toEqual([{ quantity: 10, reserved_quantity: 0, version: 2 }]);
});

test('expiry blocks consume but still allows release', async () => {
  const orderId = randomUUID();
  const reservation = await reserveOne(orderId, VARIANT_A, 3);
  await source.query("UPDATE inventory_reservation SET expires_at = now() - interval '1 minute' WHERE id=$1", [reservation.id]);

  const expired = await post(consumeUrl, commandBody(orderId, [reservation.id]));
  expect(expired.status).toBe(409);
  expect((await expired.json() as any).code).toBe('RESERVATION_EXPIRED');
  expect(await stock(VARIANT_A)).toEqual([{ quantity: 10, reserved_quantity: 3, version: 1 }]);

  expect((await post(releaseUrl, commandBody(orderId, [reservation.id]))).status).toBe(200);
  expect(await stock(VARIANT_A)).toEqual([{ quantity: 10, reserved_quantity: 0, version: 2 }]);
});

test('unknown or foreign reservations are reported as not found', async () => {
  const orderId = randomUUID();
  const reservation = await reserveOne(orderId, VARIANT_A, 1);

  expect((await post(consumeUrl, commandBody(orderId, [randomUUID()]))).status).toBe(404);

  const response = await post(releaseUrl, commandBody(randomUUID(), [reservation.id]));
  expect(response.status).toBe(404);
  expect((await response.json() as any).code).toBe('RESERVATION_NOT_FOUND');
  // A rejected command must not consume or release the row it could not claim.
  expect(await reservationState(reservation.id)).toEqual([{ status: 'ACTIVE', item_status: 'ACTIVE' }]);
});
