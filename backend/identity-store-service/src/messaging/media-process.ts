import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {stat} from 'node:fs/promises';
import {ApiError} from '../../../shared/src/errors';
import {PrivateChatFiles,detectedFormat,assertStaticImage,validateUploadSize,type ChatFileKind,videoLimit} from './media-files';

const execute=promisify(execFile);
export interface ProcessedChatMedia {key:string;preview?:string;content_type:string;stored_bytes:number;width:number;height:number;duration_ms?:number}
/** Fixed local inputs/formats, one native thread, bounded output/time; never shell commands. */
export class ChatMediaProcessor {
  constructor(private readonly files:PrivateChatFiles,
    private readonly binaries={ffmpeg:'/usr/bin/ffmpeg',ffprobe:'/usr/bin/ffprobe'},
    private readonly diagnostic:(error:unknown)=>void=()=>{}){}
  private async run(binary:string,args:string[],timeout:number){
    const command=process.platform==='linux'?'/usr/bin/prlimit':binary;
    const parameters=process.platform==='linux'?['--as=1073741824','--cpu=45','--nofile=64','--',binary,...args]:args;
    try{return await execute(command,parameters,{timeout,maxBuffer:1024*1024,windowsHide:true,killSignal:'SIGKILL'});}
    catch(error){this.diagnostic(error);throw new ApiError(422,'CHAT_FILE_INVALID','Không đọc được tệp. Chọn ảnh tĩnh hoặc video MP4 không quá 30 giây.');}
  }
  async ready(){
    await this.run(this.binaries.ffmpeg,['-version'],3000);await this.run(this.binaries.ffprobe,['-version'],3000);
  }
  async process(uploadKey:string,kind:ChatFileKind):Promise<ProcessedChatMedia>{
    const input=this.files.path(uploadKey),source=await this.files.openRead(uploadKey);
    const header=Buffer.alloc(16);let imageBytes:Buffer|undefined;
    try{validateUploadSize(kind,source.info.size);await source.handle.read(header,0,header.length,0);if(kind==='IMAGE')imageBytes=await source.handle.readFile();}finally{await source.handle.close();}
    const format=detectedFormat(header,kind),image=kind==='IMAGE';
    if(image)assertStaticImage(imageBytes!,format as 'mjpeg'|'png'|'webp');
    // Fixed image pipe demuxers select their decoder on both FFmpeg and ffprobe 5.x.
    // MOV external data references are disabled; network protocols are never allowed.
    const inputArgs=image?['-f',format==='mjpeg'?'jpeg_pipe':format+'_pipe']:['-f','mov','-enable_drefs','0','-use_absolute_path','0'];
    const safeInput=['-protocol_whitelist','file,pipe',...inputArgs,'-i',input];
    const {stdout}=await this.run(this.binaries.ffprobe,['-v','error','-threads','1',...safeInput,
      ...(image?['-count_frames']:[]),'-show_entries','stream=codec_type,width,height,nb_read_frames,duration:format=duration','-of','json'],10000);
    let info:any;try{info=JSON.parse(stdout);}catch{throw new ApiError(422,'CHAT_FILE_INVALID','Không đọc được tệp. Hãy chọn tệp khác.');}
    const streams=Array.isArray(info.streams)?info.streams:[],videos=streams.filter((s:any)=>s.codec_type==='video'),video=videos[0];
    const width=Number(video?.width),height=Number(video?.height),duration=Number(info.format?.duration??video?.duration);
    if(videos.length!==1||!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||Math.min(width,height)<32||width*height>24000000||Math.max(width,height)>8192)
      throw new ApiError(422,'CHAT_FILE_DIMENSIONS','Tệp cần có một khung hình từ 32 px và không quá 24 megapixel.');
    if(image&&(Number(video.nb_read_frames)!==1||streams.some((s:any)=>s.codec_type!=='video')))
      throw new ApiError(422,'CHAT_IMAGE_ANIMATED','Chọn ảnh JPG, PNG hoặc WebP tĩnh.');
    if(!image&&(!Number.isFinite(duration)||duration<=0||duration>30.05||streams.some((s:any)=>!['video','audio'].includes(s.codec_type))))
      throw new ApiError(422,'CHAT_VIDEO_DURATION','Chọn video MP4 không quá 30 giây.');
    const id=randomUUID(),output=id+(image?'.image.webp':'.video.mp4'),preview=image?undefined:id+'.preview.webp';
    const outputPath=this.files.path(output),common=['-nostdin','-v','error','-threads','1','-filter_threads','1',...safeInput,'-map','0:v:0','-map_metadata','-1','-map_chapters','-1'];
    try{
      if(image)await this.run(this.binaries.ffmpeg,[...common,'-frames:v','1','-vf',"scale='min(1600,iw)':'min(1600,ih)':force_original_aspect_ratio=decrease",'-c:v','libwebp','-threads','1','-quality','85','-an','-f','webp','-n',outputPath],15000);
      else{
        await this.run(this.binaries.ffmpeg,[...common,'-map','0:a:0?','-t','30','-vf',"scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=24",'-c:v','libx264','-threads','1','-preset','veryfast','-crf','26','-maxrate','2M','-bufsize','4M','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart','-f','mp4','-n',outputPath],45000);
        await this.run(this.binaries.ffmpeg,['-nostdin','-v','error','-threads','1','-filter_threads','1','-protocol_whitelist','file,pipe','-f','mov','-enable_drefs','0','-use_absolute_path','0','-i',outputPath,'-map','0:v:0','-frames:v','1','-vf',"scale='min(480,iw)':'min(480,ih)':force_original_aspect_ratio=decrease",'-map_metadata','-1','-an','-c:v','libwebp','-threads','1','-f','webp','-n',this.files.path(preview!)],10000);
      }
      const bytes=(await stat(outputPath)).size;
      if(bytes<1||bytes>(image?5*1024*1024:videoLimit))throw new Error('Normalized file exceeds limit');
      const normalized=JSON.parse((await this.run(this.binaries.ffprobe,['-v','error','-protocol_whitelist','file,pipe','-i',outputPath,'-show_entries','stream=codec_type,width,height','-of','json'],5000)).stdout).streams.find((s:any)=>s.codec_type==='video');
      return {key:output,...(preview?{preview}:{}),content_type:image?'image/webp':'video/mp4',stored_bytes:bytes,width:normalized.width,height:normalized.height,...(!image?{duration_ms:Math.min(30000,Math.round(duration*1000))}:{})};
    }catch(error){await Promise.allSettled([this.files.remove(output),...(preview?[this.files.remove(preview)]:[])]);throw error;}
  }
}
