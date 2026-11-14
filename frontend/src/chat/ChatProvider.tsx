import {createContext,useCallback,useContext,useRef,useState,type ReactNode} from 'react';
import {callOperation} from '../api/operations';
import {ApiError} from '../api/client';
import {useQueryClient} from '@tanstack/react-query';
import {useChatUploads} from './useChatUploads';

type Scope='CUSTOMER'|'STORE';
type OrderReference={order_id:string;title?:string};
type Entry={order?:OrderReference;draft:string;busy:boolean;error?:unknown;notice?:string;pending?:{content:string;client_message_id:string;order_id?:string;attachment_ids?:string[]}};
type ChatState={status:'closed'|'minimized'|'open';tab:'ai'|'store';conversationId?:string;conversationName?:string};
const empty:Entry={draft:'',busy:false};
function useChatState(){
 const cache=useQueryClient(),[ui,setUi]=useState<ChatState>({status:'closed',tab:'ai'}),[entries,setEntries]=useState<Record<string,Entry>>({}),flights=useRef(new Set<string>());
 const uploads=useChatUploads();
 const patch=useCallback((key:string,value:Partial<Entry>)=>setEntries(current=>({...current,[key]:{...empty,...current[key],...value}})),[]);
 const openChat=useCallback((input:Partial<Omit<ChatState,'status'>>={})=>setUi(current=>({...current,...input,status:'open'})),[]);
 function chooseOrder(scope:Scope,id:string,order?:OrderReference,explicitClear=false){
  const key=scope+':'+id,entry=entries[key]??empty;
  if(entry.pending||entry.busy||flights.current.has(key))return false;
  if(!explicitClear&&entry.draft.trim()&&entry.order?.order_id!==order?.order_id){patch(key,{error:new ApiError(409,'DRAFT_ORDER_CONTEXT','Hội thoại đang có bản nháp cho ngữ cảnh khác. Gửi hoặc xóa bản nháp trước khi gắn đơn mới. Bản nháp và tham chiếu cũ được giữ nguyên.')});return false;}
  patch(key,{order,error:undefined,notice:undefined});return true;
 }
 async function send(scope:Scope,id:string){
  const key=scope+':'+id,entry=entries[key]??empty;
  const files=uploads.current.current[key]??[];
  if(flights.current.has(key)||(!entry.pending&&(!entry.draft.trim()&&!files.length||files.some(file=>file.stage!=='READY'))))return;
  const body=entry.pending??{content:entry.draft.trim(),client_message_id:crypto.randomUUID(),...(entry.order?{order_id:entry.order.order_id}:{}),...(files.length?{attachment_ids:files.map(file=>file.asset!.id)}:{})};
  flights.current.add(key);patch(key,{busy:true,pending:body,error:undefined,notice:undefined});
  try{if(scope==='CUSTOMER')await callOperation('sendOwnConversationMessage',{path:{id},body});else await callOperation('sendStoreConversationMessage',{path:{id},body});
   uploads.accepted(scope,id);patch(key,{draft:'',pending:undefined,notice:'Đã gửi tin nhắn.'});
   void Promise.allSettled([cache.invalidateQueries({queryKey:['conversation-messages',scope,id]}),cache.invalidateQueries({queryKey:['conversations',scope]})]);
  }catch(error){patch(key,{error,...(!entry.pending&&error instanceof ApiError&&error.status>=400&&error.status<500&&error.status!==408&&error.status!==429?{pending:undefined}:{})});}
  finally{flights.current.delete(key);patch(key,{busy:false});}
 }
 return {ui,openChat,closeChat:()=>setUi(current=>({...current,status:'closed'})),minimizeChat:()=>setUi(current=>({...current,status:'minimized'})),entries,patch,send,chooseOrder,uploads};
}
const ChatContext=createContext<ReturnType<typeof useChatState>|null>(null);
export function ChatProvider({children}:{children:ReactNode}){return <ChatContext.Provider value={useChatState()}>{children}</ChatContext.Provider>;}
export function useChat(){const value=useContext(ChatContext);if(!value)throw new Error('ChatProvider is required');return value;}
export const conversationEntry=(entries:Record<string,Entry>,scope:Scope,id?:string)=>entries[scope+':'+id]??empty;
