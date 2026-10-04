// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';

@Controller()
@UseGuards(AuthGuard)
export class VoucherSkeletonController {
  @Post('vouchers/validate')
  @Roles('CUSTOMER')
  validateVouchers(): never {
    return notImplemented('validateVouchers');
  }

  @Get('store/vouchers/:id/usage')
  @Roles('STORE_OWNER')
  getStoreVoucherUsage(): never {
    return notImplemented('getStoreVoucherUsage');
  }

  @Get('admin/vouchers/:id/usage')
  @Roles('ADMIN')
  getPlatformVoucherUsage(): never {
    return notImplemented('getPlatformVoucherUsage');
  }
}
