import { Controller, Post, UseGuards, Body, Req, HttpCode } from '@nestjs/common';
import { ServiceGuard,ServiceCallers } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
import { ListLowStockVariantsBodyDto, QuoteVariantsBodyDto, ReserveInventoryBodyDto,
  ConsumeReservationBodyDto, ReleaseReservationBodyDto } from '../../../shared/src/dtos.generated';
import { InventoryService } from './inventory.service';
// Logic remains Thịnh's tasks; contract is docs/contracts/internal-api.json.
@Controller('internal') @UseGuards(ServiceGuard) @ServiceCallers('M2')
export class InventoryInternalController {
  private readonly service=new InventoryService();
  @Post('inventory/low-stock') lowStock(@Body() _input: ListLowStockVariantsBodyDto):never {return notImplemented('ListLowStockVariants');}
  // QuoteVariants: snapshot giá/tồn hiện hành cho M2, không reserve. Caller allowlist do @ServiceCallers('M2') chặn.
  // Contract khai báo response 2xx là 200 nên phải ghi đè mặc định 201 của @Post.
  @Post('variants/quote') @HttpCode(200) quote(@Body() dto: QuoteVariantsBodyDto,@Req() request:any) {return this.service.quote({items:dto.items},request.correlationId);}
  // ReserveInventory: giữ tồn nguyên tử theo operation ID; thiếu một SKU thì không giữ phần nào.
  @Post('inventory/reserve') @HttpCode(200) reserve(@Body() dto: ReserveInventoryBodyDto) {return this.service.reserve(dto);}
  // ConsumeReservation/ReleaseReservation: chỉ tác động item còn ACTIVE nên gọi lặp không lặp hiệu ứng.
  @Post('inventory/consume') @HttpCode(200) consume(@Body() dto: ConsumeReservationBodyDto) {return this.service.consume(dto);}
  @Post('inventory/release') @HttpCode(200) release(@Body() dto: ReleaseReservationBodyDto) {return this.service.release(dto);}
  @Post('inventory/restock') restock():never {return notImplemented('RestockOrder');}
}
