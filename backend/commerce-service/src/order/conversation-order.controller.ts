import {Controller,Post,HttpCode,Req,UseGuards} from '@nestjs/common';
import {ServiceGuard,ServiceCallers} from '../../../shared/src/auth';
import {ConversationOrderService} from './conversation-order.service';
@Controller('internal/orders') @UseGuards(ServiceGuard) @ServiceCallers('M3')
export class ConversationOrderController{
 private readonly service=new ConversationOrderService();
 @Post('conversation-context') @HttpCode(200)
 resolve(@Req() req:any){return this.service.resolve(req.contract.body,req.correlationId);}
}
