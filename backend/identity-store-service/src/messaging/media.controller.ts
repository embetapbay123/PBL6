import {Controller,Get,Post,Put,Delete,Req,Res,UseGuards,HttpCode,Header} from '@nestjs/common';
import {AuthGuard,Roles} from '../../../shared/src/auth';
import {byteRange} from './media-files';
import {ChatMediaService} from './media.service';
import type {ChatSide} from './media-scope';

const service=new ChatMediaService();
const privateHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; sandbox"};
export function chatAttachmentsController(prefix:'me'|'store',side:ChatSide,mediaService:ChatMediaService=service){
 const service=mediaService;
 const roles=side==='CUSTOMER'?['CUSTOMER']:['STORE_OWNER','SELLER'];
 @Controller(prefix+'/conversations/:id/attachments')
 @UseGuards(AuthGuard)
 @Roles(...roles)
 class ChatAttachmentsController {
  onModuleInit(){service.start();}
  onModuleDestroy(){service.stop();}
  @Get('capabilities')
  @Header('Cache-Control','private, no-store')
  capabilities(@Req()req:any){return service.capabilities(req.params.id,req.auth,side);}
  @Post()
  @Header('Cache-Control','private, no-store')
  create(@Req()req:any){return service.create(req.params.id,req.contract.body,req.auth,side,req.ip??req.socket.remoteAddress??'');}
  @Put(':attachment_id/content') @HttpCode(200)
  @Header('Cache-Control','private, no-store')
  async upload(@Req()req:any){
   req.setTimeout(120000,()=>req.destroy());
   try{return await service.upload(req.params.id,req.params.attachment_id,req.auth,side,req,req.headers['content-type']??'',req.headers['content-length']);}
   finally{req.setTimeout(0);}
  }
  @Get(':attachment_id')
  @Header('Cache-Control','private, no-store')
  metadata(@Req()req:any){return service.metadata(req.params.id,req.params.attachment_id,req.auth,side);}
  @Delete(':attachment_id') @HttpCode(200)
  @Header('Cache-Control','private, no-store')
  cancel(@Req()req:any){return service.cancel(req.params.id,req.params.attachment_id,req.auth,side);}
  @Get(':attachment_id/content')
  async content(@Req()req:any,@Res()res:any){
   const file=await service.content(req.params.id,req.params.attachment_id,req.auth,side,req.contract.query.preview);
   let range:ReturnType<typeof byteRange>;
   try{range=byteRange(req.headers.range,file.info.size);}catch(error){await file.handle.close();res.setHeader('Content-Range','bytes */'+file.info.size);throw error;}
   res.set(privateHeaders);res.setHeader('Content-Type',file.content_type);res.setHeader('Accept-Ranges','bytes');
   res.setHeader('Content-Disposition','inline; filename="chat-'+req.params.attachment_id+(file.content_type==='video/mp4'?'.mp4':'.webp')+'"');
   res.setHeader('Content-Length',range?range.end-range.start+1:file.info.size);
   if(range){res.status(206);res.setHeader('Content-Range',`bytes ${range.start}-${range.end}/${file.info.size}`);}
   if(req.method==='HEAD'){await file.handle.close();res.end();return;}
   const stream=file.handle.createReadStream({...range,autoClose:true});
   stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }
 }
 return ChatAttachmentsController;
}
export const OwnChatMediaController=chatAttachmentsController('me','CUSTOMER');
export const StoreChatMediaController=chatAttachmentsController('store','STORE');
