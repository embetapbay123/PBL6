import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { AdministrationRepository } from '../../identity-store-service/src/administration/administration.repository';
import { database, initializeDatabase } from '../../shared/src/database';
import { applyEvent } from '../../shared/src/events';
import { schemaErrors } from '../../shared/src/contract-validation';
import contracts from '../../shared/src/contracts.runtime.generated.json';

const m3Url = process.env.M3_DATABASE_URL;
const m4Url = process.env.M4_DATABASE_URL;
const describePostgres = m3Url && m4Url ? describe : describe.skip;

describePostgres('Administration event producer to M4 schema and inbox', () => {
  let m3: DataSource;
  let m4: DataSource;
  const actor = process.env.SEED_ADMIN_USER_ID;
  const userId = randomUUID();
  const storeId = randomUUID();
  const applicationId = randomUUID();
  const correlation = `event-regression-${randomUUID()}`;
  const emittedIds: string[] = [];

  beforeAll(async () => {
    if (!actor) throw new Error('SEED_ADMIN_USER_ID is required for event integration tests');
    m3 = new DataSource({ type: 'postgres', url: m3Url }); await m3.initialize();
    m4 = new DataSource({ type: 'postgres', url: m4Url }); await m4.initialize();
    process.env.SERVICE_ID = 'M3'; process.env.M3_DATABASE_URL = m3Url;
    await initializeDatabase();
    await m3.query(`INSERT INTO "user"(id,email,password_hash,status,created_at,version) VALUES($1,$2,'unused','ACTIVE',now(),0)`, [userId, `${userId}@events.test`]);
    await m3.query(`INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status,submitted_at,version) VALUES($1,$2,$3,'test','APPROVED',now(),0)`, [applicationId, userId, `event-${userId}`]);
    await m3.query(`INSERT INTO store(id,application_id,name,slug,contact,shipping_fee_vnd,status,version) VALUES($1,$2,$3,$4,'test',0,'ACTIVE',0)`, [storeId, applicationId, `event-${userId}`, `event-${userId}`]);
  });

  afterAll(async () => {
    if (m4?.isInitialized) {
      if (emittedIds.length) await m4.query("DELETE FROM inbox WHERE producer='M3' AND event_id=ANY($1::uuid[])", [emittedIds]);
      await m4.destroy();
    }
    if (m3?.isInitialized) {
      await m3.query('DELETE FROM outbox WHERE correlation_id=$1', [correlation]);
      await m3.query('DELETE FROM m3_audit WHERE request_id=$1', [correlation]);
      await m3.query('DELETE FROM store_membership WHERE store_id=$1', [storeId]);
      await m3.query('DELETE FROM store WHERE id=$1', [storeId]);
      await m3.query('DELETE FROM store_application WHERE id=$1', [applicationId]);
      await m3.query('DELETE FROM "user" WHERE id=$1', [userId]);
      await m3.destroy();
    }
    if (database?.isInitialized) await database.destroy();
  });

  test('UserLocked and StoreStatusChanged payloads validate and enter the consumer inbox once', async () => {
    await new AdministrationRepository().updateUserState(userId, 'LOCKED', 'integration test', 0, actor!, correlation);
    await new AdministrationRepository().updateStoreState(storeId, 'LOCKED', 'integration test', 0, actor!, correlation);
    const events = await m3.query('SELECT id,event_type,payload,correlation_id,created_at,pg_typeof(payload)::text AS payload_type FROM outbox WHERE correlation_id=$1 ORDER BY created_at', [correlation]);
    expect(events.map((event: any) => event.event_type)).toEqual(['UserLocked', 'StoreStatusChanged']);
    expect(await m3.query('SELECT event_type,payload FROM outbox WHERE correlation_id=$1 ORDER BY created_at', [correlation])).toEqual(expect.arrayContaining([
      expect.objectContaining({ event_type: 'UserLocked', payload: { user_id: userId, version: 1 } }),
      expect.objectContaining({ event_type: 'StoreStatusChanged', payload: { store_id: storeId, status: 'LOCKED', version: 1 } }),
    ]));
    for (const row of events) {
      emittedIds.push(row.id);
      const envelope = { event_id: row.id, event_type: row.event_type, schema_version: '1.0', producer: 'M3', occurred_at: new Date(row.created_at).toISOString(), correlation_id: row.correlation_id, payload: row.payload };
      const errors = schemaErrors(envelope, (contracts as any).events[row.event_type].schema);
      expect(errors).toEqual([]);
      expect(row.payload_type).toBe('jsonb');
      const first = await m4.transaction(manager => applyEvent(manager as any, 'M3', row.id, async () => {}));
      const duplicate = await m4.transaction(manager => applyEvent(manager as any, 'M3', row.id, async () => {}));
      expect(first).toBe(true); expect(duplicate).toBe(false);
    }
  });
});
