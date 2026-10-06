import { randomUUID } from 'node:crypto';
import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import type { CreateAddressRequest, ProfileResponse, UpdateAddressRequest, UpdateProfileRequest } from './dtos';

type QueryManager = { query: (sql: string, parameters?: unknown[]) => Promise<any[]> };
const addressFields = ['recipient_name', 'phone', 'line1', 'ward', 'district', 'city', 'is_default'] as const;
const profileFields = ['display_name', 'phone'] as const;

export class ProfileRepository {
  async getProfile(userId: string): Promise<ProfileResponse | null> {
    const [row] = await database.query(
      `SELECT u.id AS user_id,u.email,u.email_verified_at,
              p.display_name,p.phone
       FROM "user" u
       LEFT JOIN customer_profile p ON p.user_id=u.id
       WHERE u.id=$1 AND u.status='ACTIVE'`,
      [userId],
    );
    return row ? { ...row, email_verified_at: row.email_verified_at instanceof Date ? row.email_verified_at.toISOString() : row.email_verified_at } : null;
  }

  async updateProfile(userId: string, input: UpdateProfileRequest, requestId: string): Promise<ProfileResponse> {
    return database.transaction(async manager => {
      const [current] = await manager.query(
        `SELECT p.id,p.display_name,p.phone,u.email,u.email_verified_at
         FROM "user" u
         LEFT JOIN customer_profile p ON p.user_id=u.id
         WHERE u.id=$1 AND u.status='ACTIVE'
         FOR UPDATE OF u`,
        [userId],
      );
      if (!current) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy người dùng.');

      const updates = profileFields
        .filter(field => input[field] !== undefined)
        .map(field => ({ field, value: input[field] }));
      if (!updates.length) {
        throw new ApiError(422, 'VALIDATION_FAILED', 'Phải có ít nhất một trường cần cập nhật.');
      }

      const [profile] = await manager.query(
        `INSERT INTO customer_profile(user_id,display_name,phone,updated_at)
         VALUES($1,$2,$3,now())
         ON CONFLICT (user_id) DO UPDATE SET
           display_name=COALESCE(EXCLUDED.display_name,customer_profile.display_name),
           phone=CASE WHEN $4::boolean THEN EXCLUDED.phone ELSE customer_profile.phone END,
           updated_at=now()
         RETURNING id,display_name,phone`,
        [
          userId,
          input.display_name ?? current.display_name ?? '',
          input.phone ?? current.phone,
          Object.prototype.hasOwnProperty.call(input, 'phone'),
        ],
      );
      if (!profile) throw new ApiError(500, 'PROFILE_UPDATE_FAILED', 'Không thể cập nhật hồ sơ.');

      const after = {
        user_id: userId,
        email: current.email,
        email_verified_at: current.email_verified_at instanceof Date ? current.email_verified_at.toISOString() : current.email_verified_at,
        display_name: profile.display_name,
        phone: profile.phone,
      };
      await manager.query(
        `INSERT INTO m3_audit
          (actor_user_id,target_type,target_id,action,request_id,before_json,after_json)
         VALUES($1,'USER_PROFILE',$2,'PROFILE_UPDATED',$3,$4::jsonb,$5::jsonb)`,
        [
          userId,
          profile.id,
          requestId || randomUUID(),
          JSON.stringify({ fields: updates.map(x => x.field) }),
          JSON.stringify({ fields: updates.map(x => x.field) }),
        ],
      );
      return after;
    });
  }

  async listAddresses(userId: string, page: number, size: number) {
    const offset = (page - 1) * size;
    const [rows, count] = await Promise.all([
      database.query(
        `SELECT id,recipient_name,phone,line1,ward,district,city,is_default
         FROM address
         WHERE customer_user_id=$1 AND status='ACTIVE'
         ORDER BY is_default DESC, id
         LIMIT $2 OFFSET $3`,
        [userId, size, offset],
      ),
      database.query(
        `SELECT count(*)::int AS total
         FROM address
         WHERE customer_user_id=$1 AND status='ACTIVE'`,
        [userId],
      ),
    ]);
    return { items: rows, total: count[0]?.total ?? 0, page, size };
  }

  async createAddress(userId: string, input: CreateAddressRequest, requestId: string) {
    return database.transaction(async manager => {
      await this.lockCustomer(manager, userId);
      if (input.is_default === true) {
        await manager.query(
          `UPDATE address SET is_default=false
           WHERE customer_user_id=$1 AND status='ACTIVE' AND is_default=true`,
          [userId],
        );
      }
      const [row] = await manager.query(
        `INSERT INTO address
          (customer_user_id,recipient_name,phone,line1,ward,district,city,is_default,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ACTIVE')
         RETURNING id,recipient_name,phone,line1,ward,district,city,is_default`,
        [
          userId,
          input.recipient_name,
          input.phone,
          input.line1,
          input.ward,
          input.district,
          input.city,
          input.is_default ?? false,
        ],
      );
      await this.audit(manager, userId, row.id, 'ADDRESS_CREATED', null, row, requestId);
      return row;
    });
  }

  async updateAddress(userId: string, addressId: string, input: UpdateAddressRequest, requestId: string) {
    return database.transaction(async manager => {
      await this.lockCustomer(manager, userId);
      const [current] = await manager.query(
        `SELECT id,recipient_name,phone,line1,ward,district,city,is_default
         FROM address
         WHERE id=$1 AND customer_user_id=$2 AND status='ACTIVE'
         FOR UPDATE`,
        [addressId, userId],
      );
      if (!current) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa chỉ.');

      if (input.is_default === true) {
        await manager.query(
          `UPDATE address SET is_default=false
           WHERE customer_user_id=$1 AND status='ACTIVE' AND is_default=true AND id<>$2`,
          [userId, addressId],
        );
      }

      const updates = addressFields
        .filter(field => input[field] !== undefined)
        .map(field => ({ field, value: input[field] }));
      if (!updates.length) throw new ApiError(422, 'VALIDATION_FAILED', 'Phải có ít nhất một trường cần cập nhật.');

      const assignments = updates.map(({ field }, index) => `"${field}"=$${index + 3}`).join(',');
      const values = updates.map(({ value }) => value);
      const result = await manager.query(
        `UPDATE address SET ${assignments}
         WHERE id=$1 AND customer_user_id=$2 AND status='ACTIVE'
         RETURNING id,recipient_name,phone,line1,ward,district,city,is_default`,
        [addressId, userId, ...values],
      );
      const row = (Array.isArray(result[0]) ? result[0] : result)[0];
      if (!row) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa chỉ.');
      await this.audit(manager, userId, row.id, 'ADDRESS_UPDATED', current, row, requestId);
      return row;
    });
  }

  async deleteAddress(userId: string, addressId: string, requestId: string) {
    return database.transaction(async manager => {
      await this.lockCustomer(manager, userId);
      const [current] = await manager.query(
        `SELECT id,recipient_name,phone,line1,ward,district,city,is_default
         FROM address
         WHERE id=$1 AND customer_user_id=$2 AND status='ACTIVE'
         FOR UPDATE`,
        [addressId, userId],
      );
      if (!current) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa chỉ.');
      await manager.query(
        `UPDATE address SET status='DELETED',is_default=false
         WHERE id=$1 AND customer_user_id=$2 AND status='ACTIVE'`,
        [addressId, userId],
      );
      await this.audit(manager, userId, addressId, 'ADDRESS_DELETED', current, null, requestId);
      return { status: 'DELETED', message: 'Địa chỉ đã được xóa.' };
    });
  }

  private async lockCustomer(manager: QueryManager, userId: string) {
    const [user] = await manager.query('SELECT id FROM "user" WHERE id=$1 AND status=\'ACTIVE\' FOR UPDATE', [userId]);
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy người dùng.');
  }

  private async audit(
    manager: QueryManager,
    actorUserId: string,
    targetId: string,
    action: string,
    before: unknown,
    after: unknown,
    requestId: string,
  ) {
    await manager.query(
      `INSERT INTO m3_audit
        (actor_user_id,target_type,target_id,action,request_id,before_json,after_json)
       VALUES ($1,'ADDRESS',$2,$3,$4,$5::jsonb,$6::jsonb)`,
      [actorUserId, targetId, action, requestId || randomUUID(), JSON.stringify(before ? { is_default: (before as any).is_default } : {}), JSON.stringify(after ? { is_default: (after as any).is_default } : {})],
    );
  }
}
