import {ApiError} from '../../api/client';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../api/auth-context';
import { callOperation } from '../../api/operations';
import { ErrorView } from '../../bootstrap/components';

import {useChat} from '../../chat/ChatProvider';

export function ContactStoreButton({storeId,orderId}:{storeId:string;orderId?:string}) {
  const {session}=useAuth(),chat=useChat();
  const [busy,setBusy]=useState(false),[error,setError]=useState<unknown>();
  if(!session)return <Link className="ui-button ui-button-secondary" to="/login">Đăng nhập để nhắn tin gian hàng</Link>;
  if(!session.context?.roles.includes('CUSTOMER'))return null;
  async function start(){
    if(busy)return;setBusy(true);setError(undefined);
    try{const result=await callOperation('startStoreConversation',{body:{store_id:storeId,...(orderId?{order_id:orderId}:{})}});if(orderId&&(!result.order_context||result.order_context.order_id!==orderId||result.order_context.store_id!==storeId))throw new ApiError(503,'ORDER_CONTEXT_UNAVAILABLE','Chưa đọc được ngữ cảnh đúng đơn hàng. Không gửi tin nhắn; vui lòng thử lại.');if(orderId&&result.order_context){chat.chooseOrder('CUSTOMER',result.id,{order_id:result.order_context.order_id,title:result.order_context.items.slice(0,3).map(item=>(item.title??'Món đơn cũ')+' × '+item.quantity).join(' · ')+(result.order_context.items.length>3?' · Còn '+(result.order_context.items.length-3)+' dòng khác':'')});}chat.openChat({tab:'store',conversationId:result.id,conversationName:result.store_name});}
    catch(e){setError(e);}finally{setBusy(false);}
  }
  return <div><button className="ui-button ui-button-secondary" type="button" disabled={busy} onClick={()=>void start()}>{busy?'Đang mở hội thoại…':orderId?'Hỏi Store về đơn này':'Nhắn tin gian hàng'}</button>{error!==undefined&&<ErrorView error={error}/>}</div>;
}
