import { randomBytes, randomUUID } from 'node:crypto';
import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import { audit } from '../../../shared/src/audit';
import { returnedRow } from '../../../shared/src/postgres-returning';
import { digest } from '../auth/auth.service';

const SELLER_PERMISSIONS = new Set([
  'product.store.read_write', 'inventory.store.read_adjust',
  'order.store.read_status_cancel', 'cod.store.collect',
]);
const INVITATION_TTL_DAYS = 7;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type InvitationInput = { invited_email: string; permissions: string[] };
type InvitationRow = {
  id: string; store_id: string; invited_email: string; status: string;
  expires_at: Date | string; created_at: Date | string; invited_by_user_id?: string;
  store_name?: string; permissions: string[];
};

function publicInvitation(row: InvitationRow) {
  const expiresAt = new Date(row.expires_at);
  if (Number.isNaN(expiresAt.getTime())) throw new Error('Invitation expiry timestamp is invalid.');
  return {
    id: row.id, store_id: row.store_id, invited_email: row.invited_email,
    permissions: row.permissions ?? [], status: row.status, expires_at: expiresAt.toISOString(),
    ...(row.store_name ? { store_name: row.store_name } : {}),
  };
}

function pageValues(page = 1, size = 20) {
  return { page: Math.min(1_000_000, Math.max(1, Math.trunc(page || 1))), size: Math.min(100, Math.max(1, Math.trunc(size || 20))) };
}

export class StaffRepository {
  private async assertOwner(manager: any, userId: string, storeId: string) {
    if (!UUID_RE.test(storeId ?? '')) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy Store đang hoạt động.');
    const [row] = await manager.query(
      `SELECT s.id FROM store s JOIN store_membership m ON m.store_id=s.id
       WHERE s.id=$1 AND s.status='ACTIVE' AND m.user_id=$2 AND m.role='OWNER' AND m.status='ACTIVE'`,
      [storeId, userId],
    );
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy Store đang hoạt động.');
  }

  async listStoreInvitations(userId: string, storeId: string, page = 1, size = 20) {
    const paging = pageValues(page, size);
    await this.assertOwner(database.manager, userId, storeId);
    const [count] = await database.query(`SELECT count(*)::int AS total FROM staff_invitation WHERE store_id=$1`, [storeId]);
    const rows = await database.query(
      `SELECT id,store_id,invited_email,
         CASE WHEN status='PENDING' AND expires_at<=now() THEN 'EXPIRED' ELSE status END AS status,
         expires_at,created_at,permissions
       FROM staff_invitation WHERE store_id=$1 ORDER BY created_at DESC,id LIMIT $2 OFFSET $3`,
      [storeId, paging.size, (paging.page - 1) * paging.size],
    );
    return { items: rows.map(publicInvitation), total: count?.total ?? 0, ...paging };
  }

  async createInvitation(userId: string, storeId: string, input: InvitationInput, correlationId: string) {
    const email = input.invited_email.trim().toLowerCase();
    const permissions = [...new Set(input.permissions)];
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Email không hợp lệ.');
    }
    if (!Array.isArray(input.permissions) || permissions.some(p => typeof p !== 'string' || !SELLER_PERMISSIONS.has(p))) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Chỉ có thể cấp các quyền Seller của Store.');
    }
    return database.transaction(async manager => {
      await manager.query('SELECT id FROM store WHERE id=$1 FOR UPDATE', [storeId]);
      await this.assertOwner(manager, userId, storeId);
      const [recipient] = await manager.query(`SELECT id FROM "user" WHERE lower(email)=lower($1)`, [email]);
      if (recipient?.id === userId) throw new ApiError(409, 'INVITATION_SELF', 'Không thể tự mời chính mình.');
      if (recipient) {
        await manager.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE', [recipient.id]);
        const [membership] = await manager.query(`SELECT id FROM store_membership WHERE user_id=$1 AND status='ACTIVE'`, [recipient.id]);
        if (membership) throw new ApiError(409, 'ACTIVE_MEMBERSHIP_EXISTS', 'Người nhận đã có Store đang hoạt động.');
      }
      const [existing] = await manager.query(
        `SELECT id,status,expires_at FROM staff_invitation WHERE store_id=$1 AND lower(invited_email)=lower($2)
         AND status='PENDING' ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [storeId, email]);
      if (existing && new Date(existing.expires_at).getTime() > Date.now()) {
        throw new ApiError(409, 'DUPLICATE_INVITATION', 'Email này đã có lời mời đang chờ.');
      }
      if (existing) {
        await manager.query(`UPDATE staff_invitation SET status='EXPIRED',version=version+1 WHERE id=$1`, [existing.id]);
        await audit(manager, 'M3', userId, 'StaffInvitation', existing.id, 'STAFF_INVITATION_EXPIRED', correlationId,
          { status: 'PENDING', store_id: storeId }, { status: 'EXPIRED' });
      }
      const id = randomUUID();
      // Hash at rest. The invitation is redeemed only by an authenticated, verified matching identity.
      const tokenHash = digest(randomBytes(32).toString('base64url'));
      const created = returnedRow<InvitationRow>(await manager.query(
        `INSERT INTO staff_invitation(id,store_id,invited_email,invited_user_id,invited_by_user_id,status,token_hash,expires_at,version,permissions,created_at)
         VALUES($1,$2,$3,$4,$5,'PENDING',$6,now()+($7 * interval '1 day'),0,$8::jsonb,now())
         RETURNING id,store_id,invited_email,status,expires_at,created_at,permissions`,
        [id, storeId, email, recipient?.id ?? null, userId, tokenHash, INVITATION_TTL_DAYS, JSON.stringify(permissions)],
      ));
      if (!created) throw new Error('Staff invitation insert returned no row');
      await audit(manager, 'M3', userId, 'StaffInvitation', id, 'STAFF_INVITATION_CREATED', correlationId, null,
        { store_id: storeId, permissions, status: 'PENDING' });
      return publicInvitation(created);
    });
  }

  async revokeInvitation(userId: string, storeId: string, id: string, correlationId: string) {
    if (!UUID_RE.test(id ?? '')) throw new ApiError(404, 'NOT_FOUND', 'Lời mời không tồn tại.');
    const result = await database.transaction(async manager => {
      await this.assertOwner(manager, userId, storeId);
      const [row] = await manager.query(`SELECT * FROM staff_invitation WHERE id=$1 AND store_id=$2 FOR UPDATE`, [id, storeId]);
      if (!row) throw new ApiError(404, 'NOT_FOUND', 'Lời mời không tồn tại.');
      if (row.status !== 'PENDING') {
        throw new ApiError(409, 'INVALID_STATE_TRANSITION', 'Chỉ lời mời PENDING còn hạn mới được thu hồi.');
      }
      if (new Date(row.expires_at).getTime() <= Date.now()) {
        await manager.query(`UPDATE staff_invitation SET status='EXPIRED',version=version+1 WHERE id=$1`, [id]);
        await audit(manager, 'M3', userId, 'StaffInvitation', id, 'STAFF_INVITATION_EXPIRED', correlationId,
          { status: 'PENDING', store_id: storeId }, { status: 'EXPIRED' });
        return { expired: true as const };
      }
      const updated = returnedRow<InvitationRow>(await manager.query(
        `UPDATE staff_invitation SET status='REVOKED',revoked_at=now(),version=version+1 WHERE id=$1 AND status='PENDING'
         RETURNING id,store_id,invited_email,status,expires_at,created_at,permissions`, [id]));
      if (!updated) throw new ApiError(409, 'INVALID_STATE_TRANSITION', 'Lời mời không còn ở trạng thái PENDING.');
      await audit(manager, 'M3', userId, 'StaffInvitation', id, 'STAFF_INVITATION_REVOKED', correlationId,
        { store_id: storeId, status: row.status }, { status: 'REVOKED' });
      return { expired: false as const, invitation: publicInvitation(updated) };
    });
    if (result.expired) throw new ApiError(409, 'INVITATION_EXPIRED', 'Lời mời đã hết hạn.');
    return result.invitation;
  }

  async listOwnInvitations(userId: string, page = 1, size = 20) {
    const paging = pageValues(page, size);
    const [user] = await database.query(`SELECT lower(email) AS email FROM "user" WHERE id=$1 AND status='ACTIVE' AND email_verified_at IS NOT NULL`, [userId]);
    if (!user) throw new ApiError(401, 'EMAIL_NOT_VERIFIED', 'Cần xác minh email để xem lời mời.');
    const args = [user.email];
    const [count] = await database.query(`SELECT count(*)::int AS total FROM staff_invitation WHERE lower(invited_email)=$1`, args);
    const rows = await database.query(
      `SELECT i.id,i.store_id,i.invited_email,
         CASE WHEN i.status='PENDING' AND i.expires_at<=now() THEN 'EXPIRED' ELSE i.status END AS status,
         i.expires_at,i.created_at,i.permissions,s.name AS store_name
       FROM staff_invitation i JOIN store s ON s.id=i.store_id
       WHERE lower(i.invited_email)=$1 ORDER BY i.created_at DESC,i.id LIMIT $2 OFFSET $3`,
      [user.email, paging.size, (paging.page - 1) * paging.size]);
    return { items: rows.map(publicInvitation), total: count?.total ?? 0, ...paging };
  }

  async acceptInvitation(userId: string, id: string, correlationId: string) {
    if (!UUID_RE.test(id ?? '')) throw new ApiError(404, 'NOT_FOUND', 'Lời mời không tồn tại.');
    const result = await database.transaction(async manager => {
      const [identity] = await manager.query(`SELECT id,lower(email) AS email,email_verified_at,status FROM "user" WHERE id=$1 FOR UPDATE`, [userId]);
      if (!identity || identity.status !== 'ACTIVE' || !identity.email_verified_at) throw new ApiError(401, 'EMAIL_NOT_VERIFIED', 'Cần xác minh email để nhận lời mời.');
      const [row] = await manager.query(`SELECT i.*,s.name AS store_name FROM staff_invitation i JOIN store s ON s.id=i.store_id WHERE i.id=$1 FOR UPDATE OF i`, [id]);
      if (!row || row.invited_email.toLowerCase() !== identity.email) throw new ApiError(404, 'NOT_FOUND', 'Lời mời không tồn tại.');
      if (row.status !== 'PENDING') throw new ApiError(409, 'INVALID_STATE_TRANSITION', 'Lời mời không còn ở trạng thái PENDING.');
      if (new Date(row.expires_at).getTime() <= Date.now()) {
        await manager.query(`UPDATE staff_invitation SET status='EXPIRED',version=version+1 WHERE id=$1`, [id]);
        await audit(manager, 'M3', userId, 'StaffInvitation', id, 'STAFF_INVITATION_EXPIRED', correlationId,
          { status: 'PENDING', store_id: row.store_id }, { status: 'EXPIRED' });
        return { expired: true as const };
      }
      const [store] = await manager.query(`SELECT id FROM store WHERE id=$1 AND status='ACTIVE'`, [row.store_id]);
      if (!store) throw new ApiError(409, 'STORE_INACTIVE', 'Store không còn hoạt động.');
      const [membership] = await manager.query(`SELECT id FROM store_membership WHERE user_id=$1 AND status='ACTIVE'`, [userId]);
      if (membership) throw new ApiError(409, 'ACTIVE_MEMBERSHIP_EXISTS', 'Người dùng đã có Store đang hoạt động.');
      const membershipId = randomUUID();
      await manager.query(`INSERT INTO store_membership(id,store_id,user_id,role,status,joined_at,version)
        VALUES($1,$2,$3,'SELLER','ACTIVE',now(),0)`, [membershipId, row.store_id, userId]);
      const permissions = (row.permissions ?? []) as string[];
      for (const permission of permissions) {
        if (!SELLER_PERMISSIONS.has(permission)) throw new ApiError(409, 'INVALID_INVITATION_PERMISSIONS', 'Lời mời chứa quyền không hợp lệ.');
        const [permissionRow] = await manager.query(`SELECT id FROM permission WHERE code=$1`, [permission]);
        if (!permissionRow) throw new ApiError(503, 'PERMISSION_CONFIGURATION_UNAVAILABLE', 'Cấu hình quyền Seller chưa sẵn sàng.');
        await manager.query(`INSERT INTO membership_permission(membership_id,permission_id,granted_at,version)
          VALUES($1,$2,now(),0) ON CONFLICT(membership_id,permission_id) DO NOTHING`, [membershipId, permissionRow.id]);
      }
      const updated = returnedRow<InvitationRow>(await manager.query(`UPDATE staff_invitation SET status='ACCEPTED',invited_user_id=$2,accepted_at=now(),version=version+1
        WHERE id=$1 AND status='PENDING' RETURNING id,store_id,invited_email,status,expires_at,created_at,permissions`, [id, userId]));
      if (!updated) throw new ApiError(409, 'INVALID_STATE_TRANSITION', 'Lời mời không còn ở trạng thái PENDING.');
      await manager.query(`INSERT INTO outbox(id,event_type,payload,correlation_id,created_at)
        VALUES($1,'MembershipChanged',$2::jsonb,$3,now())`,
        [randomUUID(), JSON.stringify({ user_id: userId, store_id: row.store_id, version: 0 }), correlationId]);
      await audit(manager, 'M3', userId, 'StaffInvitation', id, 'STAFF_INVITATION_ACCEPTED', correlationId,
        { status: 'PENDING' }, { status: 'ACCEPTED', membership_id: membershipId, store_id: row.store_id, permissions });
      return { expired: false as const, invitation: publicInvitation(updated) };
    });
    if (result.expired) throw new ApiError(409, 'INVITATION_EXPIRED', 'Lời mời đã hết hạn.');
    return result.invitation;
  }
}
