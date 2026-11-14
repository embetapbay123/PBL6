import {ApiError,request} from '../api/client';
import type {components} from '../api/generated';
export type ChatAttachment=components['schemas']['ChatAttachment'];
export type ChatMediaCapabilities=components['schemas']['ChatMediaCapabilities'];
export type ChatScope='CUSTOMER'|'STORE';
export const attachmentPath=(scope:ChatScope,id:string,asset?:string)=>`/${scope==='CUSTOMER'?'me':'store'}/conversations/${encodeURIComponent(id)}/attachments${asset?'/'+encodeURIComponent(asset):''}`;
export const mediaCapabilities=(scope:ChatScope,id:string,signal?:AbortSignal)=>request<ChatMediaCapabilities>(attachmentPath(scope,id)+'/capabilities',{signal});
export const readChatMedia=(scope:ChatScope,id:string,asset:string,signal:AbortSignal)=>request<Blob>(attachmentPath(scope,id,asset)+'/content',{signal,binaryResponse:true});
export function checkChatFiles(files:File[],current:{kind:'IMAGE'|'VIDEO'}[]){
 const kinds=files.map(file=>{
  const kind=file.type==='video/mp4'?'VIDEO':/^image\/(jpeg|png|webp)$/.test(file.type)?'IMAGE':undefined;
  if(!kind)throw new ApiError(422,'CHAT_FILE_TYPE_INVALID','Chọn ảnh JPG, PNG, WebP tĩnh hoặc video MP4.');
  if(!file.size||file.size>(kind==='IMAGE'?5242880:20971520))throw new ApiError(413,'CHAT_FILE_TOO_LARGE','Ảnh tối đa 5 MB; video MP4 tối đa 20 MB, 30 giây.');
  return kind;
 });
 const all=[...current.map(item=>item.kind),...kinds];
 if(all.length>3||all.includes('VIDEO')&&all.length!==1)throw new ApiError(422,'CHAT_ATTACHMENT_COMBINATION','Mỗi tin gửi tối đa 3 ảnh hoặc 1 video.');
 return kinds;
}
