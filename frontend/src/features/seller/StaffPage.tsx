import { useCallback, useEffect, useState } from 'react';
import { callOperation } from '../../api/operations';
import { ErrorView, Loading } from '../../bootstrap/components';
import { SellerSubNav } from '../../live/SellerWorkspace';

const sellerPermissions = [
  ['product.store.read_write', 'Quản lý sản phẩm'],
  ['inventory.store.read_adjust', 'Xem và điều chỉnh kho'],
  ['order.store.read_status_cancel', 'Xem và xử lý đơn hàng'],
  ['cod.store.collect', 'Ghi nhận thu COD'],
] as const;
type Staff = { id: string; user_id: string; email: string; status: string; version: number; permissions: string[] };
type Invitation = { id: string; invited_email: string; permissions: string[]; status: string; expires_at: string };

export function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState('');
  const [invitePermissions, setInvitePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(undefined);
    try {
      const [staffPage, invitationPage] = await Promise.all([
        callOperation('listStoreStaff', { query: { page: 1, size: 100 } }),
        callOperation('listStaffInvitations', { query: { page: 1, size: 100 } }),
      ]);
      setStaff(staffPage.items as unknown as Staff[]); setInvitations(invitationPage.items as unknown as Invitation[]);
    } catch (cause) { setError(cause); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const invite = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(undefined); setNotice('');
    try {
      await callOperation('inviteStaff', {
        body: {
          invited_email: email,
          permissions: invitePermissions as ("product.store.read_write" | "inventory.store.read_adjust" | "order.store.read_status_cancel" | "cod.store.collect")[],
        },
      });
      setEmail(''); setInvitePermissions([]); setNotice('Đã tạo lời mời. Người nhận có thể xem trong mục lời mời của tài khoản.'); await load();
    } catch (cause) { setError(cause); await load(); setError(cause); }
    finally { setBusy(false); }
  };

  const update = async (member: Staff, changes: { status?: string; permissions?: string[] }) => {
    setBusy(true); setError(undefined);
    try {
      await callOperation('updateStaff', {
        path: { id: member.id },
        body: {
          expected_version: member.version,
          status: changes.status as "ACTIVE" | "LOCKED" | undefined,
          permissions: changes.permissions,
        },
      });
      await load();
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  };
  const revoke = async (invitation: Invitation) => {
    setBusy(true); setError(undefined);
    try { await callOperation('revokeStaffInvitation', { path: { id: invitation.id } }); await load(); }
    catch (cause) { setError(cause); }
    finally { setBusy(false); }
  };

  return <main className="boot-card">
    <SellerSubNav />
    <h2>Quản lý nhân viên Store</h2>
    {error !== undefined && <ErrorView error={error} />}
    {notice && <p role="status">{notice}</p>}
    <form onSubmit={invite}>
      <h3>Mời nhân viên</h3>
      <label>Email nhân viên <input type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>
      <fieldset><legend>Quyền được cấp</legend>
        {sellerPermissions.map(([code, label]) => <label key={code} style={{ display: 'block' }}>
          <input type="checkbox" checked={invitePermissions.includes(code)} onChange={event => setInvitePermissions(current => event.target.checked ? [...current, code] : current.filter(item => item !== code))} /> {label}
        </label>)}
      </fieldset>
      <button disabled={busy}>Gửi lời mời</button>
    </form>
    {loading ? <Loading /> : <>
      <h3>Nhân viên</h3>
      {staff.length === 0 ? <p>Chưa có nhân viên.</p> : staff.map(member => <article key={member.id} className="boot-card">
        <strong>{member.email}</strong> · {member.status} · phiên bản {member.version}
        <div>{sellerPermissions.map(([code, label]) => <label key={code} style={{ display: 'block' }}>
          <input type="checkbox" checked={member.permissions.includes(code)} disabled={busy || member.status !== 'ACTIVE'}
            onChange={event => update(member, { permissions: event.target.checked ? [...member.permissions, code] : member.permissions.filter(item => item !== code) })} /> {label}
        </label>)}</div>
        <button disabled={busy} onClick={() => update(member, { status: member.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE' })}>
          {member.status === 'ACTIVE' ? 'Khóa nhân viên' : 'Mở khóa'}
        </button>
      </article>)}
      <h3>Lời mời</h3>
      {invitations.length === 0 ? <p>Chưa có lời mời.</p> : invitations.map(invitation => <article key={invitation.id}>
        {invitation.invited_email} · {invitation.status} · hết hạn {new Date(invitation.expires_at).toLocaleString('vi-VN')}
        {invitation.status === 'PENDING' && <button disabled={busy} onClick={() => revoke(invitation)}>Thu hồi</button>}
      </article>)}
    </>}
  </main>;
}
