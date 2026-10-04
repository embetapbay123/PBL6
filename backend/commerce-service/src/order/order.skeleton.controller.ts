// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, Get, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard, Public, Roles } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
@Controller() @UseGuards(AuthGuard)
export class OrderSkeletonController {
  @Post('me/orders/:id/cancel') @Roles("CUSTOMER")
  cancelOwnOrder(): never { return notImplemented('cancelOwnOrder'); }
  @Patch('store/orders/:id/status') @Roles("SELLER","STORE_OWNER")
  transitionStoreOrder(): never { return notImplemented('transitionStoreOrder'); }
  @Post('store/orders/:id/cancel') @Roles("SELLER","STORE_OWNER")
  cancelStoreOrder(): never { return notImplemented('cancelStoreOrder'); }
  @Post('store/orders/:id/cod-collection') @Roles("SELLER","STORE_OWNER")
  collectCod(): never { return notImplemented('collectCod'); }
}

