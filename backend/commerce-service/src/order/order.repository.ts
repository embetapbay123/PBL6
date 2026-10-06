import { EntityManager } from 'typeorm';
import { OwnedRepository } from '../../../shared/src/repository';
import { ApiError } from '../../../shared/src/errors';

export interface CartItemCheckoutRow {
  id: string;
  cart_id: string;
  variant_id: string;
  product_id?: string | null;
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

export interface IdempotencyRecordRow {
  id: string;
  customer_user_id: string;
  key: string;
  payload_hash: string;
  purchase_group_id: string;
  response_json: Record<string, unknown> | null;
  expires_at: Date;
}

export interface OrderRow {
  id: string;
  purchase_group_id: string;
  customer_user_id: string;
  store_id: string;
  address_snapshot: Record<string, unknown>;
  status: string;
  payment_method: string;
  payment_expires_at: Date | null;
  goods_vnd: string;
  store_discount_vnd: string;
  platform_discount_vnd: string;
  shipping_vnd: string;
  payable_vnd: string;
  version: number;
  created_at: Date;
  payment_status?: string | null;
  refund_status?: string | null;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  product_snapshot: Record<string, unknown>;
  sku_snapshot: string;
  unit_price_vnd: string;
  quantity: number;
  line_total_vnd: string;
}

export interface PaymentRow {
  id: string;
  order_id: string;
  method: string;
  status: string;
  payable_vnd: string;
  collectible_vnd: string;
  collected_vnd: string;
  refunded_vnd: string;
  version: number;
}

export interface OrderItemEligibilityRow {
  order_item_id: string;
  order_id: string;
  product_id: string;
  customer_user_id: string;
  order_status: string;
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
      `SELECT ci.id, ci.cart_id, ci.variant_id, ci.product_id, ci.store_id, ci.quantity
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

  async findIdempotencyRecord(key: string, customerUserId: string): Promise<IdempotencyRecordRow | undefined> {
    const [row] = await this.manager.query(
      `SELECT id, customer_user_id, key, payload_hash, purchase_group_id, response_json, expires_at
       FROM idempotency_record
       WHERE key = $1 AND customer_user_id = $2`,
      [key, customerUserId]
    );
    return row;
  }

  async saveIdempotencyRecord(data: {
    id?: string;
    customer_user_id: string;
    key: string;
    payload_hash: string;
    purchase_group_id: string;
    response_json: Record<string, unknown>;
    expires_at: Date;
  }): Promise<void> {
    await this.manager.query(
      `INSERT INTO idempotency_record (id, customer_user_id, key, payload_hash, purchase_group_id, response_json, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET response_json = EXCLUDED.response_json`,
      [
        data.id ?? undefined,
        data.customer_user_id,
        data.key,
        data.payload_hash,
        data.purchase_group_id,
        JSON.stringify(data.response_json),
        data.expires_at,
      ]
    );
  }

  async createOrder(data: {
    id: string;
    purchase_group_id: string;
    customer_user_id: string;
    store_id: string;
    address_snapshot: Record<string, unknown>;
    status: string;
    payment_method: string;
    payment_expires_at?: Date | null;
    goods_vnd: number;
    store_discount_vnd: number;
    platform_discount_vnd: number;
    shipping_vnd: number;
    payable_vnd: number;
    version?: number;
  }): Promise<OrderRow> {
    const [created] = await this.manager.query(
      `INSERT INTO "order" (
         id, purchase_group_id, customer_user_id, store_id, address_snapshot,
         status, payment_method, payment_expires_at, goods_vnd, store_discount_vnd,
         platform_discount_vnd, shipping_vnd, payable_vnd, version, created_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10,
         $11, $12, $13, $14, NOW()
       ) RETURNING id, purchase_group_id, customer_user_id, store_id, address_snapshot,
                   status, payment_method, payment_expires_at, goods_vnd, store_discount_vnd,
                   platform_discount_vnd, shipping_vnd, payable_vnd, version, created_at`,
      [
        data.id,
        data.purchase_group_id,
        data.customer_user_id,
        data.store_id,
        JSON.stringify(data.address_snapshot),
        data.status,
        data.payment_method,
        data.payment_expires_at ?? null,
        data.goods_vnd,
        data.store_discount_vnd,
        data.platform_discount_vnd,
        data.shipping_vnd,
        data.payable_vnd,
        data.version ?? 0,
      ]
    );
    return created;
  }

  async createOrderItem(data: {
    id?: string;
    order_id: string;
    product_id: string;
    variant_id: string;
    product_snapshot?: Record<string, unknown>;
    sku_snapshot?: string;
    unit_price_vnd: number;
    quantity: number;
    line_total_vnd: number;
  }): Promise<OrderItemRow> {
    const [created] = await this.manager.query(
      `INSERT INTO order_item (
         id, order_id, product_id, variant_id, product_snapshot,
         sku_snapshot, unit_price_vnd, quantity, line_total_vnd
       ) VALUES (
         COALESCE($1, gen_random_uuid()), $2, $3, $4, $5,
         $6, $7, $8, $9
       ) RETURNING id, order_id, product_id, variant_id, product_snapshot,
                   sku_snapshot, unit_price_vnd, quantity, line_total_vnd`,
      [
        data.id ?? null,
        data.order_id,
        data.product_id,
        data.variant_id,
        JSON.stringify(data.product_snapshot ?? {}),
        data.sku_snapshot ?? '',
        data.unit_price_vnd,
        data.quantity,
        data.line_total_vnd,
      ]
    );
    return created;
  }



  async recordVoucherRedemption(data: {
    voucher_id: string;
    purchase_group_id: string;
    order_id: string;
    customer_user_id: string;
    discount_vnd: number;
  }): Promise<void> {
    await this.manager.query(
      `INSERT INTO voucher_redemption (
         id, voucher_id, purchase_group_id, order_id, customer_user_id,
         discount_vnd, redeemed_at
       ) VALUES (
         gen_random_uuid(), $1, $2, $3, $4, $5, NOW()
       )`,
      [
        data.voucher_id,
        data.purchase_group_id,
        data.order_id,
        data.customer_user_id,
        data.discount_vnd,
      ]
    );
  }



  async removeCartItems(cartItemIds: string[], customerUserId: string): Promise<void> {
    if (!cartItemIds.length) return;
    await this.manager.query(
      `DELETE FROM cart_item ci
       USING cart c
       WHERE ci.cart_id = c.id AND ci.id = ANY($1::uuid[]) AND c.customer_user_id = $2`,
      [cartItemIds, customerUserId]
    );
  }

  async findOrdersByPurchaseGroupId(
    purchaseGroupId: string,
    customerUserId: string
  ): Promise<Array<OrderRow & { items: OrderItemRow[] }>> {
    const orders: OrderRow[] = await this.manager.query(
      `SELECT o.id, o.purchase_group_id, o.customer_user_id, o.store_id, o.address_snapshot,
              o.status, o.payment_method, o.payment_expires_at, o.goods_vnd, o.store_discount_vnd,
              o.platform_discount_vnd, o.shipping_vnd, o.payable_vnd, o.version, o.created_at,
              p.status AS payment_status,
              r.status AS refund_status
       FROM "order" o
       LEFT JOIN payment p ON p.order_id = o.id
       LEFT JOIN LATERAL (
         SELECT status FROM refund WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1
       ) r ON true
       WHERE o.purchase_group_id = $1 AND o.customer_user_id = $2
       ORDER BY o.created_at ASC, o.id ASC`,
      [purchaseGroupId, customerUserId]
    );

    if (!orders.length) return [];

    const orderIds = orders.map(o => o.id);
    const allItems: OrderItemRow[] = await this.manager.query(
      `SELECT id, order_id, product_id, variant_id, product_snapshot,
              sku_snapshot, unit_price_vnd, quantity, line_total_vnd
       FROM order_item
       WHERE order_id = ANY($1::uuid[])
       ORDER BY id ASC`,
      [orderIds]
    );

    const itemsMap = new Map<string, OrderItemRow[]>();
    for (const item of allItems) {
      if (!itemsMap.has(item.order_id)) {
        itemsMap.set(item.order_id, []);
      }
      itemsMap.get(item.order_id)!.push(item);
    }

    return orders.map(order => ({
      ...order,
      items: itemsMap.get(order.id) ?? [],
    }));
  }

  // --- ORDER-03: Order Read methods ---

  async pageCustomerOrders(
    customerUserId: string,
    page: number,
    size: number
  ): Promise<{ items: Array<OrderRow & { items: OrderItemRow[] }>; total: number }> {
    const [countRow] = await this.manager.query(
      `SELECT count(*)::int AS total FROM "order" WHERE customer_user_id = $1`,
      [customerUserId]
    );
    const offset = (page - 1) * size;
    const orders: OrderRow[] = await this.manager.query(
      `SELECT o.id, o.purchase_group_id, o.customer_user_id, o.store_id, o.address_snapshot,
              o.status, o.payment_method, o.payment_expires_at, o.goods_vnd, o.store_discount_vnd,
              o.platform_discount_vnd, o.shipping_vnd, o.payable_vnd, o.version, o.created_at,
              p.status AS payment_status,
              r.status AS refund_status
       FROM "order" o
       LEFT JOIN payment p ON p.order_id = o.id
       LEFT JOIN LATERAL (
         SELECT status FROM refund WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1
       ) r ON true
       WHERE o.customer_user_id = $1
       ORDER BY o.created_at DESC, o.id ASC
       LIMIT $2 OFFSET $3`,
      [customerUserId, size, offset]
    );

    if (!orders.length) {
      return { items: [], total: countRow?.total ?? 0 };
    }

    const orderIds = orders.map(o => o.id);
    const allItems: OrderItemRow[] = await this.manager.query(
      `SELECT id, order_id, product_id, variant_id, product_snapshot,
              sku_snapshot, unit_price_vnd, quantity, line_total_vnd
       FROM order_item
       WHERE order_id = ANY($1::uuid[])
       ORDER BY id ASC`,
      [orderIds]
    );

    const itemsMap = new Map<string, OrderItemRow[]>();
    for (const item of allItems) {
      if (!itemsMap.has(item.order_id)) {
        itemsMap.set(item.order_id, []);
      }
      itemsMap.get(item.order_id)!.push(item);
    }

    return {
      items: orders.map(order => ({
        ...order,
        items: itemsMap.get(order.id) ?? [],
      })),
      total: countRow?.total ?? 0,
    };
  }

  async findCustomerOrderById(
    orderId: string,
    customerUserId: string
  ): Promise<(OrderRow & { items: OrderItemRow[] }) | undefined> {
    const [order]: OrderRow[] = await this.manager.query(
      `SELECT o.id, o.purchase_group_id, o.customer_user_id, o.store_id, o.address_snapshot,
              o.status, o.payment_method, o.payment_expires_at, o.goods_vnd, o.store_discount_vnd,
              o.platform_discount_vnd, o.shipping_vnd, o.payable_vnd, o.version, o.created_at,
              p.status AS payment_status,
              r.status AS refund_status
       FROM "order" o
       LEFT JOIN payment p ON p.order_id = o.id
       LEFT JOIN LATERAL (
         SELECT status FROM refund WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1
       ) r ON true
       WHERE o.id = $1 AND o.customer_user_id = $2`,
      [orderId, customerUserId]
    );

    if (!order) return undefined;

    const items: OrderItemRow[] = await this.manager.query(
      `SELECT id, order_id, product_id, variant_id, product_snapshot,
              sku_snapshot, unit_price_vnd, quantity, line_total_vnd
       FROM order_item
       WHERE order_id = $1
       ORDER BY id ASC`,
      [orderId]
    );

    return {
      ...order,
      items,
    };
  }

  async pageStoreOrders(
    storeId: string,
    page: number,
    size: number
  ): Promise<{ items: Array<OrderRow & { items: OrderItemRow[] }>; total: number }> {
    const [countRow] = await this.manager.query(
      `SELECT count(*)::int AS total FROM "order" WHERE store_id = $1`,
      [storeId]
    );
    const offset = (page - 1) * size;
    const orders: OrderRow[] = await this.manager.query(
      `SELECT o.id, o.purchase_group_id, o.customer_user_id, o.store_id, o.address_snapshot,
              o.status, o.payment_method, o.payment_expires_at, o.goods_vnd, o.store_discount_vnd,
              o.platform_discount_vnd, o.shipping_vnd, o.payable_vnd, o.version, o.created_at,
              p.status AS payment_status,
              r.status AS refund_status
       FROM "order" o
       LEFT JOIN payment p ON p.order_id = o.id
       LEFT JOIN LATERAL (
         SELECT status FROM refund WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1
       ) r ON true
       WHERE o.store_id = $1
       ORDER BY o.created_at DESC, o.id ASC
       LIMIT $2 OFFSET $3`,
      [storeId, size, offset]
    );

    if (!orders.length) {
      return { items: [], total: countRow?.total ?? 0 };
    }

    const orderIds = orders.map(o => o.id);
    const allItems: OrderItemRow[] = await this.manager.query(
      `SELECT id, order_id, product_id, variant_id, product_snapshot,
              sku_snapshot, unit_price_vnd, quantity, line_total_vnd
       FROM order_item
       WHERE order_id = ANY($1::uuid[])
       ORDER BY id ASC`,
      [orderIds]
    );

    const itemsMap = new Map<string, OrderItemRow[]>();
    for (const item of allItems) {
      if (!itemsMap.has(item.order_id)) {
        itemsMap.set(item.order_id, []);
      }
      itemsMap.get(item.order_id)!.push(item);
    }

    return {
      items: orders.map(order => ({
        ...order,
        items: itemsMap.get(order.id) ?? [],
      })),
      total: countRow?.total ?? 0,
    };
  }

  async findStoreOrderById(
    orderId: string,
    storeId: string
  ): Promise<(OrderRow & { items: OrderItemRow[] }) | undefined> {
    const [order]: OrderRow[] = await this.manager.query(
      `SELECT o.id, o.purchase_group_id, o.customer_user_id, o.store_id, o.address_snapshot,
              o.status, o.payment_method, o.payment_expires_at, o.goods_vnd, o.store_discount_vnd,
              o.platform_discount_vnd, o.shipping_vnd, o.payable_vnd, o.version, o.created_at,
              p.status AS payment_status,
              r.status AS refund_status
       FROM "order" o
       LEFT JOIN payment p ON p.order_id = o.id
       LEFT JOIN LATERAL (
         SELECT status FROM refund WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1
       ) r ON true
       WHERE o.id = $1 AND o.store_id = $2`,
      [orderId, storeId]
    );

    if (!order) return undefined;

    const items: OrderItemRow[] = await this.manager.query(
      `SELECT id, order_id, product_id, variant_id, product_snapshot,
              sku_snapshot, unit_price_vnd, quantity, line_total_vnd
       FROM order_item
       WHERE order_id = $1
       ORDER BY id ASC`,
      [orderId]
    );

    return {
      ...order,
      items,
    };
  }

  async findPaymentByOrderId(orderId: string): Promise<PaymentRow | undefined> {
    const [row] = await this.manager.query(
      `SELECT id, order_id, method, status, payable_vnd, collectible_vnd, collected_vnd, refunded_vnd, version
       FROM payment
       WHERE order_id = $1`,
      [orderId]
    );
    return row;
  }

  async updateOrderStatusWithHistory(data: {
    order_id: string;
    from_status: string;
    to_status: string;
    expected_version: number;
    actor_user_id: string;
    reason?: string;
  }): Promise<OrderRow | null> {
    const updated = await this.updateReturning(
      `UPDATE "order"
       SET status = $1, version = version + 1
       WHERE id = $2 AND version = $3
       RETURNING id, purchase_group_id, customer_user_id, store_id, address_snapshot,
                 status, payment_method, payment_expires_at, goods_vnd, store_discount_vnd,
                 platform_discount_vnd, shipping_vnd, payable_vnd, version, created_at`,
      [data.to_status, data.order_id, data.expected_version]
    );

    if (!updated) return null;

    await this.manager.query(
      `INSERT INTO order_status_history (
         id, order_id, from_status, to_status, actor_user_id, reason, operation_id, created_at
       ) VALUES (
         gen_random_uuid(), $1, $2, $3, $4, $5, gen_random_uuid(), NOW()
       )`,
      [
        data.order_id,
        data.from_status,
        data.to_status,
        data.actor_user_id,
        data.reason ?? null,
      ]
    );

    return updated;
  }









  async incrementOrderVersion(orderId: string, expectedVersion: number): Promise<OrderRow | null> {
    const updated = await this.updateReturning(
      `UPDATE "order"
       SET version = version + 1
       WHERE id = $1 AND version = $2
       RETURNING id, purchase_group_id, customer_user_id, store_id, address_snapshot,
                 status, payment_method, payment_expires_at, goods_vnd, store_discount_vnd,
                 platform_discount_vnd, shipping_vnd, payable_vnd, version, created_at`,
      [orderId, expectedVersion]
    );
    return updated ?? null;
  }

  async ship(orderId:string):Promise<void> {
    const [created]=await this.manager.query("INSERT INTO shipment(order_id,status,shipped_at) VALUES($1,'SHIPPED',now()) ON CONFLICT(order_id) DO NOTHING RETURNING id",[orderId]);
    if(!created) throw new ApiError(409,'SHIPMENT_STATE_CONFLICT','Order đã có Shipment; cần kiểm tra lại trạng thái.');
  }

  async deliver(orderId:string):Promise<void> {
    const updated=await this.updateReturning("UPDATE shipment SET status='DELIVERED',delivered_at=now() WHERE order_id=$1 AND status='SHIPPED' RETURNING id",[orderId]);
    if(!updated) throw new ApiError(409,'SHIPMENT_STATE_CONFLICT','Shipment chưa ở trạng thái đang giao.');
  }

  async findOrderItemEligibility(orderItemId: string): Promise<OrderItemEligibilityRow | undefined> {
    const [row] = await this.manager.query(
      `SELECT oi.id AS order_item_id, oi.order_id, oi.product_id, o.customer_user_id, o.status AS order_status
       FROM order_item oi
       INNER JOIN "order" o ON o.id = oi.order_id
       WHERE oi.id = $1`,
      [orderItemId]
    );
    return row;
  }

  async lockCustomerOrderById(id:string,userId:string) {
    await this.manager.query('SELECT id FROM "order" WHERE id=$1 AND customer_user_id=$2 FOR UPDATE',[id,userId]);
    return this.findCustomerOrderById(id,userId);
  }
  async lockStoreOrderById(id:string,storeId:string) {
    await this.manager.query('SELECT id FROM "order" WHERE id=$1 AND store_id=$2 FOR UPDATE',[id,storeId]);
    return this.findStoreOrderById(id,storeId);
  }
  async lockPaymentByOrderId(id:string):Promise<PaymentRow|undefined> {
    const [row]=await this.manager.query('SELECT * FROM payment WHERE order_id=$1 FOR UPDATE',[id]);return row;
  }
  async voucherAvailable(voucher:VoucherCheckoutRow,userId:string):Promise<boolean> {
    const [c]=await this.manager.query(`WITH used AS (
      SELECT purchase_group_id,customer_user_id FROM voucher_redemption WHERE voucher_id=$1
      UNION SELECT purchase_group_id,customer_user_id FROM voucher_reservation WHERE voucher_id=$1 AND status IN ('ACTIVE','RESERVED') AND expires_at>now()
    ) SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE customer_user_id=$2)::int AS customer FROM used`,[voucher.id,userId]);
    return Number(c?.total ?? 0)<voucher.usage_limit && Number(c?.customer ?? 0)<voucher.per_customer_limit;
  }
}



