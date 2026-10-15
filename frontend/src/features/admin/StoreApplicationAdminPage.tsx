import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RouteObject } from 'react-router-dom';
import { Check, Eye, X } from 'lucide-react';
import { ProtectedRoute, ErrorView, Loading, Pagination } from '../../bootstrap/components';
import { listStoreApplications, reviewStoreApplication } from '../../api/store-applications';
import { dataMode } from '../../api/operations';
import type { PageStoreApplications, StoreApplication } from '../../api/store-application.mock';

type Filter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
const labels: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
function StatusBadge({ status }: { status: string }) { return <span className={`store-app-status store-app-status--${status.toLowerCase()}`}>{labels[status] ?? status}</span>; }

function ReviewDialog({ app, decision, busy, onCancel, onConfirm }: { app: StoreApplication; decision: 'APPROVED' | 'REJECTED'; busy: boolean; onCancel: () => void; onConfirm: (reason?: string) => void }) {
  const [reason, setReason] = useState('');
  const approve = decision === 'APPROVED';
  return <div className="store-app-dialog-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
    <section className="store-app-dialog" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <button className="store-app-dialog-close" type="button" aria-label="Đóng" onClick={onCancel} disabled={busy}><X size={18} /></button>
      <p className="store-app-eyebrow">REVIEW · {dataMode === 'fixture' ? 'FIXTURE' : 'API'}</p><h2 id="review-title">{approve ? 'Approve application?' : 'Reject application?'}</h2>
      <p>{approve ? 'Approve' : 'Reject'} the application for <strong>{app.proposed_name}</strong>. {dataMode === 'fixture' ? 'Browser fixture only; no real Store or owner membership is created.' : 'The decision is sent to the server API.'}</p>
      {!approve && <label>Lý do từ chối <span aria-hidden="true">*</span><textarea value={reason} onChange={e => setReason(e.target.value)} required maxLength={200} rows={4} placeholder="Nêu rõ thông tin cần bổ sung…" /></label>}
      <div className="store-app-dialog-actions"><button type="button" className="store-app-button store-app-button--secondary" onClick={onCancel} disabled={busy}>Quay lại</button><button type="button" className={`store-app-button ${approve ? 'store-app-button--primary' : 'store-app-button--danger'}`} disabled={busy || (!approve && !reason.trim())} onClick={() => onConfirm(reason.trim() || undefined)}>{busy ? 'Đang cập nhật…' : approve ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}</button></div>
    </section>
  </div>;
}

function AdminStoreApplicationPage() {
  const [data, setData] = useState<PageStoreApplications>();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<StoreApplication>();
  const [review, setReview] = useState<{ app: StoreApplication; decision: 'APPROVED' | 'REJECTED' }>();
  const load = useCallback(async (requestedPage: number) => {
    setLoading(true); setError(undefined);
    try { setData(await listStoreApplications(requestedPage, 10)); }
    catch (cause) { setError(cause); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(page); }, [load, page]);
  const counts = useMemo(() => ({ ALL: data?.total ?? 0, PENDING: data?.items.filter(item => item.status === 'PENDING').length ?? 0, APPROVED: data?.items.filter(item => item.status === 'APPROVED').length ?? 0, REJECTED: data?.items.filter(item => item.status === 'REJECTED').length ?? 0 }), [data]);
  const visibleItems = data?.items.filter(app => filter === 'ALL' || app.status === filter) ?? [];
  const submitReview = async (reason?: string) => {
    if (!review) return;
    setBusy(true); setError(undefined);
    try {
      if (!review.app.id) throw new Error('Application ID is missing.');
      await reviewStoreApplication(review.app.id, { status: review.decision, expected_version: review.app.version ?? 0, ...(review.decision === 'REJECTED' && reason ? { decision_reason: reason } : {}) });
      setNotice(dataMode === 'fixture' ? `Updated fixture ${review.app.proposed_name}. No real Store or membership was created.` : `Updated ${review.app.proposed_name} on the server.`);
      setReview(undefined); setSelected(undefined); await load(page);
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  };
  return <section className="store-app-page store-app-admin-page">
    <header className="store-app-page-heading"><p className="store-app-eyebrow">QUẢN TRỊ · NHÀ BÁN HÀNG</p><h1>Hồ sơ đăng ký cửa hàng</h1><p>Xem thông tin và xử lý hồ sơ đang chờ xét duyệt.</p></header>
    <div className="store-app-demo-banner"><strong>{dataMode === 'fixture' ? 'FIXTURE' : 'API'}</strong><span>{dataMode === 'fixture' ? 'Browser fixture data only; mock approvals do not create persisted Stores or memberships.' : 'Data and decisions use the server API. API errors are shown without fixture fallback.'}</span></div>
    {notice && <p className="store-app-notice" role="status">{notice}</p>}
    {error !== undefined && <ErrorView error={error} onRetry={() => void load(page)} retryBusy={loading || busy} />}
    <div className="store-app-filter-list" role="group" aria-label="Lọc hồ sơ theo trạng thái">{(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as Filter[]).map(value => <button key={value} type="button" className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{value === 'ALL' ? 'Tất cả' : labels[value]}<span>{counts[value]}</span></button>)}</div>
    <section className="boot-card store-app-card">
      <div className="store-app-card-heading"><div><p className="store-app-eyebrow">DANH SÁCH HỒ SƠ</p><h2>{filter === 'ALL' ? 'Tất cả hồ sơ' : labels[filter]}</h2></div><button className="store-app-button store-app-button--secondary" type="button" onClick={() => void load(page)} disabled={loading}>Làm mới</button></div>
      {loading ? <Loading /> : !error && visibleItems.length === 0 ? <div className="store-app-empty"><strong>Không có hồ sơ phù hợp</strong><p>Hồ sơ ở trạng thái này sẽ xuất hiện tại đây.</p></div> : !error && <>
        <div className="store-app-table-wrap"><table className="store-app-table"><thead><tr><th>Cửa hàng</th><th>Liên hệ</th><th>Trạng thái</th><th>Lý do từ chối</th><th>Chi tiết / thao tác</th></tr></thead><tbody>{visibleItems.map(app => <tr key={app.id}>
          <td data-label="Cửa hàng"><strong>{app.proposed_name}</strong><small className="store-app-id">{app.id}</small></td><td data-label="Liên hệ">{app.contact}</td><td data-label="Trạng thái"><StatusBadge status={app.status ?? 'PENDING'} /></td><td data-label="Lý do">{app.decision_reason || '—'}</td><td data-label="Thao tác"><div className="store-app-row-actions"><button type="button" className="store-app-icon-button" onClick={() => setSelected(app)} aria-label={`Xem hồ sơ ${app.proposed_name}`}><Eye size={17} /> Chi tiết</button>{app.status === 'PENDING' && <><button type="button" className="store-app-icon-button store-app-icon-button--approve" onClick={() => setReview({ app, decision: 'APPROVED' })} disabled={busy}><Check size={16} /> Duyệt</button><button type="button" className="store-app-icon-button store-app-icon-button--reject" onClick={() => setReview({ app, decision: 'REJECTED' })} disabled={busy}><X size={16} /> Từ chối</button></>}</div></td>
        </tr>)}</tbody></table></div><Pagination page={data!.page} size={data!.size} total={data!.total} onPage={setPage} />
      </>}
    </section>
    {selected && <div className="store-app-dialog-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(undefined); }}><section className="store-app-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title"><button className="store-app-dialog-close" type="button" aria-label="Đóng" onClick={() => setSelected(undefined)}><X size={18} /></button><p className="store-app-eyebrow">CHI TIẾT HỒ SƠ · {dataMode === 'fixture' ? 'FIXTURE' : 'API'}</p><h2 id="detail-title">{selected.proposed_name}</h2><dl className="store-app-detail-list"><div><dt>Liên hệ</dt><dd>{selected.contact}</dd></div><div><dt>Trạng thái</dt><dd><StatusBadge status={selected.status ?? 'PENDING'} /></dd></div><div><dt>Lý do từ chối</dt><dd>{selected.decision_reason || '—'}</dd></div><div><dt>Mã hồ sơ</dt><dd><code>{selected.id}</code></dd></div><div><dt>Phiên bản</dt><dd>{selected.version ?? 0}</dd></div></dl><div className="store-app-dialog-actions"><button type="button" className="store-app-button store-app-button--secondary" onClick={() => setSelected(undefined)}>Đóng</button>{selected.status === 'PENDING' && <><button type="button" className="store-app-button store-app-button--primary" onClick={() => { setReview({ app: selected, decision: 'APPROVED' }); setSelected(undefined); }}>Duyệt hồ sơ</button><button type="button" className="store-app-button store-app-button--danger" onClick={() => { setReview({ app: selected, decision: 'REJECTED' }); setSelected(undefined); }}>Từ chối</button></>}</div></section></div>}
    {review && <ReviewDialog app={review.app} decision={review.decision} busy={busy} onCancel={() => setReview(undefined)} onConfirm={reason => void submitReview(reason)} />}
  </section>;
}

export const storeApplicationAdminRoutes: RouteObject[] = [{ path: '/admin/store-applications', element: <ProtectedRoute roles={['ADMIN']}><AdminStoreApplicationPage /></ProtectedRoute> }];
