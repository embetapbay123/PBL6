import { useCallback, useEffect, useRef, useState } from 'react';
import { callOperation } from '../../api/operations';
import { ErrorView, Loading, Pagination } from '../../bootstrap/components';
import {OrderFilters,OrderQuery,orderCode} from '../../live/OrderFilters';
import {orderLabel} from '../../live/OrderFacts';

type AdminOrder = {
  id: string; purchase_group_id: string; store_id: string; status: string; version: number;
  payment_method: string; payment_status?: string; refund_status?: string;
  amounts: { goods_vnd: number; store_discount_vnd: number; platform_discount_vnd: number; shipping_vnd: number; payable_vnd: number };
};
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export function AdminOrders() {
  const requestId=useRef(0);
  const [filters,setFilters]=useState<OrderQuery>({});
  const [items, setItems] = useState<AdminOrder[]>([]); const [total, setTotal] = useState(0); const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<unknown>();
  const load = useCallback(async () => {
    const current=++requestId.current;setLoading(true); setError(undefined);
    try { const result = await callOperation('listAllOrders', { query: { ...filters,page, size: 20 } }); if(current===requestId.current){setItems(result.items as unknown as AdminOrder[]); setTotal(result.total);} }
    catch (cause) { if(current===requestId.current)setError(cause); } finally { if(current===requestId.current)setLoading(false); }
  }, [page,filters]);
  useEffect(() => { void load(); }, [load]);
  return <section className="boot-card"><h3>Đơn hàng toàn sàn</h3><OrderFilters apply={query=>{setFilters(query);setPage(1)}}/>{error !== undefined && <ErrorView error={error} />}{loading ? <Loading /> : <>
    <p role="status">{total.toLocaleString('vi-VN')} đơn khớp bộ lọc · trang {page}.</p>
    <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Order</th><th>Store</th><th>Trạng thái</th><th>Thanh toán</th><th>Hàng hóa</th><th>Giảm giá</th><th>Phí giao</th><th>Phải trả</th></tr></thead><tbody>
      {items.map(order => <tr key={order.id}><td title={order.id}>{orderCode(order.id)}</td><td>{order.store_id}</td><td>{orderLabel[order.status]??order.status}</td><td>{order.payment_method} · {order.payment_status ?? '—'}{order.refund_status ? ` · ${order.refund_status}` : ''}</td>
        <td>{money(order.amounts.goods_vnd)}</td><td>{money(order.amounts.store_discount_vnd + order.amounts.platform_discount_vnd)}</td><td>{money(order.amounts.shipping_vnd)}</td><td>{money(order.amounts.payable_vnd)}</td></tr>)}
      {!items.length && <tr><td colSpan={8}>Không có đơn hàng ở trang này.</td></tr>}
    </tbody></table></div><button onClick={() => void load()}>Tải lại</button><Pagination page={page} size={20} total={total} onPage={setPage} />
  </>}</section>;
}

export function AdminDashboardSummary() {
  const [data, setData] = useState<Record<string, number | null>>(); const [error, setError] = useState<unknown>(); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); setError(undefined); try { setData(await callOperation('getPlatformDashboard', {}) as Record<string, number | null>); } catch (cause) { setError(cause); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <section className="boot-card"><h3>Tổng quan nền tảng</h3>{error !== undefined && <ErrorView error={error} />}{loading ? <Loading /> : data && <>
    <dl>{Object.entries(data).map(([key, value]) => <div key={key} style={{ display: 'flex', gap: '1rem' }}><dt>{key}</dt><dd>{value == null ? 'Chưa có dữ liệu' : key.endsWith('_vnd') ? money(value) : value.toLocaleString('vi-VN')}</dd></div>)}</dl>
    <button onClick={() => void load()}>Tải lại</button>
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
