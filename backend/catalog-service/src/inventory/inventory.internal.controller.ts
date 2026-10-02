import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { ServiceGuard,ServiceCallers } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
import { ListLowStockVariantsBodyDto } from '../../../shared/src/dtos.generated';
// Logic remains Thịnh's tasks; contract is docs/contracts/internal-api.json.
@Controller('internal') @UseGuards(ServiceGuard) @ServiceCallers('M2')
export class InventoryInternalController {
  @Post('inventory/low-stock') lowStock(@Body() _input: ListLowStockVariantsBodyDto):never {return notImplemented('ListLowStockVariants');}
  @Post('variants/quote') quote():never {return notImplemented('QuoteVariants');}
  @Post('inventory/reserve') reserve():never {return notImplemented('ReserveInventory');}
  @Post('inventory/consume') consume():never {return notImplemented('ConsumeReservation');}
  @Post('inventory/release') release():never {return notImplemented('ReleaseReservation');}
  @Post('inventory/restock') restock():never {return notImplemented('RestockOrder');}
}
