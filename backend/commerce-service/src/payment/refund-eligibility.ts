import type {EntityManager} from 'typeorm';

/** Callers hold the Order lock; return transitions use the same lock order. */
export async function refundOrderEligible(manager:EntityManager,order:{id:string;status:string}):Promise<boolean>{
  if(['CANCELLED','EXPIRED'].includes(order.status))return true;
  if(order.status==='SHIPPED')return (await manager.query("SELECT id FROM delivery_return_case WHERE order_id=$1 AND status='SETTLING'",[order.id])).length===1;
  if(order.status!=='COMPLETED')return false;
  const rows=await manager.query("SELECT id FROM order_return_request WHERE order_id=$1 AND type='REFUND' AND status='RECEIVED' AND inventory_status IN ('APPLIED','LEGACY_RECONCILED') AND fault_party IN ('STORE','CUSTOMER') AND fee_payer=fault_party",[order.id]);
  return rows.length===1;
}
