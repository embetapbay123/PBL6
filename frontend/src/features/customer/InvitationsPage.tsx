import {useCallback, useEffect, useRef, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {useAuth} from '../../api/auth-context';
import {getAuthSession, isUncertainMutation} from '../../api/client';
import {callOperation} from '../../api/operations';
import type {OperationOutputs} from '../../api/operations.generated';
import {ErrorView, Loading, Pagination} from '../../bootstrap/components';
import {invitationLabels, invitationStatus, invitationTime, sellerPermissions, useInvitationClock} from '../staff-presentation';
import {CustomerSubNav} from './CustomerSubNav';

type Invitation = OperationOutputs['listOwnInvitations']['items'][number];
const noInvitations: Invitation[] = [];
export function InvitationsPage() {
  const {session} = useAuth();
  return <Invitations key={session?.context?.user_id ?? 'guest'}/>;
}
function Invitations() {
  const {session, refreshContext} = useAuth(), navigate = useNavigate(), [query, setQuery] = useSearchParams();
  const requestedPage = Number(query.get('page') ?? 1), page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [data, setData] = useState<OperationOutputs['listOwnInvitations']>();
  const [error, setError] = useState<unknown>(), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [readRequired, setReadRequired] = useState(false), [notice, setNotice] = useState('');
  const alive = useRef(true), flight = useRef(false), generation = useRef(0);
  const now = useInvitationClock(data?.items ?? noInvitations);
  const membership = session?.context?.store_membership;
  const setPage = useCallback((next: number) => setQuery(previous => {
    const result = new URLSearchParams(previous);result.set('page', String(next));return result;
  }), [setQuery]);
  const load = useCallback(async () => {
    const epoch = ++generation.current;setLoading(true);
    try {
      const value = await callOperation('listOwnInvitations', {query: {page, size: 20}});
      if(!alive.current || epoch !== generation.current)return false;
      setData(value);setReadRequired(false);
      const last = Math.max(1, Math.ceil(value.total / value.size));if(page > last)setPage(last);
      return true;
    } catch(cause) {
      if(alive.current && epoch === generation.current){setError(cause);setReadRequired(true);}
      return false;
    } finally {if(alive.current && epoch === generation.current)setLoading(false);}
  }, [page, setPage]);
  useEffect(() => {alive.current = true;return () => {alive.current = false;generation.current++;};}, []);
  useEffect(() => {setData(undefined);setError(undefined);void load();return () => {generation.current++;};}, [load]);

  async function accept(item: Invitation) {
    if(flight.current || loading || readRequired || invitationStatus(item, Date.now()) !== 'PENDING' || !item.id)return;
    flight.current = true;setBusy(true);setError(undefined);setNotice('');
    try {
      await callOperation('acceptInvitation', {path: {id: item.id}});
      if(!alive.current)return;
      setReadRequired(true);setNotice('Đã chấp nhận lời mời. Đọc trạng thái dưới đây rồi cập nhật quyền để vào Store.');await load();
    } catch(cause) {
      if(!alive.current)return;
      setError(cause);setReadRequired(true);
      if(isUncertainMutation(cause))setNotice('Chưa rõ kết quả chấp nhận. Đọc lại lời mời trước khi thao tác tiếp; không tự gửi lại yêu cầu.');
      else await load();
    } finally {flight.current = false;if(alive.current)setBusy(false);}
  }
  async function enter(item: Invitation) {
    if(flight.current || !item.store_id)return;
    flight.current = true;setBusy(true);setError(undefined);
    const user = session?.context?.user_id;
    try {
      await refreshContext();
      const current = getAuthSession()?.context, member = current?.store_membership;
      if(current?.user_id === user && member?.store_id === item.store_id && member.status === 'ACTIVE')navigate('/seller');
      else if(alive.current)setNotice('Lời mời đã được chấp nhận trước đây, nhưng quyền hiện hành không cho vào Store này.');
    } catch(cause) {if(alive.current)setError(cause);}
    finally {flight.current = false;if(alive.current)setBusy(false);}
  }
  const locked = busy || loading || readRequired;
  return <section className="boot-card"><CustomerSubNav/><h2>Lời mời tham gia Store</h2>
    <p>Mỗi tài khoản chỉ tham gia một Store đang hoạt động. Chấp nhận không cấp quyền chủ Store.</p>
    {notice && <p role="status">{notice}</p>}{error != null && <ErrorView error={error}/>}
    {(error != null || readRequired) && <button disabled={busy || loading} onClick={() => {setError(undefined);void load();}}>Đọc lại lời mời</button>}
    {loading && <Loading/>}
    {data && <>{!data.items.length && <p>Không có lời mời nào.</p>}
      {data.items.map((item, i) => {
        const status = invitationStatus(item, now), differentStore = membership?.status === 'ACTIVE' && membership.store_id !== item.store_id;
        return <article className="boot-card" key={item.id ?? i}><h3>{item.store_name ?? 'Store'}</h3>
          <p>{item.invited_email} · {invitationLabels[status] ?? 'Chưa rõ trạng thái'} · hạn {invitationTime(item.expires_at)}</p>
          <p>Quyền: {item.permissions.map(p => sellerPermissions.find(([code]) => code === p)?.[1] ?? p).join(', ') || 'Chưa cấp quyền vận hành'}</p>
          {status === 'PENDING' && item.id && <button disabled={locked || membership?.status === 'ACTIVE'} onClick={() => void accept(item)}>Chấp nhận</button>}
          {status === 'ACCEPTED' && item.store_id && !differentStore && <button disabled={locked} onClick={() => void enter(item)}>Mở shop</button>}
          {differentStore && <p>Tài khoản hiện đang tham gia Store khác; lời mời này không thay đổi Store hiện hành.</p>}
        </article>;
      })}
      <fieldset disabled={busy || loading}><legend>Trang lời mời</legend><Pagination page={page} size={data.size} total={data.total} onPage={setPage}/></fieldset>
    </>}
  </section>;
}
