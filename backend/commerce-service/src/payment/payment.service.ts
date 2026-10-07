import { EntityManager } from 'typeorm';
import { PaymentPort, PaymentDraft, CodDraft, RefundDraft } from './payment.port';
import { RefundService } from './refund.service';
import { ApiError } from '../../../shared/src/errors';
import { PaymentRepository, PaymentRow } from './payment.repository';
import { once, fingerprint } from '../../../shared/src/idempotency';
import { audit } from '../../../shared/src/audit';
import { moneyNumber } from '../../../shared/src/money';
import type { OperationOutputs } from '../../../shared/src/operations.generated';
export function mapPayment(p:PaymentRow):OperationOutputs['getPayment'] {
  return {id:p.id,order_id:p.order_id,method:p.method,status:p.status,payable_vnd:moneyNumber(p.payable_vnd),
    collectible_vnd:moneyNumber(p.collectible_vnd),collected_vnd:moneyNumber(p.collected_vnd),refunded_vnd:moneyNumber(p.refunded_vnd)};
}
// Caller owns authorization and transaction. Lock order -> payment -> effects consistently.
export class PaymentService implements PaymentPort {
  private readonly repo:PaymentRepository;
  constructor(readonly manager:EntityManager) {this.repo=new PaymentRepository(manager);}
  private transaction() {
    if(!this.manager.queryRunner?.isTransactionActive)throw new Error('PAYMENT_REQUIRES_CALLER_TRANSACTION');
  }
  async createForOrder(input:PaymentDraft):Promise<OperationOutputs['getPayment']> {
    this.transaction();
    const order=await this.repo.lockOrder(input.order_id);
    if(!order)throw new ApiError(404,'NOT_FOUND','Không tìm thấy Order.');
    if(input.payable_vnd<0n || BigInt(order.payable_vnd)!==input.payable_vnd || order.payment_method!==input.method)throw new ApiError(409,'PAYMENT_DRAFT_CONFLICT','Payment phải khớp snapshot Order.');
    moneyNumber(input.payable_vnd);
    return once(this.manager,'M2.Payment.create',input.operation_id,{order_id:input.order_id,method:input.method,payable_vnd:input.payable_vnd.toString()},async()=>{
      const existing=await this.repo.byOrder(input.order_id);
      if(existing){
        if(existing.method!==input.method || BigInt(existing.payable_vnd)!==input.payable_vnd)throw new ApiError(409,'PAYMENT_DRAFT_CONFLICT','Payment đã tồn tại với snapshot khác.');
        return mapPayment(existing);
      }
      if(!['PREPARING','AWAITING_PAYMENT'].includes(order.status))throw new ApiError(409,'ORDER_STATE_CONFLICT','Chỉ tạo Payment trong bước tạo Order.');
      const [payment]=await this.manager.query("INSERT INTO payment(order_id,method,status,payable_vnd,collectible_vnd) VALUES($1,$2,'PENDING',$3,$4) RETURNING *",
        [input.order_id,input.method,input.payable_vnd.toString(),input.method==='COD'?input.payable_vnd.toString():'0']);
      if(input.method==='COD')await this.manager.query("INSERT INTO c_o_d_collection(order_id,amount_due_vnd,amount_collected_vnd,status,operation_id) VALUES($1,$2,0,'PENDING',$3)",[input.order_id,input.payable_vnd.toString(),input.operation_id]);
      await audit(this.manager,'M2',order.customer_user_id,'Payment',payment.id,'CREATE',input.correlation_id ?? input.operation_id,{},mapPayment(payment));
      return mapPayment(payment);
    });
  }
  async recordCodCollection(input:CodDraft):Promise<OperationOutputs['getPayment']> {
    this.transaction();
    const order=await this.repo.lockOrder(input.order_id);
    if(!order)throw new ApiError(404,'NOT_FOUND','Không tìm thấy Order.');
    return once(this.manager,'M2.Payment.cod',input.operation_id,{order_id:input.order_id,amount_vnd:input.amount_vnd.toString(),actor_user_id:input.actor_user_id},async()=>{
      if(order.status!=='SHIPPED' || order.payment_method!=='COD')throw new ApiError(409,'ORDER_STATE_CONFLICT','Chỉ thu COD khi Order đang giao.');
      const payment=await this.repo.byOrder(input.order_id);
      if(!payment || payment.method!=='COD' || payment.status!=='PENDING')throw new ApiError(409,'PAYMENT_STATE_CONFLICT','Payment không cho phép thu COD.');
      if(input.amount_vnd<0n || input.amount_vnd!==BigInt(order.payable_vnd) || input.amount_vnd!==BigInt(payment.payable_vnd) || input.amount_vnd!==BigInt(payment.collectible_vnd) || BigInt(payment.collected_vnd)!==0n)throw new ApiError(422,'COD_AMOUNT_MISMATCH','Phải thu đủ chính Order.');
      moneyNumber(input.amount_vnd);
      const [collection]=await this.manager.query('SELECT * FROM c_o_d_collection WHERE order_id=$1 FOR UPDATE',[input.order_id]);
      if(collection && (collection.status!=='PENDING' || BigInt(collection.amount_due_vnd)!==input.amount_vnd || BigInt(collection.amount_collected_vnd)!==0n))throw new ApiError(409,'COD_STATE_CONFLICT','Nghĩa vụ COD không hợp lệ.');
      if(collection)await this.manager.query("UPDATE c_o_d_collection SET status='SUCCEEDED',amount_collected_vnd=$2,operation_id=$3,collected_at=now() WHERE id=$1",[collection.id,input.amount_vnd.toString(),input.operation_id]);
      else await this.manager.query("INSERT INTO c_o_d_collection(order_id,amount_due_vnd,amount_collected_vnd,status,operation_id,collected_at) VALUES($1,$2,$2,'SUCCEEDED',$3,now())",[input.order_id,input.amount_vnd.toString(),input.operation_id]);
      await this.manager.query("UPDATE payment SET status='SUCCEEDED',collected_vnd=$2,version=version+1 WHERE id=$1",[payment.id,input.amount_vnd.toString()]);
      await this.manager.query("INSERT INTO payment_event(payment_id,provider_event_id,event_type,payload_hash) VALUES($1,$2,'COD_COLLECTED',$3)",[payment.id,'cod:'+input.operation_id,fingerprint({order_id:input.order_id,amount_vnd:input.amount_vnd.toString()})]);
      const result=mapPayment({...payment,status:'SUCCEEDED',collected_vnd:input.amount_vnd.toString(),version:payment.version+1});
      await audit(this.manager,'M2',input.actor_user_id,'Payment',payment.id,'COD_COLLECT',input.correlation_id ?? input.operation_id,mapPayment(payment),result);
      return result;
    });
  }
  async requestRefund(input:RefundDraft):Promise<OperationOutputs['getOrderRefund']> {return new RefundService(this.manager).request(input);}
}
