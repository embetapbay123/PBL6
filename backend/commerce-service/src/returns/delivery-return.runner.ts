import {randomUUID} from 'node:crypto';
import type {DataSource,EntityManager} from 'typeorm';
import {ApiError} from '../../../shared/src/errors';
import {audit} from '../../../shared/src/audit';
import {PaymentFollowupPort} from '../payment/payment.followup.port';
import {changeOrderStatus} from '../order/order-inventory.runner';
import {deliveryMoneySettled} from './delivery-return.service';

type ReceivedCall=(operation:'RestockReceivedItems',body:any,correlation:string)=>Promise<any>;
const SYSTEM='00000000-0000-0000-0000-000000000000';
// RPC is outside locks. The frozen receipt + operation ID survives lost ACKs and worker restarts.
export class DeliveryReturnRunner {
 constructor(private readonly source:DataSource,private readonly call:ReceivedCall) {}
 private async lock(manager:EntityManager,id:string) {
  const [target]=await manager.query('SELECT order_id FROM delivery_return_case WHERE id=$1',[id]);if(!target)return {};
  const [order]=await manager.query('SELECT * FROM "order" WHERE id=$1 FOR UPDATE',[target.order_id]);
  const [row]=await manager.query('SELECT * FROM delivery_return_case WHERE id=$1 FOR UPDATE',[id]);
  const [payment]=await manager.query('SELECT * FROM payment WHERE order_id=$1 FOR UPDATE',[target.order_id]);return {order,row,payment};
 }
 private async claim(id:string) {
  return this.source.transaction(async manager=>{
   const {order,row}=await this.lock(manager,id);
   if(!order||row.status!=='SETTLING'||row.lease_until&&new Date(row.lease_until).getTime()>Date.now())return;
   const token=randomUUID();await manager.query("UPDATE delivery_return_case SET lease_token=$2,lease_until=now()+interval '30 seconds',attempts=attempts+CASE WHEN inventory_status='PENDING' THEN 1 ELSE 0 END WHERE id=$1",[id,token]);
   return {row,token};
  });
 }
 async process(id:string) {
  const claim=await this.claim(id);if(!claim)return;
  let error:string|undefined;
  if(claim.row.inventory_status==='PENDING') {
   try {const result=await this.call('RestockReceivedItems',claim.row.inventory_command_json,'delivery-return-'+id);
    if(!['APPLIED','ALREADY_APPLIED'].includes(result?.status)||result.operation_id!==claim.row.inventory_command_json.operation_id)error='INVENTORY_RESULT_UNKNOWN';
   }catch(e){error=e instanceof ApiError?String((e.getResponse() as any).code??'INVENTORY_RESULT_UNKNOWN').slice(0,100):'INVENTORY_RESULT_UNKNOWN';}
  }
  await this.source.transaction(async manager=>{
   const {order,row,payment}=await this.lock(manager,id);
   if(!order||row.status!=='SETTLING'||row.lease_token!==claim.token)return;
   if(error){await manager.query("UPDATE delivery_return_case SET lease_token=NULL,lease_until=NULL,last_error=$2,next_attempt_at=now()+least(60,greatest(1,attempts))*interval '1 second',updated_at=now() WHERE id=$1",[id,error]);return;}
   if(row.inventory_status!=='APPLIED') {
    const [stock]=await manager.query('SELECT * FROM order_inventory_state WHERE order_id=$1 FOR UPDATE',[order.id]);
    if(!stock||stock.command_kind){await manager.query("UPDATE delivery_return_case SET lease_token=NULL,lease_until=NULL,last_error='INVENTORY_RECONCILIATION_REQUIRED',next_attempt_at=now()+interval '30 seconds' WHERE id=$1",[id]);return;}
    await manager.query("UPDATE order_inventory_state SET state='RETURN_INSPECTED',last_error=NULL,updated_at=now() WHERE order_id=$1",[order.id]);
    await manager.query("UPDATE delivery_return_case SET inventory_status='APPLIED',version=version+1,updated_at=now() WHERE id=$1",[id]);
    await manager.query("INSERT INTO delivery_return_history(case_id,actor_user_id,action,before_json,after_json) VALUES($1,$2,'INSPECTED_STOCK_ACK',$3,$4)",[id,SYSTEM,{inventory_status:'PENDING'},{inventory_status:'APPLIED',operation_id:row.inventory_command_json.operation_id}]);
   }
   const money={payment_method:order.payment_method,payment_status:payment?.status,collected_vnd:payment?.collected_vnd,refunded_vnd:payment?.refunded_vnd,payable_vnd:order.payable_vnd};
   if(!deliveryMoneySettled(money)) {await manager.query("UPDATE delivery_return_case SET lease_token=NULL,lease_until=NULL,last_error='MONEY_SETTLEMENT_PENDING',next_attempt_at=now()+interval '5 seconds',updated_at=now() WHERE id=$1",[id]);return;}
   if(order.status!=='SHIPPED')throw new ApiError(409,'ORDER_STATE_CONFLICT','Đơn đã thay đổi ngoài hồ sơ hoàn về; cần đối chiếu.');
   // Never invoke cancel/release/full-restock here. Only the inspected receipt may restore stock.
   await changeOrderStatus(manager,order,'CANCELLED','DELIVERY_RETURN_CLOSED','delivery-return-'+id,SYSTEM);
   if(BigInt(order.payable_vnd)===0n)await new PaymentFollowupPort(manager).closePending(order.id);
   await manager.query("UPDATE shipment SET status='RETURNED' WHERE order_id=$1",[order.id]);
   await manager.query("UPDATE delivery_return_case SET status='CLOSED',closed_at=now(),updated_at=now(),version=version+1,last_error=NULL,lease_token=NULL,lease_until=NULL WHERE id=$1",[id]);
   await manager.query("INSERT INTO delivery_return_history(case_id,actor_user_id,action,after_json) VALUES($1,$2,'CLOSED',$3)",[id,SYSTEM,{status:'CLOSED',order_status:'CANCELLED',reason:'DELIVERY_RETURN',inventory_status:'APPLIED',money_settled:true}]);
   await audit(manager,'M2',SYSTEM,'DeliveryReturn',id,'CLOSED','delivery-return-'+id,{status:'SETTLING'},{status:'CLOSED',order_id:order.id,inventory_receipt_id:id,money_settled:true});
  });
 }
 async tick() {
  const rows=await this.source.query("SELECT id FROM delivery_return_case WHERE status='SETTLING' AND next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<=now()) ORDER BY next_attempt_at,id LIMIT 20");
  for(const row of rows)try{await this.process(row.id);}catch{await this.source.query("UPDATE delivery_return_case SET last_error='SETTLEMENT_RECONCILIATION_REQUIRED',next_attempt_at=now()+interval '30 seconds' WHERE id=$1",[row.id]);}
 }
}
