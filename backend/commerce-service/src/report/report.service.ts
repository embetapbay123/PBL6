import type {DataSource} from 'typeorm';
import type {OrderSearch} from '../order/order-search';
import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import { moneyNumber } from '../../../shared/src/money';
import { ReportRepository, OrderAdminRow } from './report.repository';
import type { OperationOutputs } from '../../../shared/src/operations.generated';
import { config } from '../../../shared/src/config';
import { InternalClients } from '../../../shared/src/internal-clients';
import { accessToken, requireStorePermission } from '../scope';
import { IdentityStatsClient, IdentityStats } from '../identity-stats-client';
import {readReturnPolicy} from '../returns/return-policy';
import {orderTimelineActor} from '../order/order-timeline';

export function adminOrderResponse(row: OrderAdminRow) {
  return {
    id: row.id,
    ...(row.created_at?{created_at:new Date(row.created_at).toISOString()}:{}),
    ...(row.address_snapshot?{address_snapshot:row.address_snapshot}:{}),
    ...(readReturnPolicy(row.return_policy_snapshot)?{return_policy_snapshot:readReturnPolicy(row.return_policy_snapshot)!}:{}),
    ...(row.completed_at?{completed_at:new Date(row.completed_at).toISOString()}:{}),
    ...(row.status_history?{timeline:row.status_history.map(event=>({status:event.to_status,...(event.from_status?{from_status:event.from_status}:{}),occurred_at:new Date(event.created_at).toISOString(),actor_kind:orderTimelineActor(event,row.customer_user_id??'')}))}:{}),
    ...(row.items?{items:row.items.map((item:any)=>({...item,unit_price_vnd:moneyNumber(item.unit_price_vnd),line_total_vnd:moneyNumber(item.line_total_vnd)}))}:{}),
    purchase_group_id: row.purchase_group_id,
    store_id: row.store_id,
    status: row.status as any,
    version: row.version,
    payment_method: row.payment_method as any,
    payment_status: row.payment_status ?? undefined,
    refund_status: row.refund_status ?? (Number(row.refunded_vnd ?? 0) > 0 ? 'REFUNDED' : undefined),
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
  constructor(private readonly clientsFactory?:()=>InternalClients,private readonly identity:IdentityStats=new IdentityStatsClient(),private readonly source:DataSource=database) {}
  private clients():InternalClients {
    if(this.clientsFactory) return this.clientsFactory();
    const c=config('M2');return new InternalClients('M2',c.internalKeys.M2,{M1:c.catalogUrl,M2:'',M3:c.identityUrl});
  }
  private reportSnapshot(storeId:string|null,from:Date,to:Date,granularity:'DAY'|'MONTH'){
    // All money totals, gaps and buckets belong to the same committed database view.
    // A concurrent collection/refund must appear either in all of them or in the next report.
    return this.source.transaction('REPEATABLE READ',manager=>new ReportRepository(manager).getStoreReportData(storeId,from,to,granularity));
  }
  private verifyAdmin(auth: any) {
    if (!auth?.roles?.includes('ADMIN')) {
      throw new ApiError(403, 'FORBIDDEN', 'Chỉ Quản trị viên (Admin) mới có quyền truy cập.');
    }
  }

  private verifyStoreOwner(auth: any): string {
    if(auth?.store_membership?.role!=='OWNER')throw new ApiError(403,'FORBIDDEN','Báo cáo dành cho chủ cửa hàng.');
    return requireStorePermission(auth,'report.store.view');
  }

  async listAllOrders(
    query: { page?: number; size?: number } & OrderSearch,
    auth: any,
    _correlation: string
  ): Promise<OperationOutputs['listAllOrders']> {
    this.verifyAdmin(auth);
    const page = Math.max(1, Number(query?.page ?? 1));
    const size = Math.min(100, Math.max(1, Number(query?.size ?? 20)));

    const repo = new ReportRepository(this.source.manager);
    const { items, total } = await repo.pageAllOrders(page, size,query);

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
    const repo = new ReportRepository(this.source.manager);
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
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || to.getTime() <= from.getTime()) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Khoảng thời gian from/to không hợp lệ.');
    }

    const granularity = query.granularity === 'MONTH' ? 'MONTH' : 'DAY';
    const data = await this.reportSnapshot(storeId, from, to, granularity);
    const lowStockIds:string[]=[];
    let page=1,total=0;
    do {
      const result=await this.clients().call('ListLowStockVariants',{token:accessToken(auth),store_id:storeId,threshold:5,page,size:100},correlation);
      if ((!result.items.length && lowStockIds.length<result.total) || page>100) throw new ApiError(503,'DEPENDENCY_CONTRACT_INVALID','Low-stock pagination không thể hoàn tất.');
      lowStockIds.push(...result.items.map(item=>item.variant_id));total=result.total;page++;
    } while(lowStockIds.length<total);

    return {
      store_id: storeId,
      timezone: 'Asia/Ho_Chi_Minh',
      unresolved_collected_vnd: moneyNumber(data.unresolved_collected_vnd ?? '0'),
      unresolved_refunded_vnd: moneyNumber(data.unresolved_refunded_vnd ?? '0'),
      cash_series: (data.cash_series ?? []).map(row=>({bucket_start:new Date(row.bucket_start).toISOString(),collected_vnd:moneyNumber(row.collected_vnd),refunded_vnd:moneyNumber(row.refunded_vnd)})),
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
  async listMoney(query:{from:string;to:string;page?:number;size?:number;store_id?:string},auth:any,admin=false):Promise<OperationOutputs['listStoreMoneyMovements']> {
    let storeId:string|null;
    if(admin){this.verifyAdmin(auth);if(!auth.role_permissions?.includes('platform.admin'))throw new ApiError(403,'FORBIDDEN','Cần quyền quản trị hiện hành.');storeId=query.store_id ?? null;}
    else storeId=this.verifyStoreOwner(auth);
    const from=new Date(query.from),to=new Date(query.to);
    if(!Number.isFinite(from.getTime())||!Number.isFinite(to.getTime())||from>=to)throw new ApiError(422,'VALIDATION_FAILED','Khoảng thời gian không hợp lệ.');
    const page=Math.max(1,query.page??1),size=Math.min(100,Math.max(1,query.size??20));
    const result=await new ReportRepository(this.source.manager).pageMoney(storeId,from,to,page,size);
    return {page,size,total:result.total,items:result.items.map((row:any)=>({id:row.id,order_id:row.order_id,payment_id:row.payment_id,store_id:row.store_id,kind:row.kind,amount_vnd:moneyNumber(row.amount_vnd),occurred_at:new Date(row.occurred_at).toISOString(),recorded_at:new Date(row.recorded_at).toISOString(),source_type:row.source_type,source_id:row.source_id,time_source:row.time_source}))};
  }

  async getPlatformMoneyReport(query:{from:string;to:string;store_id?:string;granularity?:'DAY'|'MONTH'},auth:any):Promise<OperationOutputs['getPlatformMoneyReport']> {
    this.verifyAdmin(auth);if(!auth.role_permissions?.includes('platform.admin'))throw new ApiError(403,'FORBIDDEN','Cần quyền quản trị hiện hành.');
    const from=new Date(query.from),to=new Date(query.to);if(!Number.isFinite(from.getTime())||!Number.isFinite(to.getTime())||from>=to)throw new ApiError(422,'INVALID_REPORT_PERIOD','Khoảng báo cáo cần ngày bắt đầu trước ngày kết thúc.');
    const data=await this.reportSnapshot(query.store_id??null,from,to,query.granularity==='MONTH'?'MONTH':'DAY');
    return {...(query.store_id?{store_id:query.store_id}:{}),timezone:'Asia/Ho_Chi_Minh',period_start:from.toISOString(),period_end:to.toISOString(),order_count:data.order_count,order_value_vnd:moneyNumber(data.order_value_vnd),completed_goods_revenue_vnd:moneyNumber(data.completed_goods_revenue_vnd),shipping_fee_vnd:moneyNumber(data.shipping_fee_vnd),collected_vnd:moneyNumber(data.collected_vnd),refunded_vnd:moneyNumber(data.refunded_vnd),unresolved_collected_vnd:moneyNumber(data.unresolved_collected_vnd??'0'),unresolved_refunded_vnd:moneyNumber(data.unresolved_refunded_vnd??'0'),cash_series:(data.cash_series??[]).map(row=>({bucket_start:new Date(row.bucket_start).toISOString(),collected_vnd:moneyNumber(row.collected_vnd),refunded_vnd:moneyNumber(row.refunded_vnd)}))};
  }
  async listUnresolvedMoney(query:{page?:number;size?:number;store_id?:string},auth:any,admin=false):Promise<OperationOutputs['listStoreUnresolvedMoneyMovements']> {
    let storeId:string|null;
    if(admin){this.verifyAdmin(auth);if(!auth.role_permissions?.includes('platform.admin'))throw new ApiError(403,'FORBIDDEN','Cần quyền quản trị hiện hành.');storeId=query.store_id??null;}
    else storeId=this.verifyStoreOwner(auth);
    const page=Math.max(1,query.page??1),size=Math.min(100,Math.max(1,query.size??20));
    const result=await new ReportRepository(this.source.manager).pageUnresolvedMoney(storeId,page,size);
    return {page,size,total:result.total,items:result.items.map((row:any)=>({order_id:row.order_id,payment_id:row.payment_id,store_id:row.store_id,payment_method:row.payment_method,kind:row.kind,amount_vnd:moneyNumber(row.amount_vnd),reconciliation_reason:'MISSING_VERIFIED_EVENT_TIME'}))};
  }

}
