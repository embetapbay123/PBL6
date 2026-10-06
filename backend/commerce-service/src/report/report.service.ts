import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import { moneyNumber } from '../../../shared/src/money';
import { ReportRepository, OrderAdminRow } from './report.repository';
import type { OperationOutputs } from '../../../shared/src/operations.generated';
import { config } from '../../../shared/src/config';
import { InternalClients } from '../../../shared/src/internal-clients';
import { accessToken, requireStorePermission } from '../scope';
import { IdentityStatsClient, IdentityStats } from '../identity-stats-client';

export function adminOrderResponse(row: OrderAdminRow) {
  return {
    id: row.id,
    purchase_group_id: row.purchase_group_id,
    store_id: row.store_id,
    status: row.status as any,
    version: row.version,
    payment_method: row.payment_method as any,
    payment_status: row.payment_status ?? undefined,
    refund_status: Number(row.refunded_vnd ?? 0) > 0 ? 'REFUNDED' : undefined,
    payment_expires_at: row.payment_expires_at instanceof Date
      ? row.payment_expires_at.toISOString()
      : (row.payment_expires_at ? new Date(row.payment_expires_at).toISOString() : undefined),
    amounts: {
      goods_vnd: moneyNumber(row.goods_vnd),
      store_discount_vnd: moneyNumber(row.store_discount_vnd),
      platform_discount_vnd: moneyNumber(row.platform_discount_vnd),
      shipping_vnd: moneyNumber(row.shipping_vnd),
      payable_vnd: moneyNumber(row.payable_vnd),
    },
  };
}

export class ReportService {
  constructor(private readonly clientsFactory?:()=>InternalClients,private readonly identity:IdentityStats=new IdentityStatsClient()) {}
  private clients():InternalClients {
    if(this.clientsFactory) return this.clientsFactory();
    const c=config('M2');return new InternalClients('M2',c.internalKeys.M2,{M1:c.catalogUrl,M2:'',M3:c.identityUrl});
  }
  private verifyAdmin(auth: any) {
    if (!auth?.roles?.includes('ADMIN')) {
      throw new ApiError(403, 'FORBIDDEN', 'Chỉ Quản trị viên (Admin) mới có quyền truy cập.');
    }
  }

  private verifyStoreOwner(auth: any): string {
    return requireStorePermission(auth,'report.store.view');
  }

  async listAllOrders(
    query: { page?: number; size?: number },
    auth: any,
    _correlation: string
  ): Promise<OperationOutputs['listAllOrders']> {
    this.verifyAdmin(auth);
    const page = Math.max(1, Number(query?.page ?? 1));
    const size = Math.min(100, Math.max(1, Number(query?.size ?? 20)));

    const repo = new ReportRepository(database.manager);
    const { items, total } = await repo.pageAllOrders(page, size);

    return {
      items: items.map(adminOrderResponse),
      total,
      page,
      size,
    };
  }

  async getPlatformDashboard(
    auth: any,
    correlation: string
  ): Promise<OperationOutputs['getPlatformDashboard']> {
    this.verifyAdmin(auth);
    const repo = new ReportRepository(database.manager);
    const data = await repo.getPlatformDashboardData();
    const counts=await this.identity.counts(accessToken(auth),correlation);

    return {
      order_value_vnd: moneyNumber(data.order_value_vnd),
      completed_goods_revenue_vnd: moneyNumber(data.completed_goods_revenue_vnd),
      collected_vnd: moneyNumber(data.collected_vnd),
      refunded_vnd: moneyNumber(data.refunded_vnd),
      store_count: counts.store_count,
      user_count: counts.user_count,
    };
  }

  async getStoreReport(
    query: { from: string; to: string; granularity?: 'DAY' | 'MONTH' },
    auth: any,
    correlation: string
  ): Promise<OperationOutputs['getStoreReport']> {
    const storeId = this.verifyStoreOwner(auth);

    if (!query?.from || !query?.to) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Thiếu tham số thời gian from hoặc to.');
    }

    const from = new Date(query.from);
    const to = new Date(query.to);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || to.getTime() < from.getTime()) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Khoảng thời gian from/to không hợp lệ.');
    }

    const granularity = query.granularity === 'MONTH' ? 'MONTH' : 'DAY';
    const repo = new ReportRepository(database.manager);
    const data = await repo.getStoreReportData(storeId, from, to, granularity);
    const lowStockIds:string[]=[];
    let page=1,total=0;
    do {
      const result=await this.clients().call('ListLowStockVariants',{token:accessToken(auth),store_id:storeId,threshold:5,page,size:100},correlation);
      if ((!result.items.length && lowStockIds.length<result.total) || page>100) throw new ApiError(503,'DEPENDENCY_CONTRACT_INVALID','Low-stock pagination không thể hoàn tất.');
      lowStockIds.push(...result.items.map(item=>item.variant_id));total=result.total;page++;
    } while(lowStockIds.length<total);

    return {
      store_id: storeId,
      period_start: from.toISOString(),
      period_end: to.toISOString(),
      order_value_vnd: moneyNumber(data.order_value_vnd),
      completed_goods_revenue_vnd: moneyNumber(data.completed_goods_revenue_vnd),
      collected_vnd: moneyNumber(data.collected_vnd),
      refunded_vnd: moneyNumber(data.refunded_vnd),
      shipping_fee_vnd: moneyNumber(data.shipping_fee_vnd),
      order_count: data.order_count,
      best_selling_product_ids: data.best_selling_product_ids,
      low_stock_variant_ids: lowStockIds,
      revenue_series: data.revenue_series.map(s => ({
        bucket_start: s.bucket_start instanceof Date ? s.bucket_start.toISOString() : new Date(s.bucket_start).toISOString(),
        completed_goods_revenue_vnd: moneyNumber(s.completed_goods_revenue_vnd),
      })),
    };
  }
}
