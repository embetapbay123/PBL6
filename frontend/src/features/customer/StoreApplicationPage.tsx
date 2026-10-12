import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { RouteObject } from 'react-router-dom';
import { ProtectedRoute, ErrorView, Loading, Pagination } from '../../bootstrap/components';
import { mockListOwnStoreApplications, mockSubmitStoreApplication, type PageStoreApplications, type StoreApplication } from '../../api/store-application.mock';

const statusLabels: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
function StatusBadge({ status }: { status: string }) {
  return <span className={`store-app-status store-app-status--${status.toLowerCase()}`}>{statusLabels[status] ?? status}</span>;
}

function SubmitForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const proposed_name = name.trim();
    const normalizedContact = contact.trim();
    if (!proposed_name || !normalizedContact) return;
    setBusy(true); setError(undefined); setNotice('');
    try {
      await mockSubmitStoreApplication({ proposed_name, contact: normalizedContact });
      setNotice('Đã tạo hồ sơ demo trên thiết bị này. Đây chưa phải hồ sơ được gửi lên máy chủ.');
      setName(''); setContact(''); onSuccess();
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  };
  return <section className="boot-card store-app-card">
    <div className="store-app-card-heading"><div><p className="store-app-eyebrow">HỒ SƠ CỬA HÀNG</p><h2>Đăng ký mở cửa hàng</h2></div><span className="store-app-demo">MOCK/DEMO</span></div>
    <p className="store-app-muted">Điền thông tin để tạo hồ sơ xem thử. Dữ liệu demo được lưu trong trình duyệt.</p>
    {notice && <p className="store-app-notice" role="status">{notice}</p>}
    <form onSubmit={submit} className="store-app-form">
      <label>Tên cửa hàng <span aria-hidden="true">*</span><input value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: TechGear Flagship Store" required maxLength={200} minLength={2} disabled={busy} /></label>
      <label>Email hoặc số điện thoại liên hệ <span aria-hidden="true">*</span><input value={contact} onChange={e => setContact(e.target.value)} placeholder="email@example.com hoặc 0901234567" required maxLength={200} minLength={3} disabled={busy} /></label>
      <button className="store-app-button store-app-button--primary" disabled={busy}>{busy ? 'Đang tạo hồ sơ…' : 'Tạo hồ sơ demo'}</button>
    </form>
    {error !== undefined && <ErrorView error={error} />}
  </section>;
}

function ApplicationHistory({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<PageStoreApplications>();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const load = useCallback(async (requestedPage: number) => {
    setLoading(true); setError(undefined);
    try { const result = await mockListOwnStoreApplications(requestedPage, 10); setData(result); }
    catch (cause) { setError(cause); }
    finally { setLoading(false); }
  }, [refreshKey]);
  useEffect(() => { void load(page); }, [load, page]);
  return <section className="boot-card store-app-card">
    <div className="store-app-card-heading"><div><p className="store-app-eyebrow">THEO DÕI TIẾN ĐỘ</p><h2>Hồ sơ của bạn</h2></div></div>
    {error !== undefined && <ErrorView error={error} onRetry={() => void load(page)} retryBusy={loading} />}
    {loading ? <Loading /> : !error && (!data || data.items.length === 0) ? <div className="store-app-empty"><strong>Chưa có hồ sơ đăng ký</strong><p>Hồ sơ bạn tạo sẽ xuất hiện tại đây.</p></div> : !error && data && <>
      <div className="store-app-list">{data.items.map((app: StoreApplication) => <article className="store-app-row" key={app.id}>
        <div className="store-app-row-main"><div><h3>{app.proposed_name}</h3><p>{app.contact}</p></div><StatusBadge status={app.status ?? 'PENDING'} /></div>
        {app.decision_reason && <p className="store-app-reason"><strong>Lý do từ chối:</strong> {app.decision_reason}</p>}
        <small>Mã hồ sơ: <code>{app.id}</code></small>
      </article>)}</div>
      <Pagination page={data.page} size={data.size} total={data.total} onPage={setPage} />
    </>}
  </section>;
}

function CustomerStoreApplicationPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return <section className="store-app-page"><header className="store-app-page-heading"><p className="store-app-eyebrow">DÀNH CHO NHÀ BÁN HÀNG</p><h1>Bắt đầu bán hàng cùng PBL6</h1><p>Tạo hồ sơ cửa hàng và theo dõi trạng thái xét duyệt tại một nơi.</p></header>
    <div className="store-app-demo-banner"><strong>MOCK/DEMO</strong><span>API hồ sơ cửa hàng chưa được triển khai. Thao tác ở trang này chỉ cập nhật dữ liệu demo trong trình duyệt.</span></div>
    <SubmitForm onSuccess={() => setRefreshKey(key => key + 1)} />
    <ApplicationHistory refreshKey={refreshKey} />
  </section>;
}

export const storeApplicationCustomerRoutes: RouteObject[] = [{ path: '/customer/store-applications', element: <ProtectedRoute roles={['CUSTOMER']}><CustomerStoreApplicationPage /></ProtectedRoute> }];
