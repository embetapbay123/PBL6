// Real HTTP/guard coverage; requires the Compose gateway and seeded accounts.
if (!process.env.TEST_API_URL || !process.env.M3_DATABASE_URL || !process.env.SEED_PASSWORD) {
  describe.skip('Staff invitation HTTP integration (requires Compose gateway, M3 PostgreSQL and seed password)', () => {
    test('requires the real M3 HTTP stack', () => {});
  });
} else {
  const { DataSource } = require('typeorm');
  const { randomUUID } = require('node:crypto');
  const base = process.env.TEST_API_URL.replace(/\/$/, '');
  const requestId = `staff-http-${randomUUID()}`;
  const headers = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Correlation-Id': requestId });
  async function login(email: string) {
    const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: process.env.SEED_PASSWORD, client_type: 'MOBILE' }) });
    if (response.status !== 200) throw new Error(`Login failed for test account: ${response.status}`);
    return (await response.json() as any).access_token as string;
  }

  test('HTTP guards and all invitation routes enforce authenticated Owner and verified receiver scope', async () => {
    const db = new DataSource({ type: 'postgres', url: process.env.M3_DATABASE_URL }); await db.initialize();
    const owner = await login('owner@pbl6.test'), receiver = await login('customer1@pbl6.test'), other = await login('customer2@pbl6.test');
    const context = await (await fetch(`${base}/me/context`, { headers: headers(receiver) })).json() as any;
    const ownerContext = await (await fetch(`${base}/me/context`, { headers: headers(owner) })).json() as any;
    const userId = context.user_id, ownerId = ownerContext.user_id;
    const [store] = await db.query(`SELECT store_id FROM store_membership WHERE user_id=$1 AND role='OWNER' AND status='ACTIVE'`, [ownerId]);
    const [activeMembership] = await db.query(`SELECT id FROM store_membership WHERE user_id=$1 AND status='ACTIVE'`, [userId]);
    const inviteIds: string[] = [];
    try {
      expect((await fetch(`${base}/store/staff/invitations`, { headers: headers(owner) })).status).toBe(200);
      expect((await fetch(`${base}/store/staff/invitations`, { headers: { 'Content-Type': 'application/json' } })).status).toBe(401);
      expect((await fetch(`${base}/store/staff/invitations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invited_email: 'new@staff.test', permissions: [] }) })).status).toBe(401);
      expect((await fetch(`${base}/store/staff/invitations`, { method: 'POST', headers: headers(receiver), body: JSON.stringify({ invited_email: 'new@staff.test', permissions: [] }) })).status).toBe(403);
      expect((await fetch(`${base}/me/invitations?email=customer2%40pbl6.test`, { headers: headers(receiver) })).status).toBe(422);
      if (activeMembership) throw new Error('Seed receiver already has an active Store membership; HTTP accept fixture cannot run safely.');

      const body = { invited_email: 'CUSTOMER1@pbl6.test', permissions: ['order.store.read_status_cancel'] };
      const createdResponse = await fetch(`${base}/store/staff/invitations`, { method: 'POST', headers: headers(owner), body: JSON.stringify(body) });
      expect(createdResponse.status).toBe(201);
      const invitation = await createdResponse.json() as any; inviteIds.push(invitation.id);
      expect(invitation).toMatchObject({ store_id: store.store_id, invited_email: 'customer1@pbl6.test', status: 'PENDING' });
      expect(invitation.token_hash).toBeUndefined();
      expect((await fetch(`${base}/store/staff/invitations`, { method: 'POST', headers: headers(owner),
        body: JSON.stringify({ ...body, invited_email: 'other@staff.test', permissions: ['report.store.view'] }) })).status).toBe(422);
      expect((await fetch(`${base}/store/staff/invitations`, { method: 'POST', headers: headers(owner),
        body: JSON.stringify({ ...body, store_id: '11111111-1111-4111-8111-111111111111' }) })).status).toBe(422);
      const own = await (await fetch(`${base}/me/invitations`, { headers: headers(receiver) })).json() as any;
      expect(own.items.map((item: any) => item.id)).toContain(invitation.id);
      expect(own.items[0].store_name).toBeTruthy();
      const stranger = await (await fetch(`${base}/me/invitations`, { headers: headers(other) })).json() as any;
      expect(stranger.items.map((item: any) => item.id)).not.toContain(invitation.id);
      expect((await fetch(`${base}/me/invitations/${invitation.id}/accept`, { method: 'POST', headers: headers(other) })).status).toBe(404);

      const revoke = await fetch(`${base}/store/staff/invitations/${invitation.id}/revoke`, { method: 'POST', headers: headers(owner) });
      expect(revoke.status).toBe(200); expect((await revoke.json() as any).status).toBe('REVOKED');
      expect((await fetch(`${base}/me/invitations/${invitation.id}/accept`, { method: 'POST', headers: headers(receiver) })).status).toBe(409);

      const acceptingResponse = await fetch(`${base}/store/staff/invitations`, { method: 'POST', headers: headers(owner), body: JSON.stringify({ invited_email: 'customer1@pbl6.test', permissions: ['order.store.read_status_cancel'] }) });
      expect(acceptingResponse.status).toBe(201);
      const acceptingInvitation = await acceptingResponse.json() as any; inviteIds.push(acceptingInvitation.id);
      const accepted = await fetch(`${base}/me/invitations/${acceptingInvitation.id}/accept`, { method: 'POST', headers: headers(receiver) });
      expect(accepted.status).toBe(200); expect((await accepted.json() as any).status).toBe('ACCEPTED');
      expect((await fetch(`${base}/me/invitations/${acceptingInvitation.id}/accept`, { method: 'POST', headers: headers(receiver) })).status).toBe(409);
      expect(await db.query(`SELECT id FROM store_membership WHERE user_id=$1 AND status='ACTIVE'`, [userId])).toHaveLength(1);
    } finally {
      if (inviteIds.length) await db.query(`DELETE FROM membership_permission WHERE membership_id IN (SELECT id FROM store_membership WHERE user_id=$1)`, [userId]);
      if (inviteIds.length) await db.query(`DELETE FROM store_membership WHERE user_id=$1 AND store_id=$2`, [userId, store.store_id]);
      if (inviteIds.length) await db.query(`DELETE FROM m3_audit WHERE request_id=$1`, [requestId]);
      if (inviteIds.length) await db.query(`DELETE FROM outbox WHERE event_type='MembershipChanged' AND payload->>'user_id'=$1`, [userId]);
      if (inviteIds.length) await db.query(`DELETE FROM staff_invitation WHERE id=ANY($1::uuid[])`, [inviteIds]);
      await db.destroy();
    }
  }, 30000);
}
