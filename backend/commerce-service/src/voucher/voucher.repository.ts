import { EntityManager } from 'typeorm';
import { OwnedRepository } from '../../../shared/src/repository';
import { ApiError } from '../../../shared/src/errors';

export interface VoucherRow {
  id: string;
  code: string;
  scope: string;
  store_id: string | null;
  owner_user_id: string;
  discount_type: string;
  discount_value: string;
  max_discount_vnd: string | null;
  min_goods_vnd: string;
  starts_at: Date;
  ends_at: Date;
  usage_limit: number;
  per_customer_limit: number;
  status: string;
  version: number;
}

export class VoucherRepository extends OwnedRepository {
  constructor(manager: EntityManager) {
    super(manager);
  }

  // --- Store Voucher Methods ---
  async pageStoreVouchers(storeId: string, page: number, size: number): Promise<{ items: VoucherRow[]; total: number }> {
    const [countRow] = await this.manager.query(
      `SELECT count(*)::int AS total FROM voucher WHERE scope = 'STORE' AND store_id = $1`,
      [storeId]
    );
    const offset = (page - 1) * size;
    const items = await this.manager.query(
      `SELECT id, code, scope, store_id, owner_user_id, discount_type, discount_value, max_discount_vnd, min_goods_vnd, starts_at, ends_at, usage_limit, per_customer_limit, status, version
       FROM voucher
       WHERE scope = 'STORE' AND store_id = $1
       ORDER BY starts_at DESC, id ASC
       LIMIT $2 OFFSET $3`,
      [storeId, size, offset]
    );
    return { items, total: countRow?.total ?? 0 };
  }

  async findStoreVoucherById(id: string, storeId: string): Promise<VoucherRow | undefined> {
    const [row] = await this.manager.query(
      `SELECT id, code, scope, store_id, owner_user_id, discount_type, discount_value, max_discount_vnd, min_goods_vnd, starts_at, ends_at, usage_limit, per_customer_limit, status, version
       FROM voucher
       WHERE id = $1 AND scope = 'STORE' AND store_id = $2`,
      [id, storeId]
    );
    return row;
  }

  async lockStoreVoucherById(id: string, storeId: string): Promise<VoucherRow | undefined> {
    const [row] = await this.manager.query(
      `SELECT id, code, scope, store_id, owner_user_id, discount_type, discount_value, max_discount_vnd, min_goods_vnd, starts_at, ends_at, usage_limit, per_customer_limit, status, version
       FROM voucher
       WHERE id = $1 AND scope = 'STORE' AND store_id = $2
       FOR UPDATE`,
      [id, storeId]
    );
    return row;
  }

  async createStoreVoucher(data: {
    code: string;
    store_id: string;
    owner_user_id: string;
    discount_type: string;
    discount_value: number;
    max_discount_vnd?: number | null;
    min_goods_vnd?: number;
    starts_at: string;
    ends_at: string;
    usage_limit: number;
    per_customer_limit: number;
    status?: string;
  }): Promise<VoucherRow> {
    const [inserted] = await this.manager.query(
      `INSERT INTO voucher (
         id, code, scope, store_id, owner_user_id, discount_type, discount_value,
         max_discount_vnd, min_goods_vnd, starts_at, ends_at, usage_limit,
         per_customer_limit, status, version
       ) VALUES (
         gen_random_uuid(), $1, 'STORE', $2, $3, $4, $5,
         $6, $7, $8, $9, $10,
         $11, $12, 0
       ) RETURNING id, code, scope, store_id, owner_user_id, discount_type, discount_value, max_discount_vnd, min_goods_vnd, starts_at, ends_at, usage_limit, per_customer_limit, status, version`,
      [
        data.code.trim().toUpperCase(),
        data.store_id,
        data.owner_user_id,
        data.discount_type,
        data.discount_value,
        data.max_discount_vnd ?? null,
        data.min_goods_vnd ?? 0,
        data.starts_at,
        data.ends_at,
        data.usage_limit,
        data.per_customer_limit,
        data.status ?? 'ACTIVE',
      ]
    );
    return inserted;
  }

  async updateStoreVoucher(
    id: string,
    storeId: string,
    data: {
      discount_type?: string;
      discount_value?: number;
      max_discount_vnd?: number | null;
      min_goods_vnd?: number;
      starts_at?: string;
      ends_at?: string;
      usage_limit?: number;
      per_customer_limit?: number;
      status?: string;
    }
  ): Promise<VoucherRow> {
    const updated = await this.updateReturning(
      `UPDATE voucher SET
         discount_type = COALESCE($1, discount_type),
         discount_value = COALESCE($2, discount_value),
         max_discount_vnd = CASE WHEN $3::boolean THEN $4 ELSE max_discount_vnd END,
         min_goods_vnd = COALESCE($5, min_goods_vnd),
         starts_at = COALESCE($6, starts_at),
         ends_at = COALESCE($7, ends_at),
         usage_limit = COALESCE($8, usage_limit),
         per_customer_limit = COALESCE($9, per_customer_limit),
         status = COALESCE($10, status),
         version = version + 1
       WHERE id = $11 AND scope = 'STORE' AND store_id = $12
       RETURNING id, code, scope, store_id, owner_user_id, discount_type, discount_value, max_discount_vnd, min_goods_vnd, starts_at, ends_at, usage_limit, per_customer_limit, status, version`,
      [
        data.discount_type ?? null,
        data.discount_value ?? null,
        data.max_discount_vnd !== undefined,
        data.max_discount_vnd ?? null,
        data.min_goods_vnd ?? null,
        data.starts_at ?? null,
        data.ends_at ?? null,
        data.usage_limit ?? null,
        data.per_customer_limit ?? null,
        data.status ?? null,
        id,
        storeId,
      ]
    );
    return updated;
  }

  // --- Platform Voucher Methods ---
  async pagePlatformVouchers(page: number, size: number): Promise<{ items: VoucherRow[]; total: number }> {
    const [countRow] = await this.manager.query(
      `SELECT count(*)::int AS total FROM voucher WHERE scope = 'PLATFORM'`
    );
    const offset = (page - 1) * size;
    const items = await this.manager.query(
      `SELECT id, code, scope, store_id, owner_user_id, discount_type, discount_value, max_discount_vnd, min_goods_vnd, starts_at, ends_at, usage_limit, per_customer_limit, status, version
       FROM voucher
       WHERE scope = 'PLATFORM'
       ORDER BY starts_at DESC, id ASC
       LIMIT $1 OFFSET $2`,
      [size, offset]
    );
    return { items, total: countRow?.total ?? 0 };
  }

  async findPlatformVoucherById(id: string): Promise<VoucherRow | undefined> {
    const [row] = await this.manager.query(
      `SELECT id, code, scope, store_id, owner_user_id, discount_type, discount_value, max_discount_vnd, min_goods_vnd, starts_at, ends_at, usage_limit, per_customer_limit, status, version
       FROM voucher
       WHERE id = $1 AND scope = 'PLATFORM'`,
      [id]
    );
    return row;
  }

  async lockPlatformVoucherById(id: string): Promise<VoucherRow | undefined> {
    const [row] = await this.manager.query(
      `SELECT id, code, scope, store_id, owner_user_id, discount_type, discount_value, max_discount_vnd, min_goods_vnd, starts_at, ends_at, usage_limit, per_customer_limit, status, version
       FROM voucher
       WHERE id = $1 AND scope = 'PLATFORM'
       FOR UPDATE`,
      [id]
    );
    return row;
  }

  async findByCode(code: string): Promise<VoucherRow | undefined> {
    const [row] = await this.manager.query(
      `SELECT id, code, scope, store_id, owner_user_id, discount_type, discount_value, max_discount_vnd, min_goods_vnd, starts_at, ends_at, usage_limit, per_customer_limit, status, version
       FROM voucher
       WHERE upper(code) = upper($1)`,
      [code]
    );
    return row;
  }

  async createPlatformVoucher(data: {
    code: string;
    owner_user_id: string;
    discount_type: string;
    discount_value: number;
    max_discount_vnd?: number | null;
    min_goods_vnd?: number;
    starts_at: string;
    ends_at: string;
    usage_limit: number;
    per_customer_limit: number;
    status?: string;
  }): Promise<VoucherRow> {
    const [inserted] = await this.manager.query(
      `INSERT INTO voucher (
         id, code, scope, store_id, owner_user_id, discount_type, discount_value,
         max_discount_vnd, min_goods_vnd, starts_at, ends_at, usage_limit,
         per_customer_limit, status, version
       ) VALUES (
         gen_random_uuid(), $1, 'PLATFORM', NULL, $2, $3, $4,
         $5, $6, $7, $8, $9,
         $10, $11, 0
       ) RETURNING id, code, scope, store_id, owner_user_id, discount_type, discount_value, max_discount_vnd, min_goods_vnd, starts_at, ends_at, usage_limit, per_customer_limit, status, version`,
      [
        data.code.trim().toUpperCase(),
        data.owner_user_id,
        data.discount_type,
        data.discount_value,
        data.max_discount_vnd ?? null,
        data.min_goods_vnd ?? 0,
        data.starts_at,
        data.ends_at,
        data.usage_limit,
        data.per_customer_limit,
        data.status ?? 'ACTIVE',
      ]
    );
    return inserted;
  }

  async updatePlatformVoucher(
    id: string,
    data: {
      discount_type?: string;
      discount_value?: number;
      max_discount_vnd?: number | null;
      min_goods_vnd?: number;
      starts_at?: string;
      ends_at?: string;
      usage_limit?: number;
      per_customer_limit?: number;
      status?: string;
    }
  ): Promise<VoucherRow> {
    const updated = await this.updateReturning(
      `UPDATE voucher SET
         discount_type = COALESCE($1, discount_type),
         discount_value = COALESCE($2, discount_value),
         max_discount_vnd = CASE WHEN $3::boolean THEN $4 ELSE max_discount_vnd END,
         min_goods_vnd = COALESCE($5, min_goods_vnd),
         starts_at = COALESCE($6, starts_at),
         ends_at = COALESCE($7, ends_at),
         usage_limit = COALESCE($8, usage_limit),
         per_customer_limit = COALESCE($9, per_customer_limit),
         status = COALESCE($10, status),
         version = version + 1
       WHERE id = $11 AND scope = 'PLATFORM'
       RETURNING id, code, scope, store_id, owner_user_id, discount_type, discount_value, max_discount_vnd, min_goods_vnd, starts_at, ends_at, usage_limit, per_customer_limit, status, version`,
      [
        data.discount_type ?? null,
        data.discount_value ?? null,
        data.max_discount_vnd !== undefined,
        data.max_discount_vnd ?? null,
        data.min_goods_vnd ?? null,
        data.starts_at ?? null,
        data.ends_at ?? null,
        data.usage_limit ?? null,
        data.per_customer_limit ?? null,
        data.status ?? null,
        id,
      ]
    );
    return updated;
  }

  async getVoucherUsageCounts(
    voucherId: string
  ): Promise<{ redeemed_count: number; reserved_count: number }> {
    const [row] = await this.manager.query(
      `SELECT 
         (SELECT count(DISTINCT purchase_group_id)::int FROM voucher_redemption WHERE voucher_id = $1) AS redeemed_count,
         (SELECT count(DISTINCT purchase_group_id)::int FROM voucher_reservation r WHERE voucher_id = $1 AND status IN ('ACTIVE','RESERVED') AND expires_at > NOW() AND NOT EXISTS (SELECT 1 FROM voucher_redemption d WHERE d.voucher_id=r.voucher_id AND d.purchase_group_id=r.purchase_group_id)) AS reserved_count`,
      [voucherId]
    );
    return {
      redeemed_count: Number(row?.redeemed_count ?? 0),
      reserved_count: Number(row?.reserved_count ?? 0),
    };
  }

  async reserveVoucher(data: {
    voucher_id: string;
    purchase_group_id: string;
    customer_user_id: string;
    store_id?: string | null;
    discount_vnd: number;
    expires_at: Date;
  }): Promise<{ id: string }> {
    const [voucher] = await this.manager.query(
      `SELECT id, usage_limit, per_customer_limit, status, starts_at, ends_at
       FROM voucher
       WHERE id = $1
       FOR UPDATE`,
      [data.voucher_id]
    );
    if (!voucher) {
      throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy voucher.');
    }
    if (voucher.status !== 'ACTIVE') {
      throw new ApiError(422, 'VOUCHER_INACTIVE', 'Voucher không còn hoạt động.');
    }
    const now = new Date();
    if (now < new Date(voucher.starts_at) || now > new Date(voucher.ends_at)) {
      throw new ApiError(422, 'VOUCHER_EXPIRED', 'Voucher đã hết hạn hoặc chưa có hiệu lực.');
    }

    const [usage] = await this.manager.query(
      `WITH used AS (
         SELECT purchase_group_id, customer_user_id FROM voucher_redemption WHERE voucher_id = $1
         UNION
         SELECT purchase_group_id, customer_user_id FROM voucher_reservation 
         WHERE voucher_id = $1 AND status IN ('ACTIVE', 'RESERVED') AND expires_at > NOW() AND purchase_group_id != $3
       )
       SELECT 
         COUNT(*)::int AS total_used,
         COUNT(*) FILTER (WHERE customer_user_id = $2)::int AS customer_used
       FROM used`,
      [data.voucher_id, data.customer_user_id, data.purchase_group_id]
    );

    if (Number(usage?.total_used ?? 0) >= voucher.usage_limit) {
      throw new ApiError(422, 'VOUCHER_OUT_OF_QUOTA', 'Voucher đã hết lượt sử dụng.');
    }
    if (Number(usage?.customer_used ?? 0) >= voucher.per_customer_limit) {
      throw new ApiError(422, 'VOUCHER_OUT_OF_QUOTA', 'Bạn đã đạt giới hạn sử dụng voucher này.');
    }

    const [inserted] = await this.manager.query(
      `INSERT INTO voucher_reservation (
         id, voucher_id, purchase_group_id, customer_user_id, store_id, status, discount_vnd, expires_at
       ) VALUES (
         gen_random_uuid(), $1, $2, $3, $4, 'ACTIVE', $5, $6
       )
       ON CONFLICT (voucher_id, purchase_group_id)
       DO UPDATE SET discount_vnd = EXCLUDED.discount_vnd, expires_at = EXCLUDED.expires_at, status = 'ACTIVE'
       RETURNING id`,
      [
        data.voucher_id,
        data.purchase_group_id,
        data.customer_user_id,
        data.store_id ?? null,
        data.discount_vnd,
        data.expires_at,
      ]
    );
    return { id: inserted.id };
  }

  async commitVoucherRedemptions(
    purchaseGroupId: string,
    redemptions: Array<{
      voucher_id: string;
      order_id: string;
      customer_user_id: string;
      discount_vnd: number;
    }>
  ): Promise<void> {
    for (const r of redemptions) {
      await this.manager.query(
        `INSERT INTO voucher_redemption (
           id, voucher_id, purchase_group_id, order_id, customer_user_id, discount_vnd, redeemed_at
         ) VALUES (
           gen_random_uuid(), $1, $2, $3, $4, $5, NOW()
         )
         ON CONFLICT (voucher_id, order_id) DO NOTHING`,
        [r.voucher_id, purchaseGroupId, r.order_id, r.customer_user_id, r.discount_vnd]
      );
      await this.manager.query(
        `UPDATE voucher_reservation 
         SET status = 'RESERVED' 
         WHERE purchase_group_id = $1 AND voucher_id = $2`,
        [purchaseGroupId, r.voucher_id]
      );
    }
  }

  async releaseVoucherReservations(purchaseGroupId: string): Promise<void> {
    await this.manager.query(
      `UPDATE voucher_reservation 
       SET status = 'RELEASED' 
       WHERE purchase_group_id = $1 AND status = 'ACTIVE'`,
      [purchaseGroupId]
    );
  }

  async findActiveReservationsByPurchaseGroup(
    purchaseGroupId: string
  ): Promise<Array<{ id: string; voucher_id: string; discount_vnd: string; status: string }>> {
    return this.manager.query(
      `SELECT id, voucher_id, discount_vnd, status
       FROM voucher_reservation
       WHERE purchase_group_id = $1 AND status IN ('ACTIVE', 'RESERVED')`,
      [purchaseGroupId]
    );
  }
}

