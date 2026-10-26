// Real service HTTP + real PostgreSQL. Fault injection affects transport/transactions only.
require('reflect-metadata');
const { Client } = require('pg');
const { createHmac, randomUUID } = require('node:crypto');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { isDeepStrictEqual } = require('node:util');
const { schemaErrors } = require('../../dist/shared/src/contract-validation');
const operations = require('../../dist/shared/src/contracts.runtime.generated.json').operations;
const runId = process.env.ACCEPTANCE_RUN_ID || '';
if (process.env.PBL6_ACCEPTANCE_ISOLATED !== '1' || !/^pbl6-acceptance-[a-f0-9]{12}$/.test(runId)) {
  throw new Error('ACCEPTANCE_ISOLATION_REQUIRED');
}
const phase = process.argv[2];
if (!['payment', 'rollback-prepare', 'rollback-recover', 'expiry', 'multistore', 'authorization', 'tracking', 'chat'].includes(phase)) throw new Error('INVALID_PHASE');
const uid = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const urls = { M1: 'http://m1:3101', M2: 'http://m2:3102', M3: 'http://m3:3103', M4: 'http://m4:3104' };
const checks = [];
let correlation = 'acceptance-' + randomUUID();
const db = {};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function check(name, condition) {
  if (!condition) throw new Error('CHECK_FAILED:' + name);
  checks.push(name);
}
async function wait(name, read, accept, seconds = 45) {
  const deadline = Date.now() + seconds * 1000;
  do {
    const result = await read();
    if (accept(result)) return result;
    await delay(250);
  } while (Date.now() < deadline);
  throw new Error('WAIT_FAILED:' + name);
}
async function query(service, sql, args = []) { return (await db[service].query(sql, args)).rows; }
async function row(service, sql, args = []) { return (await query(service, sql, args))[0]; }
async function request(operation, { body, token, id, headers = {}, status, query: params = {} } = {}) {
  const spec = operations[operation];
  const search = new URLSearchParams(params).toString();
  const route = spec.route.replace('{id}', id) + (search ? '?' + search : '');
  const response = await fetch(urls[spec.service] + (spec.internal ? '' : '/api/v1') + route, {
    method: spec.method, headers: { 'content-type': 'application/json', 'x-correlation-id': correlation,
      ...(token ? { authorization: 'Bearer ' + token } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000),
  });
  const json = await response.json();
  const expected = status || Number(Object.keys(spec.responses)[0]);
  if (response.status !== expected) {
    // Never print arbitrary response bodies, tokens, bank fields or addresses.
    const code = /^[A-Z_]{1,100}$/.test(json.code || '') ? json.code : 'REDACTED';
    throw Object.assign(new Error(`HTTP_FAILED:${operation}:${response.status}:${code}:expected_${expected}`),{status:response.status,code});
  }
  if (response.status < 300) {
    const errors = schemaErrors(json, spec.responses[String(response.status)]);
    if (errors.length) throw new Error(`SCHEMA_FAILED:${operation}:` + errors.map(e => e.field).join(','));
  }
  assert.equal(response.headers.get('x-correlation-id'), correlation, 'CORRELATION_NOT_PRESERVED');
  return json;
}
async function login(email = 'customer1@pbl6.test') {
  return (await request('login', { body: { email, password: process.env.SEED_PASSWORD, client_type: 'MOBILE' } })).access_token;
}
async function control(fault) {
  const response = await fetch('http://inventory-fault:3111/__control', {
    method: fault === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', 'x-acceptance-key': process.env.ACCEPTANCE_CONTROL_KEY },
    ...(fault === undefined ? {} : { body: JSON.stringify({ fault }) }), signal: AbortSignal.timeout(5000),
  });
  assert.equal(response.status, 200, 'FAULT_CONTROL_FAILED');
  return response.json();
}
async function prepare(token, variant = 90, method = 'SANDBOX') {
  correlation = 'acceptance-' + randomUUID();
  const address = await request('createAddress', { token, body: { recipient_name: 'Acceptance only',
    phone: '0900000000', line1: 'Isolated fixture', ward: 'Test ward', district: 'Test district', city: 'Test city' } });
  const item = await request('addCartItem', { token, body: { product_id: uid(variant - 10), variant_id: uid(variant), quantity: 1 } });
  const input = { cart_item_ids: [item.id], address_id: address.id, payment_methods: { [uid(61)]: method } };
  const quote = await request('quoteCheckout', { token, body: input });
  return { item_id: item.id, key: randomUUID(), input: { ...input, quote_id: quote.quote_id,
    expected_payable_total_vnd: quote.payable_total_vnd }, correlation };
}
async function confirm(token, prepared, status = 201) {
  return request('confirmCheckout', { token, body: prepared.input,
    headers: { 'idempotency-key': prepared.key }, status });
}
async function stock(variant = 90) { return row('M1', 'SELECT quantity,reserved_quantity FROM inventory WHERE variant_id=$1', [uid(variant)]); }
async function order(id) { return row('M2', 'SELECT * FROM "order" WHERE id=$1', [id]); }
async function state(id) { return row('M2', 'SELECT * FROM order_inventory_state WHERE order_id=$1', [id]); }
async function movementCount(id, delta) {
  return (await row('M1', 'SELECT count(*)::int AS n FROM stock_movement WHERE order_id=$1 AND delta_quantity=$2', [id, delta])).n;
}
function event(attempt, amount, id) {
  return { id, gateway: 'MBBank', transactionDate: '2026-10-22 10:30:00', accountNumber: process.env.SEPAY_TEST_ACCOUNT,
    code: attempt.provider_reference, content: attempt.provider_reference + ' controlled acceptance',
    transferType: 'in', transferAmount: amount, accumulated: amount, subAccount: null,
    referenceCode: 'ACCEPTANCE' + id, description: 'Local signed callback; no bank transfer' };
}
async function callback(body, status = 200, valid = true) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = 'sha256=' + createHmac('sha256', valid ? process.env.SEPAY_WEBHOOK_SECRET : 'invalid')
    .update(timestamp + '.' + JSON.stringify(body)).digest('hex');
  return request('sepayCallback', { body, status, headers: { 'x-sepay-timestamp': timestamp, 'x-sepay-signature': signature } });
}
async function payment(token) {
  const prepared = await prepare(token);
  const result = await confirm(token, prepared);
  const id = result.order_ids[0];
  check('Online Order initially waits for payment', (await order(id)).status === 'AWAITING_PAYMENT');
  const attempt = await request('createPaymentAttempt', { token, id, body: { expected_order_version: result.orders[0].version } });
  const before = await stock();
  const payload = event(attempt, result.payable_total_vnd, 99001);
  await callback(payload, 401, false);
  await callback({ ...payload, transferAmount: payload.transferAmount + 1 }, 422);
  check('Rejected callbacks have no persisted receipt', (await row('M2', 'SELECT count(*)::int AS n FROM payment_callback_receipt')).n === 0);
  await control({ path: '/internal/inventory/consume', order_id: id, mode: 'reject' });
  await Promise.all([callback(payload), callback(payload), callback(payload)]);
  await wait('recovering after actual inventory outage', () => order(id), o => o.status === 'RECOVERING');
  // The callback can persist RECOVERING before the worker actually sends Consume.
  // Observe the rejected transport attempt before changing the fault to lose-ack.
  await wait('actual Consume reaches the rejecting proxy', control,
    result => result.calls.some(c => c.path.endsWith('/consume') && c.outcome === 'REJECTED'));
  const paid = await row('M2', 'SELECT status,collected_vnd,payable_vnd FROM payment WHERE order_id=$1', [id]);
  check('Payment is durable before inventory success', paid.status === 'SUCCEEDED' &&
    paid.collected_vnd === paid.payable_vnd && paid.collected_vnd === String(result.payable_total_vnd));
  check('Rejected Consume leaves real inventory unchanged', JSON.stringify(await stock()) === JSON.stringify(before));
  check('Follow-up is pending while inventory is unavailable', (await row('M2', 'SELECT status FROM payment_followup WHERE order_id=$1', [id])).status === 'PENDING');
  await control({ path: '/internal/inventory/consume', order_id: id, mode: 'lose-ack' });
  await wait('M1 applies consume before lost acknowledgement', () => movementCount(id, -1), n => n === 1);
  await wait('proxy drops real M1 acknowledgement', control, result => result.calls.some(c => c.outcome === 'REAL_EFFECT_ACK_LOST'));
  check('Lost acknowledgement leaves M2 recovery pending', (await state(id)).command_kind === 'CONSUME');
  await control(null);
  await wait('worker resumes exact command', () => order(id), o => o.status === 'PENDING');
  const after = await stock();
  check('Real M1 stock is consumed once', after.quantity === before.quantity - 1 && after.reserved_quantity === before.reserved_quantity - 1 && await movementCount(id, -1) === 1);
  const followup = await row('M2', 'SELECT status,resolution FROM payment_followup WHERE order_id=$1', [id]);
  check('Follow-up completes after real Consume', followup.status === 'DONE' && followup.resolution === 'CONSUMED');
  // Compare all calls for this one order's operation, including the failed transport attempt.
  const all = (await control()).calls.filter(c => c.path.endsWith('/consume'));
  check('Retries preserve operation ID, payload hash and correlation', all.length >= 3 &&
    new Set(all.map(c => c.operation_id)).size === 1 && new Set(all.map(c => c.payload_sha256)).size === 1 &&
    all.every(c => c.correlation_id === prepared.correlation));
  await callback(payload);
  await callback({ ...payload, content: payload.content + ' changed' }, 409);
  check('Concurrent/replayed callback produces one receipt/event', (await row('M2', 'SELECT count(*)::int AS n FROM payment_callback_receipt WHERE event_id=$1', ['99001'])).n === 1 &&
    (await row('M2', 'SELECT count(*)::int AS n FROM payment_event WHERE provider_event_id=$1', ['SEPAY_TEST:99001'])).n === 1);
  const replay = await confirm(token, prepared);
  check('Confirm replays its saved response', isDeepStrictEqual(replay, result));
  await request('confirmCheckout', { token, status: 409, headers: { 'idempotency-key': prepared.key },
    body: { ...prepared.input, expected_payable_total_vnd: prepared.input.expected_payable_total_vnd + 1 } });
  const stranger = await login('customer2@pbl6.test');
  await request('getOwnOrder', { token: stranger, id, status: 404 });
  const p = await row('M2', 'SELECT id FROM payment WHERE order_id=$1', [id]);
  await request('getPayment', { token: stranger, id: p.id, status: 404 });
  check('Second Customer cannot read Order or Payment', true);
  check('Replays preserve one consume effect', await movementCount(id, -1) === 1);
}
async function rollbackPrepare(token) {
  const prepared = await prepare(token, 91, 'COD');
  await db.M2.query(`CREATE FUNCTION acceptance.fail_payment() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF (SELECT fail_payment FROM acceptance.environment) THEN
      RAISE EXCEPTION 'controlled transaction fault' USING ERRCODE='40001'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER acceptance_payment_fault BEFORE INSERT ON payment FOR EACH ROW EXECUTE FUNCTION acceptance.fail_payment();
    UPDATE acceptance.environment SET fail_payment=true;`);
  const counts = 'SELECT (SELECT count(*) FROM "order") AS orders,(SELECT count(*) FROM payment) AS payments,' +
    '(SELECT count(*) FROM order_item) AS items,(SELECT count(*) FROM order_status_history) AS history,' +
    '(SELECT count(*) FROM c_o_d_collection) AS cod,(SELECT count(*) FROM m2_audit) AS audits';
  const before = await row('M2', counts);
  await confirm(token, prepared, 503);
  const attempt = await row('M2', 'SELECT * FROM checkout_attempt WHERE key=$1', [prepared.key]);
  check('Database failure preserves durable READY attempt', attempt.phase === 'READY');
  const after = await row('M2', counts);
  check('Payment failure rolls back Order/items/history/Payment/COD/audit transaction', isDeepStrictEqual(after, before));
  check('Rollback keeps Cart item', !!await row('M2', 'SELECT id FROM cart_item WHERE id=$1', [prepared.item_id]));
  const id = attempt.plan_json.storeOrders[0].orderId;
  check('Real M1 reservation survives uncertain database outcome', (await row('M1', 'SELECT count(*)::int AS n FROM inventory_reservation WHERE order_id=$1', [id])).n === 1);
  fs.writeFileSync('/evidence/recovery.private.json', JSON.stringify({ prepared, order_id: id }));
  await db.M2.query('UPDATE acceptance.environment SET fail_payment=false');
}
async function rollbackRecover(token) {
  const saved = JSON.parse(fs.readFileSync('/evidence/recovery.private.json', 'utf8'));
  await wait('restarted worker finishes durable checkout', () => order(saved.order_id), o => o?.status === 'PENDING');
  const response = await confirm(token, saved.prepared);
  check('Restart resumes same Order/attempt', response.order_ids.length === 1 && response.order_ids[0] === saved.order_id);
  check('Restart creates exactly one Payment', (await row('M2', 'SELECT count(*)::int AS n FROM payment WHERE order_id=$1', [saved.order_id])).n === 1);
  check('Restart consumes actual stock once', await movementCount(saved.order_id, -1) === 1);
  check('Restart removes only the committed Cart item', !await row('M2', 'SELECT id FROM cart_item WHERE id=$1', [saved.prepared.item_id]));
  const attempt = await row('M2', 'SELECT phase FROM checkout_attempt WHERE key=$1', [saved.prepared.key]);
  check('Checkout attempt is durably COMMITTED', attempt.phase === 'COMMITTED');
  await db.M2.query('DROP TRIGGER acceptance_payment_fault ON payment; DROP FUNCTION acceptance.fail_payment()');
}
async function expiry(token) {
  const prepared = await prepare(token, 92);
  const result = await confirm(token, prepared), id = result.order_ids[0];
  const sibling = await row('M2', 'SELECT id,status,version FROM "order" WHERE id<>$1 ORDER BY created_at LIMIT 1', [id]);
  const attempt = await request('createPaymentAttempt', { token, id, body: { expected_order_version: result.orders[0].version } });
  const before = await stock(92);
  // Advance only this fixture's deadline; never alter system clock or application code.
  await db.M2.query('UPDATE "order" SET payment_expires_at=now()-interval \'1 second\' WHERE id=$1', [id]);
  await wait('worker expires and releases reservation', () => state(id), s => s.state === 'RELEASED');
  check('Expired order restores reserved availability', (await order(id)).status === 'EXPIRED' &&
    (await stock(92)).quantity === before.quantity && (await stock(92)).reserved_quantity === before.reserved_quantity - 1);
  const payload = event(attempt, result.payable_total_vnd, 99002);
  await callback(payload);
  await wait('late callback creates Refund request', () => row('M2', 'SELECT * FROM refund WHERE order_id=$1', [id]), r => !!r);
  await callback(payload);
  const refund = await row('M2', 'SELECT * FROM refund WHERE order_id=$1', [id]);
  check('Late callback queues Refund without claiming money returned', refund.status === 'REQUESTED' &&
    String(refund.amount_vnd) === String(result.payable_total_vnd) &&
    (await row('M2', 'SELECT count(*)::int AS n FROM refund_job WHERE refund_id=$1', [refund.id])).n === 1);
  check('Refund follow-up stays pending without a provider', (await row('M2', 'SELECT status,kind FROM payment_followup WHERE order_id=$1', [id])).status === 'PENDING');
  check('Late callback never consumes closed order stock', await movementCount(id, -1) === 0);
  check('Unrelated Order is unchanged', JSON.stringify(await row('M2', 'SELECT id,status,version FROM "order" WHERE id=$1', [sibling.id])) === JSON.stringify(sibling));
}
async function main() {
  for (const service of ['M1', 'M2', 'M3', 'M4']) {
    db[service] = new Client({ connectionString: process.env[service + '_DATABASE_URL'], statement_timeout: 10000 });
    await db[service].connect();
    if (phase === 'payment') {
      // Empty transactional ledgers are mandatory before claiming this fresh database.
      const table = { M1: 'stock_movement', M2: 'checkout_attempt', M3: 'address', M4: 'inbox' }[service];
      check(service + ' starts with an empty acceptance ledger', (await row(service, `SELECT count(*)::int AS n FROM ${table}`)).n === 0);
      await db[service].query('CREATE SCHEMA acceptance; CREATE TABLE acceptance.environment(run_id text PRIMARY KEY,fail_payment boolean NOT NULL DEFAULT false)');
      await db[service].query('INSERT INTO acceptance.environment(run_id) VALUES($1)', [runId]);
    }
    check(service + ' database belongs to this run', (await row(service, 'SELECT run_id FROM acceptance.environment')).run_id === runId);
  }
  for (const service of ['M1', 'M2', 'M3', 'M4']) {
    await wait(service + ' ready', async () => {
      try { return (await fetch(urls[service] + '/health/ready', { signal: AbortSignal.timeout(2000) })).status; }
      catch { return 0; }
    }, status => status === 200);
  }
  const token = await login(['chat', 'multistore'].includes(phase) ? 'customer2@pbl6.test' : undefined);
  if (['tracking', 'chat', 'multistore', 'authorization'].includes(phase)) {
    await require('./' + phase + '.cjs')({ token, db, check, wait, query, row, request, login, uid,
      control, callback, event, order, state, stock, movementCount,
      correlation: () => correlation, newCorrelation: () => (correlation = 'acceptance-' + randomUUID()) });
  } else await ({ payment, 'rollback-prepare': rollbackPrepare, 'rollback-recover': rollbackRecover, expiry }[phase])(token);
}
const started = Date.now();
main().then(() => {
  fs.writeFileSync(`/evidence/${phase}.json`, JSON.stringify({ phase, status: 'PASS', checks,
    duration_ms: Date.now() - started }, null, 2) + '\n');
  console.log(JSON.stringify({ phase, status: 'PASS', checks: checks.length }));
}).catch(error => {
  const failure = /^(CHECK_FAILED|WAIT_FAILED|HTTP_FAILED|SCHEMA_FAILED):/.test(error.message) ? error.message :
    'HARNESS_FAILURE:' + (String(error.code || '').match(/^[A-Z0-9_]{1,30}$/)?.[0] || 'REDACTED') +
    [error.table, error.column].filter(v => typeof v === 'string' && /^[a-z_]{1,60}$/.test(v)).map(v => ':' + v).join('');
  fs.writeFileSync(`/evidence/${phase}.json`, JSON.stringify({ phase, status: 'FAIL', checks, failure }, null, 2) + '\n');
  console.error(failure);
  process.exitCode = 1;
}).finally(async () => { await Promise.allSettled(Object.values(db).map(client => client.end())); });
