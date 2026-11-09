import { lazy, useState, useEffect, useCallback } from 'react';
import type { RouteObject } from 'react-router-dom';
import { useSearchParams, Link } from 'react-router-dom';
import { ProtectedRoute, ErrorView, Loading, Pagination } from '../../bootstrap/components';
import { request, ApiError } from '../../api/client';
import { callOperation } from '../../api/operations';
import {storeApplicationAdminRoutes} from './StoreApplicationAdminPage';
import { AdminAiMetrics, AdminDashboardSummary, AdminOrders } from './AdminLiveData';
import {AccountDirectory} from './AccountDirectory';
import { AdminCatalogManagement } from './AdminOperations';
const VoucherPanel=lazy(()=>import('../../live/VoucherPanel').then(module=>({default:module.VoucherPanel})));
const DeliveryReturnsPage=lazy(()=>import('../returns/DeliveryReturnsPage').then(module=>({default:module.DeliveryReturnsPage})));
const ReturnsPage=lazy(()=>import('../returns/ReturnsPage').then(module=>({default:module.ReturnsPage})));
const FinancialReport=lazy(()=>import('../reports/FinancialReport').then(module=>({default:module.FinancialReport})));
const AuditLogPage=lazy(()=>import('./AuditLogPage').then(module=>({default:module.AuditLogPage})));
const ShippingAdmin=lazy(()=>import('../shipping/ShippingAdmin').then(module=>({default:module.ShippingAdmin})));

interface AdminRole { id: string; name: string; permission_ids: string[]; version: number }
interface AdminPermission { id: string; code: string; resource: string; action: string }

const permissionLabels: Record<string, string> = {
  'platform.admin': 'Toàn quyền quản trị hệ thống',
  'product.store.read_write': 'Quản lý sản phẩm gian hàng',
  'inventory.store.read_adjust': 'Xem và điều chỉnh kho hàng',
  'order.store.read_status_cancel': 'Xử lý và hủy đơn hàng',
  'cod.store.collect': 'Ghi nhận thu tiền COD',
  'store.application.manage': 'Duyệt hồ sơ đăng ký gian hàng',
  'audit.log.read': 'Xem nhật ký kiểm toán hệ thống',
};

function RolesManagement() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState('');
  const selectedRole = roles.find(role => role.id === selectedId);

  const load = useCallback(async () => {
    setLoading(true); setError(undefined); setNotice('');
    try {
      const result = await callOperation('listRoles', {});
      setRoles(result.roles as unknown as AdminRole[]); setPermissions(result.permissions as unknown as AdminPermission[]);
      setSelectedId(current => result.roles.some(role => role.id === current) ? current : result.roles[0]?.id ?? '');
      const currentId = selectedId || result.roles[0]?.id;
      setSelectedPermissionIds(result.roles.find(role => role.id === currentId)?.permission_ids ?? []);
    } catch (e) { setError(e); }
    finally { setLoading(false); }
  }, [selectedId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setSelectedPermissionIds(selectedRole?.permission_ids ?? []); }, [selectedId, roles]);

  const save = async () => {
    if (!selectedRole) return;
    const losingAdmin = selectedRole.name === 'ADMIN' && !selectedPermissionIds.some(id => permissions.find(p => p.id === id)?.code === 'platform.admin');
    if (losingAdmin && typeof window !== 'undefined' && !window.confirm('CẢNH BÁO: Bạn đang bỏ quyền quản trị toàn hệ thống (platform.admin) của vai trò ADMIN. Thành viên vai trò này sẽ mất quyền truy cập các chức năng quản trị. Bạn có chắc chắn muốn lưu?')) {
      return;
    }
    setBusy(true); setError(undefined); setNotice('');
    try {
      await callOperation('updateRole', {
        path: { id: selectedRole.id },
        body: {
          permission_ids: selectedPermissionIds,
          expected_version: selectedRole.version,
        },
      });
      setNotice('Đã cập nhật quyền. Thay đổi có hiệu lực ở request tiếp theo.');
      await load();
    } catch (e) { setError(e); }
    finally { setBusy(false); }
  };

  return <section className="boot-card">
    <h3>Vai trò và quyền hệ thống</h3>
    {error !== undefined && <ErrorView error={error} />}
    {notice && <p role="status">{notice}</p>}
    {loading ? <Loading /> : <>
      <label>Vai trò <select value={selectedId} onChange={event => setSelectedId(event.target.value)}>
        {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
      </select></label>
      {selectedRole && <>
        <p>Phiên bản {selectedRole.version}. Quyền áp dụng trên mọi dịch vụ từ request tiếp theo.</p>
        {selectedRole.name === 'ADMIN' && !selectedPermissionIds.some(id => permissions.find(p => p.id === id)?.code === 'platform.admin') ? (
          <div role="alert" style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', margin: '12px 0', fontSize: '13px' }}>
            ⚠️ <strong>Cảnh báo mất quyền quản trị:</strong> Bạn đang bỏ quyền <code>platform.admin</code> của vai trò ADMIN. Thành viên thuộc vai trò này sẽ không còn quyền truy cập các chức năng quản trị!
          </div>
        ) : selectedRole.name === 'ADMIN' && (
          <p role="note" style={{ color: '#475569', fontSize: '13px', margin: '8px 0' }}>Quyền <code>platform.admin</code> cho phép truy cập toàn bộ các khu vực quản trị.</p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '.6rem', margin: '1rem 0' }}>
          {permissions.map(permission => <label key={permission.id} style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-start', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <input type="checkbox" style={{ marginTop: '3px' }} checked={selectedPermissionIds.includes(permission.id)}
              onChange={event => setSelectedPermissionIds(current => event.target.checked
                ? [...new Set([...current, permission.id])]
                : current.filter(id => id !== permission.id))} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{permissionLabels[permission.code] ?? permission.code}</strong>
              <code style={{ fontSize: '11px', color: '#64748b' }}>{permission.code}</code>
            </div>
          </label>)}
        </div>
        <button disabled={busy || selectedRole.name === 'CUSTOMER'} onClick={save}>
          {busy ? 'Đang lưu…' : 'Lưu quyền'}
        </button>
        {selectedRole.name === 'CUSTOMER' && <p>Không chỉnh trực tiếp quyền CUSTOMER trên màn quản trị.</p>}
      </>}
    </>}
  </section>;
}

const adminTabHeadingTitles: Record<string, string> = {
  dashboard: 'Tổng quan hệ thống',
  users: 'Quản lý tài khoản',
  stores: 'Quản lý gian hàng',
  roles: 'Phân quyền tài khoản',
  catalog: 'Danh mục & kiểm duyệt',
  orders: 'Đơn hàng toàn sàn',
  shipping: 'Giao nhận hàng',
  returns: 'Yêu cầu đổi trả sàn',
  'delivery-returns': 'Hồ sơ giao thất bại',
  vouchers: 'Ưu đãi & voucher sàn',
  reports: 'Báo cáo thu / hoàn',
  ai: 'Vận hành AI',
  audit: 'Nhật ký quản trị',
};

function AdminDashboard() {
  const [params] = useSearchParams();
  const value = params.get('tab') ?? 'dashboard';
  const tab = ['users','stores','roles','catalog','orders','shipping','returns','delivery-returns','vouchers','dashboard','ai','audit','reports'].includes(value) ? value : 'dashboard';

  return (
    <section className="admin-workspace">
      <header className="admin-workspace-heading"><div><p className="market-eyebrow">ĐIỀU HÀNH MARKETPLACE</p><h1>{adminTabHeadingTitles[tab] ?? 'Quản trị hệ thống'}</h1></div><div><Link to="/admin/store-applications">Duyệt gian hàng →</Link><Link to="/">Về cửa hàng</Link></div></header>
      {tab === 'users' ? <AccountDirectory key="users" kind="users" /> : tab === 'stores' ? <AccountDirectory key="stores" kind="stores" /> : tab === 'roles' ? <RolesManagement />
        : tab === 'catalog' ? <AdminCatalogManagement /> : tab === 'orders' ? <AdminOrders /> : tab === 'returns' ? <ReturnsPage scope="ADMIN"/> : tab === 'delivery-returns' ? <DeliveryReturnsPage admin/> : tab === 'vouchers' ? <VoucherPanel scope="PLATFORM"/>
          : tab === 'shipping' ? <ShippingAdmin/> : tab === 'reports' ? <FinancialReport scope="ADMIN"/> : tab === 'dashboard' ? <AdminDashboardSummary /> : tab === 'audit' ? <AuditLogPage/> : <AdminAiMetrics />}

    </section>
  );
}

export const adminRoutes: RouteObject[] = [
  ...storeApplicationAdminRoutes,
  {
    path: '/admin/*',
    element: (
      <ProtectedRoute roles={['ADMIN']}>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
];
