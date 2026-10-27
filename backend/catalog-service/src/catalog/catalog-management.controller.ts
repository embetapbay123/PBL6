import { Controller,Get,Param,Req,UseGuards } from '@nestjs/common';
import { AuthGuard,Public,Roles } from '../../../shared/src/auth';
import { GetOwnStoreProductPathDto,GetProductAvailabilityPathDto } from '../../../shared/src/dtos.generated';
import { CatalogManagementService } from './catalog-management.service';
@Controller()
export class CatalogManagementController {
  private readonly service=new CatalogManagementService();
  @Get('store/products/:id') @UseGuards(AuthGuard) @Roles('SELLER','STORE_OWNER')
  own(@Param() p:GetOwnStoreProductPathDto,@Req() r:any){return this.service.own(p.id,r.auth)}
  @Get('products/:id/availability') @Public()
  availability(@Param() p:GetProductAvailabilityPathDto,@Req() r:any){return this.service.availability(p.id,r.correlationId)}
}
