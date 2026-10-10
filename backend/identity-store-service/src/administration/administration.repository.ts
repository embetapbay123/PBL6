import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import { audit } from '../../../shared/src/audit';
import { emitEvent } from '../../../shared/src/events';
import { randomUUID } from 'node:crypto';

export class AdministrationRepository {
  async listUsers(page = 1, size = 20) {
    page = Math.max(1, Math.trunc(page));
    size = Math.min(100, Math.max(1, Math.trunc(size)));
    const offset = Math.max(0, (page - 1) * size);
    const [totalRow] = await database.query('SELECT count(*)::int AS total FROM "user"');
    const items = await database.query(
      'SELECT id, email, status, version FROM "user" ORDER BY created_at DESC, id LIMIT $1 OFFSET $2',
      [size, offset]
    );
    return {
      items,
      total: totalRow?.total ?? 0,
      page,
      size,
    };
  }

  async updateUserState(id: string, status: string, reason: string, expectedVersion: number, actorUserId: string, correlationId: string) {
    return database.transaction(async manager => {
      const [user] = await manager.query('SELECT * FROM "user" WHERE id=$1 FOR UPDATE', [id]);
      if (!user) throw new ApiError(404, 'NOT_FOUND', 'Người dùng không tồn tại.');
      if (user.version !== expectedVersion) {
        throw new ApiError(409, 'VERSION_CONFLICT', 'Phiên bản không khớp.');
      }
      const newVersion = user.version + 1;
      const [updated] = await manager.query(
        'UPDATE "user" SET status=$1, version=$2 WHERE id=$3 RETURNING id, email, status, version',
        [status, newVersion, id]
      );

      if (status !== 'ACTIVE') {
        await manager.query(
          'UPDATE refresh_session SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',
          [id]
        );
      }

      await audit(
        manager,
        'M3',
        actorUserId,
        'User',
        id,
        'USER_STATE_UPDATED',
        correlationId,
        { status: user.status, version: user.version },
        { status: updated.status, version: updated.version, reason }
      );

      await emitEvent(
        manager,
        'UserLocked',
        {
          user_id: id,
          status: updated.status,
          reason,
          version: updated.version,
        },
        correlationId || randomUUID()
      );

      return updated;
    });
  }

  async listStores(page = 1, size = 20) {
    page = Math.max(1, Math.trunc(page));
    size = Math.min(100, Math.max(1, Math.trunc(size)));
    const offset = Math.max(0, (page - 1) * size);
    const [totalRow] = await database.query('SELECT count(*)::int AS total FROM store');
    const rows = await database.query(
      `SELECT s.id, m.user_id AS owner_user_id, s.name, s.status, s.shipping_fee_vnd, s.version
       FROM store s
       LEFT JOIN store_membership m ON m.store_id=s.id AND m.role='OWNER' AND m.status='ACTIVE'
       ORDER BY s.id
       LIMIT $1 OFFSET $2`,
      [size, offset]
    );
    const items = rows.map((r: any) => ({
      id: r.id,
      owner_user_id: r.owner_user_id ?? '00000000-0000-0000-0000-000000000000',
      name: r.name,
      status: r.status,
      shipping_fee_vnd: Number(r.shipping_fee_vnd),
      version: r.version,
    }));
    return {
      items,
      total: totalRow?.total ?? 0,
      page,
      size,
    };
  }

  async updateStoreState(id: string, status: string, reason: string, expectedVersion: number, actorUserId: string, correlationId: string) {
    return database.transaction(async manager => {
      const [store] = await manager.query('SELECT * FROM store WHERE id=$1 FOR UPDATE', [id]);
      if (!store) throw new ApiError(404, 'NOT_FOUND', 'Cửa hàng không tồn tại.');
      if (store.version !== expectedVersion) {
        throw new ApiError(409, 'VERSION_CONFLICT', 'Phiên bản không khớp.');
      }
      const newVersion = store.version + 1;
      const [updated] = await manager.query(
        'UPDATE store SET status=$1, version=$2 WHERE id=$3 RETURNING *',
        [status, newVersion, id]
      );
      const [ownerRow] = await manager.query(
        "SELECT user_id FROM store_membership WHERE store_id=$1 AND role='OWNER' AND status='ACTIVE' LIMIT 1",
        [id]
      );

      await audit(
        manager,
        'M3',
        actorUserId,
        'Store',
        id,
        'STORE_STATE_UPDATED',
        correlationId,
        { status: store.status, version: store.version },
        { status: updated.status, version: updated.version, reason }
      );

      await emitEvent(
        manager,
        'StoreStatusChanged',
        {
          store_id: id,
          status: updated.status,
          reason,
          version: updated.version,
        },
        correlationId || randomUUID()
      );

      return {
        id: updated.id,
        owner_user_id: ownerRow?.user_id ?? '00000000-0000-0000-0000-000000000000',
        name: updated.name,
        status: updated.status,
        shipping_fee_vnd: Number(updated.shipping_fee_vnd),
        version: updated.version,
      };
    });
  }

  async updateRole(id: string, permissionIds: string[], expectedVersion: number, actorUserId: string, correlationId: string) {
    return database.transaction(async manager => {
      const [role] = await manager.query('SELECT * FROM role WHERE id=$1 FOR UPDATE', [id]);
      if (!role) throw new ApiError(404, 'NOT_FOUND', 'Vai trò không tồn tại.');
      if (role.version !== expectedVersion) throw new ApiError(409, 'VERSION_CONFLICT', 'Phiên bản không khớp.');

      const existing = await manager.query(
        'SELECT permission_id FROM role_permission WHERE role_id=$1',
        [id]
      );
      const oldPermissionIds = existing.map((r: any) => r.permission_id);

      if (permissionIds.some(permissionId => !existing.some((row: any) => row.permission_id === permissionId))) {
        const allowed = await manager.query(
          'SELECT id FROM permission WHERE id = ANY($1::uuid[])',
          [permissionIds],
        );
        if (allowed.length !== new Set(permissionIds).size) {
          throw new ApiError(422, 'VALIDATION_FAILED', 'Một hoặc nhiều quyền không tồn tại.');
        }
      }
      await manager.query('DELETE FROM role_permission WHERE role_id=$1', [id]);
      for (const pid of permissionIds) {
        await manager.query(
          'INSERT INTO role_permission(role_id, permission_id) VALUES($1, $2) ON CONFLICT DO NOTHING',
          [id, pid]
        );
      }
      const newVersion = role.version + 1;
      await manager.query('UPDATE role SET version=$1 WHERE id=$2', [newVersion, id]);

      await audit(
        manager,
        'M3',
        actorUserId,
        'Role',
        id,
        'ROLE_PERMISSIONS_UPDATED',
        correlationId,
        { permission_ids: oldPermissionIds, version: expectedVersion },
        { permission_ids: permissionIds, version: newVersion }
      );

      await emitEvent(
        manager,
        'MembershipChanged',
        {
          role_id: id,
          code: role.code,
          permission_ids: permissionIds,
          version: newVersion,
        },
        correlationId || randomUUID()
      );

      return {
        id: role.id,
        name: role.code,
        permission_ids: permissionIds,
        version: newVersion,
      };
    });
  }
}
