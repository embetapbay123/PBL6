import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { schemaErrors } from '../../shared/src/contract-validation';
import bundle from '../../shared/src/contracts.runtime.generated.json';
const base = process.env.TEST_API_URL ?? 'http://gateway/api/v1';
const m3 = 'http://m3:3103';
const requestId = randomUUID();
const addressBody = { recipient_name: 'Customer', phone: '0900000000', line1: '1 Main', ward: 'Ward', district: 'District', city: 'Hue', is_default: true };
async function login(email: string) {
  const response = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: process.env.SEED_PASSWORD, client_type: 'MOBILE' }) });
  expect(response.status).toBe(200);
  return (await response.json() as any).access_token as string;
}
const headers = (token: string) => ({ Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'X-Correlation-Id': requestId });
const internal = (path: string, caller: string, body: unknown) => fetch(m3 + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Service-Id': caller, 'X-Service-Key': process.env[`${caller}_INTERNAL_KEY`]!, 'X-Correlation-Id': requestId }, body: JSON.stringify(body) });
function schema(operation: keyof typeof bundle.operations, body: unknown) {
  expect(schemaErrors(body, Object.values(bundle.operations[operation].responses)[0])).toEqual([]);
}

test('Profile and Address HTTP writes preserve ownership, strict schemas and concurrent default invariants', async () => {
  const source = new DataSource({ type: 'postgres', url: process.env.M3_DATABASE_URL }); await source.initialize();
  const token = await login('customer1@pbl6.test'), other = await login('customer2@pbl6.test');
  const profile = await (await fetch(base + '/me', { headers: headers(token) })).json() as any;
  const before = await source.query('SELECT id,is_default FROM address WHERE customer_user_id=$1', [profile.user_id]);
  const ids: string[] = [];
  try {
    const patch = await fetch(base + '/me', { method: 'PATCH', headers: headers(token), body: JSON.stringify({ display_name: profile.display_name }) });
    expect(patch.status).toBe(200); schema('updateProfile', await patch.json());
    expect((await fetch(base + '/me', { method: 'PATCH', headers: headers(token), body: '{}' })).status).toBe(422);
    const creates = await Promise.all([1, 2].map(() => fetch(base + '/me/addresses', { method: 'POST', headers: headers(token), body: JSON.stringify(addressBody) })));
    for (const response of creates) { expect(response.status).toBe(201); const address = await response.json() as any; schema('createAddress', address); ids.push(address.id); }
    const count = await source.query("SELECT count(*)::int total FROM address WHERE customer_user_id=$1 AND status='ACTIVE' AND is_default", [profile.user_id]);
    expect(count[0].total).toBe(1);
    const update = await fetch(base + '/me/addresses/' + ids[0], { method: 'PATCH', headers: headers(token), body: JSON.stringify({ city: 'Da Nang', is_default: true }) });
    expect(update.status).toBe(200); schema('updateAddress', await update.json());
    for (const method of ['PATCH', 'DELETE']) expect((await fetch(base + '/me/addresses/' + ids[0], { method, headers: headers(other), ...(method === 'PATCH' ? { body: JSON.stringify({ city: 'Other' }) } : {}) })).status).toBe(404);
    const list = await fetch(base + '/me/addresses?size=100', { headers: headers(token) }); expect(list.status).toBe(200); schema('listAddresses', await list.json());
    expect((await fetch(base + '/me/addresses?size=101', { headers: headers(token) })).status).toBe(422);
    const removed = await fetch(base + '/me/addresses/' + ids[0], { method: 'DELETE', headers: headers(token) }); expect(removed.status).toBe(200); schema('deleteAddress', await removed.json());
    const audits = await source.query('SELECT before_json,after_json FROM m3_audit WHERE request_id=$1', [requestId]);
    expect(audits.length).toBeGreaterThan(3);
    expect(JSON.stringify(audits)).not.toContain('0900000000');
    // A failed audit must roll back both default changes and the inserted Address.
    const { ProfileRepository } = await import('../../identity-store-service/src/profile/profile.repository');
    const dbModule = await import('../../shared/src/database');
    process.env.SERVICE_ID = 'M3'; await dbModule.initializeDatabase();
    const repo = new ProfileRepository();
    await source.query('UPDATE address SET is_default=true WHERE id=$1', [ids[1]]);
    const audit = jest.spyOn(repo as any, 'audit').mockRejectedValueOnce(new Error('audit failed'));
    await expect(repo.createAddress(profile.user_id, addressBody, requestId)).rejects.toThrow('audit failed');
    audit.mockRestore();
    expect((await source.query('SELECT count(*)::int total FROM address WHERE customer_user_id=$1 AND id=ANY($2::uuid[])', [profile.user_id, ids]))[0].total).toBe(2);
    expect((await source.query('SELECT is_default FROM address WHERE id=$1', [ids[1]]))[0].is_default).toBe(true);
    await dbModule.database.destroy();
  } finally {
    await source.query('DELETE FROM m3_audit WHERE request_id=$1', [requestId]);
    if (ids.length) await source.query('DELETE FROM address WHERE id=ANY($1::uuid[])', [ids]);
    for (const row of before) await source.query('UPDATE address SET is_default=$2 WHERE id=$1', [row.id, row.is_default]);
    await source.destroy();
  }
});

test('Internal checkout and AI scope validate tokens, snapshots, caller allowlists and owner permissions', async () => {
  const source = new DataSource({ type: 'postgres', url: process.env.M3_DATABASE_URL }); await source.initialize();
  const customer = await login('customer1@pbl6.test'), other = await login('customer2@pbl6.test'), owner = await login('owner@pbl6.test'), admin = await login('admin@pbl6.test');
  const context = await (await fetch(base + '/me/context', { headers: headers(customer) })).json() as any;
  const [store] = await source.query("SELECT id FROM store WHERE status='ACTIVE' LIMIT 1");
  const [membership] = await source.query("SELECT id,status FROM store_membership WHERE store_id=$1 AND role='OWNER' AND status='ACTIVE' LIMIT 1", [store.id]);
  const id = randomUUID();
  try {
    await source.query("INSERT INTO address(id,customer_user_id,recipient_name,phone,line1,ward,district,city,is_default,status) VALUES($1,$2,'A','0900000000','L','W','D','C',false,'ACTIVE')", [id, context.user_id]);
    const body = { token: customer, address_id: id, store_ids: [store.id] };
    const result = await internal('/internal/checkout/context', 'M2', body);
    expect(result.status).toBe(200); schema('ResolveCheckoutContext', await result.json());
    expect(result.headers.get('x-correlation-id')).toBe(requestId);
    expect((await internal('/internal/checkout/context', 'M1', body)).status).toBe(401);
    expect((await internal('/internal/checkout/context', 'M2', { ...body, customer_user_id: context.user_id })).status).toBe(422);
    expect((await internal('/internal/checkout/context', 'M2', { ...body, token: other })).status).toBe(404);
    // The seeded Owner also has Customer role; ownership must still reject this address.
    expect((await internal('/internal/checkout/context', 'M2', { ...body, token: owner })).status).toBe(404);
    expect((await internal('/internal/checkout/context', 'M2', { ...body, store_ids: [randomUUID()] })).status).toBe(409);
    const platform = await internal('/internal/ai/metrics-scope', 'M4', { token: admin }); expect(platform.status).toBe(200); const platformBody = await platform.json() as any; schema('ResolveAiMetricsScope', platformBody); expect(platformBody.scope).toBe('PLATFORM');
    const own = await internal('/internal/ai/metrics-scope', 'M4', { token: owner, store_id: store.id }); expect(own.status).toBe(200); const ownBody = await own.json() as any; schema('ResolveAiMetricsScope', ownBody); expect(ownBody.scope).toBe('STORE');
    expect((await internal('/internal/ai/metrics-scope', 'M4', { token: customer, store_id: store.id })).status).toBe(403);
    expect((await internal('/internal/ai/metrics-scope', 'M2', { token: admin })).status).toBe(401);
    await source.query("UPDATE store_membership SET status='REMOVED' WHERE id=$1", [membership.id]);
    expect((await internal('/internal/ai/metrics-scope', 'M4', { token: owner, store_id: store.id })).status).toBe(403);
    await source.query('UPDATE store_membership SET status=$2 WHERE id=$1', [membership.id, membership.status]);
    await source.query("UPDATE store SET status='LOCKED' WHERE id=$1", [store.id]);
    expect((await internal('/internal/checkout/context', 'M2', body)).status).toBe(409);
    expect((await internal('/internal/ai/metrics-scope', 'M4', { token: owner, store_id: store.id })).status).toBe(403);
    await source.query("UPDATE store SET status='ACTIVE' WHERE id=$1", [store.id]);
    await source.query("UPDATE address SET status='DELETED' WHERE id=$1", [id]);
    expect((await internal('/internal/checkout/context', 'M2', body)).status).toBe(404);
  } finally {
    await source.query("UPDATE store SET status='ACTIVE' WHERE id=$1", [store.id]);
    await source.query('UPDATE store_membership SET status=$2 WHERE id=$1', [membership.id, membership.status]);
    await source.query('DELETE FROM address WHERE id=$1', [id]); await source.destroy();
  }
});
