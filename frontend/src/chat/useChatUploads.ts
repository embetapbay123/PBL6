import {useEffect,useRef,useState} from 'react';
import {request,ApiError} from '../api/client';
import {attachmentPath,checkChatFiles,type ChatAttachment,type ChatScope} from './chat-media';

export type ChatUpload={key:string;file:File;kind:'IMAGE'|'VIDEO';url:string;progress:number;stage:'UPLOADING'|'PROCESSING'|'READY'|'ERROR';asset?:ChatAttachment;error?:unknown};
export function useChatUploads(){
 const [entries,setEntries]=useState<Record<string,ChatUpload[]>>({}),current=useRef(entries),controllers=useRef(new Map<string,AbortController>()),alive=useRef(true);
 function publish(key:string,items:ChatUpload[]){current.current={...current.current,[key]:items};if(alive.current)setEntries(current.current);}
 function update(key:string,upload:string,values:Partial<ChatUpload>){publish(key,(current.current[key]??[]).map(item=>item.key===upload?{...item,...values}:item));}
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;controllers.current.forEach(controller=>controller.abort());Object.values(current.current).flat().forEach(item=>URL.revokeObjectURL(item.url));};},[]);
 async function upload(scope:ChatScope,id:string,item:ChatUpload){
  const key=scope+':'+id,controller=new AbortController();controllers.current.get(item.key)?.abort();controllers.current.set(item.key,controller);
  const signal=controller.signal,base=attachmentPath(scope,id);
  update(key,item.key,{stage:'UPLOADING',error:undefined,progress:0});
  try{
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await item.file.arrayBuffer()))).map(value=>value.toString(16).padStart(2,'0')).join('');
   if(signal.aborted)return;
   let asset=await request<ChatAttachment>(base,{method:'POST',body:JSON.stringify({client_upload_id:item.key,kind:item.kind,size_bytes:item.file.size,sha256:hash}),signal});
   update(key,item.key,{asset});
   if(asset.status==='UPLOADING')asset=await request<ChatAttachment>(base+'/'+asset.id+'/content',{method:'PUT',body:item.file,signal,onUploadProgress:progress=>{if(!signal.aborted)update(key,item.key,{progress});}});
   for(let n=0;asset.status==='PROCESSING'&&n<60;n++){
    update(key,item.key,{stage:'PROCESSING',progress:100,asset});
    await new Promise<void>((resolve,reject)=>{const cancel=()=>{clearTimeout(timer);reject(new Error('Canceled'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',cancel);resolve();},2000);signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();});
    asset=await request<ChatAttachment>(base+'/'+asset.id,{signal});
   }
   if(asset.status!=='READY')throw new ApiError(409,'CHAT_FILE_NOT_READY',asset.message??'Tệp chưa sẵn sàng. Thử tải lại hoặc chọn tệp khác.');
   if(!signal.aborted)update(key,item.key,{stage:'READY',progress:100,asset});
  }catch(error){if(!signal.aborted&&alive.current)update(key,item.key,{stage:'ERROR',error});}
  finally{if(controllers.current.get(item.key)===controller)controllers.current.delete(item.key);}
 }
 function select(scope:ChatScope,id:string,files:File[]){
  const key=scope+':'+id,existing=current.current[key]??[],kinds=checkChatFiles(files,existing);
  const items=files.map((file,index):ChatUpload=>({key:crypto.randomUUID(),file,kind:kinds[index],url:URL.createObjectURL(file),stage:'UPLOADING',progress:0}));
  publish(key,[...existing,...items]);items.forEach(item=>void upload(scope,id,item));
 }
 async function remove(scope:ChatScope,id:string,item:ChatUpload){
  const key=scope+':'+id;controllers.current.get(item.key)?.abort();controllers.current.delete(item.key);
  // Revoke the preview immediately. Unacknowledged metadata admissions expire in 24h.
  URL.revokeObjectURL(item.url);publish(key,(current.current[key]??[]).filter(value=>value.key!==item.key));
  if(item.asset)await request(attachmentPath(scope,id,item.asset.id),{method:'DELETE'});
 }
 function accepted(scope:ChatScope,id:string){const key=scope+':'+id;(current.current[key]??[]).forEach(item=>{controllers.current.get(item.key)?.abort();URL.revokeObjectURL(item.url);});publish(key,[]);}
 return {entries,current,select,remove,retry:upload,accepted};
}
