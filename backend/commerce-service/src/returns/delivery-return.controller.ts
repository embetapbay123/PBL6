import {Controller,Get,Post,Param,Req,UseGuards} from '@nestjs/common';
import {AuthGuard,Roles} from '../../../shared/src/auth';
import {DeliveryReturnService} from './delivery-return.service';
@Controller() @UseGuards(AuthGuard)
export class DeliveryReturnController {
 private readonly service=new DeliveryReturnService();
 @Post('store/orders/:id/delivery-return') @Roles('STORE_OWNER','SELLER')
 open(@Param('id') id:string,@Req() req:any){return this.service.open(id,req.contract.body,req.auth,req.correlationId);}
 @Get('store/delivery-returns') @Roles('STORE_OWNER','SELLER')
 list(@Req() req:any){return this.service.list(req.auth,req.contract.query);}
 @Get('admin/delivery-returns') @Roles('ADMIN')
 admin(@Req() req:any){return this.service.list(req.auth,req.contract.query,true);}
 @Get('me/orders/:id/delivery-return') @Roles('CUSTOMER')
 own(@Param('id') id:string,@Req() req:any){return this.service.own(id,req.auth);}
 @Post('store/delivery-returns/:id/inspection') @Roles('STORE_OWNER','SELLER')
 inspect(@Param('id') id:string,@Req() req:any){return this.service.inspect(id,req.contract.body,req.auth,req.correlationId);}
 @Post('store/delivery-returns/:id/settle') @Roles('STORE_OWNER','SELLER')
 settle(@Param('id') id:string,@Req() req:any){return this.service.settle(id,req.contract.body,req.auth,req.correlationId);}
}
