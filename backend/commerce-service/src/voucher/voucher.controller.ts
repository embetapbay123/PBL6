import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { CreateStoreVoucherBodyDto, UpdateStoreVoucherBodyDto } from '../../../shared/src/dtos.generated';
import { VoucherService } from './voucher.service';

@Controller()
@UseGuards(AuthGuard)
export class VoucherController {
  private readonly service = new VoucherService();

  @Get('store/vouchers')
  @Roles('STORE_OWNER')
  listStoreVouchers(@Req() req: any) {
    return this.service.listStoreVouchers(req.contract?.query ?? req.query ?? {}, req.auth, req.correlationId);
  }

  @Post('store/vouchers')
  @Roles('STORE_OWNER')
  createStoreVoucher(@Body() dto: CreateStoreVoucherBodyDto, @Req() req: any) {
    return this.service.createStoreVoucher(dto, req.auth, req.correlationId);
  }

  @Patch('store/vouchers/:id')
  @Roles('STORE_OWNER')
  updateStoreVoucher(@Param('id') id: string, @Body() dto: UpdateStoreVoucherBodyDto, @Req() req: any) {
    return this.service.updateStoreVoucher(id, dto, req.auth, req.correlationId);
  }
}
