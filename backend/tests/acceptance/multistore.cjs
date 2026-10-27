const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const fs = require('node:fs');

module.exports = async function multistore(t) {
  const { token, check, wait, request, query, row, login, uid, control, callback, event, order, state, stock, movementCount } = t;
  const { storeA, storeB } = await require('./fixtures.cjs')(t);
  const ownerA = await login('owner@pbl6.test'), ownerB = await login('owner-two@pbl6.test'), admin = await login('admin@pbl6.test');
  const voucher = (code, scope, discount_value) => ({ code, scope, discount_type: 'FIXED', discount_value,
    min_goods_vnd: 0, starts_at: new Date(Date.now() - 3600000).toISOString(), ends_at: new Date(Date.now() + 86400000).toISOString(), usage_limit: 1, per_customer_limit: 1 });
  const va = await request('createStoreVoucher', { token: ownerA, body: voucher('MIX-A', 'STORE', 1001) });
  const vb = await request('createStoreVoucher', { token: ownerB, body: voucher('MIX-B', 'STORE', 1002) });
  const vp = await request('createPlatformVoucher', { token: admin, body: voucher('MIX-PLATFORM', 'PLATFORM', 101) });
  const address = await request('createAddress', { token, body: { recipient_name: 'Mixed fixture', phone: '0900000000',
    line1: 'Isolated acceptance', ward: 'Test', district: 'Test', city: 'Test' } });
  const a = await request('addCartItem', { token, body: { product_id: uid(80), variant_id: uid(90), quantity: 1 } });
  const b = await request('addCartItem', { token, body: { product_id: uid(1080), variant_id: uid(1090), quantity: 1 } });
  const stockA = await stock(90), stockB = await stock(1090);
  const input = { cart_item_ids: [b.id, a.id], address_id: address.id, payment_methods: { [storeB]: 'SANDBOX', [storeA]: 'COD' },
    store_vouchers: { [storeB]: vb.code, [storeA]: va.code }, platform_voucher_code: vp.code };
  const quote = await request('quoteCheckout', { token, body: input });
  check('Two-Store quote preserves exact integer discounts and shipping', quote.stores.length === 2 && quote.payable_total_vnd === 204897 &&
    quote.stores.reduce((n, s) => n + s.amounts.platform_discount_vnd, 0) === 101 &&
    quote.stores.every(s => s.amounts.goods_vnd - s.amounts.store_discount_vnd - s.amounts.platform_discount_vnd + s.amounts.shipping_vnd === s.amounts.payable_vnd));
  const key = randomUUID(), body = { ...input, quote_id: quote.quote_id, expected_payable_total_vnd: quote.payable_total_vnd };
  // A one-second internal timeout can leave a durable checkout pending. Reconcile the
  // original command explicitly; never create another key or change its quote/body.
  const result = await require('./replay-confirm.cjs')(request,{token,body,key});
  const cod = result.orders.find(o => o.store_id === storeA), online = result.orders.find(o => o.store_id === storeB);
  check('One real Confirm commits two Store Orders and correct methods', result.order_ids.length === 2 && cod.payment_method === 'COD' && online.payment_method === 'SANDBOX' &&
    result.payable_total_vnd === quote.payable_total_vnd && result.orders.every(o => isDeepStrictEqual(o.amounts, quote.stores.find(s => s.store_id === o.store_id).amounts)));
  const redemptions = () => query('M2', 'SELECT voucher_id,order_id,discount_vnd FROM voucher_redemption WHERE purchase_group_id=$1 ORDER BY voucher_id,order_id', [result.purchase_group_id]);
  const ledger = await redemptions();
  check('Store and platform voucher allocations commit atomically with both Payments', ledger.length === 4 &&
    (await row('M2', 'SELECT count(*)::int AS n FROM payment WHERE order_id=ANY($1::uuid[])', [result.order_ids])).n === 2 &&
    ledger.filter(r => r.voucher_id === vp.id).reduce((n, r) => n + Number(r.discount_vnd), 0) === 101);
  await wait('COD Consume acknowledged by real M1', () => order(cod.id), o => o.status === 'PENDING');
  check('Online Store remains reserved while COD Store consumes independently', (await state(online.id)).state === 'RESERVED' &&
    await movementCount(cod.id, -1) === 1 && await movementCount(online.id, -1) === 0);
  const attempt = await request('createPaymentAttempt', { token, id: online.id, body: { expected_order_version: (await order(online.id)).version } });
  const paidEvent = event(attempt, online.amounts.payable_vnd, 99003);
  await callback(paidEvent);
  await wait('Online sibling consumes after actual signed callback', () => order(online.id), o => o.status === 'PENDING');
  const sibling = async () => ({ order: await row('M2', 'SELECT id,status,version,payable_vnd FROM "order" WHERE id=$1', [cod.id]),
    payment: await row('M2', 'SELECT id,status,collected_vnd,refunded_vnd,version FROM payment WHERE order_id=$1', [cod.id]), stock: await stock(90) });
  const beforeSibling = await sibling();
  await control({ path: '/internal/inventory/restock', order_id: online.id, mode: 'lose-ack' });
  const cancelled = await request('cancelOwnOrder', { token, id: online.id,
    body: { expected_version: (await order(online.id)).version, reason: 'Controlled single-Store cancellation' } });
  check('Paid cancellation requests Refund without inventing provider success', cancelled.status === 'CANCELLED' && cancelled.refund_status === 'REQUESTED');
  await wait('Real Restock is applied before its acknowledgement is lost', control,
    r => r.calls.some(c => c.path.endsWith('/restock') && c.outcome === 'REAL_EFFECT_ACK_LOST'));
  check('Lost Restock ACK preserves its immutable pending command', (await state(online.id)).command_kind === 'RESTOCK');
  await control(null);
  await wait('Worker reconciles Restock acknowledgement', () => state(online.id), s => s.state === 'RESTOCKED' && !s.command_kind);
  check('Restock replay has one effect and restores only the canceled Store stock', await movementCount(online.id, 1) === 1 &&
    (await stock(1090)).quantity === stockB.quantity && (await stock(1090)).reserved_quantity === stockB.reserved_quantity &&
    (await stock(90)).quantity === stockA.quantity - 1);
  check('Cancel/recovery leaves the sibling Order, Payment and stock unchanged', isDeepStrictEqual(await sibling(), beforeSibling));
  check('Cancellation preserves committed voucher redemptions and group quota', isDeepStrictEqual(await redemptions(), ledger) &&
    (await request('getPlatformVoucherUsage', { token: admin, id: vp.id })).remaining_count === 0 &&
    (await request('getStoreVoucherUsage', { token: ownerB, id: vb.id })).remaining_count === 0);
  await callback(paidEvent);
  await request('cancelOwnOrder', { token, id: online.id, status: 409, body: { expected_version: cancelled.version - 1 } });
  const refund = await row('M2', 'SELECT id,status,amount_vnd FROM refund WHERE order_id=$1', [online.id]);
  check('Callback/cancel replay cannot duplicate Refund or mark money returned', refund.status === 'REQUESTED' && Number(refund.amount_vnd) === online.amounts.payable_vnd &&
    (await row('M2', 'SELECT count(*)::int AS n FROM refund_job WHERE refund_id=$1', [refund.id])).n === 1 &&
    (await row('M2', 'SELECT refunded_vnd FROM payment WHERE order_id=$1', [online.id])).refunded_vnd === '0');
  const replay = await request('confirmCheckout', { token, body, headers: { 'idempotency-key': key } });
  check('Group Confirm replay returns the immutable original response without reopening canceled Orders', isDeepStrictEqual(replay, result) && (await order(online.id)).status === 'CANCELLED');
  const foreign = await login('customer1@pbl6.test');
  await request('getPurchaseGroupOrders', { token: foreign, id: result.purchase_group_id, status: 404 });
  const read = await request('getPurchaseGroupOrders', { token, id: result.purchase_group_id });
  check('Owned group read exposes current statuses and exact total', read.orders.find(o => o.id === online.id).status === 'CANCELLED' && read.orders.find(o => o.id === cod.id).status === 'PENDING' && read.payable_total_vnd === quote.payable_total_vnd);
  const codCanceled = await request('cancelStoreOrder', { token: ownerA, id: cod.id,
    body: { expected_version: (await order(cod.id)).version, reason: 'Controlled independent COD cancellation' } });
  await wait('Store cancellation restocks consumed COD inventory', () => state(cod.id), s => s.state === 'RESTOCKED' && !s.command_kind);
  check('Store COD cancellation follows the 200 contract, restores stock and creates no Refund', codCanceled.status === 'CANCELLED' &&
    (await stock(90)).quantity === stockA.quantity && (await stock(90)).reserved_quantity === stockA.reserved_quantity &&
    !(await row('M2', 'SELECT id FROM refund WHERE order_id=$1', [cod.id])));
  fs.writeFileSync('/evidence/multistore.private.json', JSON.stringify({ group: result.purchase_group_id, cod: cod.id, online: online.id,
    payment: (await row('M2', 'SELECT id FROM payment WHERE order_id=$1', [online.id])).id, address: address.id,
    vouchers: { a: va.id, b: vb.id, platform: vp.id } }));
};
