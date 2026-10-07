// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Public, Roles } from '../../../shared/src/auth';
import { PaymentApiService } from './payment.api.service';
@Controller() @UseGuards(AuthGuard)
export class PaymentSkeletonController {
  private readonly service=new PaymentApiService();
  @Get('orders/:id/refund') @Roles("CUSTOMER")
  getOrderRefund(@Param('id') id:string,@Req() request:any) {return this.service.getOrderRefund(id,request.auth);}
}
