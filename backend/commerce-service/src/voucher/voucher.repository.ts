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

  // The caller owns the Order transaction. Never release row/advisory locks between checks and writes.
  private requireTransaction(): void {
    if (!this.manager.queryRunner?.isTransactionActive) throw new Error('VOUCHER_REQUIRES_CALLER_TRANSACTION');
  }

  private amount(value: number): bigint {
    if (!Number.isSafeInteger(value) || value < 0) throw new ApiError(422, 'VALIDATION_FAILED', 'Invalid voucher discount.');
    return BigInt(value);
  }

  private reservationConflict(message: string): never {
    throw new ApiError(409, 'VOUCHER_RESERVATION_CONFLICT', message);
  }

  private async lockGroup(group: string): Promise<void> {
    await this.manager.query("SELECT pg_advisory_xact_lock(hashtextextended('Voucher.Group:' || $1,0))", [group]);
  }

  private async now(): Promise<Date> {
    const [row] = await this.manager.query('SELECT clock_timestamp() AS now');
    return new Date(row.now);
  }

  private available(voucher: any, now: Date): void {
    if (voucher.status !== 'ACTIVE') throw new ApiError(422, 'VOUCHER_INACTIVE', 'Voucher is not active.');
    if (now < new Date(voucher.starts_at) || now >= new Date(voucher.ends_at))
      throw new ApiError(422, 'VOUCHER_EXPIRED', 'Voucher is outside its validity period.');
  }

  private async quota(voucherId: string, customerId: string): Promise<{ total_used: number; customer_used: number }> {
    const [row] = await this.manager.query(
      `WITH used AS (
         SELECT purchase_group_id,customer_user_id FROM voucher_redemption WHERE voucher_id=$1
         UNION
         SELECT purchase_group_id,customer_user_id FROM voucher_reservation
          WHERE voucher_id=$1 AND status IN ('ACTIVE','RESERVED') AND expires_at>clock_timestamp()
       ) SELECT count(*)::int AS total_used,
           count(*) FILTER (WHERE customer_user_id=$2)::int AS customer_used FROM used`,
      [voucherId, customerId]);
    return row;
  }

  async reserveVoucher(data: {
    voucher_id: string; purchase_group_id: string; customer_user_id: string;
    store_id?: string | null; discount_vnd: number; expires_at: Date;
  }): Promise<{ id: string }> {
    this.requireTransaction();
    const amount = this.amount(data.discount_vnd);
    if (!(data.expires_at instanceof Date) || !Number.isFinite(data.expires_at.getTime()))
      throw new ApiError(422, 'VALIDATION_FAILED', 'Invalid reservation expiry.');
    await this.lockGroup(data.purchase_group_id);
    const [voucher] = await this.manager.query('SELECT * FROM voucher WHERE id=$1 FOR UPDATE', [data.voucher_id]);
    if (!voucher) throw new ApiError(404, 'NOT_FOUND', 'Voucher not found.');
    const [existing] = await this.manager.query(
      'SELECT * FROM voucher_reservation WHERE voucher_id=$1 AND purchase_group_id=$2 FOR UPDATE',
      [data.voucher_id, data.purchase_group_id]);
    const now = await this.now();
    if (existing) {
      if (existing.customer_user_id !== data.customer_user_id || (existing.store_id ?? null) !== (data.store_id ?? null)
        || BigInt(existing.discount_vnd) !== amount || new Date(existing.expires_at).getTime() !== data.expires_at.getTime())
        this.reservationConflict('The reservation ID was already used with a different payload.');
      if (existing.status === 'RELEASED' || !['ACTIVE','RESERVED'].includes(existing.status)
        || (existing.status === 'ACTIVE' && new Date(existing.expires_at) <= now))
        this.reservationConflict('A closed reservation cannot be reactivated.');
      // A committed replay remains committed, including after later voucher stop/cancellation/expiry.
      return { id: existing.id };
    }
    this.available(voucher, now);
    if (data.expires_at <= now) throw new ApiError(422, 'VALIDATION_FAILED', 'Reservation expiry must be in the future.');
    if ((voucher.scope === 'STORE' && (!data.store_id || voucher.store_id !== data.store_id))
      || (voucher.scope === 'PLATFORM' && data.store_id != null) || !['STORE','PLATFORM'].includes(voucher.scope))
      this.reservationConflict('Voucher and reservation Store scope must match.');
    const redeemed = await this.manager.query(
      'SELECT id FROM voucher_redemption WHERE voucher_id=$1 AND purchase_group_id=$2 LIMIT 1',
      [data.voucher_id, data.purchase_group_id]);
    if (redeemed.length) this.reservationConflict('The group has already redeemed this voucher.');
    const otherHolds: any[] = await this.manager.query(
      `SELECT r.customer_user_id,v.scope,v.store_id FROM voucher_reservation r JOIN voucher v ON v.id=r.voucher_id
       WHERE r.purchase_group_id=$1 AND r.status IN ('ACTIVE','RESERVED')`, [data.purchase_group_id]);
    if (otherHolds.some(row => row.customer_user_id !== data.customer_user_id
      || (voucher.scope === 'PLATFORM' && row.scope === 'PLATFORM')
      || (voucher.scope === 'STORE' && row.scope === 'STORE' && row.store_id === voucher.store_id)))
      this.reservationConflict('One customer, at most one Store voucher per Store and one platform voucher per group.');
    const used = await this.quota(data.voucher_id, data.customer_user_id);
    if (used.total_used >= voucher.usage_limit || used.customer_used >= voucher.per_customer_limit)
      throw new ApiError(422, 'VOUCHER_OUT_OF_QUOTA', 'Voucher usage limit reached.');
    const [inserted] = await this.manager.query(
      `INSERT INTO voucher_reservation(voucher_id,purchase_group_id,customer_user_id,store_id,status,discount_vnd,expires_at)
       VALUES($1,$2,$3,$4,'ACTIVE',$5,$6) RETURNING id`,
      [data.voucher_id, data.purchase_group_id, data.customer_user_id, data.store_id ?? null, amount.toString(), data.expires_at]);
    return { id: inserted.id };
  }

  async commitVoucherRedemptions(group: string, redemptions: Array<{
    voucher_id: string; order_id: string; customer_user_id: string; discount_vnd: number;
  }>): Promise<void> {
    this.requireTransaction();
    const keys = new Set<string>();
    for (const row of redemptions) {
      this.amount(row.discount_vnd);
      const key = row.voucher_id + ':' + row.order_id;
      if (keys.has(key)) this.reservationConflict('Duplicate voucher/Order in redemption payload.');
      keys.add(key);
    }
    // Follow the existing Order -> effects lock order, before taking the group/voucher locks.
    const orders: any[] = await this.manager.query(
      'SELECT * FROM "order" WHERE purchase_group_id=$1 ORDER BY id FOR UPDATE', [group]);
    await this.lockGroup(group);
    const reservations: any[] = await this.manager.query(
      "SELECT * FROM voucher_reservation WHERE purchase_group_id=$1 AND status IN ('ACTIVE','RESERVED') ORDER BY voucher_id", [group]);
    if (!redemptions.length) {
      if (reservations.length || orders.some(order => BigInt(order.store_discount_vnd) > 0n || BigInt(order.platform_discount_vnd) > 0n))
        this.reservationConflict('A discounted or reserved group cannot omit its redemptions.');
      return;
    }
    if (!orders.length) this.reservationConflict('Create the complete Order group in this transaction before redeeming.');
    const ids = [...new Set(redemptions.map(row => row.voucher_id))].sort();
    if (reservations.length !== ids.length || reservations.some(row => !ids.includes(row.voucher_id)))
      this.reservationConflict('The payload must match all held vouchers of the group.');
    const vouchers: any[] = await this.manager.query('SELECT * FROM voucher WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE', [ids]);
    if (vouchers.length !== ids.length) this.reservationConflict('Voucher not found.');
    await this.manager.query('SELECT id FROM voucher_reservation WHERE purchase_group_id=$1 ORDER BY voucher_id FOR UPDATE', [group]);
    const now = await this.now();
    const byOrder = new Map(orders.map(order => [order.id, order]));
    const platformVouchers = vouchers.filter(voucher => voucher.scope === 'PLATFORM');
    const storeSlots = vouchers.filter(voucher => voucher.scope === 'STORE').map(voucher => voucher.store_id);
    if (platformVouchers.length > 1 || new Set(storeSlots).size !== storeSlots.length
      || orders.some(order => (BigInt(order.platform_discount_vnd) > 0n && platformVouchers.length !== 1)
        || (BigInt(order.store_discount_vnd) > 0n && !storeSlots.includes(order.store_id))))
      this.reservationConflict('Every Order discount must be backed by the group voucher reservations.');

    // Validate the whole batch before inserting any ledger row.
    for (const reservation of reservations) {
      const voucher = vouchers.find(row => row.id === reservation.voucher_id)!;
      const rows = redemptions.filter(row => row.voucher_id === voucher.id);
      const expected = voucher.scope === 'PLATFORM' ? orders : orders.filter(order => order.store_id === voucher.store_id);
      if (!['STORE','PLATFORM'].includes(voucher.scope) || !expected.length
        || (voucher.scope === 'STORE' && reservation.store_id !== voucher.store_id)
        || (voucher.scope === 'PLATFORM' && reservation.store_id != null)) this.reservationConflict('Voucher Store scope mismatch.');
      const field = voucher.scope === 'PLATFORM' ? 'platform_discount_vnd' : 'store_discount_vnd';
      const sum = expected.reduce((total: bigint, order: any) => total + BigInt(order[field]), 0n);
      if (orders.some(order => order.customer_user_id !== reservation.customer_user_id)
        || sum !== BigInt(reservation.discount_vnd)
        || expected.some(order => (BigInt(order[field]) > 0n || voucher.scope === 'STORE') && !rows.some(row => row.order_id === order.id)))
        this.reservationConflict('Redemptions must cover the immutable Order discount snapshots.');
      for (const row of rows) {
        const order = byOrder.get(row.order_id);
        if (!order || !expected.some(item => item.id === row.order_id) || row.customer_user_id !== reservation.customer_user_id
          || BigInt(order[field]) !== this.amount(row.discount_vnd)) this.reservationConflict('Order/customer/discount snapshot mismatch.');
      }
      if (rows.reduce((total, row) => total + this.amount(row.discount_vnd), 0n) !== BigInt(reservation.discount_vnd))
        this.reservationConflict('Redemption allocation must equal the reserved discount.');
      const previous: any[] = await this.manager.query(
        'SELECT * FROM voucher_redemption WHERE voucher_id=$1 AND purchase_group_id=$2 ORDER BY order_id', [voucher.id, group]);
      if (reservation.status === 'RESERVED') {
        if (previous.length !== rows.length || previous.some(old => !rows.some(row => row.order_id === old.order_id
          && row.customer_user_id === old.customer_user_id && this.amount(row.discount_vnd) === BigInt(old.discount_vnd))))
          this.reservationConflict('Committed redemption replay differs from the original payload.');
        continue;
      }
      if (previous.length || new Date(reservation.expires_at) <= now) this.reservationConflict('Reservation is expired or already partially redeemed.');
      if (expected.some(order => !['PREPARING','AWAITING_PAYMENT','CONFIRMED'].includes(order.status)))
        this.reservationConflict('Only a newly created Order may redeem an active reservation.');
      this.available(voucher, now);
      const used = await this.quota(voucher.id, reservation.customer_user_id);
      if (used.total_used > voucher.usage_limit || used.customer_used > voucher.per_customer_limit)
        throw new ApiError(422, 'VOUCHER_OUT_OF_QUOTA', 'Reserved voucher usage limit was reduced.');
    }
    for (const reservation of reservations) {
      if (reservation.status === 'RESERVED') continue;
      for (const row of redemptions.filter(row => row.voucher_id === reservation.voucher_id))
        await this.manager.query(
          `INSERT INTO voucher_redemption(voucher_id,purchase_group_id,order_id,customer_user_id,discount_vnd)
           VALUES($1,$2,$3,$4,$5)`, [row.voucher_id, group, row.order_id, row.customer_user_id, this.amount(row.discount_vnd).toString()]);
      await this.manager.query("UPDATE voucher_reservation SET status='RESERVED' WHERE id=$1", [reservation.id]);
    }
  }

  async releaseVoucherReservations(group: string): Promise<void> {
    this.requireTransaction();
    await this.lockGroup(group);
    const reservations: any[] = await this.manager.query("SELECT * FROM voucher_reservation WHERE purchase_group_id=$1 AND status='ACTIVE'", [group]);
    if (!reservations.length) return;
    await this.manager.query('SELECT id FROM voucher WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',
      [[...new Set(reservations.map(row => row.voucher_id))].sort()]);
    const committed = await this.manager.query('SELECT id FROM voucher_redemption WHERE purchase_group_id=$1 AND voucher_id=ANY($2::uuid[]) LIMIT 1',
      [group, reservations.map(row => row.voucher_id)]);
    if (committed.length) this.reservationConflict('A redeemed voucher cannot be released.');
    await this.manager.query("UPDATE voucher_reservation SET status='RELEASED' WHERE purchase_group_id=$1 AND status='ACTIVE'", [group]);
  }

  async findActiveReservationsByPurchaseGroup(group: string): Promise<Array<{ id: string; voucher_id: string; discount_vnd: string; status: string }>> {
    return this.manager.query(
      "SELECT id,voucher_id,discount_vnd,status FROM voucher_reservation WHERE purchase_group_id=$1 AND status='ACTIVE' AND expires_at>clock_timestamp()", [group]);
  }
}
