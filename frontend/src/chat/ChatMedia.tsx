import {useEffect,useId,useRef,useState} from 'react';
import {Paperclip,X} from 'lucide-react';
import {Modal} from '../components/Modal';
import {ErrorView} from '../bootstrap/components';
import {readChatMedia,type ChatAttachment,type ChatScope} from './chat-media';
import type {ChatUpload} from './useChatUploads';

export function ChatUploadTray({items,locked,onSelect,onRemove,onRetry}:{items:ChatUpload[];locked:boolean;onSelect:(files:File[])=>void;onRemove:(item:ChatUpload)=>void;onRetry:(item:ChatUpload)=>void}){
 const input=useRef<HTMLInputElement>(null),help=useId();
 return <section className="chat-upload-tray" aria-label="Tệp đính kèm bản nháp">
  {!!items.length&&<ul className="chat-upload-list">{items.map((item,index)=><li key={item.key}>
   {item.kind==='IMAGE'?<img src={item.url} alt={'Ảnh đã chọn '+(index+1)}/>:<video src={item.url} preload="metadata" muted playsInline aria-label={'Video đã chọn '+(index+1)}/>}
   <div className="chat-upload-info"><span title={item.file.name}>{item.file.name}</span>
    <small role="status">{item.stage==='UPLOADING'?`Đang tải ${item.progress}%`:item.stage==='PROCESSING'?'Đang xử lý…':item.stage==='READY'?'Sẵn sàng gửi':'Chưa tải được'}</small>
    {item.stage==='UPLOADING'&&<progress max={100} value={item.progress} aria-label={'Tiến độ tải tệp '+(index+1)}/>}
    {item.error!=null&&<ErrorView error={item.error}/>}
    {item.stage==='ERROR'&&<button type="button" disabled={locked} onClick={()=>onRetry(item)}>Thử tải lại</button>}
   </div>
   <button type="button" className="chat-icon-button" aria-label={'Bỏ tệp '+(index+1)} disabled={locked} onClick={()=>onRemove(item)}><X size={18}/></button>
  </li>)}</ul>}
  <div className="chat-upload-actions"><button type="button" aria-describedby={help} disabled={locked||items.length>=3||items.some(item=>item.kind==='VIDEO')} onClick={()=>input.current?.click()}><Paperclip size={16}/>Đính kèm</button><small id={help}>Tối đa 3 ảnh, 5 MB/ảnh hoặc 1 video MP4, 20 MB, 30 giây.</small></div>
  <input ref={input} type="file" className="chat-sr-only" tabIndex={-1} aria-label="Chọn ảnh hoặc video" accept="image/jpeg,image/png,image/webp,video/mp4" multiple onChange={event=>{const files=Array.from(event.target.files??[]);event.target.value='';if(files.length)onSelect(files);}}/>
 </section>;
}

export function ChatAttachmentView({scope,id,asset}:{scope:ChatScope;id:string;asset:ChatAttachment}){
 const [data,setData]=useState<{url?:string;error?:unknown}>({}),[attempt,setAttempt]=useState(0),[open,setOpen]=useState(false);
 const [videoRequested,setVideoRequested]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();let url:string|undefined;
  setData({});setOpen(false);
  if(asset.status==='READY'&&(asset.kind==='IMAGE'||videoRequested))void readChatMedia(scope,id,asset.id,controller.signal).then(blob=>{if(controller.signal.aborted)return;url=URL.createObjectURL(blob);setData({url});}).catch(error=>{if(!controller.signal.aborted)setData({error});});
  return()=>{controller.abort();if(url)URL.revokeObjectURL(url);};
 },[scope,id,asset.id,asset.status,asset.kind,attempt,videoRequested]);
 if(asset.status!=='READY')return <p role="status">Tệp không còn sẵn sàng.</p>;
 if(asset.kind==='VIDEO'&&!videoRequested)return <button type="button" className="chat-video-load" onClick={()=>setVideoRequested(true)}>Tải video · {Math.max(0.1,(asset.stored_bytes??asset.expected_bytes)/1048576).toLocaleString('vi-VN',{maximumFractionDigits:1})} MB</button>;
 if(data.error!=null)return <ErrorView error={data.error} onRetry={()=>setAttempt(value=>value+1)}/>;
 if(!data.url)return <p role="status">Đang tải tệp…</p>;
 return <div className="chat-private-media">
  {asset.kind==='VIDEO'?<video src={data.url} controls playsInline preload="metadata" aria-label="Video đính kèm"/>:<button type="button" aria-label="Xem ảnh đính kèm" onClick={()=>setOpen(true)}><img src={data.url} alt="Ảnh đính kèm" loading="lazy"/></button>}
  {open&&<Modal label="Ảnh đính kèm" onClose={()=>setOpen(false)}><div className="chat-image-viewer"><button type="button" onClick={()=>setOpen(false)} autoFocus aria-label="Đóng ảnh"><X size={20}/></button><img src={data.url} alt="Ảnh đính kèm phóng to"/></div></Modal>}
 </div>;
}
