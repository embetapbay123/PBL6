import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import { audit } from '../../../shared/src/audit';
import { randomUUID } from 'node:crypto';

export class StoreRepository {
  async submitStoreApplication(
    userId: string,
    input: { proposed_name: string; contact: string },
    correlationId: string
  ) {
    return database.transaction(async manager => {
      const pending = await manager.query(
        `SELECT id FROM store_application
         WHERE applicant_user_id=$1 AND status='PENDING'
         LIMIT 1 FOR UPDATE`,
        [userId]
      );
      if (pending.length) {
        throw new ApiError(409, 'DUPLICATE_APPLICATION', 'Người dùng đã có đơn đăng ký đang chờ duyệt.');
      }

      const [application] = await manager.query(
        `INSERT INTO store_application
           (id, applicant_user_id, proposed_name, contact, status, submitted_at, version)
         VALUES ($1,$2,$3,$4,'PENDING',now(),0)
         RETURNING id, proposed_name, contact, status, decision_reason, version`,
        [randomUUID(), userId, input.proposed_name, input.contact]
      );
      await audit(manager, 'M3', userId, 'StoreApplication', application.id, 'STORE_APPLICATION_SUBMITTED',
        correlationId, null, { status: application.status, version: application.version });
      return application;
    });
  }

  async listStoreApplications(userId: string | null, page = 1, size = 20) {
    page = Math.max(1, Math.trunc(page));
    size = Math.min(100, Math.max(1, Math.trunc(size)));
    const offset = (page - 1) * size;
    const scope = userId ? ' WHERE applicant_user_id=$1' : '';
    const parameters = userId ? [userId] : [];
    const [totalRow] = await database.query(
      `SELECT count(*)::int AS total FROM store_application${scope}`,
      parameters
    );
    const items = await database.query(
      `SELECT id, proposed_name, contact, status, decision_reason, version
       FROM store_application${scope}
       ORDER BY submitted_at DESC, id
       LIMIT $${parameters.length + 1} OFFSET $${parameters.length + 2}`,
      [...parameters, size, offset]
    );
    return { items, total: totalRow?.total ?? 0, page, size };
  }

  async reviewStoreApplication(
    id: string,
    input: { status: 'APPROVED' | 'REJECTED'; decision_reason?: string; expected_version: number },
    adminUserId: string,
    correlationId: string
  ) {
    if (input.status === 'REJECTED' && !input.decision_reason?.trim()) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'decision_reason là bắt buộc khi từ chối.');
    }

    return database.transaction(async manager => {
      const [application] = await manager.query(
        'SELECT * FROM store_application WHERE id=$1 FOR UPDATE',
        [id]
      );
      if (!application) throw new ApiError(404, 'NOT_FOUND', 'Đơn đăng ký Store không tồn tại.');
      if (application.version !== input.expected_version) {
        throw new ApiError(409, 'VERSION_CONFLICT', 'Phiên bản không khớp.');
      }
      if (application.status !== 'PENDING') {
        throw new ApiError(409, 'INVALID_STATE_TRANSITION', 'Chỉ đơn PENDING mới được duyệt.');
      }

      if (input.status === 'APPROVED') {
        await manager.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE', [application.applicant_user_id]);
        const activeMembership = await manager.query(
          `SELECT id FROM store_membership
           WHERE user_id=$1 AND status='ACTIVE'
           LIMIT 1 FOR UPDATE`,
          [application.applicant_user_id]
        );
        if (activeMembership.length) {
          throw new ApiError(409, 'ACTIVE_MEMBERSHIP_EXISTS', 'Người dùng đã có Store đang hoạt động.');
        }
      }

      const version = application.version + 1;
      const [updated] = await manager.query(
        `UPDATE store_application
         SET status=$1, decision_reason=$2, decided_by_user_id=$3, decided_at=now(), version=$4
         WHERE id=$5
         RETURNING id, proposed_name, contact, status, decision_reason, version`,
        [input.status, input.decision_reason ?? null, adminUserId, version, id]
      );

      if (input.status === 'APPROVED') {
        const storeId = randomUUID();
        const slugBase = application.proposed_name.normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '').toLowerCase()
          .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180) || 'store';
        const slug = `${slugBase}-${storeId.slice(0, 8)}`;
        await manager.query(
          `INSERT INTO store
             (id, application_id, name, slug, description, contact, shipping_fee_vnd, status, version)
           VALUES ($1,$2,$3,$4,NULL,$5,0,'ACTIVE',0)
           RETURNING id`,
          [storeId, id, application.proposed_name, slug, application.contact]
        );
        await manager.query(
          `INSERT INTO store_membership (id, store_id, user_id, role, status, joined_at, version)
           VALUES ($1,$2,$3,'OWNER','ACTIVE',now(),0)`,
          [randomUUID(), storeId, application.applicant_user_id]
        );
      }

      await audit(manager, 'M3', adminUserId, 'StoreApplication', id, 'STORE_APPLICATION_REVIEWED',
        correlationId,
        { status: application.status, version: application.version },
        { status: updated.status, version: updated.version, decision_reason: updated.decision_reason });
      return updated;
    });
  }

  async listActiveStoreIds() {
    const rows = await database.query(`SELECT id FROM store WHERE status='ACTIVE' ORDER BY id`);
    return { ids: rows.map((row: { id: string }) => row.id) };
  }

  async getOwnStore(userId: string) {
    const [row] = await database.query(
      `SELECT s.id, owner.user_id AS owner_user_id, s.name, s.status, s.shipping_fee_vnd, s.version
       FROM store s
       JOIN store_membership m ON m.store_id=s.id AND m.user_id=$1 AND m.status='ACTIVE'
       JOIN store_membership owner ON owner.store_id=s.id AND owner.role='OWNER' AND owner.status='ACTIVE'
       WHERE s.status='ACTIVE' AND m.role IN ('OWNER','SELLER')
       ORDER BY m.joined_at DESC, m.id
       LIMIT 1`,
      [userId]
    );
    if (!row) {
      throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy cửa hàng hoạt động của người dùng.');
    }
    return {
      id: row.id,
      owner_user_id: row.owner_user_id,
      name: row.name,
      status: row.status,
      shipping_fee_vnd: Number(row.shipping_fee_vnd),
      version: row.version,
    };
  }

  async updateOwnStore(
    userId: string,
    input: { name?: string; description?: string; shipping_fee_vnd?: number; expected_version: number },
    correlationId: string
  ) {
    return database.transaction(async manager => {
      const [store] = await manager.query(
        `SELECT s.* FROM store s
         JOIN store_membership m ON m.store_id=s.id AND m.user_id=$1 AND m.role='OWNER' AND m.status='ACTIVE'
         WHERE m.user_id=$1 AND s.status='ACTIVE'
         FOR UPDATE`,
        [userId]
      );
      if (!store) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy cửa hàng để cập nhật.');
      }
      if (store.version !== input.expected_version) {
        throw new ApiError(409, 'VERSION_CONFLICT', 'Phiên bản không khớp.');
      }

      const name = input.name !== undefined ? input.name : store.name;
      const description = input.description !== undefined ? input.description : store.description;
      const shippingFee = input.shipping_fee_vnd !== undefined ? input.shipping_fee_vnd : store.shipping_fee_vnd;
      const newVersion = store.version + 1;

      const [updated] = await manager.query(
        `UPDATE store SET name=$1, description=$2, shipping_fee_vnd=$3, version=$4 WHERE id=$5 RETURNING *`,
        [name, description, shippingFee, newVersion, store.id]
      );

      await audit(
        manager,
        'M3',
        userId,
        'Store',
        store.id,
        'STORE_UPDATED',
        correlationId,
        { name: store.name, description: store.description, shipping_fee_vnd: store.shipping_fee_vnd, version: store.version },
        { name: updated.name, description: updated.description, shipping_fee_vnd: updated.shipping_fee_vnd, version: updated.version }
      );

      return {
        id: updated.id,
        owner_user_id: userId,
        name: updated.name,
        status: updated.status,
        shipping_fee_vnd: Number(updated.shipping_fee_vnd),
        version: updated.version,
      };
    });
  }
}
