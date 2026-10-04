// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
@Controller() @UseGuards(AuthGuard)
export class CartSkeletonController {
  @Post('cart/items') @Roles("CUSTOMER")
  addCartItem(): never { return notImplemented('addCartItem'); }
}
