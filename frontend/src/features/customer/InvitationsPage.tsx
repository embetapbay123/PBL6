import { useCallback, useEffect, useState } from 'react';
import { request } from '../../api/client';
import { ErrorView, Loading } from '../../bootstrap/components';

type Invitation = { id: string; store_name?: string; invited_email: string; status: string; expires_at: string; permissions: string[] };
export function InvitationsPage() {
  const [items, setItems] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const [busyId, setBusyId] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError(undefined);
    try { const page = await request<{ items: Invitation[] }>('/me/invitations?page=1&size=100'); setItems(page.items); }
    catch (cause) { setError(cause); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const accept = async (id: string) => {
    setBusyId(id); setError(undefined);
    try { await request(`/me/invitations/${id}/accept`, { method: 'POST' }); await load(); }
    catch (cause) { setError(cause); }
    finally { setBusyId(''); }
  };
  return <main className="boot-card"><h2>Lời mời tham gia Store</h2>
    {error !== undefined && <ErrorView error={error} />}
    {loading ? <Loading /> : items.length === 0 ? <p>Không có lời mời nào.</p> : items.map(item => <article key={item.id} className="boot-card">
      <h3>{item.store_name ?? 'Store'}</h3><p>{item.invited_email} · {item.status} · hạn {new Date(item.expires_at).toLocaleString('vi-VN')}</p>
      <p>Quyền: {item.permissions.join(', ') || 'Chưa cấp quyền vận hành'}</p>
      {item.status === 'PENDING' && <button disabled={busyId === item.id} onClick={() => accept(item.id)}>{busyId === item.id ? 'Đang xử lý…' : 'Chấp nhận lời mời'}</button>}
    </article>)}
  </main>;
}
