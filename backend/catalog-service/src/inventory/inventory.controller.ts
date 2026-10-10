import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { AdjustInventoryBodyDto } from '../../../shared/src/dtos.generated';
import { InventoryService } from './inventory.service';

/**
 * Seller-facing inventory API. AuthGuard resolves the live context, and the Store scope is taken
 * from that membership inside the service — never from the request — so guessing another Store's
 * Variant id cannot reach its stock. `adjustInventory` keeps the contract's 201 response.
 */
@Controller() @UseGuards(AuthGuard) @Roles('SELLER','STORE_OWNER')
export class InventoryController {
  private readonly service=new InventoryService();

  @Get('store/inventory')
  listStoreInventory(@Req() request:any) {return this.service.listStoreInventory(request.contract.query,request.auth);}

  @Post('store/inventory/adjustments')
  adjustInventory(@Body() dto: AdjustInventoryBodyDto,@Req() request:any) {
    return this.service.adjustInventory(dto,request.auth,request.correlationId);
  }

  @Get('store/inventory/movements')
  listStockMovements(@Req() request:any) {return this.service.listStockMovements(request.contract.query,request.auth);}
}
