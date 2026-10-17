// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, Get, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
@Controller() @UseGuards(AuthGuard)
export class CatalogSkeletonController {
  @Post('store/products') @Roles("SELLER","STORE_OWNER")
  createProduct(): never { return notImplemented('createProduct'); }
  @Post('store/products/:id/variants') @Roles("SELLER","STORE_OWNER")
  createVariant(): never { return notImplemented('createVariant'); }
  @Post('store/products/:id/images') @Roles("SELLER","STORE_OWNER")
  addProductImage(): never { return notImplemented('addProductImage'); }
}
