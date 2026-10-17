import { Controller, Get, Patch, Body, Req, Param, UseGuards } from '@nestjs/common';
import { AuthGuard, Public, Roles } from '../../../shared/src/auth';
import { CatalogService } from './catalog.service';
import { UpdateProductBodyDto } from '../../../shared/src/dtos.generated';
/**
 * Public catalog, the public catalogue of one Store, and the Seller catalogue management list.
 *
 * `categories`, `product-types`, `products`, `products/:id` and `stores/:id/products` stay
 * anonymous: the Authorization header is read only to attribute optional search/view telemetry,
 * never to gate the response. `store/products` is the opposite: it is scoped to the caller's
 * membership and returns the management view (every status), never the public one.
 */
@Controller()
export class CatalogController {
  private readonly service=new CatalogService();
  @Get('categories') listCategories(@Req() request:any) {return this.service.listCategories(request.contract.query);}
  @Get('product-types') listProductTypes(@Req() request:any) {return this.service.listProductTypes(request.contract.query);}
  @Get('products') list(@Req() request:any) {return this.service.list(request.contract.query,request.headers.authorization,request.correlationId);}
  @Get('products/:id') detail(@Param('id') id:string,@Req() request:any) {return this.service.detail(id,request.headers.authorization,request.correlationId);}
  @Get('stores/:id/products') @Public()
  listStoreProducts(@Param('id') id:string,@Req() request:any) {return this.service.listStoreProducts(id,request.contract.query,request.correlationId);}
  @Get('store/products') @UseGuards(AuthGuard) @Roles('SELLER','STORE_OWNER')
  listOwnStoreProducts(@Req() request:any) {return this.service.listOwnStoreProducts(request.contract.query,request.auth);}
  @Patch('store/products/:id') @UseGuards(AuthGuard) @Roles('SELLER','STORE_OWNER')
  update(@Param('id') id:string,@Body() dto:UpdateProductBodyDto,@Req() request:any) {return this.service.update(id,dto,request.auth,request.correlationId);}
}
