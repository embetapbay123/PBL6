import { useState, useEffect, useCallback } from 'react';
import type { RouteObject } from 'react-router-dom';
import {useSearchParams} from 'react-router-dom';
import { ProtectedRoute, ErrorView, Loading, Pagination } from '../../bootstrap/components';
import { request, ApiError } from '../../api/client';
import {storeApplicationAdminRoutes} from './StoreApplicationAdminPage';
import { AdminAiMetrics, AdminDashboardSummary, AdminOrders } from './AdminLiveData';
import { AdminCatalogManagement } from './AdminOperations';
import {VoucherPanel} from '../../live/VoucherPanel';

interface AdminUser {
  id: string;
  email: string;
  status: string;
  version: number;
}

interface AdminStore {
  id: string;
  owner_user_id: string;
  name: string;
  status: string;
  shipping_fee_vnd: number;
  version: number;
}

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
      const result = await request<{ roles: AdminRole[]; permissions: AdminPermission[] }>('/admin/roles');
      setRoles(result.roles); setPermissions(result.permissions);
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
      await request(`/admin/roles/${selectedRole.id}`, { method: 'PATCH', body: JSON.stringify({
        permission_ids: selectedPermissionIds, expected_version: selectedRole.version,
      }) });
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

function UsersManagement() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await request<{ items: AdminUser[]; total: number; page: number; size: number }>(`/admin/users?page=${p}&size=10`);
      setItems(res.items);
      setTotal(res.total);
      setPage(res.page);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page); }, [load, page]);

  const toggleState = async (user: AdminUser) => {
    const nextStatus = user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    const reason = prompt(`Lý do chuyển trạng thái người dùng thành ${nextStatus}:`, 'Cập nhật từ Admin Web');
    if (!reason) return;
    setBusy(true);
    try {
      await request(`/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          reason,
          expected_version: user.version,
        }),
      });
      await load(page);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Thao tác thất bại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="boot-card">
      <h3>Quản lý Người dùng (Users)</h3>
      {error !== undefined && <ErrorView error={error} />}
      {loading ? <Loading /> : (
        <>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ccc' }}>
                <th>Email</th>
                <th>Trạng thái</th>
                <th>Phiên bản</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td>{u.email}</td>
                  <td><span style={{ color: u.status === 'ACTIVE' ? 'green' : 'crimson' }}>{u.status}</span></td>
                  <td>{u.version}</td>
                  <td>
                    <button disabled={busy} onClick={() => toggleState(u)}>
                      {u.status === 'ACTIVE' ? 'Khóa (Lock)' : 'Mở khóa (Activate)'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} size={10} total={total} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function StoresManagement() {
  const [items, setItems] = useState<AdminStore[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await request<{ items: AdminStore[]; total: number; page: number; size: number }>(`/admin/stores?page=${p}&size=10`);
      setItems(res.items);
      setTotal(res.total);
      setPage(res.page);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page); }, [load, page]);

  const toggleState = async (store: AdminStore) => {
    const nextStatus = store.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    const reason = prompt(`Lý do chuyển trạng thái cửa hàng thành ${nextStatus}:`, 'Cập nhật từ Admin Web');
    if (!reason) return;
    setBusy(true);
    try {
      await request(`/admin/stores/${store.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          reason,
          expected_version: store.version,
        }),
      });
      await load(page);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Thao tác thất bại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="boot-card">
      <h3>Quản lý Cửa hàng (Stores)</h3>
      {error !== undefined && <ErrorView error={error} />}
      {loading ? <Loading /> : (
        <>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ccc' }}>
                <th>Tên cửa hàng</th>
                <th>Phí giao hàng</th>
                <th>Trạng thái</th>
                <th>Phiên bản</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td>{s.name}</td>
                  <td>{s.shipping_fee_vnd.toLocaleString('vi-VN')} đ</td>
                  <td><span style={{ color: s.status === 'ACTIVE' ? 'green' : 'crimson' }}>{s.status}</span></td>
                  <td>{s.version}</td>
                  <td>
                    <button disabled={busy} onClick={() => toggleState(s)}>
                      {s.status === 'ACTIVE' ? 'Khóa (Lock)' : 'Mở khóa (Activate)'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} size={10} total={total} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function AdminDashboard() {
  const [params, setParams] = useSearchParams();
  const value = params.get('tab') ?? 'dashboard';
  const tab = ['users','stores','roles','catalog','orders','vouchers','dashboard','ai'].includes(value) ? value : 'dashboard';
  const setTab = (next: string) => setParams({tab: next});

  return (
    <section style={{ maxWidth: '960px', margin: '0 auto', padding: '1rem' }}>
      <h2>Bảng Quản trị Hệ thống (Admin Portal)</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          style={{ fontWeight: tab === 'users' ? 'bold' : 'normal' }}
          onClick={() => setTab('users')}
        >
          Người dùng (Users)
        </button>
        <button
          style={{ fontWeight: tab === 'stores' ? 'bold' : 'normal' }}
          onClick={() => setTab('stores')}
        >
          Cửa hàng (Stores)
        </button>
        <button style={{ fontWeight: tab === 'roles' ? 'bold' : 'normal' }} onClick={() => setTab('roles')}>
          Vai trò và quyền
        </button>
        <button style={{ fontWeight: tab === 'catalog' ? 'bold' : 'normal' }} onClick={() => setTab('catalog')}>Taxonomy & moderation</button>
        <button style={{ fontWeight: tab === 'orders' ? 'bold' : 'normal' }} onClick={() => setTab('orders')}>Đơn hàng</button>
        <button style={{ fontWeight: tab === 'vouchers' ? 'bold' : 'normal' }} onClick={() => setTab('vouchers')}>Voucher sàn</button>
        <button style={{ fontWeight: tab === 'dashboard' ? 'bold' : 'normal' }} onClick={() => setTab('dashboard')}>Dashboard</button>
        <button style={{ fontWeight: tab === 'ai' ? 'bold' : 'normal' }} onClick={() => setTab('ai')}>AI metrics</button>
      </div>

      {tab === 'users' ? <UsersManagement /> : tab === 'stores' ? <StoresManagement /> : tab === 'roles' ? <RolesManagement />
        : tab === 'catalog' ? <AdminCatalogManagement /> : tab === 'orders' ? <AdminOrders /> : tab === 'vouchers' ? <VoucherPanel scope="PLATFORM"/>
          : tab === 'dashboard' ? <AdminDashboardSummary /> : <AdminAiMetrics />}

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
