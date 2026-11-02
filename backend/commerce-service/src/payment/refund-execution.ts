import type {EntityManager} from 'typeorm';
import {ApiError} from '../../../shared/src/errors';
export const executionId=(job:any):string=>job.execution_operation_id??job.operation_id;
/** Immutable command identity, not a receipt or evidence of a money effect. */
export async function registerRefundExecution(manager:EntityManager,job:any){
 const id=executionId(job);
 await manager.query('INSERT INTO refund_execution(operation_id,refund_id,provider,payment_reference,amount_vnd,correlation_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',[id,job.refund_id,job.provider,job.payment_reference,job.amount_vnd,job.correlation_id]);
 const [row]=await manager.query('SELECT * FROM refund_execution WHERE operation_id=$1',[id]);
 if(!row||row.refund_id!==job.refund_id||row.provider!==job.provider||row.correlation_id!==job.correlation_id||row.payment_reference!==job.payment_reference||row.amount_vnd!==String(job.amount_vnd))throw new ApiError(409,'REFUND_EXECUTION_MISMATCH','Danh tính lệnh hoàn không khớp; cần đối soát trước khi gửi.');
 return id;
}
