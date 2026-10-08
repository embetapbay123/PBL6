import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { CreatePaymentAttemptBodyDto } from '../../../shared/src/dtos.generated';
import { PaymentApiService } from './payment.api.service';
@Controller() @UseGuards(AuthGuard)
export class PaymentController {
  private readonly service=new PaymentApiService();
  @Get('payments/:id') @Roles('CUSTOMER')
  getPayment(@Param('id') id:string,@Req() request:any) {return this.service.getPayment(id,request.auth);}
  @Post('orders/:id/payment-attempts') @Roles('CUSTOMER')
  createPaymentAttempt(@Param('id') id:string,@Body() body:CreatePaymentAttemptBodyDto,@Req() request:any) {
    return this.service.createPaymentAttempt(id,body,request.auth,request.correlationId);
  }
}
