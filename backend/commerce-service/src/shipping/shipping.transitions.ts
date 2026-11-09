import type {EntityManager} from 'typeorm';
import {ApiError} from '../../../shared/src/errors';
import {emitEvent} from '../../../shared/src/events';
import {audit} from '../../../shared/src/audit';
import {returnedRow} from '../../../shared/src/postgres-returning';
import {PaymentService} from '../payment/payment.service';
import {commandId} from '../order/checkout.runner';
import {changeOrderStatus} from '../order/order-inventory.runner';
import {acceptsStatus,carrierStatus,hasPickup,isReturning,SYSTEM_ACTOR,validTime} from './shipping-state';

export async function completeDeliveredOrder(m:EntityManager,shipment:any,trace:string){
  if(shipment.leg!=='OUTBOUND'||shipment.status!=='DELIVERED')return;
  const [order]=await m.query('SELECT * FROM "order" WHERE id=$1 FOR UPDATE',[shipment.order_id]);
  if(!order||order.status!=='SHIPPED')return;
  const [payment]=await m.query('SELECT * FROM payment WHERE order_id=$1 FOR UPDATE',[order.id]);
  if(payment?.status!=='SUCCEEDED'||BigInt(payment.collected_vnd)<BigInt(order.payable_vnd))return;
  if((await m.query('SELECT id FROM delivery_return_case WHERE order_id=$1',[order.id])).length)return;
  const updated=await changeOrderStatus(m,order,'COMPLETED','CARRIER_DELIVERED',trace);
  const items=await m.query('SELECT product_id,variant_id,quantity FROM order_item WHERE order_id=$1',[order.id]);
  await emitEvent(m,'OrderCompleted',{order_id:order.id,store_id:order.store_id,user_id:order.customer_user_id,version:updated.version,items},trace);
}
export async function applyCodEvidence(m:EntityManager,shipment:any,order:any,amount:number,source:string,reference:string,actor:string,trace:string){
  if(shipment.leg!=='OUTBOUND'||shipment.status!=='DELIVERED'||order.payment_method!=='COD'||!Number.isSafeInteger(amount)||amount<=0||BigInt(amount)!==BigInt(shipment.cod_vnd)||BigInt(amount)!==BigInt(order.payable_vnd))
    throw new ApiError(409,'COD_EVIDENCE_MISMATCH','Chỉ đối soát đủ tiền cho vận đơn giao thành công.');
  const [existing]=await m.query('SELECT * FROM shipping_cod_evidence WHERE shipment_id=$1',[shipment.id]);
  if(existing)return;
  await new PaymentService(m).recordCodCollection({order_id:order.id,amount_vnd:BigInt(amount),operation_id:commandId('shipping-cod:'+shipment.id),actor_user_id:SYSTEM_ACTOR,correlation_id:trace});
  await m.query('INSERT INTO shipping_cod_evidence(shipment_id,amount_vnd,source,reference,actor_user_id) VALUES($1,$2,$3,$4,$5)',[shipment.id,amount,source,reference,actor]);
  await m.query('UPDATE shipping_shipment SET cod_collected_at=now(),version=version+1 WHERE id=$1',[shipment.id]);
  await audit(m,'M2',actor,'ShippingShipment',shipment.id,'VERIFY_COD',trace,{}, {order_id:order.id,amount_vnd:amount,source,reference});
}
/** Caller locks Order before Shipment, shared by all commands, callbacks and reconciliation. */
export async function applyCarrierStatus(m:EntityManager,row:any,raw:string,time:unknown,source:'WEBHOOK'|'LOOKUP'|'PLATFORM'){
  const next=carrierStatus(raw),at=validTime(time),trace='shipping-'+row.id;
  if(!next||!at||at.getTime()>Date.now()+300000){
    await m.query("UPDATE shipping_shipment SET last_error='CARRIER_STATUS_UNRECOGNIZED',next_sync_at=now() WHERE id=$1",[row.id]);return;
  }
  if(!acceptsStatus(row.status,next,row.provider_updated_at,at)){
    if(!row.provider_updated_at||at.getTime()>=new Date(row.provider_updated_at).getTime())await m.query("UPDATE shipping_shipment SET last_error='CARRIER_STATUS_CONFLICT',next_sync_at=now() WHERE id=$1",[row.id]);
    return;
  }
  const updated=returnedRow<any>(await m.query(`UPDATE shipping_shipment SET status=$2::varchar,provider_status=$3::varchar,provider_updated_at=$4::timestamptz,
    picked_up_at=CASE WHEN $5 THEN coalesce(picked_up_at,$4) ELSE picked_up_at END,
    delivered_at=CASE WHEN $2::varchar='DELIVERED' THEN coalesce(delivered_at,$4::timestamptz) ELSE delivered_at END,
    version=version+CASE WHEN status<>$2::varchar OR provider_status IS DISTINCT FROM $3::varchar THEN 1 ELSE 0 END,
    last_error=NULL,updated_at=now() WHERE id=$1 RETURNING *`,[row.id,next,raw,at,hasPickup(next)]));
  if(!updated)throw new ApiError(409,'SHIPMENT_STATE_CONFLICT','Không đọc được vận đơn sau khi cập nhật.');
  await m.query('INSERT INTO shipping_event(shipment_id,status,provider_status,source,occurred_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[row.id,next,raw,source,at]);
  const [order]=await m.query('SELECT * FROM "order" WHERE id=$1 FOR UPDATE',[row.order_id]);
  if(row.leg==='OUTBOUND'){
    if(next==='DELIVERED')await m.query('UPDATE "order" SET shipping_delivered_at=coalesce(shipping_delivered_at,$2) WHERE id=$1',[row.order_id,updated.delivered_at]);
    if(hasPickup(next)&&order.status==='PROCESSING')await changeOrderStatus(m,order,'SHIPPED','CARRIER_PICKED_UP',trace);
    if(hasPickup(next))await m.query(`INSERT INTO shipment(order_id,status,tracking_code,shipped_at,delivered_at) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(order_id) DO UPDATE SET status=excluded.status,tracking_code=excluded.tracking_code,shipped_at=coalesce(shipment.shipped_at,excluded.shipped_at),delivered_at=coalesce(shipment.delivered_at,excluded.delivered_at)`,
      [row.order_id,next==='DELIVERED'?'DELIVERED':isReturning(next)?'DELIVERY_FAILED':'SHIPPED',updated.tracking_code,updated.picked_up_at,updated.delivered_at]);
    if(isReturning(next)){
      const [opened]=await m.query(`INSERT INTO delivery_return_case(order_id,shipping_shipment_id,reason,opened_by_user_id)
        VALUES($1,$2,'Hãng vận chuyển xác nhận chuyển hoàn',$3) ON CONFLICT(order_id) DO NOTHING RETURNING id`,[row.order_id,row.id,SYSTEM_ACTOR]);
      if(opened){
        await m.query("INSERT INTO delivery_return_history(case_id,actor_user_id,action,after_json) VALUES($1,$2,'CARRIER_RETURNING',$3)",[opened.id,SYSTEM_ACTOR,{status:'OPEN',shipment_id:row.id}]);
        await m.query('UPDATE "order" SET version=version+1 WHERE id=$1',[row.order_id]);
      }
    }
    await completeDeliveredOrder(m,updated,trace);
  }else if(row.leg==='EXCHANGE_OUTBOUND'){
    const [request]=await m.query('SELECT * FROM order_return_request WHERE id=$1 FOR UPDATE',[row.return_request_id]);
    if(hasPickup(next)&&request?.status==='RECEIVED'&&request.exchange_status==='APPLIED'){
      await m.query("UPDATE order_return_request SET status='EXCHANGE_SENT',replacement_reference=$2,version=version+1,updated_at=now() WHERE id=$1",[request.id,updated.tracking_code]);
      await m.query("INSERT INTO return_status_history(request_id,from_status,to_status,actor_user_id,reason) VALUES($1,'RECEIVED','EXCHANGE_SENT',$2,'Hãng vận chuyển xác nhận nhận kiện đổi')",[request.id,SYSTEM_ACTOR]);
    }
    // Replacement return must never cancel or restock the original purchase.
    if(isReturning(next)||next==='EXCEPTION')await m.query("UPDATE shipping_shipment SET last_error='EXCHANGE_RETURN_RECONCILIATION_REQUIRED' WHERE id=$1",[row.id]);
  }
  return updated;
}
