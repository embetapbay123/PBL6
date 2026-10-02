import { Controller, Get, Patch, Body, Req, Param, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { CatalogService } from './catalog.service';
import { ProductUpdateSample } from './product-update.dto';
class ListQuery {
  @IsOptional() @Type(()=>Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(100) size = 20;
  @IsOptional() @IsString() @MaxLength(200) q?: string;
}
@Controller()
export class CatalogController {
  private readonly service=new CatalogService();
  @Get('products') list(@Query() query:ListQuery) {return this.service.list(query);}
  @Get('products/:id') detail(@Param('id',new ParseUUIDPipe()) id:string) {return this.service.detail(id);}
  @Patch('store/products/:id') @UseGuards(AuthGuard) @Roles('SELLER','STORE_OWNER')
  update(@Param('id',new ParseUUIDPipe()) id:string,@Body() dto:ProductUpdateSample,@Req() request:any) {return this.service.update(id,dto,request.auth,request.correlationId);}
}
