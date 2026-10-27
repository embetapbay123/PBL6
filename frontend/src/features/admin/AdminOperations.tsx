import { FormEvent, useCallback, useEffect, useState } from 'react';
import { request } from '../../api/client';
import { callOperation } from '../../api/operations';
import { ErrorView, Loading, Pagination } from '../../bootstrap/components';

type Order = { id: string; store_id: string; status: string; payment_method: string; payment_status?: string; version: number; amounts: { payable_vnd: number } };
type Voucher = { id: string; code: string; discount_type: 'FIXED' | 'PERCENT'; discount_value: number; starts_at: string; ends_at: string; usage_limit: number; per_customer_limit: number; status?: string; version?: number };
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export function AdminOrders() {
  const [items, setItems] = useState<Order[]>([]); const [total, setTotal] = useState(0); const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<unknown>();
  const load = useCallback(async () => { setLoading(true); setError(undefined); try {
    const result = await callOperation('listAllOrders', { query: { page, size: 20 } });
    setItems(result.items as unknown as Order[]); setTotal(result.total);
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
  useEffect(() => { callOperation('getPlatformDashboard', {}).then(res => setData(res as Record<string, number>)).catch(setError); }, []);
  return <section className="boot-card"><h3>Tổng quan nền tảng</h3>{error !== undefined && <ErrorView error={error} />}{!data && error === undefined ? <Loading /> : data && <dl>
    {Object.entries(data).map(([key, value]) => <div key={key} style={{ display: 'flex', gap: '1rem' }}><dt>{key}</dt><dd>{key.endsWith('_vnd') ? money(value) : value.toLocaleString('vi-VN')}</dd></div>)}
  </dl>}</section>;
}

export function AdminAiMetrics() {
  const [data, setData] = useState<Record<string, unknown>>(); const [error, setError] = useState<unknown>();
  useEffect(() => { callOperation('getAiMetrics', {}).then(res => setData(res as Record<string, unknown>)).catch(setError); }, []);
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
  const [attrName, setAttrName] = useState(''); const [attrId, setAttrId] = useState('');
  const [productId, setProductId] = useState(''); const [reviewId, setReviewId] = useState(''); const [version, setVersion] = useState(0); const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(); const [notice, setNotice] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(undefined); try {
    const [categoryPage, typePage] = await Promise.all([
      request<{ items: Category[] }>('/categories?page=1&size=100'), request<{ items: ProductType[] }>('/product-types?page=1&size=100'),
    ]); setCategories(categoryPage.items); setProductTypes(typePage.items);
  } catch (cause) { setError(cause); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(undefined); setNotice('');
    try {
      await callOperation('createCategory', { body: { name: categoryName } });
      setNotice('Đã tạo danh mục.'); setCategoryName(''); await load();
    } catch (cause) { setError(cause); } finally { setBusy(false); }
  };
  const handleUpdateCategory = async () => {
    const item = categories.find(row => row.id === editCategoryId);
    if (!item) return;
    setBusy(true); setError(undefined); setNotice('');
    try {
      await callOperation('updateCategory', {
        path: { id: item.id },
        body: { name: categoryName || item.name, expected_version: item.version ?? 0 },
      });
      setNotice('Đã cập nhật danh mục.'); await load();
    } catch (cause) { setError(cause); } finally { setBusy(false); }
  };
  const handleCreateProductType = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(undefined); setNotice('');
    try {
      await callOperation('createProductType', { body: { name: typeName, category_id: categoryId } });
      setNotice('Đã tạo loại sản phẩm.'); setTypeName(''); await load();
    } catch (cause) { setError(cause); } finally { setBusy(false); }
  };
  const handleUpdateProductType = async () => {
    const item = productTypes.find(row => row.id === editTypeId);
    if (!item) return;
    setBusy(true); setError(undefined); setNotice('');
    try {
      await callOperation('updateProductType', {
        path: { id: item.id },
        body: { name: typeName || item.name, expected_version: item.version ?? 0 },
      });
      setNotice('Đã cập nhật loại sản phẩm.'); await load();
    } catch (cause) { setError(cause); } finally { setBusy(false); }
  };
  const handleCreateAttribute = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(undefined); setNotice('');
    try {
      await callOperation('createAttributeDefinition', {
        body: { name: attrName, data_type: 'STRING', product_type_id: editTypeId || undefined },
      });
      setNotice('Đã tạo định nghĩa thuộc tính.'); setAttrName('');
    } catch (cause) { setError(cause); } finally { setBusy(false); }
  };
  const handleUpdateAttribute = async () => {
    if (!attrId) return;
    setBusy(true); setError(undefined); setNotice('');
    try {
      await callOperation('updateAttributeDefinition', {
        path: { id: attrId },
        body: { name: attrName, expected_version: 1 },
      });
      setNotice('Đã cập nhật định nghĩa thuộc tính.');
    } catch (cause) { setError(cause); } finally { setBusy(false); }
  };
  const hideOrRestore = async (kind: 'products' | 'reviews', action: 'hide' | 'restore') => {
    const id = kind === 'products' ? productId : reviewId; if (!id) return;
    setBusy(true); setError(undefined); setNotice('');
    try {
      if (kind === 'products') {
        if (action === 'hide') {
          await callOperation('hideProduct', { path: { id }, body: { reason, expected_version: version } });
        } else {
          await callOperation('restoreProduct', { path: { id }, body: { reason, expected_version: version } });
        }
      } else {
        if (action === 'hide') {
          await callOperation('hideReview', { path: { id }, body: { reason, expected_version: version } });
        } else {
          await callOperation('restoreReview', { path: { id }, body: { reason, expected_version: version } });
        }
      }
      setNotice(`Đã ${action === 'hide' ? 'ẩn' : 'khôi phục'} ${kind}.`);
    } catch (cause) { setError(cause); } finally { setBusy(false); }
  };
  return <section className="boot-card"><h3>Taxonomy và kiểm duyệt</h3>
    <p>Danh mục và loại sản phẩm đang đọc dữ liệu API công khai; thay đổi kiểm duyệt cần API quản trị M1.</p>
    {error !== undefined && <ErrorView error={error} />}{notice && <p role="status">{notice}</p>}
    {loading ? <Loading /> : <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: '1rem' }}>
        <div><h4>Danh mục</h4><ul>{categories.map(item => <li key={item.id}>{item.name} · {item.status ?? 'ACTIVE'}</li>)}</ul>
          <form onSubmit={handleCreateCategory}>
            <label>Tên danh mục<input required value={categoryName} onChange={event => setCategoryName(event.target.value)} /></label><button disabled={busy}>Tạo danh mục</button>
          </form>
          <label>Sửa danh mục<select value={editCategoryId} onChange={event => setEditCategoryId(event.target.value)}><option value="">Chọn danh mục</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <button disabled={busy || !editCategoryId} onClick={handleUpdateCategory}>Cập nhật danh mục</button>
        </div>
        <div><h4>Loại sản phẩm</h4><ul>{productTypes.map(item => <li key={item.id}>{item.name}</li>)}</ul>
          <form onSubmit={handleCreateProductType}>
            <label>Tên loại<input required value={typeName} onChange={event => setTypeName(event.target.value)} /></label>
            <label>Danh mục<select required value={categoryId} onChange={event => setCategoryId(event.target.value)}><option value="">Chọn danh mục</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <button disabled={busy}>Tạo loại sản phẩm</button>
          </form>
          <label>Sửa loại sản phẩm<select value={editTypeId} onChange={event => setEditTypeId(event.target.value)}><option value="">Chọn loại sản phẩm</option>{productTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <button disabled={busy || !editTypeId} onClick={handleUpdateProductType}>Cập nhật loại sản phẩm</button>

          <h5 style={{ marginTop: '1rem' }}>Thuộc tính loại sản phẩm</h5>
          <form onSubmit={handleCreateAttribute}>
            <label>Tên thuộc tính<input value={attrName} onChange={e => setAttrName(e.target.value)} placeholder="VD: Màu sắc, Kích cỡ" /></label>
            <button disabled={busy || !attrName}>Thêm thuộc tính</button>
          </form>
          <label>Attribute ID sửa<input value={attrId} onChange={e => setAttrId(e.target.value)} placeholder="UUID thuộc tính" /></label>
          <button disabled={busy || !attrId} onClick={handleUpdateAttribute}>Cập nhật thuộc tính</button>
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
