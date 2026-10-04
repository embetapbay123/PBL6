import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { QuoteCheckoutBodyDto } from '../../../shared/src/dtos.generated';
import { OrderService } from './order.service';

@Controller()
@UseGuards(AuthGuard)
export class OrderController {
  private readonly service = new OrderService();

  @Post('checkout/quotes')
  @Roles('CUSTOMER')
  quoteCheckout(@Body() dto: QuoteCheckoutBodyDto, @Req() req: any) {
    return this.service.quoteCheckout(dto, req.auth, req.correlationId);
  }
}
