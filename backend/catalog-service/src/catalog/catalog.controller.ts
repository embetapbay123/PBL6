import { Controller, Get, Patch, Body, Req, Param, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { CatalogService } from './catalog.service';
import { UpdateProductBodyDto } from '../../../shared/src/dtos.generated';
@Controller()
export class CatalogController {
  private readonly service=new CatalogService();
  @Get('products') list(@Req() request:any) {return this.service.list(request.contract.query,request.correlationId);}
  @Get('products/:id') detail(@Param('id') id:string,@Req() request:any) {return this.service.detail(id,request.correlationId);}
  @Patch('store/products/:id') @UseGuards(AuthGuard) @Roles('SELLER','STORE_OWNER')
  update(@Param('id') id:string,@Body() dto:UpdateProductBodyDto,@Req() request:any) {return this.service.update(id,dto,request.auth,request.correlationId);}
}
