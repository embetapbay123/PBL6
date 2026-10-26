const fs = require('node:fs');

module.exports = async function authorization(t) {
  const { token: customer, request, check, query, row, login, uid } = t;
  const fixture = JSON.parse(fs.readFileSync('/evidence/multistore.private.json', 'utf8'));
  const other = await login('customer2@pbl6.test'), ownerA = await login('owner@pbl6.test'), ownerB = await login('owner-two@pbl6.test');
  const sellerA = await login('seller-one@pbl6.test'), sellerB = await login('seller-two@pbl6.test'), admin = await login('admin@pbl6.test');
  await request('getProduct', { id: uid(80), status: 401, headers: { 'x-service-id':'M2','x-service-key':'forged-identity' } });
  await request('getProduct', { id: uid(80), headers: { 'x-service-id':'M2','x-service-key':process.env.M2_INTERNAL_KEY } });
  check('Service Catalog budget requires actual service authentication', true);
  for (const operation of ['listOwnOrders', 'listCartItems', 'listAddresses', 'listOwnStoreProducts', 'listUsers', 'getAiMetrics']) {
    await request(operation, { status: 401 });
  }
  check('Guest is rejected across M1/M2/M3/M4 protected APIs', true);
  for (const actor of [customer, ownerA, sellerA]) await request('listUsers', { token: actor, status: 403 });
  await request('listOwnStoreProducts', { token: admin, status: 403 });
  await request('getAiMetrics', { token: sellerA, status: 403 });
  check('Global Admin, Customer and Store roles do not imply one another', true);
  for (const [actor, store] of [[ownerA, uid(61)], [sellerA, uid(61)], [ownerB, uid(1061)], [sellerB, uid(1061)]]) {
    const products = await request('listOwnStoreProducts', { token: actor, query: { size: 100 } });
    check('Live Store membership scopes every returned Product', products.items.length > 0 && products.items.every(p => p.store_id === store));
  }
  for (const operation of ['getOwnOrder', 'getOrderRefund']) await request(operation, { token: customer, id: fixture.online, status: 404 });
  await request('getPayment', { token: customer, id: fixture.payment, status: 404 });
  await request('getPurchaseGroupOrders', { token: customer, id: fixture.group, status: 404 });
  await request('deleteAddress', { token: customer, id: fixture.address, status: 404 });
  const item = await request('addCartItem', { token: other, body: { product_id: uid(1080), variant_id: uid(1090), quantity: 1 } });
  await request('removeCartItem', { token: customer, id: item.id, status: 404 });
  await request('removeCartItem', { token: other, id: item.id });
  check('Cross-Customer Order/group/Payment/Refund/Address/Cart access is hidden as 404', true);
  for (const actor of [ownerB, sellerB]) await request('getStoreOrder', { token: actor, id: fixture.cod, status: 404 });
  for (const actor of [ownerA, sellerA]) await request('getStoreOrder', { token: actor, id: fixture.online, status: 404 });
  await request('updateProduct', { token: sellerA, id: uid(1080), status: 404, body: { expected_version: 0, title: 'Must not change' } });
  await request('getStoreVoucherUsage', { token: ownerA, id: fixture.vouchers.b, status: 404 });
  await request('getStoreVoucherUsage', { token: sellerA, id: fixture.vouchers.a, status: 403 });
  await request('collectCod', { token: sellerB, id: fixture.cod, status: 404,
    body: { expected_version: (await row('M2', 'SELECT version FROM "order" WHERE id=$1', [fixture.cod])).version, amount_collected_vnd: 1 } });
  check('Cross-Store Product writes, Orders, COD and Voucher usage are denied', true);
  const own = await request('getStoreOrder', { token: sellerA, id: fixture.cod });
  for (const [code, operation, input] of [
    ['product.store.read_write', 'listOwnStoreProducts', {}],
    ['inventory.store.read_adjust', 'listStoreInventory', {}],
    ['order.store.read_status_cancel', 'listStoreOrders', {}],
    ['cod.store.collect', 'collectCod', { id: fixture.cod, body: { expected_version: own.version, amount_collected_vnd: own.amounts.payable_vnd } }],
  ]) {
    const permission = await row('M3', 'SELECT id FROM permission WHERE code=$1', [code]);
    await query('M3', 'DELETE FROM membership_permission WHERE membership_id=$1 AND permission_id=$2', [uid(1063), permission.id]);
    try {
      await request(operation, { token: sellerA, status: 403, ...input });
      check('Existing Seller JWT immediately loses ' + code + ' after live grant revocation', true);
    } finally {
      await query('M3', 'INSERT INTO membership_permission(membership_id,permission_id,granted_at) VALUES($1,$2,now())', [uid(1063), permission.id]);
    }
    await request(operation, { token: sellerA, ...(operation === 'collectCod' ? { status: 409 } : {}), ...input });
  }
  // Direct fixture grant changes test enforcement, not the unfinished M3 permission-management API.
  await query('M3', "UPDATE store_membership SET status='LOCKED',version=version+1 WHERE id=$1", [uid(1063)]);
  await request('listOwnStoreProducts', { token: sellerA, status: 403 });
  await request('listStoreOrders', { token: sellerA, status: 403 });
  await query('M3', "UPDATE store_membership SET status='ACTIVE',version=version+1 WHERE id=$1", [uid(1063)]);
  await request('listOwnStoreProducts', { token: sellerA });
  check('Membership lock is effective on the old JWT without revoking unrelated Customers', true);
  await request('listCartItems', { token: customer });
  const store = await row('M3', 'SELECT version FROM store WHERE id=$1', [uid(1061)]);
  await request('updateStoreState', { token: admin, id: uid(1061), body: { expected_version: store.version, status: 'LOCKED', reason: 'Isolated authorization control' } });
  await request('listOwnStoreProducts', { token: ownerB, status: 403 });
  await request('listStoreOrders', { token: sellerB, status: 403 });
  await request('getProduct', { id: uid(1080), status: 404 });
  await request('getProduct', { id: uid(1080), status: 404, headers: { 'x-service-id':'M2','x-service-key':process.env.M2_INTERNAL_KEY } });
  await request('getRelatedProducts', { id: uid(1080), status: 404 });
  await request('getProduct', { id: uid(80) });
  await request('listOwnStoreProducts', { token: ownerA });
  await request('updateStoreState', { token: admin, id: uid(1061), body: { expected_version: store.version + 1, status: 'ACTIVE', reason: 'Restore isolated fixture' } });
  await request('listOwnStoreProducts', { token: ownerB });
  check('Actual Store lock blocks only its own Store and current public/Related reads', true);
  const user = await row('M3', 'SELECT version FROM "user" WHERE id=$1', [uid(1007)]);
  await request('updateUserState', { token: admin, id: uid(1007), body: { expected_version: user.version, status: 'LOCKED', reason: 'Isolated session revocation' } });
  await request('getProfile', { token: sellerB, status: 401 });
  await request('listStoreOrders', { token: sellerB, status: 401 });
  await request('updateUserState', { token: admin, id: uid(1007), body: { expected_version: user.version + 1, status: 'ACTIVE', reason: 'Restore isolated fixture User' } });
  await request('getProfile', { token: sellerB, status: 401 });
  await request('listStoreOrders', { token: await login('seller-two@pbl6.test') });
  check('Actual User lock revokes the old session even after unlock and requires fresh login', true);
  await request('updateProfile', { token: customer, status: 422, body: { display_name: 'Rejected mass assignment', roles: ['ADMIN'] } });
  await request('listUsers', { token: customer, status: 403, query: { size: 'bad' } });
  await request('getOwnOrder', { status: 401, id: 'not-a-uuid' });
  check('Mass-assignment is rejected and auth/role guards precede malformed input', true);
  await request('ResolveCheckoutContext', { status: 401, body: {}, headers: { 'x-service-id': 'M1', 'x-service-key': process.env.M1_INTERNAL_KEY } });
  await request('ResolveCheckoutContext', { status: 404,
    body: { token: customer, address_id: fixture.address, store_ids: [uid(61), uid(1061)] },
    headers: { 'x-service-id': 'M2', 'x-service-key': process.env.M2_INTERNAL_KEY } });
  await request('ResolveAiMetricsScope', { status: 401, body: {}, headers: { 'x-service-id': 'M2', 'x-service-key': process.env.M2_INTERNAL_KEY } });
  await request('ResolveAiMetricsScope', { status: 403,
    body: { token: ownerA, store_id: uid(1061) }, headers: { 'x-service-id': 'M4', 'x-service-key': process.env.M4_INTERNAL_KEY } });
  check('Internal caller allowlists precede DTOs and preserve live ownership errors', true);
};
