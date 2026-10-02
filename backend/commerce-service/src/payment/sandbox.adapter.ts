import { createHmac, timingSafeEqual } from 'node:crypto';
import { ApiError } from '../../../shared/src/errors';
// Legacy local callback compatibility only; not a SePay signature or provider integration.
export function verifySandbox(raw:Buffer,signature:unknown,secret:string) {
  if(typeof signature!=='string' || !/^sha256=[a-f0-9]{64}$/.test(signature))throw new ApiError(401,'INVALID_CALLBACK','Chữ ký sandbox không hợp lệ.');
  const expected='sha256='+createHmac('sha256',secret).update(raw).digest('hex');
  if(!timingSafeEqual(Buffer.from(expected),Buffer.from(signature)))throw new ApiError(401,'INVALID_CALLBACK','Chữ ký sandbox không hợp lệ.');
}
