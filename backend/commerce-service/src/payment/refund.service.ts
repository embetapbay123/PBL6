import { EntityManager } from 'typeorm';
import { ApiError } from '../../../shared/src/errors';
import { once } from '../../../shared/src/idempotency';
import { audit } from '../../../shared/src/audit';
import { moneyNumber } from '../../../shared/src/money';
import { PaymentRepository } from './payment.repository';
import type { RefundDraft } from './payment.port';
import type { OperationOutputs } from '../../../shared/src/operations.generated';

export function mapRefund(row:any):OperationOutputs['getOrderRefund'] {
  return {id:row.id,payment_id:row.payment_id,order_id:row.order_id,amount_vnd:moneyNumber(row.amount_vnd),status:row.status};
}
export class RefundService {
  constructor(readonly manager:EntityManager) {}
  async request(input:RefundDraft):Promise<OperationOutputs['getOrderRefund']> {
    if(!this.manager.queryRunner?.isTransactionActive)throw new Error('PAYMENT_REQUIRES_CALLER_TRANSACTION');
    const repo=new PaymentRepository(this.manager),order=await repo.lockOrder(input.order_id);
    if(!order)throw new ApiError(404,'NOT_FOUND','Không tìm thấy Order.');
    return once(this.manager,'M2.Payment.refund',input.operation_id,{order_id:input.order_id,payment_id:input.payment_id,amount_vnd:input.amount_vnd.toString()},async()=>{
      const payment=await repo.byOrder(input.order_id);
      if(!payment || payment.id!==input.payment_id)throw new ApiError(404,'NOT_FOUND','Payment không thuộc Order.');
      const [existing]=await this.manager.query('SELECT * FROM refund WHERE payment_id=$1 FOR UPDATE',[payment.id]);
      if(existing)throw new ApiError(409,'REFUND_ALREADY_REQUESTED','Payment đã có yêu cầu Refund; dùng cùng operation_id.');
      if(!['CANCELLED','EXPIRED'].includes(order.status) || payment.method!=='SANDBOX' || payment.status!=='SUCCEEDED')throw new ApiError(409,'REFUND_STATE_CONFLICT','Chỉ hoàn Payment online đã thu của Order đóng.');
      if(input.amount_vnd<=0n || input.amount_vnd!==BigInt(payment.collected_vnd) || input.amount_vnd!==BigInt(payment.payable_vnd) || input.amount_vnd!==BigInt(order.payable_vnd) || BigInt(payment.refunded_vnd)!==0n)throw new ApiError(422,'REFUND_AMOUNT_MISMATCH','Refund phải khớp toàn bộ tiền đã thu của Order.');
      moneyNumber(input.amount_vnd);
      const [attempt]=await this.manager.query("SELECT * FROM payment_attempt WHERE payment_id=$1 AND status='SUCCEEDED' ORDER BY created_at,id LIMIT 1 FOR UPDATE",[payment.id]);
      if(!attempt || BigInt(attempt.amount_vnd)!==input.amount_vnd)throw new ApiError(409,'REFUND_RECONCILIATION_REQUIRED','Thiếu bằng chứng giao dịch đã thu.');
      const [refund]=await this.manager.query("INSERT INTO refund(payment_id,order_id,amount_vnd,status,operation_id) VALUES($1,$2,$3,'REQUESTED',$4) RETURNING *",[payment.id,input.order_id,input.amount_vnd.toString(),input.operation_id]);
      await this.manager.query('INSERT INTO refund_job(refund_id,operation_id,provider,payment_reference,amount_vnd,correlation_id) VALUES($1,$2,$3,$4,$5,$6)',[refund.id,input.operation_id,attempt.provider,attempt.provider_reference,input.amount_vnd.toString(),input.correlation_id ?? input.operation_id]);
      await audit(this.manager,'M2',order.customer_user_id,'Refund',refund.id,'REQUEST',input.correlation_id ?? input.operation_id,{},mapRefund(refund));
      return mapRefund(refund);
    });
  }
}
