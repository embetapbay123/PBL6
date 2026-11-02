import {DataSource} from 'typeorm';
import {database} from '../../../shared/src/database';
import {once} from '../../../shared/src/idempotency';
import {audit} from '../../../shared/src/audit';
import {ApiError} from '../../../shared/src/errors';
import {mapRefund} from './refund.service';
import {recordMoneyMovement} from './money-journal';
import {returnSettlementReady} from '../returns/returns.service';

export interface CodRefundConfirmation {
  operation_id:string; expected_order_version:number; expected_return_version?:number; expected_case_version?:number;
  receipt_reference:string; recipient_name:string; refunded_at:string; full_amount_confirmed:boolean;
}
export class CodRefundService {
  constructor(private readonly source:DataSource=database) {}
  async confirm(orderId:string,input:CodRefundConfirmation,auth:any,trace:string) {
    const membership=auth?.store_membership;
    if(!auth?.user_id || !auth.roles?.includes('STORE_OWNER') || membership?.role!=='OWNER' || membership.status!=='ACTIVE' || !membership.store_id)
      throw new ApiError(403,'OWNER_REQUIRED','Chỉ chủ cửa hàng hiện hành được xác nhận hoàn COD.');
    const reference=input.receipt_reference?.trim(),recipient=input.recipient_name?.trim(),time=Date.parse(input.refunded_at);
    if(!reference || reference.length>200 || !recipient || recipient.length>200 || !input.full_amount_confirmed || !Number.isFinite(time) || time>Date.now()+60000)
      throw new ApiError(422,'COD_REFUND_PROOF_REQUIRED','Cần biên nhận, người nhận, thời điểm hợp lệ và xác nhận đã hoàn đủ tiền.');
    return this.source.transaction(async manager=>{
      const [order]=await manager.query('SELECT * FROM "order" WHERE id=$1 AND store_id=$2 FOR UPDATE',[orderId,membership.store_id]);
      if(!order)throw new ApiError(404,'NOT_FOUND','Không tìm thấy đơn của cửa hàng.');
      return once(manager,'M2.Payment.cod-refund',input.operation_id,{...input,order_id:orderId,store_id:membership.store_id,actor_user_id:auth.user_id},async()=>{
        if(order.version!==input.expected_order_version)throw new ApiError(409,'VERSION_CONFLICT','Đơn đã thay đổi. Đọc lại trước khi xác nhận.');
        const [request]=await manager.query('SELECT * FROM order_return_request WHERE order_id=$1 FOR UPDATE',[orderId]);
        if(order.status==='COMPLETED') {
          if(request?.type!=='REFUND' || request.status!=='RECEIVED' || !returnSettlementReady(request))throw new ApiError(409,'REFUND_STATE_CONFLICT','Cần kiểm hàng, đối chiếu kho và quyết định phí trước khi xác nhận hoàn đủ tiền.');
          if(request.version!==input.expected_return_version)throw new ApiError(409,'VERSION_CONFLICT','Yêu cầu đã thay đổi. Đọc lại trước khi xác nhận.');
        } else if(order.status==='SHIPPED') {
          const [deliveryCase]=await manager.query('SELECT status,version FROM delivery_return_case WHERE order_id=$1 FOR UPDATE',[orderId]);
          if(deliveryCase?.status!=='SETTLING')throw new ApiError(409,'REFUND_STATE_CONFLICT','Cần hồ sơ giao thất bại đã nhận/kiểm hàng và đang đối chiếu.');
          if(deliveryCase.version!==input.expected_case_version)throw new ApiError(409,'VERSION_CONFLICT','Hồ sơ hoàn về đã thay đổi. Đọc lại trước khi xác nhận.');
        } else if(!['CANCELLED','EXPIRED'].includes(order.status))throw new ApiError(409,'REFUND_STATE_CONFLICT','Đơn chưa đủ điều kiện hoàn tiền.');
        const [payment]=await manager.query('SELECT * FROM payment WHERE order_id=$1 FOR UPDATE',[orderId]);
        const [collection]=await manager.query('SELECT * FROM c_o_d_collection WHERE order_id=$1 FOR UPDATE',[orderId]);
        if(order.payment_method!=='COD' || payment?.method!=='COD' || payment.status!=='SUCCEEDED' || BigInt(payment.refunded_vnd)!==0n || BigInt(payment.collected_vnd)<=0n || payment.collected_vnd!==payment.payable_vnd || payment.payable_vnd!==order.payable_vnd || collection?.status!=='SUCCEEDED' || collection.amount_collected_vnd!==payment.collected_vnd)
          throw new ApiError(409,'COD_REFUND_RECONCILIATION_REQUIRED','Chỉ xác nhận hoàn đủ khoản COD đã thu và đối chiếu của chính đơn.');
        if(collection.collected_at && time<new Date(collection.collected_at).getTime())throw new ApiError(422,'COD_REFUND_TIME_INVALID','Thời điểm hoàn không thể trước thời điểm thu.');
        const [existing]=await manager.query('SELECT id FROM refund WHERE payment_id=$1 FOR UPDATE',[payment.id]);
        if(existing)throw new ApiError(409,'REFUND_ALREADY_REQUESTED','Khoản tiền đã có hồ sơ hoàn. Đối chiếu trước khi tiếp tục.');
        const [refund]=await manager.query("INSERT INTO refund(payment_id,order_id,amount_vnd,status,operation_id) VALUES($1,$2,$3,'SUCCEEDED',$4) RETURNING *",[payment.id,orderId,payment.collected_vnd,input.operation_id]);
        const [receipt]=await manager.query(`INSERT INTO cod_refund_receipt(refund_id,operation_id,owner_user_id,receipt_reference,recipient_name,refunded_at,amount_vnd,full_amount_confirmed)
          VALUES($1,$2,$3,$4,$5,$6,$7,true) RETURNING id`,[refund.id,input.operation_id,auth.user_id,reference,recipient,input.refunded_at,payment.collected_vnd]);
        await manager.query("UPDATE payment SET status='REFUNDED',refunded_vnd=collected_vnd,version=version+1 WHERE id=$1",[payment.id]);
        await recordMoneyMovement(manager,{paymentId:payment.id,orderId,storeId:order.store_id,kind:'REFUND',amount:payment.collected_vnd,sourceType:'COD_REFUND_RECEIPT',sourceId:receipt.id,occurredAt:input.refunded_at,timeSource:'OWNER_ATTESTED'});
        await manager.query('UPDATE "order" SET version=version+1 WHERE id=$1',[orderId]);
        await audit(manager,'M2',auth.user_id,'Refund',refund.id,'COD_REFUND_MANUALLY_CONFIRMED',trace,{}, {status:'SUCCEEDED',amount_vnd:payment.collected_vnd,receipt_id:receipt.id,confirmation:'OWNER_ATTESTED'});
        return mapRefund(refund);
      });
    });
  }
}
