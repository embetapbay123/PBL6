import {useEffect,useRef,useState} from 'react';
import {request,ApiError,isUncertainMutation} from '../api/client';
import type {components} from '../api/generated';
import type {ChatAttachment} from './chat-media';

type Turn=components['schemas']['ChatMediaTurn'];
type Answer=components['schemas']['ChatMessage'];
export type PendingAiMedia={sessionId:string;clientId:string;content:string;assets:ChatAttachment[];consentVersion:'chat-media-openai-v1';status:string;canReplay:boolean};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function restored(key:string):PendingAiMedia|undefined{
 try{const raw=sessionStorage.getItem(key);if(!raw||raw.length>16000)return;const item=JSON.parse(raw);
  if(!uuid.test(item.sessionId)||!uuid.test(item.clientId)||typeof item.content!=='string'||item.content.length>2000||item.consentVersion!=='chat-media-openai-v1'||!Array.isArray(item.assets)||item.assets.length>3||item.assets.some((asset:ChatAttachment)=>!uuid.test(asset.id)||!['IMAGE','VIDEO'].includes(asset.kind)))return;
  return {...item,status:'READING'};
 }catch{/* Server capabilities can recover the pending attempt when storage is unavailable. */}
}
export function useAiMediaTurn(user:string|undefined,onSuccess:(record:PendingAiMedia,answer:Answer)=>void,onFailure:(error:unknown)=>void){
 const storageKey='pbl6_ai_media_pending_'+user,[pending,setPending]=useState(()=>user?restored(storageKey):undefined),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>();
 const current=useRef(pending),alive=useRef(true),flight=useRef(false),timer=useRef<ReturnType<typeof setTimeout>>(undefined),controller=useRef<AbortController>(undefined),polls=useRef(0),settled=useRef(new Set<string>());
 const callbacks=useRef({onSuccess,onFailure});callbacks.current={onSuccess,onFailure};
 function store(record:PendingAiMedia,required=false){
  try{sessionStorage.setItem(storageKey,JSON.stringify(record));}catch(error){if(required)throw error;}
  current.current=record;if(alive.current)setPending(record);
 }
 function clear(){if(timer.current)clearTimeout(timer.current);const id=current.current?.clientId;if(id)settled.current.add(id);try{sessionStorage.removeItem(storageKey);}catch{/* The in-memory attempt still clears after a confirmed result. */}current.current=undefined;if(alive.current)setPending(undefined);}
 function handle(record:PendingAiMedia,turn:Turn){
  if(turn.client_message_id!==record.clientId)throw new ApiError(503,'CHAT_MEDIA_CONTEXT_INVALID','Kết quả không khớp câu hỏi đã gửi. Hãy đọc lại kết quả.');
  if(turn.status==='SUCCEEDED'){
   if(!turn.assistant||turn.assistant.session_id!==record.sessionId)throw new ApiError(503,'CHAT_MEDIA_CONTEXT_INVALID','Kết quả chưa khớp phiên chat. Hãy đọc lại kết quả.');
   clear();callbacks.current.onSuccess(record,turn.assistant);return;
  }
  if(turn.status==='FAILED'||turn.status==='CANCELLED'){clear();callbacks.current.onFailure(new ApiError(409,turn.error_code??'CHAT_MEDIA_FAILED',turn.message??'Câu hỏi chưa có kết quả. Hãy kiểm tra tệp và thử lại trong hạn mức.'));return;}
  store({...record,status:turn.status});
  if(turn.status==='UNKNOWN')setError(new ApiError(0,'CHAT_MEDIA_UNKNOWN',turn.message??'Chưa xác định kết quả. Đọc lại câu hỏi này; không gửi thành câu hỏi mới.'));
  else if(polls.current++<90)timer.current=setTimeout(()=>void read(),2000);
 }
 async function read(){
  const record=current.current;if(!record||flight.current)return;flight.current=true;setBusy(true);setError(undefined);controller.current=new AbortController();
  if(timer.current)clearTimeout(timer.current);
  try{const value=await request<Turn>(`/chat/sessions/${record.sessionId}/media-messages/${record.clientId}`,{signal:controller.current.signal});if(alive.current&&current.current?.clientId===record.clientId)handle(record,value);}
  catch(error){if(alive.current&&current.current?.clientId===record.clientId){if(error instanceof ApiError&&error.status===404)store({...record,status:'NOT_FOUND'});setError(error);}}
  finally{flight.current=false;if(alive.current)setBusy(false);}
 }
 async function admit(record:PendingAiMedia,password:string){
  if(flight.current)return;flight.current=true;setBusy(true);setError(undefined);controller.current=new AbortController();
  try{
   // Save the immutable key before sending. A reload must read this attempt,
   // rather than accidentally create a second paid request.
   try{store({...record,status:'ADMITTING'},true);polls.current=0;}catch{throw new ApiError(422,'CHAT_PENDING_STORAGE_UNAVAILABLE','Chưa lưu được câu hỏi để theo dõi kết quả. Cho phép lưu trữ trên trình duyệt rồi thử lại.');}
   const value=await request<Turn>(`/chat/sessions/${record.sessionId}/media-messages`,{method:'POST',body:JSON.stringify({client_message_id:record.clientId,content:record.content,attachment_ids:record.assets.map(asset=>asset.id),consent_version:record.consentVersion}),headers:password?{'X-Try-On-Demo-Password':password}:{},signal:controller.current.signal});
   if(alive.current&&current.current?.clientId===record.clientId)handle(record,value);
  }catch(error){if(alive.current){
   if(error instanceof ApiError&&!isUncertainMutation(error)&&![401,408,429].includes(error.status)){clear();callbacks.current.onFailure(error);}else{setError(error);if(current.current)store({...current.current,status:'UNCONFIRMED'});}
  }}finally{flight.current=false;if(alive.current)setBusy(false);}
 }
 useEffect(()=>{alive.current=true;if(current.current)void read();return()=>{alive.current=false;controller.current?.abort();if(timer.current)clearTimeout(timer.current);};},[]);
 return {pending,busy,error,read,start:(sessionId:string,content:string,assets:ChatAttachment[],password:string)=>admit({sessionId,content,assets,clientId:crypto.randomUUID(),consentVersion:'chat-media-openai-v1',status:'ADMITTING',canReplay:true},password),
  retryAdmission:(password:string)=>{const record=current.current;if(record?.status==='NOT_FOUND'&&record.canReplay)return admit(record,password);},
  forgetDeleted:(sessionId?:string)=>{if(current.current&&(!sessionId||current.current.sessionId===sessionId)){controller.current?.abort();clear();setError(undefined);}},
  adopt:(sessionId:string,clientId:string)=>{if(current.current||settled.current.has(clientId)||!uuid.test(sessionId)||!uuid.test(clientId))return;try{store({sessionId,clientId,content:'',assets:[],consentVersion:'chat-media-openai-v1',status:'READING',canReplay:false});void read();}catch{/* Retain the server-owned key in memory if browser storage is disabled. */}}
 };
}
