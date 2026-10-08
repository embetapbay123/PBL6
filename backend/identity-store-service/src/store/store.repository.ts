import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import { audit } from '../../../shared/src/audit';

export class StoreRepository {
  async getOwnStore(userId: string) {
    const [row] = await database.query(
      `SELECT s.id, m.user_id AS owner_user_id, s.name, s.status, s.shipping_fee_vnd, s.version
       FROM store s
       JOIN store_membership m ON m.store_id=s.id AND m.status='ACTIVE'
       WHERE m.user_id=$1 AND s.status='ACTIVE'
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
         JOIN store_membership m ON m.store_id=s.id AND m.role='OWNER' AND m.status='ACTIVE'
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
