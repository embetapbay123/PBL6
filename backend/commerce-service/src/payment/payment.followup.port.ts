import { EntityManager } from 'typeorm';
import { ApiError } from '../../../shared/src/errors';

export interface PaymentFollowup {
  operation_id:string; attempt_id:string; payment_id:string; order_id:string;
  kind:'CONSUME_REQUIRED'|'REFUND_REQUIRED'|'RECONCILE_REQUIRED'; correlation_id:string;
}
// Order owner's worker polls snapshots, calls network outside the transaction, then uses
// the same manager for its verified Order transition and this completion marker.
export class PaymentFollowupPort {
  constructor(readonly manager:EntityManager) {}
  async pending(limit=20):Promise<PaymentFollowup[]> {
    if(!Number.isInteger(limit) || limit<1 || limit>100)throw new Error('FOLLOWUP_LIMIT_INVALID');
    return this.manager.query("SELECT operation_id,attempt_id,payment_id,order_id,kind,correlation_id FROM payment_followup WHERE status='PENDING' ORDER BY created_at,operation_id LIMIT $1",[limit]);
  }
  async complete(operationId:string,resolution:'CONSUMED'|'REFUNDED') {
    if(!this.manager.queryRunner?.isTransactionActive)throw new Error('PAYMENT_REQUIRES_CALLER_TRANSACTION');
    const [target]=await this.manager.query('SELECT order_id FROM payment_followup WHERE operation_id=$1',[operationId]);
    if(!target)throw new ApiError(404,'NOT_FOUND','Không tìm thấy Payment follow-up.');
    const [order]=await this.manager.query('SELECT status FROM "order" WHERE id=$1 FOR UPDATE',[target.order_id]);
    const [payment]=await this.manager.query('SELECT * FROM payment WHERE order_id=$1 FOR UPDATE',[target.order_id]);
    const [job]=await this.manager.query('SELECT * FROM payment_followup WHERE operation_id=$1 FOR UPDATE',[operationId]);
    if(job.status==='DONE'){
      if(job.resolution!==resolution)throw new ApiError(409,'IDEMPOTENCY_CONFLICT','Follow-up đã hoàn tất với resolution khác.');
      return;
    }
    if(resolution==='CONSUMED'){
      if(job.kind==='REFUND_REQUIRED' || !['PENDING','CONFIRMED','PROCESSING','SHIPPED','COMPLETED'].includes(order.status) || payment.status!=='SUCCEEDED' || BigInt(payment.collected_vnd)!==BigInt(payment.payable_vnd))
        throw new ApiError(409,'FOLLOWUP_NOT_RESOLVED','Order chưa xác nhận consume và chuyển trạng thái.');
    }else if(resolution==='REFUNDED'){
      const [refund]=await this.manager.query("SELECT * FROM refund WHERE payment_id=$1 AND order_id=$2 AND status='SUCCEEDED' AND amount_vnd=$3",[payment.id,target.order_id,payment.payable_vnd]);
      if(!['EXPIRED','CANCELLED'].includes(order.status) || !refund || BigInt(payment.refunded_vnd)!==BigInt(payment.payable_vnd))
        throw new ApiError(409,'FOLLOWUP_NOT_RESOLVED','Chưa có bằng chứng Refund thành công.');
    }else throw new ApiError(422,'VALIDATION_FAILED','Resolution không hợp lệ.');
    await this.manager.query("UPDATE payment_followup SET status='DONE',resolution=$2 WHERE operation_id=$1",[operationId,resolution]);
  }
}
