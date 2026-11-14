import { Controller, Get, Post, Param, Req, UseGuards, HttpCode } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { MessagingService } from './messaging.service';

@Controller() @UseGuards(AuthGuard)
export class MessagingController {
  private readonly service=new MessagingService();
  @Post('me/conversations') @Roles('CUSTOMER')
  start(@Req() request:any){return this.service.start(request.contract.body.store_id,request.auth,request.contract.body.order_id,request.correlationId);}
  @Get('me/conversations') @Roles('CUSTOMER')
  ownList(@Req() request:any){const {page,size,q}=request.contract.query;return this.service.list(request.auth,'CUSTOMER',page,size,q);}
  @Get('store/conversations') @Roles('STORE_OWNER','SELLER')
  storeList(@Req() request:any){const {page,size,q,archived}=request.contract.query;return this.service.list(request.auth,'STORE',page,size,q,archived);}
  @Post('store/conversations/:id/read') @HttpCode(200) @Roles('STORE_OWNER','SELLER')
  read(@Param('id') id:string,@Req() request:any){return this.service.markRead(id,request.contract.body.message_id,request.auth);}
  @Post('store/conversations/:id/archive') @HttpCode(200) @Roles('STORE_OWNER','SELLER')
  archive(@Param('id') id:string,@Req() request:any){return this.service.archive(id,request.contract.body.archived,request.auth);}
  @Get('me/conversations/:id/messages') @Roles('CUSTOMER')
  ownHistory(@Param('id') id:string,@Req() request:any){const {page,size}=request.contract.query;return this.service.history(id,request.auth,'CUSTOMER',page,size);}
  @Get('store/conversations/:id/messages') @Roles('STORE_OWNER','SELLER')
  storeHistory(@Param('id') id:string,@Req() request:any){const {page,size}=request.contract.query;return this.service.history(id,request.auth,'STORE',page,size);}
  @Post('me/conversations/:id/messages') @Roles('CUSTOMER')
  ownSend(@Param('id') id:string,@Req() request:any){return this.service.send(id,request.contract.body,request.auth,'CUSTOMER',request.correlationId);}
  @Post('store/conversations/:id/messages') @Roles('STORE_OWNER','SELLER')
  storeSend(@Param('id') id:string,@Req() request:any){return this.service.send(id,request.contract.body,request.auth,'STORE',request.correlationId);}
}
