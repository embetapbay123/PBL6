import { EntityManager } from 'typeorm';
import { OwnedRepository } from '../../../shared/src/repository';

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
    const [updated] = await this.manager.query(
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
    const [updated] = await this.manager.query(
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
}
