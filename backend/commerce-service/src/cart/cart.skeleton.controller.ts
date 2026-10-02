// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, Get, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard, Public, Roles } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
@Controller() @UseGuards(AuthGuard)
export class CartSkeletonController {
  @Get('cart/items') @Roles("CUSTOMER")
  listCartItems(): never { return notImplemented('listCartItems'); }
  @Post('cart/items') @Roles("CUSTOMER")
  addCartItem(): never { return notImplemented('addCartItem'); }
  @Patch('cart/items/:id') @Roles("CUSTOMER")
  updateCartItem(): never { return notImplemented('updateCartItem'); }
  @Delete('cart/items/:id') @Roles("CUSTOMER")
  removeCartItem(): never { return notImplemented('removeCartItem'); }
}
