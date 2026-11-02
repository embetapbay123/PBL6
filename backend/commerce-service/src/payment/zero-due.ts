import type {EntityManager} from 'typeorm';
import {audit} from '../../../shared/src/audit';
import {returnedRow} from '../../../shared/src/postgres-returning';

/** Zero payable settles an obligation, never evidence of a collection or refund. */
export function zeroDueSettled(order:{payable_vnd:unknown},payment:any):boolean {
  return String(order.payable_vnd)==='0'&&payment?.status==='SUCCEEDED'&&String(payment.payable_vnd)==='0'&&
    String(payment.collected_vnd)==='0'&&String(payment.refunded_vnd)==='0';
}

/** Caller holds Order then Payment locks. Also recovers old zero-due pending orders. */
export async function settleZeroDue(manager:EntityManager,order:any,payment:any,correlation:string){
  if(!manager.queryRunner?.isTransactionActive)throw new Error('PAYMENT_REQUIRES_CALLER_TRANSACTION');
  if(String(order.payable_vnd)!=='0'||String(payment?.payable_vnd)!=='0'||String(payment?.collected_vnd)!=='0'||String(payment?.refunded_vnd)!=='0'||payment.method!==order.payment_method)return payment;
  if(zeroDueSettled(order,payment))return payment;
  if(!['PENDING','FAILED'].includes(payment.status))return payment;
  // Do not erase uncertain external activity, including legacy data requiring reconciliation.
  if((await manager.query('SELECT id FROM payment_attempt WHERE payment_id=$1 LIMIT 1',[payment.id])).length)return payment;
  const updated=returnedRow<any>(await manager.query("UPDATE payment SET status='SUCCEEDED',collectible_vnd=0,version=version+1 WHERE id=$1 RETURNING *",[payment.id]));
  if(!updated)throw new Error('ZERO_DUE_PAYMENT_UPDATE_MISSING');
  await manager.query("UPDATE c_o_d_collection SET status='CANCELLED' WHERE order_id=$1 AND status='PENDING' AND amount_due_vnd=0 AND amount_collected_vnd=0",[order.id]);
  await audit(manager,'M2','00000000-0000-0000-0000-000000000000','Payment',payment.id,'PAYMENT_NOT_REQUIRED',correlation,{status:payment.status},{status:'SUCCEEDED',amount_vnd:0,collection_required:false});
  return updated;
}
