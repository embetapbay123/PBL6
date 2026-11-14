import {constants} from 'node:fs';
import {mkdir,chmod,lstat,open,link,unlink,stat,statfs,readdir} from 'node:fs/promises';
import {isAbsolute,resolve,dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {ApiError} from '../../../shared/src/errors';

const keyPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(upload|image\.webp|video\.mp4|preview\.webp|frame-[0-7]\.jpg)$/;
export type ChatFileKind='IMAGE'|'VIDEO';
export const imageLimit=5242880,videoLimit=20971520;
export function validateUploadSize(kind:ChatFileKind,size:number){
  if(!['IMAGE','VIDEO'].includes(kind)||!Number.isSafeInteger(size)||size<1||size>(kind==='IMAGE'?imageLimit:videoLimit))
    throw new ApiError(413,'CHAT_FILE_TOO_LARGE','Chọn ảnh tối đa 5 MB hoặc video MP4 tối đa 20 MB.');
}
export function detectedFormat(bytes:Buffer,kind:ChatFileKind):'mjpeg'|'png'|'webp'|'mov'{
  if(kind==='IMAGE'){
    if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'mjpeg';
    if(bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
    if(bytes.length>=12&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return 'webp';
  }else if(kind==='VIDEO'&&bytes.length>=12&&bytes.toString('ascii',4,8)==='ftyp')return 'mov';
  throw new ApiError(422,'CHAT_FILE_TYPE_INVALID','Chọn ảnh JPG, PNG, WebP tĩnh hoặc video MP4.');
}
/** APNG/animated WebP can look like a still image to a forced decoder. Reject their containers first. */
export function assertStaticImage(bytes:Buffer,format:'mjpeg'|'png'|'webp'){
  if(format==='mjpeg')return;
  const webp=format==='webp';let at=webp?12:8;
  while(at+8<=bytes.length){
    const size=webp?bytes.readUInt32LE(at+4):bytes.readUInt32BE(at),type=bytes.toString('ascii',at+(webp?0:4),at+(webp?4:8));
    if((!webp&&type==='acTL')||(webp&&['ANIM','ANMF'].includes(type))||webp&&type==='VP8X'&&at+8<bytes.length&&(bytes[at+8]&2))
      throw new ApiError(422,'CHAT_IMAGE_ANIMATED','Chọn ảnh JPG, PNG hoặc WebP tĩnh.');
    const step=webp?8+size+(size%2):12+size;
    if(step>bytes.length-at)throw new ApiError(422,'CHAT_FILE_INVALID','Không đọc được tệp. Hãy chọn tệp khác.');
    at+=step;if(!webp&&type==='IEND')break;
  }
}
/** Single bounded byte ranges only; reject overflow, multipart and unsatisfiable ranges. */
export function byteRange(value:string|undefined,size:number):{start:number;end:number}|undefined{
  if(!value)return undefined;
  const match=/^bytes=(\d*)-(\d*)$/.exec(value);
  if(!Number.isSafeInteger(size)||size<1||!match||(!match[1]&&!match[2]))throw new ApiError(416,'RANGE_NOT_SATISFIABLE','Khoảng tải không hợp lệ.');
  let start:number,end:number;
  if(!match[1]){const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<1)throw new ApiError(416,'RANGE_NOT_SATISFIABLE','Khoảng tải không hợp lệ.');start=Math.max(0,size-suffix);end=size-1;}
  else{start=Number(match[1]);end=match[2]?Number(match[2]):size-1;}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||start>=size)throw new ApiError(416,'RANGE_NOT_SATISFIABLE','Khoảng tải không hợp lệ.');
  return {start,end:Math.min(end,size-1)};
}

/** Opaque server keys only. Original names, URLs and paths never become filesystem paths. */
export class PrivateChatFiles {
  readonly root:string;
  constructor(directory:string){
    if(!isAbsolute(directory))throw new Error('CHAT_MEDIA_DIRECTORY_MUST_BE_ABSOLUTE');
    this.root=resolve(directory);
  }
  async prepare(){
    await mkdir(this.root,{recursive:true,mode:0o700});
    if((await lstat(this.root)).isSymbolicLink())throw new Error('CHAT_MEDIA_DIRECTORY_SYMLINK');
    await chmod(this.root,0o700);
  }
  path(key:string){
    if(!keyPattern.test(key))throw new Error('INVALID_CHAT_MEDIA_KEY');
    const file=resolve(this.root,key);
    if(dirname(file)!==this.root)throw new Error('INVALID_CHAT_MEDIA_PATH');
    return file;
  }
  async available(){
    await this.prepare();const disk=await statfs(this.root);
    if(BigInt(disk.bavail)*BigInt(disk.bsize)<256n*1024n*1024n)throw new ApiError(503,'CHAT_STORAGE_FULL','Chưa thể lưu tệp. Hãy thử lại sau.');
  }
  async openRead(key:string){
    const handle=await open(this.path(key),constants.O_RDONLY|(constants.O_NOFOLLOW??0));
    const info=await handle.stat();
    if(!info.isFile()){await handle.close();throw new Error('CHAT_MEDIA_NOT_A_FILE');}
    return {handle,info};
  }
  async temporary(){
    await this.available();
    const key=randomUUID()+'.upload',handle=await open(this.path(key),constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY,0o600);
    return {key,handle};
  }
  async publish(temporary:string,target:string){
    const source=this.path(temporary),destination=this.path(target);
    const info=await lstat(source);
    if(!info.isFile()||info.isSymbolicLink())throw new Error('CHAT_MEDIA_NOT_A_FILE');
    // link is atomic and exclusive; rename could overwrite a competing worker's output.
    try{await link(source,destination);}catch(error){if((error as NodeJS.ErrnoException).code==='EEXIST')throw new Error('CHAT_MEDIA_TARGET_EXISTS');throw error;}
    await unlink(source);
    return stat(destination);
  }
  async remove(key:string){
    try{await unlink(this.path(key));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  }
  async oldFiles(before:number){
    await this.prepare();const result:Array<{key:string;mtime:number}>=[];
    for(const item of await readdir(this.root,{withFileTypes:true})){
      if(!item.isFile()||!keyPattern.test(item.name))continue;
      const info=await lstat(this.path(item.name));if(info.mtimeMs<before)result.push({key:item.name,mtime:info.mtimeMs});
    }
    return result;
  }
}
