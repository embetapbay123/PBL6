import { EntityManager } from 'typeorm';
import { OwnedRepository } from '../../../shared/src/repository';

export interface OrderAdminRow {
  id: string;
  purchase_group_id: string;
  store_id: string;
  status: string;
  version: number;
  payment_method: string;
  payment_status: string | null;
  refunded_vnd: string | null;
  payment_expires_at: Date | string | null;
  goods_vnd: string;
  store_discount_vnd: string;
  platform_discount_vnd: string;
  shipping_vnd: string;
  payable_vnd: string;
  created_at: Date;
}

export interface PlatformDashboardData {
  order_value_vnd: string;
  completed_goods_revenue_vnd: string;
  collected_vnd: string;
  refunded_vnd: string;
  store_count: number;
  user_count: number;
}

export interface StoreReportData {
  order_count: number;
  order_value_vnd: string;
  completed_goods_revenue_vnd: string;
  collected_vnd: string;
  refunded_vnd: string;
  shipping_fee_vnd: string;
  best_selling_product_ids: string[];
  revenue_series: Array<{
    bucket_start: Date | string;
    completed_goods_revenue_vnd: string;
  }>;
}

export class ReportRepository extends OwnedRepository {
  constructor(manager: EntityManager) {
    super(manager);
  }

  // --- Admin List All Orders ---
  async pageAllOrders(page: number, size: number): Promise<{ items: OrderAdminRow[]; total: number }> {
    const [countRow] = await this.manager.query(`SELECT count(*)::int AS total FROM "order"`);
    const offset = (page - 1) * size;
    const items = await this.manager.query(
      `SELECT 
         o.id,
         o.purchase_group_id,
         o.store_id,
         o.status,
         o.version,
         o.payment_method,
         o.payment_expires_at,
         o.goods_vnd,
         o.store_discount_vnd,
         o.platform_discount_vnd,
         o.shipping_vnd,
         o.payable_vnd,
         o.created_at,
         p.status AS payment_status,
         p.refunded_vnd
       FROM "order" o
       LEFT JOIN "payment" p ON p.order_id = o.id
       ORDER BY o.created_at DESC, o.id ASC
       LIMIT $1 OFFSET $2`,
      [size, offset]
    );
    return { items, total: countRow?.total ?? 0 };
  }

  // --- Platform Dashboard Aggregations ---
  async getPlatformDashboardData(): Promise<PlatformDashboardData> {
    const [orderAgg] = await this.manager.query(
      `SELECT 
         COALESCE(SUM(payable_vnd), 0)::text AS order_value_vnd,
         COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN goods_vnd ELSE 0 END), 0)::text AS completed_goods_revenue_vnd
       FROM "order"`
    );

    const [paymentAgg] = await this.manager.query(
      `SELECT 
         COALESCE(SUM(collected_vnd), 0)::text AS collected_vnd,
         COALESCE(SUM(refunded_vnd), 0)::text AS refunded_vnd
       FROM "payment"`
    );

    const [storeCountRow] = await this.manager.query(
      `SELECT count(DISTINCT store_id)::int AS store_count FROM "order"`
    );

    const [userCountRow] = await this.manager.query(
      `SELECT count(DISTINCT customer_user_id)::int AS user_count FROM "order"`
    );

    return {
      order_value_vnd: orderAgg?.order_value_vnd ?? '0',
      completed_goods_revenue_vnd: orderAgg?.completed_goods_revenue_vnd ?? '0',
      collected_vnd: paymentAgg?.collected_vnd ?? '0',
      refunded_vnd: paymentAgg?.refunded_vnd ?? '0',
      store_count: storeCountRow?.store_count ?? 0,
      user_count: userCountRow?.user_count ?? 0,
    };
  }

  // --- Store Business Report ---
  async getStoreReportData(
    storeId: string,
    from: Date,
    to: Date,
    granularity: 'DAY' | 'MONTH'
  ): Promise<StoreReportData> {
    const [orderAgg] = await this.manager.query(
      `SELECT 
         COUNT(*)::int AS order_count,
         COALESCE(SUM(o.payable_vnd), 0)::text AS order_value_vnd,
         COALESCE(SUM(CASE WHEN o.status = 'COMPLETED' THEN o.goods_vnd ELSE 0 END), 0)::text AS completed_goods_revenue_vnd,
         COALESCE(SUM(o.shipping_vnd), 0)::text AS shipping_fee_vnd
       FROM "order" o
       WHERE o.store_id = $1 AND o.created_at >= $2 AND o.created_at <= $3`,
      [storeId, from.toISOString(), to.toISOString()]
    );

    const [paymentAgg] = await this.manager.query(
      `SELECT 
         COALESCE(SUM(p.collected_vnd), 0)::text AS collected_vnd,
         COALESCE(SUM(p.refunded_vnd), 0)::text AS refunded_vnd
       FROM "payment" p
       JOIN "order" o ON o.id = p.order_id
       WHERE o.store_id = $1 AND o.created_at >= $2 AND o.created_at <= $3`,
      [storeId, from.toISOString(), to.toISOString()]
    );

    const bestSellingRows = await this.manager.query(
      `SELECT 
         oi.product_id,
         SUM(oi.quantity)::int AS total_qty
       FROM "order_item" oi
       JOIN "order" o ON o.id = oi.order_id
       WHERE o.store_id = $1 AND o.created_at >= $2 AND o.created_at <= $3 AND o.status = 'COMPLETED'
       GROUP BY oi.product_id
       ORDER BY total_qty DESC
       LIMIT 10`,
      [storeId, from.toISOString(), to.toISOString()]
    );

    const truncUnit = granularity === 'MONTH' ? 'month' : 'day';
    const seriesRows = await this.manager.query(
      `SELECT 
         date_trunc('${truncUnit}', o.created_at) AS bucket_start,
         COALESCE(SUM(CASE WHEN o.status = 'COMPLETED' THEN o.goods_vnd ELSE 0 END), 0)::text AS completed_goods_revenue_vnd
       FROM "order" o
       WHERE o.store_id = $1 AND o.created_at >= $2 AND o.created_at <= $3
       GROUP BY date_trunc('${truncUnit}', o.created_at)
       ORDER BY bucket_start ASC`,
      [storeId, from.toISOString(), to.toISOString()]
    );

    return {
      order_count: orderAgg?.order_count ?? 0,
      order_value_vnd: orderAgg?.order_value_vnd ?? '0',
      completed_goods_revenue_vnd: orderAgg?.completed_goods_revenue_vnd ?? '0',
      collected_vnd: paymentAgg?.collected_vnd ?? '0',
      refunded_vnd: paymentAgg?.refunded_vnd ?? '0',
      shipping_fee_vnd: orderAgg?.shipping_fee_vnd ?? '0',
      best_selling_product_ids: bestSellingRows.map((r: any) => String(r.product_id)),
      revenue_series: seriesRows.map((r: any) => ({
        bucket_start: r.bucket_start,
        completed_goods_revenue_vnd: r.completed_goods_revenue_vnd,
      })),
    };
  }
}
