import { Controller, Post, Req } from '@nestjs/common';
import { ApiError, notImplemented } from '../../../shared/src/errors';
import { verifySePay } from './sepay.adapter';
@Controller()
export class SePayController {
  @Post('payment-callbacks/sepay') callback(@Req() request:any): never {
    const secret=process.env.SEPAY_WEBHOOK_SECRET;
    if (!secret) throw new ApiError(503,'PROVIDER_NOT_CONFIGURED','SePay Test Mode chưa được cấu hình.');
    verifySePay(request.rawBody ?? Buffer.alloc(0),request.headers['x-sepay-signature'] ?? '',request.headers['x-sepay-timestamp'] ?? '',secret);
    return notImplemented('sepayCallback');
  }
}
