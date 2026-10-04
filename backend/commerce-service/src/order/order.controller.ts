import { Controller, Get, Post, Patch, Body, Param, Query, Headers, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import {
  QuoteCheckoutBodyDto,
  ConfirmCheckoutBodyDto,
  TransitionStoreOrderBodyDto,
  CancelOwnOrderBodyDto,
  CancelStoreOrderBodyDto,
} from '../../../shared/src/dtos.generated';
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

  @Get('me/orders')
  @Roles('CUSTOMER')
  listOwnOrders(
    @Query('page') page: string | undefined,
    @Query('size') size: string | undefined,
    @Req() req: any
  ) {
    return this.service.listOwnOrders(
      {
        page: page !== undefined ? Number(page) : undefined,
        size: size !== undefined ? Number(size) : undefined,
      },
      req.auth,
      req.correlationId
    );
  }

  @Get('me/orders/:id')
  @Roles('CUSTOMER')
  getOwnOrder(@Param('id') id: string, @Req() req: any) {
    return this.service.getOwnOrder(id, req.auth, req.correlationId);
  }

  @Post('me/orders/:id/cancel')
  @Roles('CUSTOMER')
  cancelOwnOrder(@Param('id') id: string, @Body() dto: CancelOwnOrderBodyDto, @Req() req: any) {
    return this.service.cancelOwnOrder(id, dto, req.auth, req.correlationId);
  }

  @Get('store/orders')
  @Roles('SELLER', 'STORE_OWNER')
  listStoreOrders(
    @Query('page') page: string | undefined,
    @Query('size') size: string | undefined,
    @Req() req: any
  ) {
    return this.service.listStoreOrders(
      {
        page: page !== undefined ? Number(page) : undefined,
        size: size !== undefined ? Number(size) : undefined,
      },
      req.auth,
      req.correlationId
    );
  }

  @Get('store/orders/:id')
  @Roles('SELLER', 'STORE_OWNER')
  getStoreOrder(@Param('id') id: string, @Req() req: any) {
    return this.service.getStoreOrder(id, req.auth, req.correlationId);
  }

  @Patch('store/orders/:id/status')
  @Roles('SELLER', 'STORE_OWNER')
  transitionStoreOrder(
    @Param('id') id: string,
    @Body() dto: TransitionStoreOrderBodyDto,
    @Req() req: any
  ) {
    return this.service.transitionStoreOrder(id, dto, req.auth, req.correlationId);
  }

  @Post('store/orders/:id/cancel')
  @Roles('SELLER', 'STORE_OWNER')
  cancelStoreOrder(
    @Param('id') id: string,
    @Body() dto: CancelStoreOrderBodyDto,
    @Req() req: any
  ) {
    return this.service.cancelStoreOrder(id, dto, req.auth, req.correlationId);
  }
}


