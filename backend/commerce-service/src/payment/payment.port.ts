import { DataSource, EntityManager } from 'typeorm';
import type { OperationOutputs } from '../../../shared/src/operations.generated';
export type PaymentMethod = 'COD' | 'SANDBOX';
export interface PaymentDraft {order_id:string;method:PaymentMethod;payable_vnd:bigint;operation_id:string}
export interface CodDraft {order_id:string;amount_vnd:bigint;operation_id:string;actor_user_id:string}
export interface RefundDraft {order_id:string;payment_id:string;amount_vnd:bigint;operation_id:string}
// Implementations must use this manager; provider calls and retry workers are outside this boundary.
export interface PaymentPort {
  readonly manager:EntityManager;
  createForOrder(input:PaymentDraft):Promise<OperationOutputs['getPayment']>;
  recordCodCollection(input:CodDraft):Promise<OperationOutputs['getPayment']>;
  requestRefund(input:RefundDraft):Promise<OperationOutputs['getOrderRefund']>;
}
export function orderPaymentUnitOfWork<T>(source:DataSource,factory:(manager:EntityManager)=>PaymentPort,
  work:(manager:EntityManager,payments:PaymentPort)=>Promise<T>):Promise<T> {
  return source.transaction(manager=>{
    const payments=factory(manager);
    if(payments.manager!==manager)throw new Error('TRANSACTION_MANAGER_MISMATCH');
    return work(manager,payments);
  });
}
