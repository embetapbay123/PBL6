import { FormEvent, useCallback, useEffect, useState } from 'react';
import { request } from '../../api/client';
import { ErrorView, Loading, Pagination } from '../../bootstrap/components';

type Order = { id: string; store_id: string; status: string; payment_method: string; payment_status?: string; version: number; amounts: { payable_vnd: number } };
type Voucher = { id: string; code: string; discount_type: 'FIXED' | 'PERCENT'; discount_value: number; starts_at: string; ends_at: string; usage_limit: number; per_customer_limit: number; status?: string; version?: number };
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export function AdminOrders() {
  const [items, setItems] = useState<Order[]>([]); const [total, setTotal] = useState(0); const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<unknown>();
  const load = useCallback(async () => { setLoading(true); setError(undefined); try {
    const result = await request<{ items: Order[]; total: number; page: number }>('/admin/orders?page=' + page + '&size=20');
    setItems(result.items); setTotal(result.total);
  } catch (cause) { setError(cause); } finally { setLoading(false); } }, [page]);
  useEffect(() => { void load(); }, [load]);
  return <section className="boot-card"><h3>Đơn hàng toàn sàn</h3>{error !== undefined && <ErrorView error={error} />}{loading ? <Loading /> : <>
    <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Order</th><th>Store</th><th>Trạng thái</th><th>Thanh toán</th><th>Tổng tiền</th></tr></thead><tbody>
      {items.map(order => <tr key={order.id}><td>{order.id}</td><td>{order.store_id}</td><td>{order.status}</td><td>{order.payment_method} {order.payment_status}</td><td>{money(order.amounts.payable_vnd)}</td></tr>)}
    </tbody></table></div><Pagination page={page} size={20} total={total} onPage={setPage} />
  </>}</section>;
}

export function AdminDashboardSummary() {
  const [data, setData] = useState<Record<string, number>>(); const [error, setError] = useState<unknown>();
  useEffect(() => { request<Record<string, number>>('/admin/dashboard').then(setData).catch(setError); }, []);
  return <section className="boot-card"><h3>Tổng quan nền tảng</h3>{error !== undefined && <ErrorView error={error} />}{!data && error === undefined ? <Loading /> : data && <dl>
    {Object.entries(data).map(([key, value]) => <div key={key} style={{ display: 'flex', gap: '1rem' }}><dt>{key}</dt><dd>{key.endsWith('_vnd') ? money(value) : value.toLocaleString('vi-VN')}</dd></div>)}
  </dl>}</section>;
}

export function AdminAiMetrics() {
  const [data, setData] = useState<Record<string, unknown>>(); const [error, setError] = useState<unknown>();
  useEffect(() => { request<Record<string, unknown>>('/ai/metrics').then(setData).catch(setError); }, []);
  return <section className="boot-card"><h3>AI và trạng thái vận hành</h3>{error !== undefined && <ErrorView error={error} />}{!data && error === undefined ? <Loading /> : data && <dl>
    {Object.entries(data).map(([key, value]) => <div key={key} style={{ display: 'flex', gap: '1rem' }}><dt>{key}</dt><dd>{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}</dd></div>)}
  </dl>}</section>;
}

type Category = { id: string; name: string; parent_id?: string; status?: string; version?: number };
type ProductType = { id: string; name: string; category_id?: string; status?: string; version?: number };
export function AdminCatalogManagement() {
  const [categories, setCategories] = useState<Category[]>([]); const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [categoryName, setCategoryName] = useState(''); const [typeName, setTypeName] = useState(''); const [categoryId, setCategoryId] = useState('');
  const [editCategoryId, setEditCategoryId] = useState(''); const [editTypeId, setEditTypeId] = useState('');
  const [productId, setProductId] = useState(''); const [reviewId, setReviewId] = useState(''); const [version, setVersion] = useState(0); const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(); const [notice, setNotice] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(undefined); try {
    const [categoryPage, typePage] = await Promise.all([
      request<{ items: Category[] }>('/categories?page=1&size=100'), request<{ items: ProductType[] }>('/product-types?page=1&size=100'),
    ]); setCategories(categoryPage.items); setProductTypes(typePage.items);
  } catch (cause) { setError(cause); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const submit = async (path: string, method: string, body: unknown) => { setBusy(true); setError(undefined); setNotice(''); try {
    await request(path, { method, body: JSON.stringify(body) }); setNotice('Đã gửi yêu cầu tới API quản trị.'); await load();
  } catch (cause) { setError(cause); } finally { setBusy(false); } };
  const hideOrRestore = (kind: 'products' | 'reviews', action: 'hide' | 'restore') => {
    const id = kind === 'products' ? productId : reviewId; if (!id) return;
    void submit(`/admin/${kind}/${id}/${action}`, 'POST', { reason, expected_version: version });
  };
  return <section className="boot-card"><h3>Taxonomy và kiểm duyệt</h3>
    <p>Danh mục và loại sản phẩm đang đọc dữ liệu API công khai; thay đổi kiểm duyệt cần API quản trị M1.</p>
    {error !== undefined && <ErrorView error={error} />}{notice && <p role="status">{notice}</p>}
    {loading ? <Loading /> : <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: '1rem' }}>
        <div><h4>Danh mục</h4><ul>{categories.map(item => <li key={item.id}>{item.name} · {item.status ?? 'ACTIVE'}</li>)}</ul>
          <form onSubmit={event => { event.preventDefault(); void submit('/admin/categories', 'POST', { name: categoryName }); }}>
            <label>Tên danh mục<input required value={categoryName} onChange={event => setCategoryName(event.target.value)} /></label><button disabled={busy}>Tạo danh mục</button>
          </form>
          <label>Sửa danh mục<select value={editCategoryId} onChange={event => setEditCategoryId(event.target.value)}><option value="">Chọn danh mục</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <button disabled={busy || !editCategoryId} onClick={() => { const item = categories.find(row => row.id === editCategoryId); if (item) void submit(`/admin/categories/${item.id}`, 'PATCH', { name: categoryName || item.name, expected_version: item.version }); }}>Cập nhật danh mục</button>
        </div>
        <div><h4>Loại sản phẩm</h4><ul>{productTypes.map(item => <li key={item.id}>{item.name}</li>)}</ul>
          <form onSubmit={event => { event.preventDefault(); void submit('/admin/product-types', 'POST', { name: typeName, category_id: categoryId }); }}>
            <label>Tên loại<input required value={typeName} onChange={event => setTypeName(event.target.value)} /></label>
            <label>Danh mục<select required value={categoryId} onChange={event => setCategoryId(event.target.value)}><option value="">Chọn danh mục</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <button disabled={busy}>Tạo loại sản phẩm</button>
          </form>
          <label>Sửa loại sản phẩm<select value={editTypeId} onChange={event => setEditTypeId(event.target.value)}><option value="">Chọn loại sản phẩm</option>{productTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <button disabled={busy || !editTypeId} onClick={() => { const item = productTypes.find(row => row.id === editTypeId); if (item) void submit(`/admin/product-types/${item.id}`, 'PATCH', { name: typeName || item.name, expected_version: item.version }); }}>Cập nhật loại sản phẩm</button>
        </div>
      </div>
      <h4>Ẩn hoặc khôi phục nội dung</h4>
      <label>Product ID<input value={productId} onChange={event => setProductId(event.target.value)} /></label>
      <label>Review ID<input value={reviewId} onChange={event => setReviewId(event.target.value)} /></label>
      <label>Phiên bản đã đọc<input type="number" min={0} value={version} onChange={event => setVersion(Number(event.target.value))} /></label>
      <label>Lý do<input required value={reason} onChange={event => setReason(event.target.value)} /></label>
      <div>{(['products', 'reviews'] as const).map(kind => <span key={kind} style={{ marginRight: '.75rem' }}>
        <button disabled={busy || !reason} onClick={() => hideOrRestore(kind, 'hide')}>Ẩn {kind === 'products' ? 'Product' : 'Review'}</button>{' '}
        <button disabled={busy || !reason} onClick={() => hideOrRestore(kind, 'restore')}>Khôi phục {kind === 'products' ? 'Product' : 'Review'}</button>
      </span>)}</div>
    </>}
  </section>;
}

export function AdminVouchers() {
  const [items, setItems] = useState<Voucher[]>([]); const [page, setPage] = useState(1); const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>();
  const [usage, setUsage] = useState<{ voucher_id: string; reserved_count: number; redeemed_count: number; remaining_count: number }>();
  const [code, setCode] = useState(''); const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED'); const [discountValue, setDiscountValue] = useState(10000);
  const [usageLimit, setUsageLimit] = useState(100); const [perCustomerLimit, setPerCustomerLimit] = useState(1);
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 16)); const [endsAt, setEndsAt] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16));
  const load = useCallback(async () => { setLoading(true); setError(undefined); try {
    const result = await request<{ items: Voucher[]; total: number }>('/admin/vouchers?page=' + page + '&size=20'); setItems(result.items); setTotal(result.total);
  } catch (cause) { setError(cause); } finally { setLoading(false); } }, [page]);
  useEffect(() => { void load(); }, [load]);
  const create = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(undefined); try {
    await request('/admin/vouchers', { method: 'POST', body: JSON.stringify({ code, scope: 'PLATFORM', discount_type: discountType, discount_value: discountValue,
      starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString(), usage_limit: usageLimit, per_customer_limit: perCustomerLimit }) });
    setCode(''); await load();
  } catch (cause) { setError(cause); } finally { setBusy(false); } };
  const stop = async (voucher: Voucher) => { if (!voucher.id) return; setBusy(true); setError(undefined); try {
    await request(`/admin/vouchers/${voucher.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'STOPPED', expected_version: voucher.version }) }); await load();
  } catch (cause) { setError(cause); } finally { setBusy(false); } };
  const showUsage = async (voucher: Voucher) => { if (!voucher.id) return; setError(undefined); try { setUsage(await request<{ voucher_id: string; reserved_count: number; redeemed_count: number; remaining_count: number }>(`/admin/vouchers/${voucher.id}/usage`)); } catch (cause) { setError(cause); } };
  return <section className="boot-card"><h3>Voucher toàn sàn</h3>{error !== undefined && <ErrorView error={error} />}
    <form onSubmit={create} style={{ display: 'grid', gap: '.5rem', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
      <label>Mã voucher<input required maxLength={50} value={code} onChange={event => setCode(event.target.value.toUpperCase())} /></label>
      <label>Loại giảm<select value={discountType} onChange={event => setDiscountType(event.target.value as 'FIXED' | 'PERCENT')}><option value="FIXED">Số tiền</option><option value="PERCENT">Phần trăm</option></select></label>
      <label>Mức giảm<input type="number" min={1} value={discountValue} onChange={event => setDiscountValue(Number(event.target.value))} /></label>
      <label>Lượt dùng<input type="number" min={1} value={usageLimit} onChange={event => setUsageLimit(Number(event.target.value))} /></label>
      <label>Giới hạn mỗi khách<input type="number" min={1} value={perCustomerLimit} onChange={event => setPerCustomerLimit(Number(event.target.value))} /></label>
      <label>Bắt đầu<input type="datetime-local" required value={startsAt} onChange={event => setStartsAt(event.target.value)} /></label>
      <label>Kết thúc<input type="datetime-local" required value={endsAt} onChange={event => setEndsAt(event.target.value)} /></label>
      <button disabled={busy}>Tạo voucher</button>
    </form>
    {usage && <p role="status">Voucher usage: reserved {usage.reserved_count}, redeemed {usage.redeemed_count}, remaining {usage.remaining_count}</p>}
    {loading ? <Loading /> : <><div style={{ overflowX: 'auto' }}><table><thead><tr><th>Mã</th><th>Ưu đãi</th><th>Hiệu lực</th><th>Trạng thái</th><th></th></tr></thead><tbody>
      {items.map(item => <tr key={item.id}><td>{item.code}</td><td>{item.discount_type === 'PERCENT' ? `${item.discount_value}%` : money(item.discount_value)}</td><td>{new Date(item.starts_at).toLocaleDateString()} – {new Date(item.ends_at).toLocaleDateString()}</td><td>{item.status}</td><td><button disabled={busy} onClick={() => void showUsage(item)}>Usage</button>{' '}{item.status === 'ACTIVE' && <button disabled={busy} onClick={() => stop(item)}>Dừng</button>}</td></tr>)}
    </tbody></table></div><Pagination page={page} size={20} total={total} onPage={setPage} /></>}
  </section>;
}
