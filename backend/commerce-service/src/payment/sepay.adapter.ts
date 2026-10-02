import { createHmac, timingSafeEqual } from 'node:crypto';
import { ApiError } from '../../../shared/src/errors';
export interface PaymentProvider {
  createInstructions(orderId: string, amountVnd: number): Promise<{code:string; qr_url:string; expires_at:string}>;
  reconcile(reference: string): Promise<unknown>;
}
// Provider contract: https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc
export function verifySePay(rawBody: Buffer, signature: string, timestamp: string, secret: string, now=Date.now()) {
  if (!/^\d+$/.test(timestamp) || Math.abs(now/1000-Number(timestamp))>300 || !/^sha256=[a-f0-9]{64}$/.test(signature)) throw new ApiError(401,'INVALID_CALLBACK','Callback không hợp lệ.');
  const expected='sha256='+createHmac('sha256',secret).update(timestamp+'.').update(rawBody).digest('hex');
  if (!timingSafeEqual(Buffer.from(expected),Buffer.from(signature))) throw new ApiError(401,'INVALID_CALLBACK','Callback không hợp lệ.');
}
