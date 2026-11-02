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

interface AdminRole { id: string; name: string; permission_ids: string[]; version: number }
interface AdminPermission { id: string; code: string; resource: string; action: string }

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
        {selectedRole.name === 'ADMIN' && <p role="note">Nếu bỏ `platform.admin`, các màn quản trị sẽ bị từ chối cho thành viên của role ADMIN.</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '.5rem', margin: '1rem 0' }}>
          {permissions.map(permission => <label key={permission.id} style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            <input type="checkbox" checked={selectedPermissionIds.includes(permission.id)}
              onChange={event => setSelectedPermissionIds(current => event.target.checked
                ? [...new Set([...current, permission.id])]
                : current.filter(id => id !== permission.id))} />
            <span>{permission.code}</span>
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

function AdminDashboard() {
  const [params] = useSearchParams();
  const value = params.get('tab') ?? 'dashboard';
  const tab = ['users','stores','roles','catalog','orders','returns','delivery-returns','vouchers','dashboard','ai','audit','reports'].includes(value) ? value : 'dashboard';

  return (
    <section className="admin-workspace">
      <header className="admin-workspace-heading"><div><p className="market-eyebrow">ĐIỀU HÀNH MARKETPLACE</p><h1>Quản trị hệ thống</h1></div><div><Link to="/admin/store-applications">Duyệt gian hàng →</Link><Link to="/">Về cửa hàng</Link></div></header>
      {tab === 'users' ? <AccountDirectory key="users" kind="users" /> : tab === 'stores' ? <AccountDirectory key="stores" kind="stores" /> : tab === 'roles' ? <RolesManagement />
        : tab === 'catalog' ? <AdminCatalogManagement /> : tab === 'orders' ? <AdminOrders /> : tab === 'returns' ? <ReturnsPage scope="ADMIN"/> : tab === 'delivery-returns' ? <DeliveryReturnsPage admin/> : tab === 'vouchers' ? <VoucherPanel scope="PLATFORM"/>
          : tab === 'reports' ? <FinancialReport scope="ADMIN"/> : tab === 'dashboard' ? <AdminDashboardSummary /> : tab === 'audit' ? <AuditLogPage/> : <AdminAiMetrics />}

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
