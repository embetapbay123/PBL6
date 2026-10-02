// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, Get, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard, Public, Roles } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
@Controller() @UseGuards(AuthGuard)
export class InventorySkeletonController {
  @Get('store/inventory') @Roles("SELLER","STORE_OWNER")
  listStoreInventory(): never { return notImplemented('listStoreInventory'); }
  @Post('store/inventory/adjustments') @Roles("SELLER","STORE_OWNER")
  adjustInventory(): never { return notImplemented('adjustInventory'); }
  @Get('store/inventory/movements') @Roles("SELLER","STORE_OWNER")
  listStockMovements(): never { return notImplemented('listStockMovements'); }
}
