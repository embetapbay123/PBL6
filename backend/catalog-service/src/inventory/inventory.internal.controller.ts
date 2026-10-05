import { Controller, Post, UseGuards, Body, Req, HttpCode } from '@nestjs/common';
import { ServiceGuard,ServiceCallers } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
import { ListLowStockVariantsBodyDto, QuoteVariantsBodyDto } from '../../../shared/src/dtos.generated';
import { InventoryService } from './inventory.service';
// Logic remains Thịnh's tasks; contract is docs/contracts/internal-api.json.
@Controller('internal') @UseGuards(ServiceGuard) @ServiceCallers('M2')
export class InventoryInternalController {
  private readonly service=new InventoryService();
  @Post('inventory/low-stock') lowStock(@Body() _input: ListLowStockVariantsBodyDto):never {return notImplemented('ListLowStockVariants');}
  // QuoteVariants: snapshot giá/tồn hiện hành cho M2, không reserve. Caller allowlist do @ServiceCallers('M2') chặn.
  // Contract khai báo response 2xx là 200 nên phải ghi đè mặc định 201 của @Post.
  @Post('variants/quote') @HttpCode(200) quote(@Body() dto: QuoteVariantsBodyDto,@Req() request:any) {return this.service.quote({items:dto.items},request.correlationId);}
  @Post('inventory/reserve') reserve():never {return notImplemented('ReserveInventory');}
  @Post('inventory/consume') consume():never {return notImplemented('ConsumeReservation');}
  @Post('inventory/release') release():never {return notImplemented('ReleaseReservation');}
  @Post('inventory/restock') restock():never {return notImplemented('RestockOrder');}
}
