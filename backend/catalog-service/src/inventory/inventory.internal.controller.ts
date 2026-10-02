import { Controller, Post, UseGuards } from '@nestjs/common';
import { ServiceGuard,ServiceCallers } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
// DTO/logic remain Thịnh's tasks; contract is docs/contracts/internal-api.json.
@Controller('internal') @UseGuards(ServiceGuard) @ServiceCallers('M2')
export class InventoryInternalController {
  @Post('variants/quote') quote():never {return notImplemented('QuoteVariants');}
  @Post('inventory/reserve') reserve():never {return notImplemented('ReserveInventory');}
  @Post('inventory/consume') consume():never {return notImplemented('ConsumeReservation');}
  @Post('inventory/release') release():never {return notImplemented('ReleaseReservation');}
  @Post('inventory/restock') restock():never {return notImplemented('RestockOrder');}
}
