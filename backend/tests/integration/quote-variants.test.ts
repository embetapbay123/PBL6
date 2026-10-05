import { DataSource } from 'typeorm';

// Internal route is served without the /api/v1 prefix and is reachable only inside the compose network.
const route = 'http://m1:3101/internal/variants/quote';
const STORE = '10000000-0000-4000-8000-000000000061';          // Demo Store, ACTIVE in seed
const VARIANT = '10000000-0000-4000-8000-000000000090';        // DEMO-0, 100000 VND, quantity 10
const SECOND_VARIANT = '10000000-0000-4000-8000-000000000091'; // DEMO-1, 150000 VND, quantity 10
const UNKNOWN_VARIANT = '00000000-0000-4000-8000-0000000000ff';
const FOREIGN_STORE = '00000000-0000-4000-8000-0000000000aa';
const CORRELATION = 'quote-variants-integration';

const line = (variant_id = VARIANT, store_id = STORE, quantity = 2) => ({ variant_id, store_id, quantity });

function call(body: unknown, { caller = 'M2', key = process.env.M2_INTERNAL_KEY, correlation = CORRELATION }:
  { caller?: string; key?: string; correlation?: string } = {}) {
  return fetch(route, { method: 'POST', headers: {
    'Content-Type': 'application/json', 'X-Service-Id': caller, 'X-Service-Key': key ?? '', 'X-Correlation-Id': correlation,
  }, body: JSON.stringify(body) });
}

test('QuoteVariants enforces the M2 caller allowlist', async () => {
  const rejected = [['M3', process.env.M3_INTERNAL_KEY], ['M4', process.env.M4_INTERNAL_KEY], ['M2', 'not-the-real-key']] as const;
  for (const [caller, key] of rejected) {
    const response = await call({ items: [line()] }, { caller, key });
    expect(response.status).toBe(401);
    expect((await response.json() as any).code).toBe('INVALID_SERVICE_IDENTITY');
  }
});

test('QuoteVariants rejects malformed input with 422 and keeps the correlation id', async () => {
  const bodies: unknown[] = [{}, { items: [] }, { items: [line('not-a-uuid')] }, { items: [line(VARIANT, STORE, 0)] },
    { items: [line(VARIANT, STORE, -1)] }, { items: [{ ...line(), extra: true }] },
    { items: Array.from({ length: 101 }, () => line()) }];
  for (const body of bodies) {
    const response = await call(body);
    expect(response.status).toBe(422);
    const error = await response.json() as any;
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.correlation_id).toBe(CORRELATION);
    expect(response.headers.get('X-Correlation-Id')).toBe(CORRELATION);
  }
});

test('QuoteVariants returns the current price, stock and version snapshot', async () => {
  const response = await call({ items: [line(VARIANT, STORE, 2), line(SECOND_VARIANT, STORE, 1)] });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ items: [
    { variant_id: VARIANT, store_id: STORE, quantity: 2, price_vnd: 100000, available_quantity: 10, version: 0 },
    { variant_id: SECOND_VARIANT, store_id: STORE, quantity: 1, price_vnd: 150000, available_quantity: 10, version: 0 },
  ] });
});

test('QuoteVariants never reserves, deducts or writes stock', async () => {
  const source = new DataSource({ type: 'postgres', url: process.env.M1_DATABASE_URL }); await source.initialize();
  try {
    const stock = () => source.query('SELECT quantity, reserved_quantity, version FROM inventory WHERE variant_id=$1', [VARIANT]);
    const reservations = () => source.query('SELECT count(*)::int AS total FROM inventory_reservation');
    const before = await stock(); const reservationsBefore = await reservations();
    expect((await call({ items: [line(VARIANT, STORE, 4)] })).status).toBe(200);
    expect(await stock()).toEqual(before);
    expect(await reservations()).toEqual(reservationsBefore);
  } finally { await source.destroy(); }
});

test('QuoteVariants reports unknown Variant, foreign Store and short stock explicitly', async () => {
  const missing = await call({ items: [line(UNKNOWN_VARIANT)] });
  expect(missing.status).toBe(404);
  expect((await missing.json() as any).code).toBe('VARIANT_NOT_FOUND');

  const foreign = await call({ items: [line(VARIANT, FOREIGN_STORE)] });
  expect(foreign.status).toBe(404);
  expect((await foreign.json() as any).code).toBe('VARIANT_NOT_FOUND');

  const shortStock = await call({ items: [line(VARIANT, STORE, 11)] });
  expect(shortStock.status).toBe(409);
  const error = await shortStock.json() as any;
  expect(error.code).toBe('INSUFFICIENT_STOCK');
  expect(error.correlation_id).toBe(CORRELATION);
});

test('QuoteVariants refuses a hidden Product and restores the seed state', async () => {
  const source = new DataSource({ type: 'postgres', url: process.env.M1_DATABASE_URL }); await source.initialize();
  const product = '(SELECT product_id FROM product_variant WHERE id=$1)';
  try {
    await source.query(`UPDATE product SET moderation_status='HIDDEN' WHERE id=${product}`, [VARIANT]);
    const response = await call({ items: [line()] });
    expect(response.status).toBe(409);
    expect((await response.json() as any).code).toBe('PRODUCT_UNAVAILABLE');
  } finally {
    await source.query(`UPDATE product SET moderation_status='VISIBLE' WHERE id=${product}`, [VARIANT]);
    await source.destroy();
  }
});

test('QuoteVariants refuses a Store that is no longer active', async () => {
  const source = new DataSource({ type: 'postgres', url: process.env.M3_DATABASE_URL }); await source.initialize();
  try {
    await source.query("UPDATE store SET status='LOCKED' WHERE id=$1", [STORE]);
    const response = await call({ items: [line()] });
    expect(response.status).toBe(409);
    expect((await response.json() as any).code).toBe('STORE_UNAVAILABLE');
  } finally {
    await source.query("UPDATE store SET status='ACTIVE' WHERE id=$1", [STORE]);
    await source.destroy();
  }
});
