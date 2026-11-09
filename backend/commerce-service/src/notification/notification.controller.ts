import { Controller, Get, Post, HttpCode, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { NotificationService } from './notification.service';

@Controller() @UseGuards(AuthGuard) @Roles('CUSTOMER')
export class NotificationController {
  private readonly service=new NotificationService();

  @Get('me/notifications')
  list(@Req() request:any){
    const {page,size}=request.contract.query;
    return this.service.list(request.auth.user_id,page,size);
  }

  @Get('me/notifications/group')
  listGroup(@Req() request:any){
    const {kind,order_id,page,size,exclude_primary,up_to}=request.contract.query;
    return this.service.listGroupHistory(request.auth.user_id,kind,order_id,page,size,exclude_primary,up_to);
  }

  @Post('me/notifications/read-group')
  @HttpCode(200)
  readGroup(@Req() request:any){
    const {kind,order_id,up_to}=request.contract.body;
    return this.service.markGroupRead(request.auth.user_id,kind,order_id,up_to);
  }

  @Post('me/notifications/read-all')
  @HttpCode(200)
  readAll(@Req() request:any){
    return this.service.markAllRead(request.auth.user_id);
  }

  @Post('me/notifications/:id/read')
  @HttpCode(200)
  read(@Param('id') id:string,@Req() request:any){
    return this.service.markRead(id,request.auth.user_id);
  }
}
