import { Body, Controller, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import {
  CreateAttributeDefinitionBodyDto, CreateCategoryBodyDto, CreateProductTypeBodyDto,
  HideProductBodyDto, HideProductPathDto, RestoreProductBodyDto, RestoreProductPathDto,
  UpdateAttributeDefinitionBodyDto, UpdateAttributeDefinitionPathDto, UpdateCategoryBodyDto,
  UpdateCategoryPathDto, UpdateProductTypeBodyDto, UpdateProductTypePathDto,
} from '../../../shared/src/dtos.generated';
import { ModerationService } from './moderation.service';

/**
 * Admin taxonomy and Product moderation.
 *
 * Every route is ADMIN-only and scoped to M1's own tables; the service keeps one transaction per
 * mutation so the row and its audit entry always agree.
 */
@Controller() @UseGuards(AuthGuard)
export class ModerationController {
  private readonly service = new ModerationService();
  @Post('admin/categories') @Roles('ADMIN')
  createCategory(@Body() b: CreateCategoryBodyDto, @Req() r: any) { return this.service.createCategory(b, r.auth.user_id, r.correlationId ?? ''); }
  @Patch('admin/categories/:id') @Roles('ADMIN')
  updateCategory(@Param() p: UpdateCategoryPathDto, @Body() b: UpdateCategoryBodyDto, @Req() r: any) { return this.service.updateCategory(p.id, b, r.auth.user_id, r.correlationId ?? ''); }
  @Post('admin/product-types') @Roles('ADMIN')
  createProductType(@Body() b: CreateProductTypeBodyDto, @Req() r: any) { return this.service.createProductType(b, r.auth.user_id, r.correlationId ?? ''); }
  @Patch('admin/product-types/:id') @Roles('ADMIN')
  updateProductType(@Param() p: UpdateProductTypePathDto, @Body() b: UpdateProductTypeBodyDto, @Req() r: any) { return this.service.updateProductType(p.id, b, r.auth.user_id, r.correlationId ?? ''); }
  @Post('admin/attribute-definitions') @Roles('ADMIN')
  createAttributeDefinition(@Body() b: CreateAttributeDefinitionBodyDto, @Req() r: any) { return this.service.createAttributeDefinition(b, r.auth.user_id, r.correlationId ?? ''); }
  @Patch('admin/attribute-definitions/:id') @Roles('ADMIN')
  updateAttributeDefinition(@Param() p: UpdateAttributeDefinitionPathDto, @Body() b: UpdateAttributeDefinitionBodyDto, @Req() r: any) { return this.service.updateAttributeDefinition(p.id, b, r.auth.user_id, r.correlationId ?? ''); }
  @Post('admin/products/:id/hide') @Roles('ADMIN')
  hideProduct(@Param() p: HideProductPathDto, @Body() b: HideProductBodyDto, @Req() r: any) { return this.service.hideProduct(p.id, b, r.auth.user_id, r.correlationId ?? ''); }
  @Post('admin/products/:id/restore') @Roles('ADMIN')
  restoreProduct(@Param() p: RestoreProductPathDto, @Body() b: RestoreProductBodyDto, @Req() r: any) { return this.service.restoreProduct(p.id, b, r.auth.user_id, r.correlationId ?? ''); }
}
