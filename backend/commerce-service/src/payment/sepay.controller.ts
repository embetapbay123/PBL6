import { Controller, Post, Req } from '@nestjs/common';
import { ApiError, notImplemented } from '../../../shared/src/errors';
import { validateHttpRequest } from '../../../shared/src/request-contract';
import { verifySePay } from './sepay.adapter';
import { verifySandbox } from './sandbox.adapter';
@Controller()
export class SePayController {
  @Post('payment-callbacks/sandbox') sandbox(@Req() request:any):never {
    const secret=process.env.SANDBOX_WEBHOOK_SECRET;
    if(!secret)throw new ApiError(503,'PROVIDER_NOT_CONFIGURED','Legacy sandbox chưa được cấu hình.');
    verifySandbox(request.rawBody ?? Buffer.alloc(0),request.headers['x-sandbox-signature'],secret);
    validateHttpRequest('sandboxCallback',request);
    return notImplemented('sandboxCallback');
  }
  @Post('payment-callbacks/sepay') callback(@Req() request:any): never {
    const secret=process.env.SEPAY_WEBHOOK_SECRET;
    if (!secret) throw new ApiError(503,'PROVIDER_NOT_CONFIGURED','SePay Test Mode chưa được cấu hình.');
    verifySePay(request.rawBody ?? Buffer.alloc(0),request.headers['x-sepay-signature'] ?? '',request.headers['x-sepay-timestamp'] ?? '',secret);
    validateHttpRequest('sepayCallback',request);
    return notImplemented('sepayCallback');
  }
}
