// Uses only the dedicated M3 test PostgreSQL database and migrations.
if (!process.env.M3_TEST_DATABASE_URL) {
  describe.skip('Staff invitation PostgreSQL integration (requires M3_TEST_DATABASE_URL)', () => {
    test('requires PostgreSQL', () => {});
  });
} else {
  process.env.M3_DATABASE_URL = process.env.M3_TEST_DATABASE_URL;
  process.env.SERVICE_ID = 'M3';
  const { randomUUID } = require('node:crypto');
  const dbModule = require('../../shared/src/database');
  const { StaffRepository } = require('../../identity-store-service/src/staff/staff.repository');
  const auditModule = require('../../shared/src/audit');
  let database: any;
  let ownerId: string, recipientId: string, secondRecipientId: string, applicationId: string, storeId: string;
  const transientUserIds: string[] = [];
  const repository = new StaffRepository();
  const requestId = `staff-test-${randomUUID()}`;

  beforeAll(async () => {
    await dbModule.initializeDatabase(); database = dbModule.database;
    ownerId = randomUUID(); recipientId = randomUUID(); secondRecipientId = randomUUID();
    applicationId = randomUUID(); storeId = randomUUID();
    await database.query(`INSERT INTO "user"(id,email,email_verified_at,password_hash,status,created_at,version)
      VALUES ($1,$2,now(),'test','ACTIVE',now(),0),($3,$4,now(),'test','ACTIVE',now(),0),($5,$6,now(),'test','ACTIVE',now(),0)`,
      [ownerId, `${ownerId}@staff.test`, recipientId, `${recipientId}@staff.test`, secondRecipientId, `${secondRecipientId}@staff.test`]);
    await database.query(`INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status,submitted_at,version)
      VALUES($1,$2,'Staff test','test','APPROVED',now(),0)`, [applicationId, ownerId]);
    await database.query(`INSERT INTO store(id,application_id,name,slug,contact,shipping_fee_vnd,status,version)
      VALUES($1,$2,'Staff test store',$3,'test',0,'ACTIVE',0)`, [storeId, applicationId, `staff-${storeId}`]);
    await database.query(`INSERT INTO store_membership(id,store_id,user_id,role,status,joined_at,version)
      VALUES($1,$2,$3,'OWNER','ACTIVE',now(),0)`, [randomUUID(), storeId, ownerId]);
  }, 20000);

  afterAll(async () => {
    if (!database) return;
    await database.query('DELETE FROM m3_audit WHERE request_id=$1', [requestId]);
    await database.query('DELETE FROM staff_invitation WHERE store_id=$1', [storeId]);
    await database.query(`DELETE FROM membership_permission WHERE membership_id IN
      (SELECT id FROM store_membership WHERE store_id=$1 OR user_id=ANY($2::uuid[]))`, [storeId, [recipientId, secondRecipientId]]);
    await database.query(`DELETE FROM outbox WHERE event_type='MembershipChanged' AND payload->>'store_id'=$1`, [storeId]);
    await database.query('DELETE FROM store_membership WHERE store_id=$1 OR user_id=ANY($2::uuid[])', [storeId, [recipientId, secondRecipientId]]);
    await database.query('DELETE FROM store WHERE id=$1', [storeId]);
    await database.query('DELETE FROM store_application WHERE id=$1', [applicationId]);
    await database.query('DELETE FROM "user" WHERE id=ANY($1::uuid[])', [[ownerId, recipientId, secondRecipientId, ...transientUserIds]]);
    if (database.isInitialized) await database.destroy();
  });

  describe('StaffRepository PostgreSQL behavior', () => {
    test('creates and scopes invitations; concurrent accept creates one membership and cannot replay', async () => {
      const invitation = await repository.createInvitation(ownerId, storeId,
        { invited_email: `${recipientId}@STAFF.TEST`, permissions: ['order.store.read_status_cancel'] }, requestId);
      expect(invitation).toMatchObject({ invited_email: `${recipientId}@staff.test`, status: 'PENDING', store_id: storeId });
      expect((invitation as any).token_hash).toBeUndefined();
      expect((await repository.listStoreInvitations(ownerId, storeId)).total).toBe(1);
      expect((await repository.listOwnInvitations(recipientId)).items).toHaveLength(1);
      const results = await Promise.allSettled([
        repository.acceptInvitation(recipientId, invitation.id, requestId),
        repository.acceptInvitation(recipientId, invitation.id, requestId),
      ]);
      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      expect(await database.query(`SELECT id FROM store_membership WHERE user_id=$1 AND status='ACTIVE'`, [recipientId])).toHaveLength(1);
      expect(await database.query(`SELECT id FROM membership_permission mp JOIN store_membership m ON m.id=mp.membership_id WHERE m.user_id=$1`, [recipientId])).toHaveLength(1);
      expect(await database.query(`SELECT id FROM outbox WHERE event_type='MembershipChanged' AND payload->>'user_id'=$1`, [recipientId])).toHaveLength(1);
      await expect(repository.acceptInvitation(recipientId, invitation.id, requestId)).rejects.toMatchObject({ status: 409 });
      await expect(repository.listStoreInvitations(ownerId, randomUUID())).rejects.toMatchObject({ status: 404 });
    }, 20000);

    test('serializes accept versus revoke and rolls back accept if the audit write fails', async () => {
      const raceInvitation = await repository.createInvitation(ownerId, storeId,
        { invited_email: `${secondRecipientId}@staff.test`, permissions: [] }, requestId);
      const race = await Promise.allSettled([
        repository.acceptInvitation(secondRecipientId, raceInvitation.id, requestId),
        repository.revokeInvitation(ownerId, storeId, raceInvitation.id, requestId),
      ]);
      expect(race.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      const [state] = await database.query('SELECT status FROM staff_invitation WHERE id=$1', [raceInvitation.id]);
      expect(['ACCEPTED', 'REVOKED']).toContain(state.status);
      const accepted = state.status === 'ACCEPTED';
      expect(await database.query(`SELECT id FROM store_membership WHERE user_id=$1 AND status='ACTIVE'`, [secondRecipientId])).toHaveLength(accepted ? 1 : 0);

      const rollbackRecipient = randomUUID();
      transientUserIds.push(rollbackRecipient);
      await database.query(`INSERT INTO "user"(id,email,email_verified_at,password_hash,status,created_at,version)
        VALUES($1,$2,now(),'test','ACTIVE',now(),0)`, [rollbackRecipient, `${rollbackRecipient}@staff.test`]);
      const rollbackInvite = await repository.createInvitation(ownerId, storeId,
        { invited_email: `${rollbackRecipient}@staff.test`, permissions: [] }, requestId);
      const spy = jest.spyOn(auditModule, 'audit').mockRejectedValueOnce(new Error('audit unavailable'));
      await expect(repository.acceptInvitation(rollbackRecipient, rollbackInvite.id, requestId)).rejects.toThrow('audit unavailable');
      spy.mockRestore();
      expect((await database.query('SELECT status FROM staff_invitation WHERE id=$1', [rollbackInvite.id]))[0].status).toBe('PENDING');
      expect(await database.query('SELECT id FROM store_membership WHERE user_id=$1', [rollbackRecipient])).toHaveLength(0);
      await database.query('DELETE FROM staff_invitation WHERE id=$1', [rollbackInvite.id]);
      await database.query('DELETE FROM "user" WHERE id=$1', [rollbackRecipient]);
    }, 20000);

    test('persists expiry and refuses expired revoke or accept', async () => {
      const expiryRecipient = randomUUID();
      transientUserIds.push(expiryRecipient);
      await database.query(`INSERT INTO "user"(id,email,email_verified_at,password_hash,status,created_at,version)
        VALUES($1,$2,now(),'test','ACTIVE',now(),0)`, [expiryRecipient, `${expiryRecipient}@staff.test`]);
      const invitation = await repository.createInvitation(ownerId, storeId,
        { invited_email: `${expiryRecipient}@staff.test`, permissions: [] }, requestId);
      await database.query(`UPDATE staff_invitation SET expires_at=now()-interval '1 second' WHERE id=$1`, [invitation.id]);
      await expect(repository.acceptInvitation(expiryRecipient, invitation.id, requestId)).rejects.toMatchObject({ status: 409 });
      expect((await database.query('SELECT status FROM staff_invitation WHERE id=$1', [invitation.id]))[0].status).toBe('EXPIRED');
      await expect(repository.revokeInvitation(ownerId, storeId, invitation.id, requestId)).rejects.toMatchObject({ status: 409 });
    }, 20000);
  });
}
