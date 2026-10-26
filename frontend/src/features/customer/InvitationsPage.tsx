import {useEffect,useRef,useState} from 'react';
import {useAuth} from '../../api/auth-context';
import {callOperation} from '../../api/operations';
import type {OperationOutputs} from '../../api/operations.generated';
import {ErrorView,Loading,Pagination} from '../../bootstrap/components';
export function InvitationsPage(){const {session}=useAuth();return <Invitations key={session?.context?.user_id??'guest'}/>}
function Invitations(){
 const {refreshContext}=useAuth();const [data,setData]=useState<OperationOutputs['listOwnInvitations']>(),[page,setPage]=useState(1),[reload,setReload]=useState(0),[error,setError]=useState<unknown>(),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');const alive=useRef(true),flight=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 useEffect(()=>{let active=true;setData(undefined);setError(undefined);callOperation('listOwnInvitations',{query:{page,size:20}}).then(v=>{if(active)setData(v)}).catch(e=>{if(active)setError(e)});return()=>{active=false}},[page,reload]);
 async function accept(id:string){if(flight.current)return;flight.current=true;setBusy(true);setError(undefined);setNotice('');let accepted=false;try{await callOperation('acceptInvitation',{path:{id}});accepted=true;if(!alive.current)return;await refreshContext();if(alive.current){setNotice('Đã chấp nhận lời mời và cập nhật quyền hiện tại.');setReload(n=>n+1)}}catch(e){if(alive.current){setError(e);if(accepted){setNotice('Lời mời đã được chấp nhận; hãy đăng nhập lại để cập nhật quyền.');setData(undefined)}}}finally{flight.current=false;if(alive.current)setBusy(false)}}
 return <section className="boot-card"><h2>Lời mời tham gia Store</h2>{notice&&<p role="status">{notice}</p>}{error!=null&&<ErrorView error={error} onRetry={()=>setReload(n=>n+1)}/>}
 {!data&&!error?<Loading/>:data&&<>{!data.items.length&&<p>Không có lời mời nào.</p>}{data.items.map((item,i)=><article className="boot-card" key={item.id??i}><h3>{item.store_name??'Store'}</h3><p>{item.invited_email} · {item.status} {item.expires_at&&'· hạn '+new Date(item.expires_at).toLocaleString('vi-VN')}</p><p>Quyền: {item.permissions.join(', ')||'Chưa cấp quyền vận hành'}</p>{item.status==='PENDING'&&item.id&&<button disabled={busy} onClick={()=>void accept(item.id!)}>Chấp nhận lời mời</button>}</article>)}<Pagination page={page} size={data.size} total={data.total} onPage={setPage}/></>}
 </section>;
}
