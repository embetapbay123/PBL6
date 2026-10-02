// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, Get, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard, Public, Roles } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
@Controller() @UseGuards(AuthGuard)
export class ModerationSkeletonController {
  @Post('admin/categories') @Roles("ADMIN")
  createCategory(): never { return notImplemented('createCategory'); }
  @Post('admin/product-types') @Roles("ADMIN")
  createProductType(): never { return notImplemented('createProductType'); }
  @Post('admin/attribute-definitions') @Roles("ADMIN")
  createAttributeDefinition(): never { return notImplemented('createAttributeDefinition'); }
  @Patch('admin/categories/:id') @Roles("ADMIN")
  updateCategory(): never { return notImplemented('updateCategory'); }
  @Patch('admin/product-types/:id') @Roles("ADMIN")
  updateProductType(): never { return notImplemented('updateProductType'); }
  @Patch('admin/attribute-definitions/:id') @Roles("ADMIN")
  updateAttributeDefinition(): never { return notImplemented('updateAttributeDefinition'); }
  @Post('admin/products/:id/hide') @Roles("ADMIN")
  hideProduct(): never { return notImplemented('hideProduct'); }
  @Post('admin/products/:id/restore') @Roles("ADMIN")
  restoreProduct(): never { return notImplemented('restoreProduct'); }
}
