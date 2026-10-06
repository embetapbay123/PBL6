// Integration tests for ProfileRepository address behavior.
// These tests run only when M3_DATABASE_URL is set in the environment.

if (!process.env.M3_DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('Skipping profile.address.integration tests because M3_DATABASE_URL is not set');
  // create a trivial skipped test suite so jest reports skip
  describe.skip('ProfileRepository integration tests (skipped)', () => {
    test('skipped', () => {});
  });
} else {
  process.env.SERVICE_ID = 'M3';
  const dbModule = require('../../shared/src/database');
  let database: any;
  const { ProfileRepository } = require('../../identity-store-service/src/profile/profile.repository');
  const { randomUUID } = require('node:crypto');

  describe('ProfileRepository integration (addresses)', () => {
    let userId: string;
    beforeAll(async () => {
      await dbModule.initializeDatabase();
      database = dbModule.database;
      userId = randomUUID();
      // insert a minimal user record
      await database.query(
        `INSERT INTO "user"(id,email,password_hash,status,created_at,version) VALUES($1,$2,$3,'ACTIVE',NOW(),0)`,
        [userId, `test-${userId}@pbl6.test`, 'test_hash'],
      );
    }, 20000);

    afterAll(async () => {
      await database.query('DELETE FROM m3_audit WHERE actor_user_id=$1', [userId]);
      await database.query('DELETE FROM address WHERE customer_user_id=$1', [userId]);
      await database.query('DELETE FROM "user" WHERE id=$1', [userId]);
      if (database && database.isInitialized) await database.destroy();
    });

    test('createAddress with is_default ensures a single default', async () => {
      const repo = new ProfileRepository();
      const a1 = await repo.createAddress(userId, { recipient_name: 'A1', phone: '01', line1: 'L1', ward: 'W', district: 'D', city: 'C', is_default: true }, 'req-1');
      expect(a1.is_default).toBe(true);
      const a2 = await repo.createAddress(userId, { recipient_name: 'A2', phone: '02', line1: 'L2', ward: 'W', district: 'D', city: 'C', is_default: true }, 'req-2');
      expect(a2.is_default).toBe(true);
      // verify only one default exists
      const rows = await database.query("SELECT id,is_default FROM address WHERE customer_user_id=$1 AND status='ACTIVE'", [userId]);
      const defaults = rows.filter((r: any) => r.is_default);
      expect(defaults.length).toBe(1);
      expect(defaults[0].id).toBe(a2.id);
    }, 20000);

    test('updateAddress can set is_default and clears others', async () => {
      const repo = new ProfileRepository();
      // create two non-default addresses
      const b1 = await repo.createAddress(userId, { recipient_name: 'B1', phone: '11', line1: 'L1', ward: 'W', district: 'D', city: 'C', is_default: false }, 'req-3');
      const b2 = await repo.createAddress(userId, { recipient_name: 'B2', phone: '22', line1: 'L2', ward: 'W', district: 'D', city: 'C', is_default: false }, 'req-4');
      // set b1 as default
      const updated = await repo.updateAddress(userId, b1.id, { is_default: true }, 'req-5');
      expect(updated.is_default).toBe(true);
      const rows = await database.query("SELECT id,is_default FROM address WHERE customer_user_id=$1 AND status='ACTIVE'", [userId]);
      const defaults = rows.filter((r: any) => r.is_default);
      expect(defaults.length).toBe(1);
      expect(defaults[0].id).toBe(b1.id);
    }, 20000);

    test('deleteAddress clears default and marks DELETED', async () => {
      const repo = new ProfileRepository();
      const c = await repo.createAddress(userId, { recipient_name: 'C1', phone: '33', line1: 'L3', ward: 'W', district: 'D', city: 'C', is_default: true }, 'req-6');
      // delete it
      const res = await repo.deleteAddress(userId, c.id, 'req-7');
      expect(res.status).toBe('DELETED');
      const row = await database.query('SELECT id,status,is_default FROM address WHERE id=$1', [c.id]);
      expect(row[0].status).toBe('DELETED');
      expect(row[0].is_default).toBe(false);
    }, 20000);
  });
}
