import {CodRefundService} from './cod-refund.service';
import { Body, Controller, Get, Param, Post, Req, UseGuards,HttpCode } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { CreatePaymentAttemptBodyDto } from '../../../shared/src/dtos.generated';
import { PaymentApiService } from './payment.api.service';
import {RefundRecoveryService} from './refund-recovery.service';
@Controller() @UseGuards(AuthGuard)
export class PaymentController {
  private readonly service=new PaymentApiService();
  private readonly recovery=new RefundRecoveryService();
  @Get('store/orders/:id/refund-recovery') @Roles('STORE_OWNER')
  storeRecovery(@Param('id') id:string,@Req() request:any){return this.recovery.get(id,request.auth,'STORE');}
  @Get('admin/orders/:id/refund-recovery') @Roles('ADMIN')
  adminRecovery(@Param('id') id:string,@Req() request:any){return this.recovery.get(id,request.auth,'ADMIN');}
  @Post('store/orders/:id/refund-recovery') @HttpCode(200) @Roles('STORE_OWNER')
  recoverStore(@Param('id') id:string,@Req() request:any){return this.recovery.request(id,request.contract.body,request.auth,'STORE',request.correlationId);}
  @Post('admin/orders/:id/refund-recovery') @HttpCode(200) @Roles('ADMIN')
  recoverAdmin(@Param('id') id:string,@Req() request:any){return this.recovery.request(id,request.contract.body,request.auth,'ADMIN',request.correlationId);}
  @Post('store/orders/:id/cod-refund') @Roles('STORE_OWNER')
  confirmCodRefund(@Param('id') id:string,@Req() request:any) {return new CodRefundService().confirm(id,request.contract.body,request.auth,request.correlationId);}
  @Get('payments/:id') @Roles('CUSTOMER')
  getPayment(@Param('id') id:string,@Req() request:any) {return this.service.getPayment(id,request.auth);}
  @Post('orders/:id/payment-attempts') @Roles('CUSTOMER')
  createPaymentAttempt(@Param('id') id:string,@Body() body:CreatePaymentAttemptBodyDto,@Req() request:any) {
    return this.service.createPaymentAttempt(id,body,request.auth,request.correlationId);
  }
}
