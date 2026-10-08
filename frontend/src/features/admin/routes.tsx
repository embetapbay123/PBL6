import { useState, useEffect, useCallback } from 'react';
import type { RouteObject } from 'react-router-dom';
import { ProtectedRoute, ErrorView, Loading, Pagination } from '../../bootstrap/components';
import { request, ApiError } from '../../api/client';

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
      {error && <ErrorView error={error} />}
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
      {error && <ErrorView error={error} />}
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
  const [tab, setTab] = useState<'users' | 'stores'>('users');

  return (
    <section style={{ maxWidth: '960px', margin: '0 auto', padding: '1rem' }}>
      <h2>Bảng Quản trị Hệ thống (Admin Portal)</h2>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
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
      </div>

      {tab === 'users' ? <UsersManagement /> : <StoresManagement />}

      <footer style={{ marginTop: '2rem', fontSize: '0.85rem', color: '#666' }}>
        <p>• Store Application (#40) và Staff Management (#42, #43) giữ theo issue riêng.</p>
        <p>• Số liệu User/Store thống kê được lấy trực tiếp từ nguồn quản trị M3.</p>
      </footer>
    </section>
  );
}

export const adminRoutes: RouteObject[] = [
  {
    path: '/admin/*',
    element: (
      <ProtectedRoute roles={['ADMIN']}>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
];
