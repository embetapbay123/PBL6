import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import {
  CreateStoreVoucherBodyDto,
  UpdateStoreVoucherBodyDto,
  CreatePlatformVoucherBodyDto,
  UpdatePlatformVoucherBodyDto,
  ValidateVouchersBodyDto,
} from '../../../shared/src/dtos.generated';
import { VoucherService } from './voucher.service';

@Controller()
@UseGuards(AuthGuard)
export class VoucherController {
  private readonly service = new VoucherService();

  // --- Customer Voucher Validation ---
  @Post('vouchers/validate')
  @Roles('CUSTOMER')
  validateVouchers(@Body() dto: ValidateVouchersBodyDto, @Req() req: any) {
    return this.service.validateVouchers(dto, req.auth, req.correlationId);
  }

  // --- Store Voucher Endpoints ---
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

  @Get('store/vouchers/:id/usage')
  @Roles('STORE_OWNER')
  getStoreVoucherUsage(@Param('id') id: string, @Req() req: any) {
    return this.service.getStoreVoucherUsage(id, req.auth, req.correlationId);
  }

  // --- Platform Voucher Endpoints ---
  @Get('admin/vouchers')
  @Roles('ADMIN')
  listPlatformVouchers(@Req() req: any) {
    return this.service.listPlatformVouchers(req.contract?.query ?? req.query ?? {}, req.auth, req.correlationId);
  }

  @Post('admin/vouchers')
  @Roles('ADMIN')
  createPlatformVoucher(@Body() dto: CreatePlatformVoucherBodyDto, @Req() req: any) {
    return this.service.createPlatformVoucher(dto, req.auth, req.correlationId);
  }

  @Patch('admin/vouchers/:id')
  @Roles('ADMIN')
  updatePlatformVoucher(@Param('id') id: string, @Body() dto: UpdatePlatformVoucherBodyDto, @Req() req: any) {
    return this.service.updatePlatformVoucher(id, dto, req.auth, req.correlationId);
  }

  @Get('admin/vouchers/:id/usage')
  @Roles('ADMIN')
  getPlatformVoucherUsage(@Param('id') id: string, @Req() req: any) {
    return this.service.getPlatformVoucherUsage(id, req.auth, req.correlationId);
  }
}
