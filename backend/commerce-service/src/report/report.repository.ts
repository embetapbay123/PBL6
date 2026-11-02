import {orderSearch,type OrderSearch} from '../order/order-search';
import { EntityManager } from 'typeorm';
import { OwnedRepository } from '../../../shared/src/repository';
import type {OrderTimelineRow} from '../order/order.repository';

export interface OrderAdminRow {
  id: string;
  purchase_group_id: string;
  store_id: string;
  status: string;
  version: number;
  payment_method: string;
  payment_status: string | null;
  refunded_vnd: string | null;
  refund_status?:string|null;
  payment_expires_at: Date | string | null;
  goods_vnd: string;
  store_discount_vnd: string;
  platform_discount_vnd: string;
  shipping_vnd: string;
  payable_vnd: string;
  created_at: Date;
  address_snapshot?:Record<string,unknown>;
  customer_user_id?:string;
  return_policy_snapshot?:Record<string,unknown>|null;
  completed_at?:Date|string|null;
  status_history?:OrderTimelineRow[]|null;
  items?:Record<string,unknown>[];
}

export interface PlatformDashboardData {
  order_value_vnd: string;
  completed_goods_revenue_vnd: string;
  collected_vnd: string;
  refunded_vnd: string;
}

export interface StoreReportData {
  order_count: number;
  order_value_vnd: string;
  completed_goods_revenue_vnd: string;
  collected_vnd: string;
  refunded_vnd: string;
  shipping_fee_vnd: string;
  best_selling_product_ids: string[];
  unresolved_collected_vnd?: string;
  unresolved_refunded_vnd?: string;
  cash_series?: Array<{bucket_start:Date|string;collected_vnd:string;refunded_vnd:string}>;
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
  async pageAllOrders(page: number, size: number,filters:OrderSearch={}): Promise<{ items: OrderAdminRow[]; total: number }> {
    const args:unknown[]=[],extra=orderSearch(filters,args);
    const [countRow] = await this.manager.query(extra?`SELECT count(*)::int AS total FROM "order" o WHERE true${extra}`:`SELECT count(*)::int AS total FROM "order"`,...(extra?[args]:[]));
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
         o.created_at, o.address_snapshot, o.customer_user_id, o.return_policy_snapshot,
         (SELECT h.created_at FROM order_status_history h WHERE h.order_id=o.id AND h.to_status='COMPLETED' ORDER BY h.created_at,h.id LIMIT 1) AS completed_at,
         (SELECT jsonb_agg(jsonb_build_object('from_status',h.from_status,'to_status',h.to_status,'actor_user_id',h.actor_user_id,'created_at',h.created_at) ORDER BY h.created_at,h.id) FROM order_status_history h WHERE h.order_id=o.id) AS status_history,
         p.status AS payment_status,
         p.refunded_vnd,
         (SELECT latest_refund.status FROM refund latest_refund WHERE latest_refund.order_id=o.id ORDER BY latest_refund.created_at DESC,latest_refund.id DESC LIMIT 1) AS refund_status
       FROM "order" o
       LEFT JOIN "payment" p ON p.order_id = o.id
       WHERE true${extra}
       ORDER BY o.created_at DESC, o.id ASC
       LIMIT $${args.length+1} OFFSET $${args.length+2}`,
      [...args,size, offset]
    );
    if(items.length){
      const lines=await this.manager.query('SELECT id,order_id,product_id,variant_id,product_snapshot,sku_snapshot,quantity,unit_price_vnd,line_total_vnd FROM order_item WHERE order_id=ANY($1::uuid[]) ORDER BY id',[items.map((row:any)=>row.id)]);
      const grouped=new Map<string,Record<string,unknown>[]>();
      for(const line of lines){const group=grouped.get(line.order_id)??[];group.push(line);grouped.set(line.order_id,group);}
      for(const row of items)row.items=grouped.get(row.id)??[];
    }
    return { items, total: countRow?.total ?? 0 };
  }

  // --- Platform Dashboard Aggregations ---
  async getPlatformDashboardData(): Promise<PlatformDashboardData> {
    const [orderAgg] = await this.manager.query(
      `SELECT 
         COALESCE(SUM(payable_vnd), 0)::text AS order_value_vnd,
         COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN goods_vnd - store_discount_vnd - platform_discount_vnd ELSE 0 END), 0)::text AS completed_goods_revenue_vnd
       FROM "order"`
    );

    const [paymentAgg] = await this.manager.query(
      `SELECT 
         COALESCE(SUM(collected_vnd), 0)::text AS collected_vnd,
         COALESCE(SUM(refunded_vnd), 0)::text AS refunded_vnd
       FROM "payment"`
    );

    return {
      order_value_vnd: orderAgg?.order_value_vnd ?? '0',
      completed_goods_revenue_vnd: orderAgg?.completed_goods_revenue_vnd ?? '0',
      collected_vnd: paymentAgg?.collected_vnd ?? '0',
      refunded_vnd: paymentAgg?.refunded_vnd ?? '0',
    };
  }

  // --- Store Business Report ---
  async getStoreReportData(
    storeId: string|null,
    from: Date,
    to: Date,
    granularity: 'DAY' | 'MONTH'
  ): Promise<StoreReportData> {
    const [orderAgg] = await this.manager.query(
      `SELECT 
         COUNT(*)::int AS order_count,
         COALESCE(SUM(o.payable_vnd), 0)::text AS order_value_vnd,
         COALESCE(SUM(CASE WHEN o.status = 'COMPLETED' THEN o.goods_vnd - o.store_discount_vnd - o.platform_discount_vnd ELSE 0 END), 0)::text AS completed_goods_revenue_vnd,
         COALESCE(SUM(o.shipping_vnd), 0)::text AS shipping_fee_vnd
       FROM "order" o
       WHERE ($1::uuid IS NULL OR o.store_id = $1) AND o.created_at >= $2 AND o.created_at < $3`,
      [storeId, from.toISOString(), to.toISOString()]
    );

    const [paymentAgg] = await this.manager.query(
      `SELECT coalesce(sum(amount_vnd) FILTER (WHERE kind='COLLECTION'),0)::text AS collected_vnd,
              coalesce(sum(amount_vnd) FILTER (WHERE kind='REFUND'),0)::text AS refunded_vnd
       FROM money_movement WHERE ($1::uuid IS NULL OR store_id=$1) AND occurred_at >= $2 AND occurred_at < $3`,
      [storeId,from.toISOString(),to.toISOString()]);
    const [gaps] = await this.manager.query(
      `SELECT coalesce(sum(p.collected_vnd) FILTER (WHERE p.collected_vnd>0 AND NOT EXISTS(SELECT 1 FROM money_movement m WHERE m.payment_id=p.id AND m.kind='COLLECTION')),0)::text AS unresolved_collected_vnd,
              coalesce(sum(p.refunded_vnd) FILTER (WHERE p.refunded_vnd>0 AND NOT EXISTS(SELECT 1 FROM money_movement m WHERE m.payment_id=p.id AND m.kind='REFUND')),0)::text AS unresolved_refunded_vnd
       FROM payment p JOIN "order" o ON o.id=p.order_id WHERE ($1::uuid IS NULL OR o.store_id=$1)`,[storeId]);
    const cashUnit=granularity==='MONTH'?'month':'day';
    const cashSeries=await this.manager.query(
      `SELECT date_trunc('${cashUnit}',occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh' AS bucket_start,
              coalesce(sum(amount_vnd) FILTER (WHERE kind='COLLECTION'),0)::text AS collected_vnd,
              coalesce(sum(amount_vnd) FILTER (WHERE kind='REFUND'),0)::text AS refunded_vnd
       FROM money_movement WHERE ($1::uuid IS NULL OR store_id=$1) AND occurred_at >= $2 AND occurred_at < $3 GROUP BY 1 ORDER BY 1`,
      [storeId,from.toISOString(),to.toISOString()]);

    const bestSellingRows = await this.manager.query(
      `SELECT 
         oi.product_id,
         SUM(oi.quantity)::int AS total_qty
       FROM "order_item" oi
       JOIN "order" o ON o.id = oi.order_id
       WHERE ($1::uuid IS NULL OR o.store_id = $1) AND o.created_at >= $2 AND o.created_at < $3 AND o.status = 'COMPLETED'
       GROUP BY oi.product_id
       ORDER BY total_qty DESC
       LIMIT 10`,
      [storeId, from.toISOString(), to.toISOString()]
    );

    const truncUnit = granularity === 'MONTH' ? 'month' : 'day';
    const seriesRows = await this.manager.query(
      `SELECT 
         (date_trunc('${truncUnit}', o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh') AS bucket_start,
         COALESCE(SUM(CASE WHEN o.status = 'COMPLETED' THEN o.goods_vnd - o.store_discount_vnd - o.platform_discount_vnd ELSE 0 END), 0)::text AS completed_goods_revenue_vnd
       FROM "order" o
       WHERE ($1::uuid IS NULL OR o.store_id = $1) AND o.created_at >= $2 AND o.created_at < $3
       GROUP BY (date_trunc('${truncUnit}', o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh')
       ORDER BY bucket_start ASC`,
      [storeId, from.toISOString(), to.toISOString()]
    );

    return {
      unresolved_collected_vnd:gaps?.unresolved_collected_vnd ?? '0',
      unresolved_refunded_vnd:gaps?.unresolved_refunded_vnd ?? '0',
      cash_series:cashSeries,
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
  async pageMoney(storeId:string|null,from:Date,to:Date,page:number,size:number) {
    const args=[storeId,from.toISOString(),to.toISOString()];
    const where=' WHERE ($1::uuid IS NULL OR m.store_id=$1) AND m.occurred_at >= $2 AND m.occurred_at < $3';
    const [count]=await this.manager.query('SELECT count(*)::int AS total FROM money_movement m'+where,args);
    const items=await this.manager.query('SELECT m.* FROM money_movement m'+where+' ORDER BY occurred_at DESC,id LIMIT $4 OFFSET $5',[...args,size,(page-1)*size]);
    return {items,total:count.total};
  }

  async pageUnresolvedMoney(storeId:string|null,page:number,size:number) {
    const from=` FROM payment p JOIN "order" o ON o.id=p.order_id CROSS JOIN LATERAL (VALUES ('COLLECTION',p.collected_vnd),('REFUND',p.refunded_vnd)) AS missing(kind,amount_vnd)
      WHERE ($1::uuid IS NULL OR o.store_id=$1) AND missing.amount_vnd>0 AND NOT EXISTS(SELECT 1 FROM money_movement m WHERE m.payment_id=p.id AND m.kind=missing.kind)`;
    const [count]=await this.manager.query('SELECT count(*)::int AS total'+from,[storeId]);
    const items=await this.manager.query('SELECT o.id AS order_id,p.id AS payment_id,o.store_id,p.method AS payment_method,missing.kind,missing.amount_vnd'+from+' ORDER BY o.id,p.id,missing.kind LIMIT $2 OFFSET $3',[storeId,size,(page-1)*size]);
    return {items,total:count.total};
  }

}
