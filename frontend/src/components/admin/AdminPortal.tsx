import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  Store,
  Users,
  EyeOff,
  Eye,
  Ticket,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  MessageSquare,
  Sparkles,
  Layers
} from 'lucide-react';
import { callOperation } from '../../api/operations';

type AdminUser = { id: string; email: string; status: string; version: number };
type AdminStore = { id: string; owner_user_id?: string; name: string; status: string; shipping_fee_vnd?: number; version: number };

export const AdminPortal: React.FC = () => {
  const {
    storeApplications,
    reviewStoreApplication,
    products,
    toggleAdminHideProduct,
    reviews,
    toggleAdminHideReview,
    vouchers,
    auditLogs
  } = useApp();

  const [activeTab, setActiveTab] = useState<'applications' | 'users-stores' | 'moderation' | 'vouchers-ai'>('applications');
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminStores, setAdminStores] = useState<AdminStore[]>([]);
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const loadDirectory = useCallback(async () => {
    setAdminLoading(true);
    setAdminError('');
    try {
      const [userPage, storePage] = await Promise.all([
        callOperation('listUsers', { query: { page: 1, size: 100 } }),
        callOperation('listStores', { query: { page: 1, size: 100 } }),
      ]);
      setAdminUsers(userPage.items as AdminUser[]);
      setAdminStores(storePage.items as AdminStore[]);
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Không tải được dữ liệu quản trị.');
    } finally {
      setAdminLoading(false);
    }
  }, []);

  useEffect(() => { if (activeTab === 'users-stores') void loadDirectory(); }, [activeTab, loadDirectory]);

  const updateUser = async (user: AdminUser, reason: string) => {
    try {
      const updated = await callOperation('updateUserState', { path: { id: user.id }, body: {
        status: user.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED', reason, expected_version: user.version,
      } });
      setAdminUsers(current => current.map(item => item.id === user.id ? { ...item, ...updated } : item));
    } catch (error) { setAdminError(error instanceof Error ? error.message : 'Không cập nhật được tài khoản.'); }
  };

  const updateStore = async (store: AdminStore, reason: string) => {
    try {
      const updated = await callOperation('updateStoreState', { path: { id: store.id }, body: {
        status: store.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE', reason, expected_version: store.version,
      } });
      setAdminStores(current => current.map(item => item.id === store.id ? { ...item, ...updated } : item));
    } catch (error) { setAdminError(error instanceof Error ? error.message : 'Không cập nhật được cửa hàng.'); }
  };

  const pendingApps = storeApplications.filter(a => a.status === 'PENDING');

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleReviewApp = (appId: string, status: 'APPROVED' | 'REJECTED') => {
    let reason = '';
    if (status === 'REJECTED') {
      reason = prompt('Vui lòng nhập lý do từ chối đơn mở gian hàng:') || '';
      if (!reason.trim()) return;
    }
    reviewStoreApplication(appId, status, reason);
    alert(status === 'APPROVED' ? 'Đã duyệt mở Gian hàng thành công!' : 'Đã từ chối đơn kèm lý do!');
  };

  const handleToggleProduct = (prodId: string, isCurrentlyHidden: boolean) => {
    let reason = 'Kiểm duyệt định kỳ';
    if (!isCurrentlyHidden) {
      reason = prompt('Nhập lý do ẩn sản phẩm vi phạm khỏi sàn:') || 'Vi phạm tiêu chuẩn sàn';
    }
    toggleAdminHideProduct(prodId, reason);
  };

  const handleToggleReview = (revId: string, isCurrentlyHidden: boolean) => {
    let reason = 'Kiểm duyệt nội dung';
    if (!isCurrentlyHidden) {
      reason = prompt('Nhập lý do ẩn đánh giá này:') || 'Nội dung spam hoặc không phù hợp';
    }
    toggleAdminHideReview(revId, reason);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl p-6 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Cổng Quản Trị Hệ Thống (Administrator Portal)</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500/30 text-purple-200 border border-purple-400/40">
                PBL6 MASTER CONTROL
              </span>
            </div>
            <p className="text-xs text-purple-200 mt-1">
              Phê duyệt đơn mở Store, kiểm soát User/Store, kiểm duyệt sản phẩm & đánh giá, giám sát AI & Audit Logs
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('applications')}
          className={`flex items-center gap-2 pb-3 px-3 border-b-2 transition whitespace-nowrap ${
            activeTab === 'applications'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>A01. Duyệt Đơn mở Store ({pendingApps.length} chờ)</span>
        </button>

        <button
          onClick={() => setActiveTab('users-stores')}
          className={`flex items-center gap-2 pb-3 px-3 border-b-2 transition whitespace-nowrap ${
            activeTab === 'users-stores'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>A01. Quản lý Users & Stores</span>
        </button>

        <button
          onClick={() => setActiveTab('moderation')}
          className={`flex items-center gap-2 pb-3 px-3 border-b-2 transition whitespace-nowrap ${
            activeTab === 'moderation'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <EyeOff className="w-4 h-4" />
          <span>A02. Kiểm duyệt Sản phẩm & Review</span>
        </button>

        <button
          onClick={() => setActiveTab('vouchers-ai')}
          className={`flex items-center gap-2 pb-3 px-3 border-b-2 transition whitespace-nowrap ${
            activeTab === 'vouchers-ai'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>A03. Voucher Toàn Sàn & Giám Sát AI</span>
        </button>
      </div>

      {/* TAB 1: Store Applications */}
      {activeTab === 'applications' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Danh sách Đơn đăng ký mở Gian hàng mới</h3>
            <p className="text-xs text-slate-500">
              Admin xem xét mã số kinh doanh, thông tin gian hàng và phê duyệt hoặc từ chối kèm lý do
            </p>
          </div>

          <div className="space-y-3">
            {storeApplications.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Chưa có đơn đăng ký nào.</p>
            ) : (
              storeApplications.map(app => (
                <div
                  key={app.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{app.storeName}</h4>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          app.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : app.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                    <p className="text-slate-600">{app.description}</p>
                    <p className="text-slate-500 text-[11px]">
                      Mã KD: <strong className="font-mono text-slate-700">{app.businessCode}</strong> • Nộp lúc: {new Date(app.createdAt).toLocaleString('vi-VN')}
                    </p>
                    {app.rejectionReason && (
                      <p className="text-rose-600 font-semibold text-[11px]">
                        Lý do từ chối: {app.rejectionReason}
                      </p>
                    )}
                  </div>

                  {app.status === 'PENDING' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleReviewApp(app.id, 'APPROVED')}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-xs transition"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Phê duyệt</span>
                      </button>
                      <button
                        onClick={() => handleReviewApp(app.id, 'REJECTED')}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold flex items-center gap-1 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Từ chối</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Users & Stores */}
      {activeTab === 'users-stores' && (
        <div className="space-y-6">
          {/* Users table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900">Danh sách Tài khoản Người dùng (Users)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-y border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">User ID</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Tài khoản</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3 text-right">Khóa / Mở</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminUsers.map(u => (
                    <tr key={u.id}>
                      <td className="p-3 font-bold text-slate-900">{u.id}</td>
                      <td className="p-3 font-mono text-slate-600">{u.email}</td>
                      <td className="p-3 font-semibold text-slate-700">{u.status}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            u.status === 'LOCKED' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {u.status !== 'PENDING' && (
                          <button
                            onClick={() => {
                              const reason = prompt(
                                u.status === 'LOCKED' ? 'Lý do mở khóa:' : 'Lý do khóa tài khoản:'
                              );
                              if (reason) void updateUser(u, reason);
                            }}
                            className={`px-3 py-1 rounded text-[11px] font-bold transition ${
                              u.status === 'LOCKED'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                            }`}
                          >
                            {u.status === 'LOCKED' ? 'Mở khóa' : 'Khóa User'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {adminError && <p role="alert" className="text-sm text-rose-700">{adminError}</p>}
            {adminLoading && <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>}
          </div>

          {/* Stores table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900">Danh sách Gian hàng trên Toàn Sàn (Stores)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-y border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Gian hàng</th>
                    <th className="p-3">Phí ship</th>
                    <th className="p-3">Chủ cửa hàng</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3 text-right">Quản lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminStores.map(s => (
                    <tr key={s.id}>
                      <td className="p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100" aria-hidden="true" />
                        <div>
                          <p className="font-bold text-slate-900">{s.name}</p>
                          <p className="text-[10px] text-slate-400">ID: {s.id}</p>
                        </div>
                      </td>
                      <td className="p-3 text-slate-700">{formatVnd(s.shipping_fee_vnd ?? 0)}</td>
                      <td className="p-3 font-mono text-slate-600">{s.owner_user_id ?? '—'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            s.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            const reason = prompt('Nhập lý do thay đổi trạng thái Store:') || 'Admin audit';
                            void updateStore(s, reason);
                          }}
                          className="px-3 py-1 rounded border border-slate-200 hover:bg-slate-100 font-semibold text-[11px]"
                        >
                          {s.status === 'ACTIVE' ? 'Khóa Store' : 'Kích hoạt Store'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Moderation */}
      {activeTab === 'moderation' && (
        <div className="space-y-6">
          {/* Product moderation */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900">Kiểm duyệt Sản phẩm (Product Moderation)</h3>
            <p className="text-xs text-slate-500">
              Admin có quyền ẩn các sản phẩm vi phạm mà không làm thay đổi saleStatus của Store (Audit lưu lý do)
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-y border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Sản phẩm</th>
                    <th className="p-3">Gian hàng</th>
                    <th className="p-3">Trạng thái ẩn</th>
                    <th className="p-3">Lý do ẩn (Audit)</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map(p => (
                    <tr key={p.id}>
                      <td className="p-3 flex items-center gap-3">
                        <img src={p.images[0]} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                        <span className="font-bold text-slate-900">{p.name}</span>
                      </td>
                      <td className="p-3 text-slate-700">{p.storeName}</td>
                      <td className="p-3">
                        {p.isAdminHidden ? (
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-rose-100 text-rose-800">
                            ĐANG BỊ ẨN
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                            HIỂN THỊ CÔNG KHAI
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 italic">
                        {p.adminHiddenReason || '—'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleToggleProduct(p.id, p.isAdminHidden)}
                          className={`px-3 py-1 rounded text-[11px] font-bold transition ${
                            p.isAdminHidden
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          }`}
                        >
                          {p.isAdminHidden ? 'Gỡ ẩn sản phẩm' : 'Ẩn sản phẩm'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Review moderation */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900">Kiểm duyệt Đánh giá Khách hàng (Review Moderation)</h3>
            <div className="space-y-3">
              {reviews.map(r => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{r.userName}</span>
                      <span className="text-amber-500 font-bold">{r.rating} ★</span>
                      {r.isAdminHidden && (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                          ĐÃ BỊ ẨN: {r.adminHiddenReason}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700">"{r.comment}"</p>
                    <p className="text-slate-400 text-[10px]">{new Date(r.createdAt).toLocaleString('vi-VN')}</p>
                  </div>

                  <button
                    onClick={() => handleToggleReview(r.id, r.isAdminHidden)}
                    className="px-3 py-1 border border-slate-200 hover:bg-slate-100 rounded text-xs font-semibold"
                  >
                    {r.isAdminHidden ? 'Hiển thị lại' : 'Ẩn đánh giá này'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Vouchers & AI Monitor */}
      {activeTab === 'vouchers-ai' && (
        <div className="space-y-6">
          {/* Platform Vouchers */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900">Voucher Toàn Sàn (Platform Vouchers)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vouchers
                .filter(v => v.scope === 'PLATFORM')
                .map(v => (
                  <div key={v.id} className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-purple-900 bg-white px-2 py-0.5 rounded border border-purple-300">
                        {v.code}
                      </span>
                      <span className="font-bold text-purple-800">{v.title}</span>
                    </div>
                    <p className="text-slate-600">
                      Giảm {formatVnd(v.discountValue)} cho đơn từ {formatVnd(v.minSpendVnd)}
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      Đã sử dụng: {v.usedCount} / {v.usageLimit} lượt • Trạng thái: {v.isActive ? 'Active' : 'Expired'}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          {/* AI Monitor & System Audit Log */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Giám sát AI & Nhật ký Kiểm toán (Audit Logs)</h3>
                <p className="text-xs text-slate-500">
                  Theo dõi các hành vi can thiệp hệ thống và chỉ số RAG grounding
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI RAG Status: ONLINE (Grounded)</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-y border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-2.5">Thời gian</th>
                    <th className="p-2.5">Hành động</th>
                    <th className="p-2.5">Người thực hiện</th>
                    <th className="p-2.5">Mục tiêu</th>
                    <th className="p-2.5">Lý do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td className="p-2.5 font-mono text-slate-400 text-[11px]">
                        {new Date(log.timestamp).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-2.5 font-bold text-purple-800">{log.action}</td>
                      <td className="p-2.5 text-slate-700">
                        {log.actorEmail} ({log.actorRole})
                      </td>
                      <td className="p-2.5 font-mono text-slate-600">{log.targetType}:{log.targetId}</td>
                      <td className="p-2.5 text-slate-600">{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
