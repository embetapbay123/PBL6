import { FormEvent, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../api/auth-context';
import { ApiError } from '../api/client';
import { callOperation } from '../api/operations';
import { Empty, ErrorView, Loading, Pagination } from '../bootstrap/components';

import {useChat,conversationEntry} from './ChatProvider';

type Scope='CUSTOMER'|'STORE';
export function MessagesWorkspace({scope,id,onSelect,active=true,compact=false}:{scope:Scope;id?:string;onSelect?:(id:string)=>void;active?:boolean;compact?:boolean}) {
  const {session}=useAuth();
  const member=session?.context?.store_membership;
  const allowed=scope==='CUSTOMER'?!!session?.context?.roles.includes('CUSTOMER'):!!member&&member.status==='ACTIVE'&&(member.role==='OWNER'||!!member.permissions?.includes('order.store.read_status_cancel'));
  const [listPage,setListPage]=useState(1),[messagePages,setMessagePages]=useState<Record<string,number>>({});
  const conversationKey=scope+':'+id,messagePage=messagePages[conversationKey]??1;
  const setMessagePage=(page:number)=>setMessagePages(current=>({...current,[conversationKey]:page}));
  const chat=useChat(),entry=conversationEntry(chat.entries,scope,id),{draft,busy,error,notice,pending,order}=entry;
  const setDraft=(draft:string)=>chat.patch(scope+':'+id,{draft});
  const base=scope==='CUSTOMER'?'/customer/messages':'/seller/messages';
  const threads=useQuery({queryKey:['conversations',scope,listPage],enabled:allowed&&active,refetchInterval:active?10000:false,queryFn:()=>scope==='CUSTOMER'?callOperation('listOwnConversations',{query:{page:listPage,size:20}}):callOperation('listStoreConversations',{query:{page:listPage,size:20}})});
  const messages=useQuery({queryKey:['conversation-messages',scope,id,messagePage],enabled:allowed&&active&&!!id,refetchInterval:active&&messagePage===1?10000:false,refetchOnWindowFocus:messagePage===1,queryFn:async()=>{
    const result=scope==='CUSTOMER'?await callOperation('listOwnConversationMessages',{path:{id:id!},query:{page:messagePage,size:20}}):await callOperation('listStoreConversationMessages',{path:{id:id!},query:{page:messagePage,size:20}});
    if(result.conversation_id!==id||result.conversation&&result.conversation.id!==id)throw new ApiError(503,'CONVERSATION_CONTEXT_INVALID','Kết quả không khớp hội thoại đã chọn. Hãy đọc lại trước khi gửi.');
    return result;
  }});
  const log=useRef<HTMLDivElement>(null),following=useRef(true),position=useRef<{key:string;latest?:string}>(undefined);
  const [newMessages,setNewMessages]=useState(false),historyKey=conversationKey+':'+messagePage;
  useLayoutEffect(()=>{
    const element=log.current;if(!element||!messages.data)return;
    const latest=messages.data.items[0]?.id,changed=position.current?.key!==historyKey;
    if(changed||following.current){element.scrollTop=element.scrollHeight;following.current=true;setNewMessages(false);}
    else if(position.current?.latest!==latest)setNewMessages(true);
    position.current={key:historyKey,latest};
  },[historyKey,messages.data]);
  function followLatest(){const element=log.current;if(element){element.scrollTop=element.scrollHeight;following.current=true;setNewMessages(false);}}
  function send(event:FormEvent){event.preventDefault();if(id&&!messages.error&&!messages.isLoading){setMessagePage(1);void chat.send(scope,id);}}
  if(!allowed)return <ErrorView error={new ApiError(403,'FORBIDDEN','Bạn chưa có quyền truy cập tin nhắn của gian hàng.')}/>;
  const selected=(!messages.error?messages.data?.conversation:undefined)??threads.data?.items.find(thread=>thread.id===id),rememberedName=scope==='CUSTOMER'&&chat.ui.conversationId===id?chat.ui.conversationName:undefined;
  const orderPath=(orderId:string)=>(scope==='CUSTOMER'?'/customer/orders/':'/seller/orders?q=')+encodeURIComponent(orderId);
  return <section className={compact?'conversation-workspace conversation-compact':'conversation-workspace'}>{!compact&&<h1>{scope==='CUSTOMER'?'Tin nhắn với gian hàng':'Tin nhắn khách hàng'}</h1>}<div className="market-messages">
    <aside className="boot-card" hidden={compact&&!!id} aria-label="Danh sách hội thoại"><h2>Hội thoại</h2>
      {threads.isLoading&&<Loading/>}{threads.error&&<ErrorView error={threads.error} onRetry={()=>void threads.refetch()}/>}
      {threads.data&&<>{!threads.data.items.length&&<Empty>Chưa có hội thoại. Mở sản phẩm hoặc gian hàng rồi chọn Nhắn tin gian hàng để bắt đầu.</Empty>}<nav aria-label="Hội thoại">{threads.data.items.map(thread=><Link key={thread.id} onClick={event=>{if(onSelect){event.preventDefault();onSelect(thread.id);setMessagePage(1);}}} to={base+'/'+thread.id} aria-current={thread.id===id?'page':undefined}><strong>{scope==='CUSTOMER'?thread.store_name:thread.customer_name}</strong><p>{thread.last_message ?? 'Chưa có tin nhắn'}</p><small>{new Date(thread.updated_at).toLocaleString('vi-VN')}</small></Link>)}</nav><Pagination page={listPage} size={threads.data.size} total={threads.data.total} onPage={setListPage}/></>}
    </aside>
    <div className="boot-card" hidden={compact&&!id}>{compact&&id&&<button type="button" className="ui-button ui-button-secondary" onClick={()=>onSelect?.('')}>← Hội thoại</button>}{!id?<Empty>Chọn hội thoại để xem và gửi tin nhắn.</Empty>:<><h2>{selected?(scope==='CUSTOMER'?selected.store_name:selected.customer_name):rememberedName??'Hội thoại'}</h2>
      {messages.isLoading&&<Loading/>}{messages.error&&<ErrorView error={messages.error} onRetry={()=>void messages.refetch()}/>}
      {messages.data&&<><div ref={log} tabIndex={0} role="log" aria-label="Nội dung hội thoại" aria-live="polite" className="market-message-log" onScroll={event=>{const element=event.currentTarget;following.current=element.scrollHeight-element.clientHeight-element.scrollTop<=32;if(following.current)setNewMessages(false);}}>{!messages.data.items.length&&<Empty>Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện.</Empty>}{[...messages.data.items].reverse().map(message=><article key={message.id} className={message.sender_side===scope?'message-own':''}><small>{message.sender_side===scope?'Bạn':scope==='CUSTOMER'?'Gian hàng':'Khách hàng'} · {new Date(message.created_at).toLocaleString('vi-VN')}</small><p>{message.content}</p>{message.order_id&&<div className="message-order-actions"><Link to={orderPath(message.order_id)} onClick={()=>chat.closeChat()}>Xem đơn #{message.order_id.slice(-8).toUpperCase()}</Link><button type="button" disabled={busy||!!pending} onClick={()=>chat.chooseOrder(scope,id!,{order_id:message.order_id!})}>Trả lời về đơn này</button></div>}</article>)}</div>{newMessages&&<p role="status"><button type="button" onClick={followLatest}>Có tin nhắn mới · Xem cuối hội thoại</button></p>}<Pagination page={messagePage} size={messages.data.size} total={messages.data.total} onPage={setMessagePage}/></>}
      {order&&<section className="message-order-reference" aria-label="Đơn hàng tham chiếu khi gửi"><p>Đang trao đổi về <Link to={orderPath(order.order_id)} onClick={()=>chat.closeChat()}>đơn #{order.order_id.slice(-8).toUpperCase()}</Link>{order.title&&<> · {order.title}</>}</p><p>Chỉ gắn tham chiếu khi bạn gửi nội dung. Chưa tự gửi tin nhắn.</p><button type="button" disabled={busy||!!pending} onClick={()=>chat.chooseOrder(scope,id!,undefined,true)}>Bỏ tham chiếu đơn</button></section>}
      <form onSubmit={send}><label>Nội dung tin nhắn<textarea required maxLength={2000} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();event.currentTarget.form?.requestSubmit();}}} value={draft} disabled={busy||!!pending||!!messages.error||messages.isLoading} onChange={event=>setDraft(event.target.value)}/></label><button disabled={busy||!!messages.error||messages.isLoading||(!pending&&!draft.trim())}>{busy?'Đang gửi…':pending?'Thử gửi lại':'Gửi tin nhắn'}</button></form>
      {pending&&!busy&&error!==undefined&&<p role="note">Chưa xác định được kết quả. Thử gửi lại sẽ dùng cùng mã và nội dung tin nhắn.</p>}
      {error!==undefined&&<ErrorView error={error}/>} {notice&&<p role="status">{notice}</p>}
    </>}</div>
  </div></section>;
}
