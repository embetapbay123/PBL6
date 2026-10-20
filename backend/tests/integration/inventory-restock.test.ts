import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { InventoryRepository } from '../../catalog-service/src/inventory/inventory.repository';

// Internal routes are served without the /api/v1 prefix and are reachable only inside compose.
const route = (path: string) => 'http://m1:3101/internal/inventory' + path;
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

function post(path: string, body: unknown, caller = 'M2', key = process.env.M2_INTERNAL_KEY) {
  return fetch(route(path), { method: 'POST', headers: { 'Content-Type': 'application/json',
    'X-Service-Id': caller, 'X-Service-Key': key ?? '' }, body: JSON.stringify(body) });
}

const track = <T extends { operation_id: string }>(body: T, orderId: string): T => {
  operationIds.push(body.operation_id); orderIds.push(orderId); return body;
};

const restockBody = (orderId: string, items: Array<{ variant_id: string; quantity: number }>) =>
  track({ operation_id: randomUUID(), order_id: orderId,
    items: items.map(item => ({ ...item, store_id: STORE })) }, orderId);

const stock = (variantId: string) =>
  source.query('SELECT quantity, reserved_quantity FROM inventory WHERE variant_id=$1', [variantId]);

async function reserveAndConsume(orderId: string, items: Array<{ variant_id: string; quantity: number }>) {
  const reserve = track({ operation_id: randomUUID(), purchase_group_id: randomUUID(), expires_at: FUTURE,
    items: items.map(item => ({ ...item, store_id: STORE, order_id: orderId })) }, orderId);
  const reserved = await post('/reserve', reserve);
  expect(reserved.status).toBe(200);
  const reservationId = (await reserved.json() as any).reservations[0].id as string;
  const consume = track({ operation_id: randomUUID(), order_id: orderId, reservation_ids: [reservationId] }, orderId);
  expect((await post('/consume', consume)).status).toBe(200);
  return reservationId;
}

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

beforeAll(async () => {
  source = new DataSource({ type: 'postgres', url: process.env.M1_DATABASE_URL });
  await source.initialize();
});
beforeEach(reset);
afterAll(async () => { await reset(); await source.destroy(); });

test('RestockOrder returns stock exactly once for a consumed Order', async () => {
  const orderId = randomUUID();
  await reserveAndConsume(orderId, [{ variant_id: VARIANT_A, quantity: 2 }, { variant_id: VARIANT_B, quantity: 3 }]);
  // Consume shipped the goods, so the hold is already cleared and physical stock is short.
  expect(await stock(VARIANT_A)).toEqual([{ quantity: 8, reserved_quantity: 0 }]);
  expect(await stock(VARIANT_B)).toEqual([{ quantity: 7, reserved_quantity: 0 }]);

  const body = restockBody(orderId, [{ variant_id: VARIANT_A, quantity: 2 }, { variant_id: VARIANT_B, quantity: 3 }]);
  const response = await post('/restock', body);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ operation_id: body.operation_id, status: 'APPLIED' });
  expect(await stock(VARIANT_A)).toEqual([{ quantity: 10, reserved_quantity: 0 }]);
  expect(await stock(VARIANT_B)).toEqual([{ quantity: 10, reserved_quantity: 0 }]);
  expect(await source.query(
    "SELECT delta_quantity, delta_reserved, reason, operation_id FROM stock_movement WHERE order_id=$1 AND reason='RESTOCK' ORDER BY delta_quantity",
    [orderId])).toEqual([
    { delta_quantity: 2, delta_reserved: 0, reason: 'RESTOCK', operation_id: body.operation_id },
    { delta_quantity: 3, delta_reserved: 0, reason: 'RESTOCK', operation_id: body.operation_id },
  ]);

  // Same operation id replays the stored result; a new id hits the business guard.
  expect(await (await post('/restock', body)).json()).toEqual({ operation_id: body.operation_id, status: 'APPLIED' });
  const again = restockBody(orderId, [{ variant_id: VARIANT_A, quantity: 2 }, { variant_id: VARIANT_B, quantity: 3 }]);
  expect(await (await post('/restock', again)).json()).toEqual({ operation_id: again.operation_id, status: 'ALREADY_APPLIED' });
  expect(await stock(VARIANT_A)).toEqual([{ quantity: 10, reserved_quantity: 0 }]);
});

test('RestockOrder refuses an Order that was never consumed', async () => {
  const orderId = randomUUID();
  const reserve = track({ operation_id: randomUUID(), purchase_group_id: randomUUID(), expires_at: FUTURE,
    items: [{ variant_id: VARIANT_A, quantity: 4, store_id: STORE, order_id: orderId }] }, orderId);
  const reserved = await post('/reserve', reserve);
  const reservationId = (await reserved.json() as any).reservations[0].id as string;
  expect(await stock(VARIANT_A)).toEqual([{ quantity: 10, reserved_quantity: 4 }]);

  const active = await post('/restock', restockBody(orderId, [{ variant_id: VARIANT_A, quantity: 4 }]));
  expect(active.status).toBe(409);
  expect((await active.json() as any).code).toBe('RESTOCK_NOT_ALLOWED');
  // Nothing was returned: the hold is untouched because the stock was never taken.
  expect(await stock(VARIANT_A)).toEqual([{ quantity: 10, reserved_quantity: 4 }]);

  const release = track({ operation_id: randomUUID(), order_id: orderId, reservation_ids: [reservationId] }, orderId);
  expect((await post('/release', release)).status).toBe(200);
  const released = await post('/restock', restockBody(orderId, [{ variant_id: VARIANT_A, quantity: 4 }]));
  expect(released.status).toBe(409);
  expect(await stock(VARIANT_A)).toEqual([{ quantity: 10, reserved_quantity: 0 }]);
});

test('RestockOrder rejects a request that does not match the consumed lines', async () => {
  const orderId = randomUUID();
  await reserveAndConsume(orderId, [{ variant_id: VARIANT_A, quantity: 4 }]);

  for (const items of [[{ variant_id: VARIANT_A, quantity: 5 }],
    [{ variant_id: VARIANT_A, quantity: 4 }, { variant_id: VARIANT_B, quantity: 1 }],
    [{ variant_id: VARIANT_B, quantity: 4 }]]) {
    const response = await post('/restock', restockBody(orderId, items));
    expect(response.status).toBe(409);
    expect((await response.json() as any).code).toBe('RESTOCK_MISMATCH');
  }
  expect(await stock(VARIANT_A)).toEqual([{ quantity: 6, reserved_quantity: 0 }]);
  expect((await post('/restock', restockBody(orderId, [{ variant_id: VARIANT_A, quantity: 4 }]))).status).toBe(200);
  expect(await stock(VARIANT_A)).toEqual([{ quantity: 10, reserved_quantity: 0 }]);
});

test('concurrent restock requests still add the stock only once', async () => {
  const orderId = randomUUID();
  await reserveAndConsume(orderId, [{ variant_id: VARIANT_A, quantity: 3 }]);

  const [first, second] = await Promise.all([
    post('/restock', restockBody(orderId, [{ variant_id: VARIANT_A, quantity: 3 }])),
    post('/restock', restockBody(orderId, [{ variant_id: VARIANT_A, quantity: 3 }])),
  ]);
  expect([(await first.json() as any).status, (await second.json() as any).status].sort()).toEqual(['ALREADY_APPLIED', 'APPLIED']);
  expect(await stock(VARIANT_A)).toEqual([{ quantity: 10, reserved_quantity: 0 }]);
  expect(await source.query("SELECT count(*)::int AS n FROM stock_movement WHERE order_id=$1 AND reason='RESTOCK'", [orderId]))
    .toEqual([{ n: 1 }]);
});

test('RestockOrder reports an unknown Order, a foreign caller and bad input', async () => {
  expect((await post('/restock', restockBody(randomUUID(), [{ variant_id: VARIANT_A, quantity: 1 }]))).status).toBe(404);
  expect((await post('/restock', restockBody(randomUUID(), [{ variant_id: VARIANT_A, quantity: 1 }]), 'M3', process.env.M3_INTERNAL_KEY))
    .status).toBe(401);
  expect((await post('/restock', {})).status).toBe(422);
  expect((await post('/restock', { operation_id: randomUUID(), order_id: 'not-a-uuid', items: [] })).status).toBe(422);
});

test('an expired hold is reported but never released or restocked automatically', async () => {
  const orderId = randomUUID();
  const reserve = track({ operation_id: randomUUID(), purchase_group_id: randomUUID(), expires_at: FUTURE,
    items: [{ variant_id: VARIANT_C, quantity: 4, store_id: STORE, order_id: orderId }] }, orderId);
  const reserved = await post('/reserve', reserve);
  const reservationId = (await reserved.json() as any).reservations[0].id as string;
  await source.query("UPDATE inventory_reservation SET expires_at = now() - interval '1 hour' WHERE id=$1", [reservationId]);

  // M1 exposes the overdue hold for reconciliation, read-only.
  const overdue = await new InventoryRepository(source.manager).overdueReservations(100);
  expect(overdue.some(row => row.order_id === orderId && row.reserved_quantity === 4)).toBe(true);

  // It is not released by anything M1 does on its own: the hold is still there.
  expect(await stock(VARIANT_C)).toEqual([{ quantity: 10, reserved_quantity: 4 }]);
  // Restock refuses it because the reservation was never consumed.
  const blocked = await post('/restock', restockBody(orderId, [{ variant_id: VARIANT_C, quantity: 4 }]));
  expect(blocked.status).toBe(409);
  expect((await blocked.json() as any).code).toBe('RESTOCK_NOT_ALLOWED');
  expect(await stock(VARIANT_C)).toEqual([{ quantity: 10, reserved_quantity: 4 }]);

  // Only M2's explicit release clears it, and it still works on an expired hold.
  const release = track({ operation_id: randomUUID(), order_id: orderId, reservation_ids: [reservationId] }, orderId);
  expect((await post('/release', release)).status).toBe(200);
  expect(await stock(VARIANT_C)).toEqual([{ quantity: 10, reserved_quantity: 0 }]);
  const remaining = await new InventoryRepository(source.manager).overdueReservations(100);
  expect(remaining.some(row => row.order_id === orderId)).toBe(false);
});
