import { Controller, Get, Post, Patch, Body, Param, Headers, Req, UseGuards, HttpCode } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import {
  TransitionStoreOrderBodyDto,
  CancelOwnOrderBodyDto,
  CancelStoreOrderBodyDto,
  CollectCodBodyDto,
} from '../../../shared/src/dtos.generated';
import { OrderService } from './order.service';
import {StockCommitmentsService} from './stock-commitments.service';
import type {OperationInputs} from '../../../shared/src/operations.generated';

@Controller()
@UseGuards(AuthGuard)
export class OrderController {
  private readonly service = new OrderService();
  private readonly commitments=new StockCommitmentsService();

  @Post('checkout/voucher-suggestions')
  @HttpCode(200)
  @Roles('CUSTOMER')
  suggestCheckoutVouchers(@Body() dto: OperationInputs['suggestCheckoutVouchers']['body'], @Req() req: any) {
    return this.service.suggestCheckoutVouchers(dto, req.auth, req.correlationId);
  }

  @Get('store/stock-commitments')
  @Roles('SELLER','STORE_OWNER')
  listStockCommitments(@Req() req:any){return this.commitments.list(req.contract.query,req.auth);}

  @Post('checkout/quotes')
  @HttpCode(200)
  @Roles('CUSTOMER')
  quoteCheckout(@Body() dto: OperationInputs['quoteCheckout']['body'], @Req() req: any) {
    return this.service.quoteCheckout(dto, req.auth, req.correlationId);
  }

  @Post('orders/batches')
  @Roles('CUSTOMER')
  confirmCheckout(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: OperationInputs['confirmCheckout']['body'],
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
  listOwnOrders(@Req() req:any) {
    return this.service.listOwnOrders(req.contract?.query??{},req.auth,req.correlationId);
  }

  @Get('me/orders/:id')
  @Roles('CUSTOMER')
  getOwnOrder(@Param('id') id: string, @Req() req: any) {
    return this.service.getOwnOrder(id, req.auth, req.correlationId);
  }

  @Post('me/orders/:id/cancel')
  @HttpCode(200)
  @Roles('CUSTOMER')
  cancelOwnOrder(@Param('id') id: string, @Body() dto: CancelOwnOrderBodyDto, @Req() req: any) {
    return this.service.cancelOwnOrder(id, dto, req.auth, req.correlationId);
  }

  @Get('store/orders')
  @Roles('SELLER', 'STORE_OWNER')
  listStoreOrders(@Req() req:any) {
    return this.service.listStoreOrders(req.contract?.query??{},req.auth,req.correlationId);
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
  @HttpCode(200)
  @Roles('SELLER', 'STORE_OWNER')
  cancelStoreOrder(
    @Param('id') id: string,
    @Body() dto: CancelStoreOrderBodyDto,
    @Req() req: any
  ) {
    return this.service.cancelStoreOrder(id, dto, req.auth, req.correlationId);
  }

  @Post('store/orders/:id/cod-collection')
  @HttpCode(200)
  @Roles('SELLER', 'STORE_OWNER')
  collectCod(
    @Param('id') id: string,
    @Body() dto: CollectCodBodyDto,
    @Req() req: any
  ) {
    return this.service.collectCod(id, dto, req.auth, req.correlationId);
  }
}



