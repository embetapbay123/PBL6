import {createHash,randomUUID} from 'node:crypto';
import type {DataSource,EntityManager} from 'typeorm';
import {database} from '../../../shared/src/database';
import {config} from '../../../shared/src/config';
import {ApiError} from '../../../shared/src/errors';
import type {OperationOutputs,OperationInputs} from '../../../shared/src/operations.generated';
import {PrivateChatFiles,imageLimit,videoLimit,validateUploadSize,type ChatFileKind} from './media-files';
import {ChatMediaProcessor} from './media-process';
import {chatParticipant,chatIpHash,type ChatMediaActor,type ChatSide} from './media-scope';

export interface ChatAttachmentRow {id:string;conversation_id:string;owner_user_id:string;client_upload_id:string;kind:ChatFileKind;
 expected_bytes:number;input_sha256:string;status:string;stored_bytes:number;content_type?:'image/webp'|'video/mp4';width?:number;height?:number;duration_ms?:number;
 file_key?:string;preview_key?:string;error_code?:string;lease_token?:string;lease_until?:Date;message_id?:string;expires_at?:Date}
const rows=(value:any):any[]=>Array.isArray(value[0])?value[0]:value;
export function attachmentDto(row:ChatAttachmentRow):OperationOutputs['createOwnConversationAttachment']{
 return {id:row.id,kind:row.kind,status:row.status as any,expected_bytes:row.expected_bytes,
  ...(row.status==='READY'?{stored_bytes:row.stored_bytes,content_type:row.content_type,width:row.width,height:row.height,...(row.duration_ms?{duration_ms:row.duration_ms}:{})}:{}),
  ...(row.expires_at?{expires_at:new Date(row.expires_at).toISOString()}:{}),
  ...(row.error_code?{error_code:row.error_code,message:'Không xử lý được tệp. Chọn ảnh tĩnh hoặc video MP4 không quá 30 giây.'}:{})};
}
export class ChatMediaService {
 readonly files:PrivateChatFiles;
 private readonly processor:ChatMediaProcessor;
 private nativeReady?:Promise<boolean>;
 private working=false;
 private sweeps=0;
 private timer?:NodeJS.Timeout;
 constructor(private readonly injectedSource?:DataSource,private readonly options:{enabled?:boolean;directory?:string;ipKey?:string}={}){
  this.files=new PrivateChatFiles(options.directory??process.env.CHAT_MEDIA_STORAGE_DIR??'/var/lib/pbl6/chat-media');
  this.processor=new ChatMediaProcessor(this.files);
 }
 private get source():DataSource{return this.injectedSource??database;}
 private get enabled(){return this.options.enabled??process.env.CHAT_MEDIA_ENABLED==='1';}
 private async ready(){
  if(!this.enabled)return false;
  const [schema]=await this.source.query("SELECT to_regclass('chat_attachment') IS NOT NULL AS present");if(!schema.present)return false;
  this.nativeReady??=this.processor.ready().then(()=>true,()=>false);
  if(!await this.nativeReady)return false;
  try{await this.files.available();return true;}catch{return false;}
 }
 private async requireReady(){if(!await this.ready())throw new ApiError(503,'CHAT_MEDIA_DISABLED','Gửi tệp đang tạm dừng. Bạn vẫn có thể gửi tin nhắn văn bản.');}
 async capabilities(id:string,actor:ChatMediaActor,side:ChatSide):Promise<OperationOutputs['getOwnConversationMediaCapabilities']>{
  const thread=await chatParticipant(this.source.manager,id,actor,side);
  return {enabled:thread.store_status==='ACTIVE'&&await this.ready(),images_per_message:3,image_max_bytes:imageLimit,video_max_bytes:videoLimit,video_max_duration_seconds:30};
 }
 private async owned(manager:EntityManager,id:string,assetId:string,actor:ChatMediaActor,side:ChatSide,write=false,lock=false){
  await chatParticipant(manager,id,actor,side,write);
  const [row]=await manager.query('SELECT * FROM chat_attachment WHERE id=$1 AND conversation_id=$2'+(lock?' FOR UPDATE':''),[assetId,id]);
  if(!row||(!row.message_id&&row.owner_user_id!==actor.user_id))throw new ApiError(404,'NOT_FOUND','Không tìm thấy tệp của hội thoại.');
  return row as ChatAttachmentRow;
 }
 async create(id:string,input:OperationInputs['createOwnConversationAttachment']['body'],actor:ChatMediaActor,side:ChatSide,ip:string){
  await this.requireReady();validateUploadSize(input.kind,input.size_bytes);
  const ipHash=chatIpHash(ip,this.options.ipKey??config('M3').internalKeys.M3);
  return this.source.transaction(async manager=>{
   await chatParticipant(manager,id,actor,side,true);
   // Serialize admission for the shared storage/day/IP quotas. No raw IP is retained.
   await manager.query('SELECT pg_advisory_xact_lock(71520031)');
   const [existing]=await manager.query('SELECT * FROM chat_attachment WHERE owner_user_id=$1 AND client_upload_id=$2',[actor.user_id,input.client_upload_id]);
   if(existing){if(existing.conversation_id!==id||existing.kind!==input.kind||existing.expected_bytes!==input.size_bytes||existing.input_sha256!==input.sha256)throw new ApiError(409,'UPLOAD_KEY_CONFLICT','Lần tải này đã dùng cho tệp khác. Hãy chọn lại tệp.');return attachmentDto(existing);}
   const [usage]=await manager.query(`SELECT
     count(*) FILTER(WHERE owner_user_id=$1 AND status IN ('UPLOADING','PROCESSING'))::int AS pending,
     coalesce(sum(CASE WHEN kind='IMAGE' THEN 5242880 ELSE 20971520 END) FILTER(WHERE owner_user_id=$1 AND created_at>now()-interval '24 hours'),0)::bigint AS user_day,
     coalesce(sum(CASE WHEN kind='IMAGE' THEN 5242880 ELSE 20971520 END) FILTER(WHERE ip_hash=$2 AND created_at>now()-interval '24 hours'),0)::bigint AS ip_day,
     coalesce(sum(CASE WHEN kind='IMAGE' THEN 5242880 ELSE 20971520 END) FILTER(WHERE created_at>now()-interval '24 hours'),0)::bigint AS global_day,
     coalesce(sum(CASE WHEN kind='IMAGE' THEN 5242880 ELSE 20971520 END) FILTER(WHERE owner_user_id=$1 AND status IN ('UPLOADING','PROCESSING','READY')),0)::bigint AS stored_user,
     coalesce(sum(CASE WHEN kind='IMAGE' THEN 5242880 ELSE 20971520 END) FILTER(WHERE status IN ('UPLOADING','PROCESSING','READY')),0)::bigint AS stored_global
     FROM chat_attachment`,[actor.user_id,ipHash]);
   const reserve=input.kind==='IMAGE'?imageLimit:videoLimit;
   if(usage.pending>=3||Number(usage.user_day)+reserve>50*1024*1024||Number(usage.ip_day)+reserve>100*1024*1024||Number(usage.global_day)+reserve>500*1024*1024)
    throw new ApiError(429,'CHAT_UPLOAD_QUOTA','Đã đạt giới hạn tải tệp trong 24 giờ. Bạn vẫn có thể gửi văn bản.');
   if(Number(usage.stored_user)+reserve>100*1024*1024||Number(usage.stored_global)+reserve>1024*1024*1024)
    throw new ApiError(429,'CHAT_STORAGE_QUOTA','Chưa thể lưu thêm tệp. Bạn vẫn có thể gửi văn bản.');
   await this.files.available();
   const [row]=await manager.query(`INSERT INTO chat_attachment(conversation_id,owner_user_id,client_upload_id,kind,expected_bytes,input_sha256,ip_hash)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[id,actor.user_id,input.client_upload_id,input.kind,input.size_bytes,input.sha256,ipHash]);
   return attachmentDto(row);
  });
 }
 async metadata(id:string,assetId:string,actor:ChatMediaActor,side:ChatSide){
  return attachmentDto(await this.owned(this.source.manager,id,assetId,actor,side));
 }
 async upload(id:string,assetId:string,actor:ChatMediaActor,side:ChatSide,stream:AsyncIterable<Uint8Array>,contentType:string,contentLength?:string){
  await this.requireReady();
  if(contentType.toLowerCase().split(';')[0].trim()!=='application/octet-stream')throw new ApiError(415,'CHAT_UPLOAD_CONTENT_TYPE','Tải nội dung tệp dưới dạng nhị phân.');
  const token=randomUUID(),row=await this.source.transaction(async manager=>{
   const row=await this.owned(manager,id,assetId,actor,side,true,true);
   if(row.owner_user_id!==actor.user_id||row.message_id)throw new ApiError(409,'CHAT_FILE_ALREADY_SENT','Tệp đã gửi không thể thay thế.');
   if(row.status==='READY'||row.status==='PROCESSING')return row;
   if(row.status!=='UPLOADING'||!row.expires_at||new Date(row.expires_at).getTime()<=Date.now())throw new ApiError(409,'CHAT_UPLOAD_CLOSED','Lần tải này đã kết thúc. Hãy chọn lại tệp.');
   if(row.lease_until&&new Date(row.lease_until).getTime()>Date.now())throw new ApiError(409,'CHAT_UPLOAD_PENDING','Tệp đang được tải. Hãy đọc lại trạng thái.');
   if(contentLength!==undefined&&Number(contentLength)!==row.expected_bytes)throw new ApiError(422,'CHAT_UPLOAD_SIZE_MISMATCH','Dung lượng tệp đã thay đổi. Hãy chọn lại tệp.');
   await manager.query("UPDATE chat_attachment SET lease_token=$2,lease_until=now()+interval '2 minutes',version=version+1 WHERE id=$1",[assetId,token]);return row;
  });
  if(['READY','PROCESSING'].includes(row.status))return attachmentDto(row);
  const temporary=await this.files.temporary(),hash=createHash('sha256');let size=0;
  try{
   for await(const chunk of stream){size+=chunk.byteLength;if(size>row.expected_bytes)throw new ApiError(413,'CHAT_FILE_TOO_LARGE','Dung lượng tệp vượt giới hạn của lần tải này.');hash.update(chunk);await temporary.handle.writeFile(chunk);}
   if(size!==row.expected_bytes||hash.digest('hex')!==row.input_sha256)throw new ApiError(422,'CHAT_UPLOAD_CHECKSUM','Tệp tải lên chưa đầy đủ. Hãy chọn lại tệp.');
   await temporary.handle.close();
   try{await this.files.publish(temporary.key,assetId+'.upload');}catch(error){if((error as Error).message!=='CHAT_MEDIA_TARGET_EXISTS')throw error;await this.files.remove(temporary.key);}
   const changed=rows(await this.source.query("UPDATE chat_attachment SET status='PROCESSING',lease_token=NULL,lease_until=NULL,updated_at=now(),version=version+1 WHERE id=$1 AND status='UPLOADING' AND lease_token=$2 RETURNING *",[assetId,token]));
   if(!changed.length){
    const [current]=await this.source.query('SELECT status FROM chat_attachment WHERE id=$1',[assetId]);
    if(!current||['DELETED','EXPIRED','REJECTED'].includes(current.status))await this.files.remove(assetId+'.upload');
    throw new ApiError(409,'CHAT_UPLOAD_CLOSED','Lần tải này đã thay đổi. Hãy đọc lại trạng thái tệp.');
   }
   void this.tick();return attachmentDto(changed[0]);
  }catch(error){
   await this.source.query("UPDATE chat_attachment SET status='REJECTED',error_code='CHAT_UPLOAD_FAILED',lease_token=NULL,lease_until=NULL,updated_at=now(),version=version+1 WHERE id=$1 AND status='UPLOADING' AND lease_token=$2",[assetId,token]);throw error;
  }finally{await temporary.handle.close().catch(()=>{});await this.files.remove(temporary.key).catch(()=>{});}
 }
 async cancel(id:string,assetId:string,actor:ChatMediaActor,side:ChatSide){
  const row=await this.source.transaction(async manager=>{
   const current=await this.owned(manager,id,assetId,actor,side,false,true);
   if(current.owner_user_id!==actor.user_id||current.message_id)throw new ApiError(409,'CHAT_FILE_ALREADY_SENT','Tệp đã gửi không thể xóa từ bản nháp.');
   await manager.query("UPDATE chat_attachment SET status='DELETED',lease_token=NULL,lease_until=NULL,updated_at=now(),version=version+1 WHERE id=$1",[assetId]);return {...current,status:'DELETED'};
  });
  await Promise.allSettled([this.files.remove(assetId+'.upload'),...(row.file_key?[this.files.remove(row.file_key)]:[]),...(row.preview_key?[this.files.remove(row.preview_key)]:[])]);
  return attachmentDto(row);
 }
 async content(id:string,assetId:string,actor:ChatMediaActor,side:ChatSide,preview=false){
  const row=await this.owned(this.source.manager,id,assetId,actor,side);
  if(row.status!=='READY'||(!row.message_id&&row.expires_at&&new Date(row.expires_at).getTime()<=Date.now()))throw new ApiError(404,'CHAT_FILE_UNAVAILABLE','Tệp không còn sẵn sàng.');
  const key=preview?row.preview_key:row.file_key;if(!key)throw new ApiError(404,'CHAT_FILE_UNAVAILABLE','Tệp không còn sẵn sàng.');
  try{const opened=await this.files.openRead(key);return {...opened,content_type:preview?'image/webp':row.content_type!,kind:row.kind};}
  catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')throw new ApiError(404,'CHAT_FILE_UNAVAILABLE','Tệp không còn sẵn sàng.');throw error;}
 }
 start(){if(this.timer)return;this.timer=setInterval(()=>{void this.tick();},1000);this.timer.unref();}
 stop(){if(this.timer)clearInterval(this.timer);this.timer=undefined;}
 async tick(){
  if(this.working||!this.source?.isInitialized)return;this.working=true;
  try{
   // Expire drafts even while uploads are disabled or the disk is low; otherwise
   // the storage guard could prevent the very cleanup that makes room again.
   if(++this.sweeps%60===0){
    const [schema]=await this.source.query("SELECT to_regclass('chat_attachment') IS NOT NULL AS present");
    if(schema.present)await this.sweep();
   }
   if(!await this.ready())return;
   const token=randomUUID(),job=await this.source.transaction(async manager=>{
    const [job]=await manager.query("SELECT * FROM chat_attachment WHERE status='PROCESSING' AND expires_at>now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED");if(!job)return undefined;
    await manager.query("UPDATE chat_attachment SET lease_token=$2,lease_until=now()+interval '90 seconds',version=version+1 WHERE id=$1",[job.id,token]);return job as ChatAttachmentRow;
   });
   if(job){
    let result:Awaited<ReturnType<ChatMediaProcessor['process']>>|undefined;
    try{
     result=await this.processor.process(job.id+'.upload',job.kind);
     const updated=rows(await this.source.query(`UPDATE chat_attachment SET status='READY',file_key=$3,preview_key=$4,content_type=$5,stored_bytes=$6,width=$7,height=$8,duration_ms=$9,
       lease_token=NULL,lease_until=NULL,updated_at=now(),version=version+1 WHERE id=$1 AND status='PROCESSING' AND lease_token=$2 AND lease_until>now() RETURNING id`,
      [job.id,token,result.key,result.preview??null,result.content_type,result.stored_bytes,result.width,result.height,result.duration_ms??null]));
     if(!updated.length)await Promise.allSettled([this.files.remove(result.key),...(result.preview?[this.files.remove(result.preview)]:[])]);
     else await this.files.remove(job.id+'.upload').catch(()=>{});
    }catch(error){
     const code=error instanceof ApiError?(error.getResponse() as {code?:string}).code??'CHAT_FILE_INVALID':'CHAT_FILE_INVALID';
     const updated=rows(await this.source.query("UPDATE chat_attachment SET status='REJECTED',error_code=$3,lease_token=NULL,lease_until=NULL,updated_at=now(),version=version+1 WHERE id=$1 AND status='PROCESSING' AND lease_token=$2 RETURNING id",[job.id,token,code]));
     // A lost READY acknowledgement may already have committed. Never delete a
     // file referenced by that committed row; unreadable DB state leaves cleanup
     // to the orphan sweeper instead of destroying a potentially sent image.
     const [current]=await this.source.query('SELECT status,file_key,preview_key FROM chat_attachment WHERE id=$1',[job.id]);
     if(result&&current?.file_key!==result.key)await Promise.allSettled([this.files.remove(result.key),...(result.preview&&current?.preview_key!==result.preview?[this.files.remove(result.preview)]:[])]);
     if(updated.length||current?.status==='READY')await this.files.remove(job.id+'.upload').catch(()=>{});
    }
   }
  }catch{/* Retry transient database/storage errors on the next bounded tick; no user content is logged. */}
  finally{this.working=false;}
 }
 private async sweep(){
  const expired=rows(await this.source.query("UPDATE chat_attachment SET status='EXPIRED',lease_token=NULL,lease_until=NULL,updated_at=now(),version=version+1 WHERE message_id IS NULL AND expires_at<now() AND status IN ('UPLOADING','PROCESSING','READY') RETURNING *"));
  const retired=await this.source.query("SELECT * FROM chat_attachment WHERE status IN ('DELETED','EXPIRED') AND (file_key IS NOT NULL OR preview_key IS NOT NULL) ORDER BY updated_at LIMIT 100");
  for(const row of [...expired,...retired]){
   await Promise.all([this.files.remove(row.id+'.upload'),...(row.file_key?[this.files.remove(row.file_key)]:[]),...(row.preview_key?[this.files.remove(row.preview_key)]:[])]);
   await this.source.query('UPDATE chat_attachment SET file_key=NULL,preview_key=NULL,stored_bytes=0 WHERE id=$1 AND status IN (\'DELETED\',\'EXPIRED\')',[row.id]);
  }
  const old=await this.files.oldFiles(Date.now()-2*60*60*1000);
  if(old.length){
   const references=await this.source.query<Array<Pick<ChatAttachmentRow,'id'|'status'|'file_key'|'preview_key'>>>("SELECT id,status,file_key,preview_key FROM chat_attachment WHERE status IN ('UPLOADING','PROCESSING','READY')");
   const live=new Set<string>(references.flatMap(row=>[...(row.status==='READY'?[]:[row.id+'.upload']),row.file_key,row.preview_key].filter((key):key is string=>typeof key==='string')));
   for(const file of old)if(!live.has(file.key))await this.files.remove(file.key);
  }
 }
}
