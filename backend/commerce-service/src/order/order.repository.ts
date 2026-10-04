import { EntityManager } from 'typeorm';
import { OwnedRepository } from '../../../shared/src/repository';

export interface CartItemCheckoutRow {
  id: string;
  cart_id: string;
  variant_id: string;
  store_id: string;
  quantity: number;
}

export interface VoucherCheckoutRow {
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

export class OrderRepository extends OwnedRepository {
  constructor(manager: EntityManager) {
    super(manager);
  }

  async findCartItemsWithOwnership(
    cartItemIds: string[],
    customerUserId: string
  ): Promise<CartItemCheckoutRow[]> {
    if (!cartItemIds.length) return [];
    const rows = await this.manager.query(
      `SELECT ci.id, ci.cart_id, ci.variant_id, ci.store_id, ci.quantity
       FROM cart_item ci
       INNER JOIN cart c ON c.id = ci.cart_id
       WHERE ci.id = ANY($1::uuid[]) AND c.customer_user_id = $2`,
      [cartItemIds, customerUserId]
    );
    return rows;
  }

  async findStoreVoucherByCode(code: string, storeId: string): Promise<VoucherCheckoutRow | undefined> {
    const [row] = await this.manager.query(
      `SELECT id, code, scope, store_id, owner_user_id, discount_type, discount_value, max_discount_vnd, min_goods_vnd, starts_at, ends_at, usage_limit, per_customer_limit, status, version
       FROM voucher
       WHERE upper(code) = upper($1) AND scope = 'STORE' AND store_id = $2`,
      [code.trim(), storeId]
    );
    return row;
  }

  async findPlatformVoucherByCode(code: string): Promise<VoucherCheckoutRow | undefined> {
    const [row] = await this.manager.query(
      `SELECT id, code, scope, store_id, owner_user_id, discount_type, discount_value, max_discount_vnd, min_goods_vnd, starts_at, ends_at, usage_limit, per_customer_limit, status, version
       FROM voucher
       WHERE upper(code) = upper($1) AND scope = 'PLATFORM'`,
      [code.trim()]
    );
    return row;
  }
}
