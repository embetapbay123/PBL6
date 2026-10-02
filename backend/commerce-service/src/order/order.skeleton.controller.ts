// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, Get, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard, Public, Roles } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
@Controller() @UseGuards(AuthGuard)
export class OrderSkeletonController {
  @Post('checkout/quotes') @Roles("CUSTOMER")
  quoteCheckout(): never { return notImplemented('quoteCheckout'); }
  @Post('orders/batches') @Roles("CUSTOMER")
  confirmCheckout(): never { return notImplemented('confirmCheckout'); }
  @Get('me/orders') @Roles("CUSTOMER")
  listOwnOrders(): never { return notImplemented('listOwnOrders'); }
  @Get('store/orders') @Roles("SELLER","STORE_OWNER")
  listStoreOrders(): never { return notImplemented('listStoreOrders'); }
  @Get('orders/batches/:id') @Roles("CUSTOMER")
  getPurchaseGroupOrders(): never { return notImplemented('getPurchaseGroupOrders'); }
  @Get('me/orders/:id') @Roles("CUSTOMER")
  getOwnOrder(): never { return notImplemented('getOwnOrder'); }
  @Post('me/orders/:id/cancel') @Roles("CUSTOMER")
  cancelOwnOrder(): never { return notImplemented('cancelOwnOrder'); }
  @Get('store/orders/:id') @Roles("SELLER","STORE_OWNER")
  getStoreOrder(): never { return notImplemented('getStoreOrder'); }
  @Patch('store/orders/:id/status') @Roles("SELLER","STORE_OWNER")
  transitionStoreOrder(): never { return notImplemented('transitionStoreOrder'); }
  @Post('store/orders/:id/cancel') @Roles("SELLER","STORE_OWNER")
  cancelStoreOrder(): never { return notImplemented('cancelStoreOrder'); }
  @Post('store/orders/:id/cod-collection') @Roles("SELLER","STORE_OWNER")
  collectCod(): never { return notImplemented('collectCod'); }
}
