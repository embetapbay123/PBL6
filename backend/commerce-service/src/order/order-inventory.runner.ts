import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { ApiError } from '../../../shared/src/errors';
import { audit } from '../../../shared/src/audit';
import { PaymentService } from '../payment/payment.service';
import { PaymentFollowupPort } from '../payment/payment.followup.port';
import { OrderRepository } from './order.repository';
import { commandId, CommandCall } from './checkout.runner';

type Kind='CONSUME'|'RELEASE'|'RESTOCK';
const closed=(order:any)=>['CANCELLED','EXPIRED','RETURNED'].includes(order.status);
const operations={CONSUME:'ConsumeReservation',RELEASE:'ReleaseReservation',RESTOCK:'RestockOrder'} as const;

export async function queueInventoryCommand(manager:EntityManager,id:string,kind:Kind,correlation:string) {
  if(!manager.queryRunner?.isTransactionActive)throw new Error('ORDER_REQUIRES_CALLER_TRANSACTION');
  const [row]=await manager.query('SELECT * FROM order_inventory_state WHERE order_id=$1 FOR UPDATE',[id]);
  if(!row)throw new ApiError(409,'INVENTORY_CONTEXT_MISSING','Order thiếu bằng chứng reservation; cần đối soát.');
  if(row.command_kind){
    if(row.command_kind!==kind)throw new ApiError(409,'INVENTORY_COMMAND_IN_PROGRESS','Lệnh kho trước chưa rõ kết quả.');
    return;
  }
  const operation=commandId('inventory:'+id+':'+kind);
  const body=kind==='RESTOCK'?{operation_id:operation,order_id:id,items:row.items_json}:
    {operation_id:operation,order_id:id,reservation_ids:[...row.reservation_ids].sort(),reason:kind==='CONSUME'?'ORDER_CONFIRMED':'ORDER_CLOSED'};
  await manager.query(`UPDATE order_inventory_state SET command_kind=$2,operation_id=$3,command_json=$4,
    correlation_id=$5,lease_token=NULL,lease_until=NULL,next_attempt_at=now(),last_error=NULL,updated_at=now() WHERE order_id=$1`,[id,kind,operation,JSON.stringify(body),correlation]);
}

export async function changeOrderStatus(manager:EntityManager,order:any,status:string,reason:string,correlation:string,actor=order.customer_user_id) {
  if(order.status===status)return order;
  const updated=await new OrderRepository(manager).updateOrderStatusWithHistory({order_id:order.id,from_status:order.status,to_status:status,expected_version:order.version,actor_user_id:actor,reason});
  if(!updated)throw new ApiError(409,'VERSION_CONFLICT','Order đã thay đổi.');
  await audit(manager,'M2',actor,'Order',order.id,reason,correlation,{status:order.status,version:order.version},{status:updated.status,version:updated.version});
  return updated;
}

export async function requestClosedRefund(manager:EntityManager,order:any,payment:any,correlation:string) {
  await new PaymentFollowupPort(manager).closePending(order.id);
  if(payment?.status!=='SUCCEEDED' || payment.method!=='SANDBOX')return;
  const [existing]=await manager.query('SELECT id FROM refund WHERE payment_id=$1',[payment.id]);
  if(!existing)await new PaymentService(manager).requestRefund({order_id:order.id,payment_id:payment.id,amount_vnd:BigInt(payment.collected_vnd),operation_id:commandId('refund:'+order.id),correlation_id:correlation});
}

// Each row is both the last acknowledged M1 state and a durable, immutable pending command.
// A conflicting command is never substituted while the old command may already have applied.
export class OrderInventoryRunner {
  constructor(private readonly source:DataSource,private readonly call:CommandCall) {}
  private async lock(manager:EntityManager,id:string) {
    const [order]=await manager.query('SELECT * FROM "order" WHERE id=$1 FOR UPDATE',[id]);
    const [payment]=await manager.query('SELECT * FROM payment WHERE order_id=$1 FOR UPDATE',[id]);
    const [stock]=await manager.query('SELECT * FROM order_inventory_state WHERE order_id=$1 FOR UPDATE',[id]);
    return {order,payment,stock};
  }
  private async reconcile(id:string) {
    await this.source.transaction(async manager=>{
      let {order,payment,stock}=await this.lock(manager,id);
      if(!order || !stock)return;
      if(closed(order)){
        await requestClosedRefund(manager,order,payment,stock.correlation_id);
        if(!stock.command_kind){
          if(stock.state==='RESERVED')await queueInventoryCommand(manager,id,'RELEASE',stock.correlation_id);
          else if(stock.state==='CONSUMED')await queueInventoryCommand(manager,id,'RESTOCK',stock.correlation_id);
          else await manager.query("UPDATE order_inventory_state SET next_attempt_at=now()+interval '30 seconds' WHERE order_id=$1",[id]);
        }
        return;
      }
      if(order.payment_method!=='SANDBOX' || !['AWAITING_PAYMENT','RECOVERING'].includes(order.status))return;
      const successful=await manager.query("SELECT id FROM payment_attempt WHERE payment_id=$1 AND status='SUCCEEDED' AND amount_vnd=$2",[payment?.id,order.payable_vnd]);
      if(payment?.status==='SUCCEEDED' && payment.method===order.payment_method && BigInt(payment.collected_vnd)===BigInt(payment.payable_vnd) && BigInt(payment.payable_vnd)===BigInt(order.payable_vnd) && successful.length){
        if(!stock.command_kind && stock.state==='RESERVED')await queueInventoryCommand(manager,id,'CONSUME',stock.correlation_id);
        await changeOrderStatus(manager,order,'RECOVERING','PAYMENT_RECEIVED',stock.correlation_id);
        return;
      }
      if(successful.length || payment?.status==='SUCCEEDED'){
        await changeOrderStatus(manager,order,'RECOVERING','PAYMENT_RECONCILIATION_REQUIRED',stock.correlation_id);
        await manager.query("UPDATE order_inventory_state SET last_error='PAYMENT_RECONCILIATION_REQUIRED',next_attempt_at=now()+interval '30 seconds' WHERE order_id=$1",[id]);
        return;
      }
      if(!order.payment_expires_at || new Date(order.payment_expires_at).getTime()>Date.now()){
        await manager.query("UPDATE order_inventory_state SET next_attempt_at=now()+interval '1 second' WHERE order_id=$1",[id]);
        return;
      }
      const uncertain=await manager.query("SELECT id FROM payment_attempt WHERE payment_id=$1 AND status='UNKNOWN'",[payment?.id]);
      if(uncertain.length){
        await changeOrderStatus(manager,order,'RECOVERING','PAYMENT_RECONCILIATION_REQUIRED',stock.correlation_id);
        await manager.query("UPDATE order_inventory_state SET last_error='PAYMENT_RECONCILIATION_REQUIRED',next_attempt_at=now()+interval '30 seconds' WHERE order_id=$1",[id]);
        return;
      }
      // Pending QR attempts can receive a late callback; the terminal Order then requires Refund.
      order=await changeOrderStatus(manager,order,'EXPIRED','PAYMENT_EXPIRED',stock.correlation_id);
      await requestClosedRefund(manager,order,payment,stock.correlation_id);
      if(!stock.command_kind && stock.state==='RESERVED')await queueInventoryCommand(manager,id,'RELEASE',stock.correlation_id);
    });
  }
  private async claim(id:string) {
    return this.source.transaction(async manager=>{
      const {order,payment,stock}=await this.lock(manager,id);
      if(!stock?.command_kind || stock.lease_until && new Date(stock.lease_until).getTime()>Date.now())return;
      if(stock.command_kind==='CONSUME' && !closed(order) && order.payment_method==='SANDBOX' && payment?.status!=='SUCCEEDED')return;
      const token=randomUUID();
      await manager.query("UPDATE order_inventory_state SET lease_token=$2,lease_until=now()+interval '30 seconds',attempts=attempts+1,updated_at=now() WHERE order_id=$1",[id,token]);
      return {...stock,token};
    });
  }
  async process(id:string) {
    const claim=await this.claim(id);if(!claim)return;
    let result:any,error:unknown;
    try {result=await this.call(operations[claim.command_kind as Kind],claim.command_json,claim.correlation_id);}
    catch(e){error=e;}
    await this.source.transaction(async manager=>{
      let {order,payment,stock}=await this.lock(manager,id);
      if(stock.lease_token!==claim.token)return;
      const code=error instanceof ApiError?(error.getResponse() as any).code:undefined;
      if(error || !['APPLIED','ALREADY_APPLIED'].includes(result?.status) || result.operation_id!==claim.operation_id){
        if(claim.command_kind==='CONSUME' && code==='RESERVATION_EXPIRED'){
          // M1's atomic command definitively rejected consumption; releasing cannot undo a consume.
          await manager.query('UPDATE order_inventory_state SET command_kind=NULL,command_json=NULL,operation_id=NULL,lease_token=NULL,lease_until=NULL WHERE order_id=$1',[id]);
          if(!closed(order))order=await changeOrderStatus(manager,order,'EXPIRED','RESERVATION_EXPIRED',claim.correlation_id);
          await requestClosedRefund(manager,order,payment,claim.correlation_id);
          await queueInventoryCommand(manager,id,'RELEASE',claim.correlation_id);
          return;
        }
        if(claim.command_kind==='CONSUME' && !closed(order) && ['PREPARING','AWAITING_PAYMENT'].includes(order.status))
          await changeOrderStatus(manager,order,'RECOVERING','INVENTORY_RESULT_UNKNOWN',claim.correlation_id);
        await manager.query("UPDATE order_inventory_state SET lease_token=NULL,lease_until=NULL,last_error=$2,next_attempt_at=now()+least(60,attempts)*interval '1 second',updated_at=now() WHERE order_id=$1",[id,typeof code==='string'?code.slice(0,100):'INVENTORY_RESULT_UNKNOWN']);
        return;
      }
      const state=claim.command_kind==='CONSUME'?'CONSUMED':claim.command_kind==='RELEASE'?'RELEASED':'RESTOCKED';
      await manager.query('UPDATE order_inventory_state SET state=$2,command_kind=NULL,operation_id=NULL,command_json=NULL,lease_token=NULL,lease_until=NULL,last_error=NULL,updated_at=now() WHERE order_id=$1',[id,state]);
      if(claim.command_kind==='CONSUME'){
        if(closed(order))await queueInventoryCommand(manager,id,'RESTOCK',claim.correlation_id);
        else {
          if(!['PREPARING','AWAITING_PAYMENT','RECOVERING'].includes(order.status))throw new ApiError(409,'ORDER_STATE_CONFLICT','Order cần đối soát trạng thái kho.');
          order=await changeOrderStatus(manager,order,'PENDING','INVENTORY_CONSUMED',claim.correlation_id);
          if(order.payment_method==='SANDBOX'){
            const pending=await manager.query("SELECT operation_id FROM payment_followup WHERE order_id=$1 AND status='PENDING' AND kind<>'REFUND_REQUIRED'",[id]);
            for(const f of pending)await new PaymentFollowupPort(manager).complete(f.operation_id,'CONSUMED');
          }
        }
      }
      await audit(manager,'M2',order.customer_user_id,'Order',id,'INVENTORY_'+state,claim.correlation_id,{state:stock.state},{state,operation_id:claim.operation_id});
      if(closed(order))await requestClosedRefund(manager,order,payment,claim.correlation_id);
    });
  }
  async tick() {
    const reconcile=await this.source.query(`SELECT o.id FROM "order" o JOIN order_inventory_state s ON s.order_id=o.id
      WHERE s.next_attempt_at<=now() AND (o.status IN ('CANCELLED','EXPIRED','RETURNED') OR
        o.payment_method='SANDBOX' AND o.status IN ('AWAITING_PAYMENT','RECOVERING')) ORDER BY s.next_attempt_at,o.id LIMIT 20`);
    for(const row of reconcile)try {await this.reconcile(row.id);} catch {await this.defer(row.id);}
    const rows=await this.source.query("SELECT order_id FROM order_inventory_state WHERE command_kind IS NOT NULL AND next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<=now()) ORDER BY updated_at LIMIT 20");
    for(const row of rows)try {await this.process(row.order_id);} catch {await this.defer(row.order_id);}
  }
  private async defer(id:string) {
    // Preserve the lease and immutable command after an uncertain database commit. One bad
    // Order must not starve unrelated Orders in this batch. No provider error text is stored.
    await this.source.query("UPDATE order_inventory_state SET last_error='ORDER_RECONCILIATION_REQUIRED',next_attempt_at=now()+interval '30 seconds' WHERE order_id=$1",[id]);
  }
}
