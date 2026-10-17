import { Controller, Get, Post, Patch, Body, Req, Param, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { CatalogService } from './catalog.service';
import { AddProductImageBodyDto, CreateVariantBodyDto, UpdateProductBodyDto } from '../../../shared/src/dtos.generated';
/**
 * Public catalog plus the Seller Product, Variant and image mutations.
 *
 * `categories`, `product-types`, `products` and `products/:id` stay anonymous: the Authorization
 * header is read only to attribute optional search/view telemetry, never to gate the response.
 * Everything under `store/` is scoped to the caller's Store membership.
 */
@Controller()
export class CatalogController {
  private readonly service=new CatalogService();
  @Get('categories') listCategories(@Req() request:any) {return this.service.listCategories(request.contract.query);}
  @Get('product-types') listProductTypes(@Req() request:any) {return this.service.listProductTypes(request.contract.query);}
  @Get('products') list(@Req() request:any) {return this.service.list(request.contract.query,request.headers.authorization,request.correlationId);}
  @Get('products/:id') detail(@Param('id') id:string,@Req() request:any) {return this.service.detail(id,request.headers.authorization,request.correlationId);}
  @Post('store/products/:id/variants') @UseGuards(AuthGuard) @Roles('SELLER','STORE_OWNER')
  createVariant(@Param('id') id:string,@Body() dto:CreateVariantBodyDto,@Req() request:any) {return this.service.createVariant(id,dto,request.auth,request.correlationId);}
  @Post('store/products/:id/images') @UseGuards(AuthGuard) @Roles('SELLER','STORE_OWNER')
  addProductImage(@Param('id') id:string,@Body() dto:AddProductImageBodyDto,@Req() request:any) {return this.service.addProductImage(id,dto,request.auth,request.correlationId);}
  @Patch('store/products/:id') @UseGuards(AuthGuard) @Roles('SELLER','STORE_OWNER')
  update(@Param('id') id:string,@Body() dto:UpdateProductBodyDto,@Req() request:any) {return this.service.update(id,dto,request.auth,request.correlationId);}
}
