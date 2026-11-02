import {OrderQueue} from '../../components/OrderQueue';
import { useCallback, useEffect, useState } from 'react';
import {Link} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import type {OperationOutputs} from '../../api/operations.generated';
import {OrderListFilters,useOrderListFilters,refundStatusLabel,paymentMethodLabel,paymentStatusLabel} from '../../components/OrderListTools';
import {OrderPackingSheet,orderStatusLabel,ReturnPolicyNotice,OrderTimeline} from '../../components/OrderPresentation';
import {RefreshCw} from 'lucide-react';
import {Modal} from '../../components/Modal';
import { callOperation } from '../../api/operations';
import { ErrorView, Loading, Pagination } from '../../bootstrap/components';

type AdminOrder=OperationOutputs['listAllOrders']['items'][number];
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export function AdminOrders() {
  const filters=useOrderListFilters(),[selected,setSelected]=useState<AdminOrder>();
  const query=useQuery({queryKey:['admin-orders',filters.query],staleTime:0,queryFn:({signal})=>callOperation('listAllOrders',{query:filters.query},{signal})});
  useEffect(()=>setSelected(undefined),[JSON.stringify(filters.query)]);
  useEffect(()=>{if(query.data&&!query.isFetching&&!query.error&&filters.page>Math.max(1,Math.ceil(query.data.total/query.data.size)))filters.set('page',String(Math.max(1,Math.ceil(query.data.total/query.data.size))),{replace:true});},[query.data,query.isFetching,query.error,filters.page]);
  return <section className="boot-card"><div className="seller-products-toolbar"><div><h3>Đơn hàng toàn sàn</h3><p>Tìm trên toàn bộ đơn và dữ liệu đã chốt; kiểm tra món, tiền và người nhận trước khi hỗ trợ.</p></div><button className="ui-button ui-button-secondary" disabled={query.isFetching} onClick={()=>void query.refetch()}><RefreshCw size={15}/>Tải lại</button></div>
    <OrderListFilters filters={filters}/>
    {query.error?<ErrorView error={query.error} onRetry={()=>void query.refetch()}/>:query.isPending?<Loading/>:query.data&&<>
      <p role="status">{query.data.total.toLocaleString('vi-VN')} đơn phù hợp · trang {filters.page}.</p>
      <OrderQueue admin orders={query.data.items} onOpen={id=>setSelected(query.data.items.find(order=>order.id===id))}/><Pagination page={filters.page} size={query.data.size} total={query.data.total} onPage={page=>filters.set('page',String(page))}/>
    </>}
    {selected&&<Modal label={'Chi tiết đơn '+selected.id} onClose={()=>setSelected(undefined)}><h2>Chi tiết đơn hàng</h2><p>{selected.id}</p><dl className="admin-order-details">{[['Mã nhóm mua',selected.purchase_group_id],['Store',selected.store_id],['Trạng thái',orderStatusLabel(selected.status)],['Phương thức',paymentMethodLabel(selected.payment_method)],['Thanh toán',paymentStatusLabel(selected.payment_status,selected.amounts.payable_vnd)],['Hoàn tiền',selected.refund_status?refundStatusLabel(selected.refund_status):'Chưa có kết quả hoàn'],['Tiền hàng',money(selected.amounts.goods_vnd)],['Giảm giá',money(selected.amounts.store_discount_vnd+selected.amounts.platform_discount_vnd)],['Phí giao hàng',money(selected.amounts.shipping_vnd)],['Phải trả',money(selected.amounts.payable_vnd)]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><OrderPackingSheet order={selected}/><ReturnPolicyNotice policy={selected.return_policy_snapshot}/><OrderTimeline order={selected}/><div className="ui-actions"><button className="ui-button ui-button-secondary" onClick={()=>setSelected(undefined)}>Đóng</button><Link className="ui-button ui-button-primary" to="/admin?tab=returns">Xem yêu cầu đổi trả</Link></div></Modal>}
  </section>;
}

export function AdminDashboardSummary() {
  const [data, setData] = useState<Record<string, number | null>>(); const [error, setError] = useState<unknown>(); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); setError(undefined); try { setData(await callOperation('getPlatformDashboard', {}) as Record<string, number | null>); } catch (cause) { setError(cause); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <section className="boot-card"><h3>Tổng quan nền tảng</h3>{error !== undefined && <ErrorView error={error} />}{loading ? <Loading /> : data && <>
    <dl className="admin-metric-grid">{Object.entries(data).map(([key, value]) => <div key={key}><dt>{({order_value_vnd:"Giá trị đơn hàng",completed_goods_revenue_vnd:"Doanh thu hàng đã hoàn tất",collected_vnd:"Đã thu",refunded_vnd:"Đã hoàn tiền",store_count:"Gian hàng",user_count:"Người dùng"} as Record<string,string>)[key] ?? key}</dt><dd>{value == null ? 'Chưa có dữ liệu' : key.endsWith('_vnd') ? money(value) : value.toLocaleString('vi-VN')}</dd></div>)}</dl>
    <div className="ui-actions"><button className="ui-button ui-button-secondary" onClick={() => void load()}>Tải lại</button><Link className="ui-button ui-button-primary" to="/admin?tab=orders">Quản lý đơn hàng</Link><Link className="ui-button ui-button-secondary" to="/admin/store-applications">Duyệt gian hàng</Link></div>
  </>}</section>;
}

type MetricsResponse = {
  index_status?: string; model_version?: string | null; dataset_version?: string | null; last_training_at?: string | null;
  evaluation_status?: 'NOT_RUN' | 'RUNNING' | 'COMPLETED' | 'FAILED' | string; mode?: 'mock' | 'real' | string;
  metrics?: Record<string, unknown> | null;
};
const metricValue = (value: unknown) => {
  if (value === null || value === undefined) return 'Chưa có dữ liệu';
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString('vi-VN', { maximumFractionDigits: 4 }) : 'Không hợp lệ';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export function AdminAiMetrics() {
  const [data, setData] = useState<MetricsResponse>(); const [error, setError] = useState<unknown>(); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); setError(undefined); try { setData(await callOperation('getAiMetrics', {}) as MetricsResponse); } catch (cause) { setError(cause); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const metrics = data?.metrics ?? undefined;
  return <section className="boot-card"><h3>AI và trạng thái vận hành</h3>{error !== undefined && <ErrorView error={error} />}{loading ? <Loading /> : data && <>
    <dl>{[['Chế độ', data.mode], ['Trạng thái index', data.index_status], ['Model version', data.model_version], ['Dataset version', data.dataset_version], ['Evaluation', data.evaluation_status], ['Lần huấn luyện cuối', data.last_training_at]].map(([key, value]) =>
      <div key={String(key)} style={{ display: 'flex', gap: '1rem' }}><dt>{key}</dt><dd>{metricValue(value)}</dd></div>)}</dl>
    {data.mode === 'mock' && <p role="note">Chế độ mock: đây không phải số liệu vận hành thật.</p>}
    {data.evaluation_status === 'NOT_RUN' && <p role="status">Chưa có lượt đánh giá. Không có kết quả để báo cáo.</p>}
    {data.evaluation_status === 'RUNNING' && <p role="status">Lượt đánh giá đang chạy.</p>}
    {data.evaluation_status === 'FAILED' && <p role="alert">Lượt đánh giá gần nhất thất bại.</p>}
    {data && <><h4>{data.evaluation_status === 'COMPLETED' ? 'Metrics' : 'Telemetry'}</h4>{metrics && Object.keys(metrics).length ? <dl>{Object.entries(metrics).map(([key, value]) => <div key={key} style={{ display: 'flex', gap: '1rem' }}><dt>{key}</dt><dd>{metricValue(value)}</dd></div>)}</dl> : <p>Chưa có metrics.</p>}</>}
    <button onClick={() => void load()}>Tải lại</button>
  </>}</section>;
}
