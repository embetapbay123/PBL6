import {Button as UiButton} from '../../components/ui/Button';
import {Link,useSearchParams} from 'react-router-dom';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { request,ApiError } from '../../api/client';
import { callOperation } from '../../api/operations';
import { ErrorView, Loading, Pagination } from '../../bootstrap/components';
import { ReviewModeration } from './ReviewModeration';
import { ProductModeration } from './ProductModeration';
import { AttributeDefinitions } from './AttributeDefinitions';
import type { OperationOutputs } from '../../api/operations.generated';

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
type ProductType = OperationOutputs['listProductTypes']['items'][number];
export function AdminCatalogManagement() {
  const [params]=useSearchParams(),requested=params.get('section')??'taxonomy',section=['taxonomy','attributes','products','reviews'].includes(requested)?requested:'taxonomy';
  const [categories, setCategories] = useState<Category[]>([]); const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [categoryName, setCategoryName] = useState(''); const [typeName, setTypeName] = useState(''); const [categoryId, setCategoryId] = useState('');
  const [editCategoryId, setEditCategoryId] = useState(''); const [editTypeId, setEditTypeId] = useState('');
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(); const [notice, setNotice] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(undefined); try {
    const [categoryItems,typeItems]=await Promise.all([
      (async()=>{const items:Category[]=[];for(let page=1;;page++){const result=await callOperation('listCategories',{query:{page,size:100}});items.push(...result.items);if(!result.items.length||items.length>=result.total)return items;}})(),
      (async()=>{const items:ProductType[]=[];for(let page=1;;page++){const result=await callOperation('listProductTypes',{query:{page,size:100}});items.push(...result.items);if(!result.items.length||items.length>=result.total)return items;}})(),
    ]);setCategories(categoryItems);setProductTypes(typeItems);
  } catch (cause) { setError(cause); } finally { setLoading(false); } }, []);
  useEffect(() => { if(section==='taxonomy'||section==='attributes')void load(); }, [load,section]);
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
      if(item.version===undefined)throw new ApiError(503,'VERSION_MISSING','Danh mục chưa có phiên bản. Tải lại taxonomy trước khi sửa.');
      await callOperation('updateCategory', {
        path: { id: item.id },
        body: { name: categoryName || item.name, expected_version: item.version },
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
      if(item.version===undefined)throw new ApiError(503,'VERSION_MISSING','Loại sản phẩm chưa có phiên bản. Tải lại taxonomy trước khi sửa.');
      await callOperation('updateProductType', {
        path: { id: item.id },
        body: { name: typeName || item.name, expected_version: item.version,...(categoryId?{category_id:categoryId}:{}) },
      });
      setNotice('Đã cập nhật loại sản phẩm.'); await load();
    } catch (cause) { setError(cause); } finally { setBusy(false); }
  };
  return <section className="boot-card admin-catalog"><h3>Taxonomy và kiểm duyệt</h3>
    <p>Quản lý danh mục, loại sản phẩm và thuộc tính dùng chung cho các gian hàng.</p>
    <nav className="admin-catalog-shortcuts" aria-label="Công cụ danh mục">{[['taxonomy','Danh mục & loại sản phẩm'],['attributes','Thuộc tính'],['products','Kiểm duyệt sản phẩm'],['reviews','Kiểm duyệt đánh giá']].map(([value,label])=><Link key={value} className={'ui-button '+(section===value?'ui-button-primary':'ui-button-secondary')} aria-current={section===value?'page':undefined} to={'/admin?tab=catalog&section='+value}>{label}</Link>)}{(section==='taxonomy'||section==='attributes')&&<UiButton variant="secondary" type="submit" disabled={busy||loading} onClick={()=>void load()}>Tải lại taxonomy</UiButton>}</nav>
    {error !== undefined && <ErrorView error={error} />}{notice && <p role="status">{notice}</p>}
    {(section==='taxonomy'||section==='attributes')&&(loading ? <Loading /> : <>
      {section==='taxonomy'&&<div id="taxonomy" className="admin-taxonomy-grid">
        <div><h4>Danh mục</h4><ul>{categories.map(item => <li key={item.id}>{item.name} · {item.status ?? 'ACTIVE'}</li>)}</ul>
          <form onSubmit={handleCreateCategory}>
            <label>Tên danh mục<input required value={categoryName} onChange={event => setCategoryName(event.target.value)} /></label><button disabled={busy}>Tạo danh mục</button>
          </form>
          <label>Sửa danh mục<select value={editCategoryId} onChange={event => {setEditCategoryId(event.target.value);setCategoryName(categories.find(item=>item.id===event.target.value)?.name ?? '');}}><option value="">Chọn danh mục</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <button disabled={busy || !editCategoryId} onClick={handleUpdateCategory}>Cập nhật danh mục</button>
        </div>
        <div><h4>Loại sản phẩm</h4><ul>{productTypes.map(item => <li key={item.id}>{item.name}</li>)}</ul>
          <form onSubmit={handleCreateProductType}>
            <label>Tên loại<input required value={typeName} onChange={event => setTypeName(event.target.value)} /></label>
            <label>Danh mục<select required value={categoryId} onChange={event => setCategoryId(event.target.value)}><option value="">Chọn danh mục</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <button disabled={busy}>Tạo loại sản phẩm</button>
          </form>
          <label>Sửa loại sản phẩm<select value={editTypeId} onChange={event => {const item=productTypes.find(row=>row.id===event.target.value);setEditTypeId(event.target.value);setTypeName(item?.name ?? '');setCategoryId(item?.category_id ?? '');}}><option value="">Chọn loại sản phẩm</option>{productTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <button disabled={busy || !editTypeId} onClick={handleUpdateProductType}>Cập nhật loại sản phẩm</button>

        </div>
      </div>}
      {section==='attributes'&&<div id="attributes"><AttributeDefinitions types={productTypes} reload={load}/></div>}
    </>)}
    {section==='products'&&<ProductModeration />}
    {section==='reviews'&&<ReviewModeration />}
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
