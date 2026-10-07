import { Controller, Post, Req, HttpCode } from '@nestjs/common';
import { ApiError } from '../../../shared/src/errors';
import { validateHttpRequest } from '../../../shared/src/request-contract';
import { verifySePay } from './sepay.adapter';
import { verifySandbox } from './sandbox.adapter';
import { PaymentCallbackService } from './payment.callback.service';
@Controller()
export class SePayController {
  private readonly service=new PaymentCallbackService();
  @Post('payment-callbacks/sandbox') @HttpCode(200) sandbox(@Req() request:any) {
    const secret=process.env.SANDBOX_WEBHOOK_SECRET;
    if(!secret)throw new ApiError(503,'PROVIDER_NOT_CONFIGURED','Legacy sandbox chưa được cấu hình.');
    verifySandbox(request.rawBody ?? Buffer.alloc(0),request.headers['x-sandbox-signature'],secret);
    validateHttpRequest('sandboxCallback',request);
    return this.service.sandbox(request.contract.body,request.correlationId)
      .then(result=>({status:result.disposition,correlation_id:request.correlationId}));
  }
  @Post('payment-callbacks/sepay') @HttpCode(200) callback(@Req() request:any) {
    const secret=process.env.SEPAY_WEBHOOK_SECRET;
    if (!secret) throw new ApiError(503,'PROVIDER_NOT_CONFIGURED','SePay Test Mode chưa được cấu hình.');
    verifySePay(request.rawBody ?? Buffer.alloc(0),request.headers['x-sepay-signature'] ?? '',request.headers['x-sepay-timestamp'] ?? '',secret);
    validateHttpRequest('sepayCallback',request);
    return this.service.sepay(request.contract.body,request.correlationId).then(()=>({success:true}));
  }
}
