import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
const users = new SharedArray('isolated capacity sessions', () => JSON.parse(open('/evidence/users.private.json')));
const base = 'http://gateway/api/v1';
const flows = new Counter('workflow_count'), pending = new Counter('recovery_pending'), conflicts = new Counter('business_conflicts');
const failures = Object.fromEntries(['refresh','addCartItem','quoteCheckout','removeCartItem','confirmCheckout','confirmReplay','listProducts','listCartItems','updateCartItem','listOwnOrders','getOwnOrder'].map(name => [name,new Counter('failed_'+name)]));
const statuses = Object.fromEntries([0,400,401,403,404,409,422,429,500,501,502,503,504].map(status => [status,new Counter('failed_status_'+status)]));
const durations = Object.fromEntries(Object.keys(failures).map(name=>[name,new Trend('duration_'+name,true)]));
const errorCodes = Object.fromEntries(['DEPENDENCY_UNAVAILABLE','DEPENDENCY_CONTRACT_INVALID','CHECKOUT_RECOVERING','RATE_LIMITED','OTHER'].map(code=>[code,new Counter('failed_code_'+code)]));
const uid = n => '20000000-0000-4000-8000-' + String(n).padStart(12, '0');
let auth, uncertain;
export const options = {
  scenarios: { mixed: __ENV.CAPACITY_PROFILE === 'quick'
    ? { executor: 'constant-vus', vus: 100, duration: '60s', gracefulStop: '15s' }
    : { executor: 'ramping-vus', startVUs: 10, stages: [{ duration: '2m', target: 10 }, { duration: '3m', target: 100 },
      { duration: '15m', target: 100 }, { duration: '2m', target: 0 }], gracefulRampDown: '15s', gracefulStop: '15s' } },
  thresholds: { http_req_duration: ['p(95)<2000'], http_req_failed: ['rate<0.01'], checks: ['rate>0.99'] },
};
function api(name, path, method = 'GET', body, extra = {}) {
  const r = http.request(method, base + path, body === undefined ? null : JSON.stringify(body), { timeout: '8s', tags: { name },
    headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + auth.access_token,
      'x-correlation-id': `capacity-${__VU}-${__ITER}`, ...extra } });
  const ok = r.status >= 200 && r.status < 300;
  durations[name].add(r.timings.duration);
  check(r, { 'valid workflow response': () => ok });
  if (r.status === 503) pending.add(1, { name });
  if (r.status === 409) conflicts.add(1, { name });
  if (!ok) { failures[name].add(1); if (statuses[r.status]) statuses[r.status].add(1); }
  let json;
  try { json = r.json(); } catch { check(r, { 'response JSON': () => false }); }
  if (!ok) (errorCodes[json?.code] || errorCodes.OTHER).add(1);
  return { status: r.status, json, ok };
}
function ensureAuth() {
  if (!auth) auth = { ...users[(__VU - 1) % users.length] };
  if (Date.now() - auth.issued_at < 12 * 60 * 1000) return true;
  const result = api('refresh', '/auth/refresh', 'POST', { refresh_token: auth.refresh_token });
  if (!result.ok) return false;
  auth = { ...auth, ...result.json, issued_at: Date.now() };
  return true;
}
function checkout(create) {
  const v = (__ITER * 101 + __VU * 37) % 20000 + 1, p = Math.floor((v - 1) / 2) + 1, store = uid(2001 + (p - 1) % 10);
  const added = api('addCartItem', '/cart/items', 'POST', { product_id: uid(100000 + p), variant_id: uid(200000 + v), quantity: 1 });
  if (!added.ok) return;
  const input = { cart_item_ids: [added.json.id], address_id: auth.address_id, payment_methods: { [store]: 'COD' } };
  const quote = api('quoteCheckout', '/checkout/quotes', 'POST', input);
  if (!quote.ok) { api('removeCartItem', '/cart/items/' + added.json.id, 'DELETE'); return; }
  if (!create) { api('removeCartItem', '/cart/items/' + added.json.id, 'DELETE'); return; }
  const body = { ...input, quote_id: quote.json.quote_id, expected_payable_total_vnd: quote.json.payable_total_vnd };
  const key = `capacity-${__VU}-${__ITER}-${Date.now()}`;
  const result = api('confirmCheckout', '/orders/batches', 'POST', body, { 'idempotency-key': key });
  if (result.status === 503) uncertain = { body, key };
}
export default function () {
  try {
    if (!ensureAuth()) return;
    if (uncertain) {
      flows.add(1, { flow: 'same-key-recovery' });
      const result = api('confirmReplay', '/orders/batches', 'POST', uncertain.body, { 'idempotency-key': uncertain.key });
      if (result.status !== 503) uncertain = undefined;
      return;
    }
    const choice = (__ITER * 37 + __VU * 13) % 100;
    if (choice < 50) {
      flows.add(1, { flow: 'catalog' });
      const result = api('listProducts', '/products?page=' + ((__ITER % 100) + 1) + '&size=20');
      if (result.ok) check(result, { 'Catalog page from volume fixture': () => Array.isArray(result.json.items) && result.json.total === 10000 });
    } else if (choice < 70) {
      flows.add(1, { flow: 'cart' });
      const result = api('listCartItems', '/cart/items?size=20');
      if (result.ok && result.json.items.length) api('updateCartItem', '/cart/items/' + result.json.items[0].id, 'PATCH', { quantity: 1 });
    } else if (choice < 85) {
      flows.add(1, { flow: 'order-read' });
      const result = api('listOwnOrders', '/me/orders?size=20');
      if (result.ok && __ITER % 3 === 0 && result.json.items.length) api('getOwnOrder', '/me/orders/' + result.json.items[0].id);
    } else if (choice < 95) {
      flows.add(1, { flow: 'quote' }); checkout(false);
    } else {
      flows.add(1, { flow: 'create-order' }); checkout(true);
    }
  } finally { sleep(1); }
}
