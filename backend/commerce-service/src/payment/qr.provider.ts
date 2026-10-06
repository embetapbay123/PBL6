import { ApiError } from '../../../shared/src/errors';
// Bank-transfer QR instructions only. No debit, network call or success inference.
export function sepayTestQr(reference:string,amount:number):string {
  const account=process.env.SEPAY_TEST_ACCOUNT,bank=process.env.SEPAY_TEST_BANK;
  if(process.env.PAYMENT_PROVIDER_MODE!=='sepay_test' || !account || !/^[a-zA-Z0-9]{1,19}$/.test(account) || !bank || !/^[a-zA-Z0-9]{1,30}$/.test(bank)) {
    throw new ApiError(503,'PROVIDER_NOT_CONFIGURED','Cần cấu hình tài khoản SePay Test cho QR.');
  }
  if(!Number.isSafeInteger(amount) || amount<=0)throw new ApiError(409,'PAYMENT_AMOUNT_INVALID','Số tiền thanh toán không hợp lệ.');
  const url=new URL('https://vietqr.app/img');
  url.search=new URLSearchParams({acc:account,bank,amount:String(amount),des:reference,template:'compact'}).toString();
  return url.toString();
}
