import {FormEvent,useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../../api/auth-context';
import {ApiError} from '../../api/client';
import type {OperationOutputs} from '../../api/operations.generated';
import {createChatSession,listOwnChatSessions,sendChatMessage} from '../../api/recommendationsChat';
import {ErrorView,Loading,Pagination} from '../../bootstrap/components';
type Message=OperationOutputs['sendChatMessage'];
type Session=OperationOutputs['createChatSession'];
export function CustomerChatWidget(){
 const {session}=useAuth();const customer=session?.context?.roles.includes('CUSTOMER')?session.context.user_id:undefined;
 if(session&&!customer)return null;
 return <Chat key={customer??'guest'} customer={!!customer}/>;
}
function Chat({customer}:{customer:boolean}){
 const [open,setOpen]=useState(false),[draft,setDraft]=useState(''),[messages,setMessages]=useState<Message[]>([]),[current,setCurrent]=useState<Session>(),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>();
 const [history,setHistory]=useState<OperationOutputs['listOwnChatSessions']>(),[page,setPage]=useState(1),[messagePage,setMessagePage]=useState(1),[messageTotal,setMessageTotal]=useState(0),[reload,setReload]=useState(0),[historyError,setHistoryError]=useState<unknown>();
 const alive=useRef(true),flight=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 useEffect(()=>{if(!customer||!open)return;let active=true;setHistory(undefined);setHistoryError(undefined);listOwnChatSessions({page,size:20}).then(v=>{if(active)setHistory(v)}).catch(e=>{if(active)setHistoryError(e)});return()=>{active=false}},[customer,open,page,reload]);
 async function choose(id:string,p=1){if(flight.current)return;flight.current=true;setBusy(true);setError(undefined);
  try{const result=await listOwnChatSessions({session_id:id,page:1,size:20,message_page:p,message_size:20});const selected=result.items.find(v=>v.id===id);if(!selected)throw new ApiError(404,'NOT_FOUND','Không tìm thấy phiên chat của bạn.');if(alive.current){setCurrent(selected);setMessages(selected.messages?.items??[]);setMessagePage(p);setMessageTotal(selected.messages?.total??0)}}catch(e){if(alive.current)setError(e)}finally{flight.current=false;if(alive.current)setBusy(false)}
 }
 async function send(event:FormEvent){event.preventDefault();const content=draft.trim();if(!content||flight.current)return;flight.current=true;setBusy(true);setError(undefined);
  try{let selected=current;if(!selected){selected=await createChatSession();if(!alive.current)return;setCurrent(selected)}
   if(!customer&&!selected.anonymous_key)throw new ApiError(503,'CHAT_KEY_MISSING','Không thể xác minh phiên Guest. Hãy bắt đầu phiên mới.');
   const answer=await sendChatMessage(selected.id,content,customer?undefined:selected.anonymous_key);
   if(alive.current){setMessages(v=>[...v,{content,role:'USER'},answer]);setDraft('');setMessageTotal(0);setReload(n=>n+1)}
  }catch(e){if(alive.current)setError(e)}finally{flight.current=false;if(alive.current)setBusy(false)}
 }
 return <aside className="boot-card" aria-label="Trợ lý mua sắm"><button aria-expanded={open} onClick={()=>setOpen(v=>!v)}>Chat hỗ trợ</button>{open&&<>
  <h2>Trợ lý mua sắm</h2><p>Chỉ hiển thị câu trả lời và giá do API trả về.</p>
  <button disabled={busy} onClick={()=>{setCurrent(undefined);setMessages([]);setMessageTotal(0);setDraft('');setError(undefined)}}>Phiên mới</button>
  {customer&&<section aria-label="Lịch sử chat"><h3>Lịch sử của bạn</h3>{historyError?<ErrorView error={historyError} onRetry={()=>setReload(n=>n+1)}/>:!history?<Loading/>:<>{!history.items.length&&<p>Chưa có phiên chat.</p>}{history.items.map(s=><button key={s.id} disabled={busy} onClick={()=>void choose(s.id)}>Mở phiên {s.id}</button>)}<Pagination page={page} size={history.size} total={history.total} onPage={setPage}/></>}</section>}
  {error!=null&&<ErrorView error={error}/>}
  <div role="log" aria-live="polite">{messages.map((m,i)=><article key={m.id??i}><strong>{m.role==='USER'?'Bạn':'Trợ lý'}</strong><p>{m.content}</p>{m.fallback&&<p role="status">Câu trả lời dự phòng: {m.fallback_reason??'PROVIDER_UNAVAILABLE'}</p>}{m.product_cards?.map(card=><p key={card.product_id}><Link to={'/products/'+card.product_id}>Xem sản phẩm</Link> · {card.current_price_vnd.toLocaleString('vi-VN')} ₫ · {card.status}</p>)}</article>)}</div>
  {customer&&current&&messageTotal>20&&<Pagination page={messagePage} size={20} total={messageTotal} onPage={p=>{void choose(current.id,p)}}/>}
  <form onSubmit={send}><label>Câu hỏi<input maxLength={2000} required value={draft} disabled={busy} onChange={e=>setDraft(e.target.value)}/></label><button disabled={busy||!draft.trim()}>{busy?'Đang trả lời…':'Gửi câu hỏi'}</button></form>
 </>}</aside>;
}
