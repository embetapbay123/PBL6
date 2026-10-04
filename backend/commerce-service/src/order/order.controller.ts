import { Controller, Get, Post, Body, Param, Headers, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { QuoteCheckoutBodyDto, ConfirmCheckoutBodyDto } from '../../../shared/src/dtos.generated';
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

  @Post('orders/batches')
  @Roles('CUSTOMER')
  confirmCheckout(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: ConfirmCheckoutBodyDto,
    @Req() req: any
  ) {
    const key = idempotencyKey || req.headers?.['idempotency-key'] || req.headers?.['Idempotency-Key'];
    return this.service.confirmCheckout(dto, key, req.auth, req.correlationId);
  }

  @Get('orders/batches/:id')
  @Roles('CUSTOMER')
  getPurchaseGroupOrders(@Param('id') id: string, @Req() req: any) {
    return this.service.getPurchaseGroupOrders(id, req.auth, req.correlationId);
  }
}
