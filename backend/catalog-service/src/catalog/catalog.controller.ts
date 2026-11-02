import { Controller, Get, Post, Put, Delete, Patch, Body, Req, Param, UseGuards, HttpCode } from '@nestjs/common';
import { AuthGuard, Public, Roles } from '../../../shared/src/auth';
import { CatalogService } from './catalog.service';
import { AddProductImageBodyDto, CreateVariantBodyDto, CreateProductBodyDto, UpdateProductBodyDto } from '../../../shared/src/dtos.generated';
/**
 * Public catalog and the Seller Product mutations.
 *
 * `categories`, `product-types`, `products` and `products/:id` stay anonymous: the Authorization
 * header is read only to attribute optional search/view telemetry, never to gate the response.
 */
@Controller()
export class CatalogController {
  private readonly service=new CatalogService();
  @Get('admin/products') @UseGuards(AuthGuard) @Roles('ADMIN')
  listAdminProducts(@Req() request:any){return this.service.listAdminProducts(request.contract.query);}
  @Get('categories') listCategories(@Req() request:any) {return this.service.listCategories(request.contract.query);}
  @Get('product-types') listProductTypes(@Req() request:any) {return this.service.listProductTypes(request.contract.query);}
  @Get('products') list(@Req() request:any) {return this.service.list(request.contract.query,request.headers.authorization,request.correlationId);}
  @Get('products/:id') detail(@Param('id') id:string,@Req() request:any) {return this.service.detail(id,request.headers.authorization,request.correlationId);}
  @Get('me/favorites') @UseGuards(AuthGuard) @Roles('CUSTOMER')
  listFavorites(@Req() request:any) {return this.service.listFavorites(request.contract.query,request.auth);}
  @Put('me/favorites/:id') @UseGuards(AuthGuard) @Roles('CUSTOMER')
  addFavorite(@Param('id') id:string,@Req() request:any) {return this.service.addFavorite(id,request.auth,request.correlationId);}
  @Delete('me/favorites/:id') @UseGuards(AuthGuard) @Roles('CUSTOMER')
  removeFavorite(@Param('id') id:string,@Req() request:any) {return this.service.removeFavorite(id,request.auth);}
  @Get('stores/:id/products') @Public()
  listStoreProducts(@Param('id') id:string,@Req() request:any) {return this.service.listStoreProducts(id,request.contract.query,request.correlationId);}
  @Get('store/products') @UseGuards(AuthGuard) @Roles('SELLER','STORE_OWNER')
  listOwnStoreProducts(@Req() request:any) {return this.service.listOwnStoreProducts(request.contract.query,request.auth);}
  @Get('store/products/:id') @UseGuards(AuthGuard) @Roles('SELLER','STORE_OWNER')
  getOwnStoreProduct(@Param('id') id:string,@Req() request:any) {return this.service.getOwnStoreProduct(id,request.auth);}
  @Post('store/products') @UseGuards(AuthGuard) @Roles('SELLER','STORE_OWNER')
  createProduct(@Body() dto: CreateProductBodyDto,@Req() request:any) {return this.service.createProduct(dto,request.auth,request.correlationId);}
  @Post('store/products/:id/variants') @UseGuards(AuthGuard) @Roles('SELLER','STORE_OWNER')
  createVariant(@Param('id') id:string,@Body() dto:CreateVariantBodyDto,@Req() request:any) {return this.service.createVariant(id,dto,request.auth,request.correlationId);}
  @Post('store/products/:id/images') @UseGuards(AuthGuard) @Roles('SELLER','STORE_OWNER')
  addProductImage(@Param('id') id:string,@Body() dto:AddProductImageBodyDto,@Req() request:any) {return this.service.addProductImage(id,dto,request.auth,request.correlationId);}
  @Post('store/products/:id/images/reorder') @HttpCode(200) @UseGuards(AuthGuard) @Roles('SELLER','STORE_OWNER')
  reorderProductImages(@Param('id') id:string,@Req() request:any) {return this.service.reorderProductImages(id,request.contract.body,request.auth,request.correlationId);}
  @Delete('store/products/:id/images/:image_id') @UseGuards(AuthGuard) @Roles('SELLER','STORE_OWNER')
  removeProductImage(@Param('id') id:string,@Param('image_id') imageId:string,@Req() request:any) {return this.service.removeProductImage(id,imageId,request.auth,request.correlationId);}
  @Patch('store/products/:id') @UseGuards(AuthGuard) @Roles('SELLER','STORE_OWNER')
  update(@Param('id') id:string,@Body() dto: UpdateProductBodyDto,@Req() request:any) {return this.service.updateProduct(id,dto,request.auth,request.correlationId);}
}
