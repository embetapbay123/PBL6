import { randomUUID } from 'node:crypto';
import { database } from '../../../shared/src/database';
import { DataSource } from 'typeorm';
import { ApiError } from '../../../shared/src/errors';
import { audit } from '../../../shared/src/audit';
import { moneyNumber } from '../../../shared/src/money';
import { PaymentRepository, AttemptRow } from './payment.repository';
import { mapPayment } from './payment.service';
import { sepayTestQr } from './qr.provider';
import { mapRefund } from './refund.service';
import type { OperationInputs, OperationOutputs } from '../../../shared/src/operations.generated';
function mapAttempt(row:AttemptRow):OperationOutputs['createPaymentAttempt'] {
  return {id:row.id,status:row.status,provider:'SEPAY_TEST',provider_reference:row.provider_reference,payment_code:row.provider_reference,
    ...(row.qr_url?{qr_url:row.qr_url}:{}),...(row.expires_at?{expires_at:new Date(row.expires_at).toISOString()}: {})};
}
export class PaymentApiService {
  constructor(private readonly source:DataSource=database) {}
  async getPayment(id:string,auth:{user_id:string}) {
    const payment=await new PaymentRepository(this.source.manager).owned(id,auth.user_id);
    if(!payment)throw new ApiError(404,'NOT_FOUND','Không tìm thấy Payment.');
    return mapPayment(payment);
  }
  async getOrderRefund(id:string,auth:{user_id:string}) {
    const [row]=await this.source.manager.query('SELECT r.* FROM refund r JOIN "order" o ON o.id=r.order_id WHERE o.id=$1 AND o.customer_user_id=$2',[id,auth.user_id]);
    if(!row)throw new ApiError(404,'NOT_FOUND','Không tìm thấy Refund của bạn.');
    return mapRefund(row);
  }
  async createPaymentAttempt(id:string,input:OperationInputs['createPaymentAttempt']['body'],auth:{user_id:string},correlation:string) {
    return this.source.transaction(async manager=>{
      const repo=new PaymentRepository(manager),order=await repo.lockOrder(id);
      if(!order || order.customer_user_id!==auth.user_id)throw new ApiError(404,'NOT_FOUND','Không tìm thấy Order.');
      if(order.version!==input.expected_order_version)throw new ApiError(409,'VERSION_CONFLICT','Order đã thay đổi.');
      if(order.payment_method!=='SANDBOX' || order.status!=='AWAITING_PAYMENT')throw new ApiError(409,'ORDER_STATE_CONFLICT','Order không cho phép tạo PaymentAttempt.');
      if(!order.payment_expires_at || new Date(order.payment_expires_at).getTime()<=Date.now())throw new ApiError(409,'PAYMENT_EXPIRED','Order đã hết hạn thanh toán; cần đối soát trước khi release tồn.');
      const payment=await repo.byOrder(id);
      if(!payment || payment.method!=='SANDBOX' || !['PENDING','FAILED'].includes(payment.status) || BigInt(payment.payable_vnd)!==BigInt(order.payable_vnd) || BigInt(payment.collected_vnd)!==0n)throw new ApiError(409,'PAYMENT_STATE_CONFLICT','Payment không cho phép thử thanh toán.');
      const existing=await repo.activeAttempt(payment.id);
      if(existing){
        if(existing.provider!=='SEPAY_TEST' || existing.status==='SUCCEEDED' || BigInt(existing.amount_vnd)!==BigInt(payment.payable_vnd) || !existing.qr_url || !existing.expires_at)throw new ApiError(409,'ATTEMPT_RECONCILIATION_REQUIRED','Attempt hiện tại cần đối soát; không tạo reference thứ hai.');
        return mapAttempt(existing);
      }
      const attemptId=randomUUID(),reference='PBL6'+attemptId.replace(/-/g,'').toUpperCase();
      const qr=sepayTestQr(reference,moneyNumber(payment.payable_vnd));
      const [row]=await manager.query("INSERT INTO payment_attempt(id,payment_id,provider_reference,status,amount_vnd,qr_url,expires_at) VALUES($1,$2,$3,'PENDING',$4,$5,$6) RETURNING *",[attemptId,payment.id,reference,payment.payable_vnd,qr,order.payment_expires_at]);
      if(payment.status==='FAILED')await manager.query("UPDATE payment SET status='PENDING',version=version+1 WHERE id=$1",[payment.id]);
      await audit(manager,'M2',auth.user_id,'PaymentAttempt',attemptId,'CREATE',correlation,{}, {payment_id:payment.id,status:'PENDING',provider_reference:reference});
      return mapAttempt(row);
    });
  }
}
