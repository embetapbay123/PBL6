// Run inside the existing M3 container: node < scripts/verify_demo_runtime.cjs.
// Uses local seed credentials only in memory. Never prints tokens, cookies or response bodies.
// Business reads only; the fresh authentication sessions are revoked in finally.
const { randomUUID } = require('node:crypto');
const base = process.env.DEMO_VERIFY_BASE_URL || 'http://gateway';
const report = { status: 'RUNNING', checks: [], limits: [
  'Existing demo data only; no seed/reset or business state mutation',
  'Seller/two-Store/revoked-permission/upload/load/device/provider acceptance is separate',
] };
const sessions = [];
function check(name, ok) {
  report.checks.push({ name, status: ok ? 'PASS' : 'FAIL' });
  if (!ok) throw new Error('CHECK_FAILED:' + name);
}
async function request(path, { token, body, cookie, csrf, origin, method = 'GET', direct } = {}) {
  const correlation = 'demo-audit-' + randomUUID();
  const response = await fetch((direct || base) + path, {
    method, signal: AbortSignal.timeout(10000), headers: {
      'content-type': 'application/json', 'x-correlation-id': correlation,
      ...(token ? { authorization: 'Bearer ' + token } : {}),
      ...(cookie ? { cookie } : {}), ...(csrf ? { 'x-csrf-token': csrf } : {}),
      ...(origin ? { origin } : {}),
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = response.headers.get('content-type')?.includes('application/json') ? await response.json() : undefined;
  return { status: response.status, json, correlation: response.headers.get('x-correlation-id') === correlation,
    cookies: response.headers.getSetCookie() };
}
function cookies(result) {
  const pairs = result.cookies.map(c => c.split(';')[0]);
  return { cookie: pairs.join('; '), csrf: pairs.find(c => c.startsWith('pbl6_csrf='))?.slice(10) };
}
async function login(email) {
  const result = await request('/api/v1/auth/login', { method: 'POST', origin: process.env.WEB_ORIGIN,
    body: { email, password: process.env.SEED_PASSWORD, client_type: 'WEB' } });
  if (result.status !== 200) throw new Error('SEED_LOGIN_UNAVAILABLE');
  const session = { ...cookies(result), token: result.json.access_token, context: result.json.context };
  sessions.push(session);
  check('Web login keeps refresh token out of JSON', !('refresh_token' in result.json));
  const refresh = result.cookies.find(c => c.startsWith('pbl6_refresh=')) || '';
  check('Refresh cookie is HttpOnly and SameSite Strict', /; HttpOnly/i.test(refresh) && /; SameSite=Strict/i.test(refresh));
  if (process.env.COOKIE_SECURE === 'true') check('HTTPS demo uses Secure refresh cookies', /; Secure/i.test(refresh));
  return session;
}
async function expect(name, path, status, options) {
  const result = await request(path, options);
  check(name, result.status === status && result.correlation);
  return result;
}
async function main() {
  try {
    await expect('Public Catalog is available', '/api/v1/products?size=1', 200);
    await expect('Guest cannot read Cart', '/api/v1/cart/items', 401);
    await expect('Authentication precedes malformed Order path validation', '/api/v1/me/orders/not-a-uuid', 401);
    await expect('Invalid bearer token is rejected', '/api/v1/me', 401, { token: 'invalid-test-token' });
    await expect('M3 internal endpoint requires caller identity', '/internal/context', 401,
      { direct: 'http://m3:3103', method: 'POST', body: { token: 'invalid-test-token' } });
    const internal = await request('/internal/context', { method: 'POST', body: {} });
    check('Public gateway does not expose internal JSON endpoint', !internal.json);
    await expect('Unsigned payment callback is rejected before body validation', '/api/v1/payment-callbacks/sepay', 401,
      { method: 'POST', body: {} });
    await expect('WEB login rejects a foreign Origin', '/api/v1/auth/login', 403,
      { method: 'POST', origin: 'https://foreign-origin.invalid',
        body: { email: 'customer1@pbl6.test', password: process.env.SEED_PASSWORD, client_type: 'WEB' } });
    const customer = await login('customer1@pbl6.test');
    const second = await login('customer2@pbl6.test');
    const owner = await login('owner@pbl6.test');
    const admin = await login('admin@pbl6.test');
    for (const [name, session] of [['Customer', customer], ['Other Customer', second], ['Owner', owner], ['Admin', admin]]) {
      const profile = await expect(name + ' reads only its current profile', '/api/v1/me', 200, { token: session.token });
      check(name + ' profile matches live identity', profile.json.user_id === session.context.user_id);
    }
    await expect('Customer reads own Cart', '/api/v1/cart/items', 200, { token: customer.token });
    await expect('Customer cannot read Admin Users', '/api/v1/admin/users', 403, { token: customer.token });
    await expect('Customer role guard precedes invalid Admin query validation', '/api/v1/admin/users?size=bad', 403, { token: customer.token });
    await expect('Customer cannot read Store management', '/api/v1/store/products', 403, { token: customer.token });
    await expect('Admin role alone does not grant Store management', '/api/v1/store/products', 403, { token: admin.token });
    await expect('Admin reads platform Users', '/api/v1/admin/users?size=1', 200, { token: admin.token });
    const products = await expect('Owner reads own Store Products', '/api/v1/store/products?size=100', 200, { token: owner.token });
    check('Owner Product list is scoped to live membership', products.json.items.every(p => p.store_id === owner.context.store_membership.store_id));
    await expect('Customer cannot read AI metrics', '/api/v1/ai/metrics', 403, { token: customer.token });
    await expect('Owner reads Store AI metrics', '/api/v1/ai/metrics', 200, { token: owner.token });
    await expect('Owner cannot select an unrelated AI Store scope', '/api/v1/ai/metrics?store_id=' + randomUUID(), 403, { token: owner.token });
    const metrics = await expect('Admin reads platform AI metrics', '/api/v1/ai/metrics', 200, { token: admin.token });
    check('Unknown AI costs are not reported as zero',
      metrics.json.metrics.cost_samples >= metrics.json.metrics.requests || metrics.json.metrics.cost_usd === null);
    const orders = await expect('Customer reads own Orders', '/api/v1/me/orders?size=1', 200, { token: customer.token });
    if (orders.json.items.length) {
      await expect('Other Customer cannot read an existing owned Order', '/api/v1/me/orders/' + orders.json.items[0].id, 404, { token: second.token });
    } else report.checks.push({ name: 'Cross-Customer existing Order ownership', status: 'NOT_RUN', reason: 'NO_EXISTING_CUSTOMER_ORDER' });
    await expect('Cookie logout rejects missing CSRF', '/api/v1/auth/logout', 403,
      { method: 'POST', body: {}, cookie: customer.cookie, origin: process.env.WEB_ORIGIN });
    await expect('Cookie refresh rejects foreign Origin', '/api/v1/auth/refresh', 403,
      { method: 'POST', body: {}, ...customer, origin: 'https://foreign-origin.invalid' });
    const refreshed = await expect('Cookie refresh rotates credentials', '/api/v1/auth/refresh', 200,
      { method: 'POST', body: {}, ...customer, origin: process.env.WEB_ORIGIN });
    const old = { ...customer };
    Object.assign(customer, cookies(refreshed), { token: refreshed.json.access_token });
    check('Refresh cookie changes after rotation', old.cookie !== customer.cookie);
    await expect('Old refresh replay is rejected', '/api/v1/auth/refresh', 401,
      { method: 'POST', body: {}, ...old, origin: process.env.WEB_ORIGIN });
    await expect('Refresh replay revokes the replacement session', '/api/v1/me', 401, { token: customer.token });
    await expect('Customer UUID validation remains strict', '/api/v1/me/orders/not-a-uuid', 422, { token: second.token });
    await expect('Customer pagination is bounded', '/api/v1/me/orders?size=101', 422, { token: second.token });
    report.status = 'PASS';
  } catch (error) {
    report.status = 'FAIL';
    report.failure = error.message?.startsWith('CHECK_FAILED:') || error.message === 'SEED_LOGIN_UNAVAILABLE' ? error.message : 'RUNTIME_AUDIT_FAILED';
  } finally {
    for (const session of sessions) {
      try {
        const result = await request('/api/v1/auth/logout', { method: 'POST', body: {}, ...session, origin: process.env.WEB_ORIGIN });
        if (result.status !== 200) throw new Error();
      } catch {
        report.status = 'FAIL';
        report.checks.push({ name: 'Revoke fresh audit session', status: 'FAIL' });
      }
    }
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== 'PASS') process.exitCode = 1;
  }
}
main();
