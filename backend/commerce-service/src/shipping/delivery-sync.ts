import {DataSource} from 'typeorm';
import {database} from '../../../shared/src/database';
import {ApiError} from '../../../shared/src/errors';
import {DeliveryApi,authenticateDeliveryCallback,deliveryApiConfigured} from './delivery-api';
import {applyCarrierStatus,applyCodEvidence,completeDeliveredOrder} from './shipping.transitions';
import {SYSTEM_ACTOR} from './shipping-state';
import {commandId} from '../order/checkout.runner';
import type {DeliverySnapshot} from '../../../delivery-service/src/contracts';

const rawStatus:Record<string,string>={READY_FOR_PICKUP:'ready_to_pick',PICKED_UP:'picked',IN_TRANSIT:'transporting',OUT_FOR_DELIVERY:'delivering',DELIVERY_ATTEMPT_FAILED:'delivery_fail',DELIVERED:'delivered',RETURNING:'return',RETURNED:'returned',CANCELLED:'cancel'};
function valid(snapshot:any):snapshot is DeliverySnapshot {
  return snapshot&&typeof snapshot.client_reference==='string'&&snapshot.client_reference.length<=100&&typeof snapshot.tracking_code==='string'&&snapshot.tracking_code.length<=100&&
    Object.hasOwn(rawStatus,snapshot.status)&&Number.isSafeInteger(snapshot.version)&&snapshot.version>0&&Number.isSafeInteger(snapshot.cod_amount)&&snapshot.cod_amount>=0&&Number.isSafeInteger(snapshot.collected_vnd)&&snapshot.collected_vnd>=0&&Number.isFinite(Date.parse(snapshot.updated_at));
}
export class DeliverySync {
  constructor(private readonly source:DataSource=database,private readonly api:DeliveryApi=new DeliveryApi()){}
  async receive(raw:Buffer,timestamp:unknown,signature:unknown){
    authenticateDeliveryCallback(raw,timestamp,signature);
    let body:any;try{body=JSON.parse(raw.toString('utf8'));}catch{throw new ApiError(422,'INVALID_DELIVERY_EVENT','Callback chưa hợp lệ.');}
    if(!body||!/^[0-9a-f-]{36}$/i.test(body.event_id)||!valid(body.parcel))throw new ApiError(422,'INVALID_DELIVERY_EVENT','Callback chưa hợp lệ.');
    await this.source.query('INSERT INTO delivery_callback_receipt(event_id,snapshot_json) VALUES($1,$2) ON CONFLICT DO NOTHING',[body.event_id,body.parcel]);
    return {accepted:true};
  }
  async apply(snapshot:DeliverySnapshot){
    if(!valid(snapshot))throw new Error('DELIVERY_SNAPSHOT_INVALID');
    return this.source.transaction(async manager=>{
      const [target]=await manager.query("SELECT id,order_id FROM shipping_shipment WHERE client_order_code=$1 AND provider='PLATFORM'",[snapshot.client_reference]);
      if(!target)return false;
      const [order]=await manager.query('SELECT * FROM "order" WHERE id=$1 FOR UPDATE',[target.order_id]);
      const [shipment]=await manager.query('SELECT * FROM shipping_shipment WHERE id=$1 FOR UPDATE',[target.id]);
      if(shipment.tracking_code&&shipment.tracking_code!==snapshot.tracking_code)throw new Error('DELIVERY_IDENTITY_MISMATCH');
      if(snapshot.version<=shipment.carrier_version)return true;
      if(Number(shipment.cod_vnd)!==snapshot.cod_amount)throw new Error('DELIVERY_COD_MISMATCH');
      await manager.query('UPDATE shipping_shipment SET tracking_code=$2 WHERE id=$1',[shipment.id,snapshot.tracking_code]);
      shipment.tracking_code=snapshot.tracking_code;
      const updated=await applyCarrierStatus(manager,{...shipment,provider_updated_at:null},rawStatus[snapshot.status],snapshot.updated_at,'PLATFORM');
      if(!updated||updated.status!==snapshot.status)throw new Error('DELIVERY_STATUS_CONFLICT');
      if(snapshot.status==='DELIVERED'&&shipment.leg==='OUTBOUND'&&snapshot.cod_amount>0){
        if(snapshot.collected_vnd!==snapshot.cod_amount)throw new Error('DELIVERY_COLLECTION_MISMATCH');
        await applyCodEvidence(manager,updated,order,snapshot.collected_vnd,'DELIVERY_API',snapshot.tracking_code,SYSTEM_ACTOR,'delivery-'+shipment.id);
        await completeDeliveredOrder(manager,updated,'delivery-'+shipment.id);
      }
      const remitted=snapshot.remitted_at&&Number.isFinite(Date.parse(snapshot.remitted_at))?new Date(snapshot.remitted_at):null;
      await manager.query(`UPDATE shipping_shipment SET carrier_version=$2,courier_name=$3,delivery_note=$4,cod_remitted_at=coalesce($5,cod_remitted_at),last_error=NULL,next_sync_at=now()+interval '2 minutes',version=version+1 WHERE id=$1`,[shipment.id,snapshot.version,snapshot.courier_name,snapshot.note,remitted]);
      return true;
    });
  }
  async processCommand(id:string){
    // Parcel commands are idempotent at the carrier. An expired claim can replay safely.
    const claimed=await this.source.query(`UPDATE shipping_command SET lease_token=gen_random_uuid(),lease_until=now()+interval '30 seconds',attempts=attempts+1 WHERE id=$1 AND status IN ('PENDING','UNKNOWN') AND (lease_until IS NULL OR lease_until<now()) RETURNING *`,[id]);
    const command=Array.isArray(claimed[0])?claimed[0][0]:claimed[0];if(!command)return;
    const [shipment]=await this.source.query('SELECT * FROM shipping_shipment WHERE id=$1',[command.shipment_id]);
    try{
      let result:DeliverySnapshot;
      if(command.kind==='CREATE')result=await this.api.create(shipment.client_order_code,shipment.request_json);
      else{
        let payload=command.carrier_command_json;
        if(!payload){
          const current=await this.api.lookup(shipment.client_order_code);
          payload={operation_id:commandId('delivery-command:'+id),expected_version:current.version,action:command.kind==='REDELIVER'?'REDELIVER':command.kind,note:'Yêu cầu từ sàn PBL6'};
          const saved=await this.source.query('UPDATE shipping_command SET carrier_command_json=coalesce(carrier_command_json,$2) WHERE id=$1 AND lease_token=$3 RETURNING carrier_command_json',[id,payload,command.lease_token]);
          const row=Array.isArray(saved[0])?saved[0][0]:saved[0];if(!row)return;
          payload=row.carrier_command_json;
        }
        result=await this.api.command(shipment.client_order_code,payload);
      }
      if(result.client_reference!==shipment.client_order_code)throw new Error('DELIVERY_IDENTITY_MISMATCH');
      await this.apply(result);
      await this.source.query("UPDATE shipping_command SET status='APPLIED',last_error=NULL,lease_until=NULL,lease_token=NULL WHERE id=$1 AND lease_token=$2",[id,command.lease_token]);
    }catch(error){
      const rejected=error instanceof ApiError&&[409,422].includes(error.getStatus());
      // Only a validation rejection proves that no parcel was created. A timeout
      // or reference conflict must retain its reference for reconciliation.
      const invalidCreate=command.kind==='CREATE'&&error instanceof ApiError&&error.getStatus()===422;
      const code=invalidCreate?'DELIVERY_CREATE_REJECTED':rejected?'DELIVERY_COMMAND_REJECTED':'DELIVERY_API_RETRY';
      await this.source.transaction(async manager=>{
        await manager.query('SELECT id FROM "order" WHERE id=$1 FOR UPDATE',[shipment.order_id]);
        await manager.query('SELECT id FROM shipping_shipment WHERE id=$1 FOR UPDATE',[shipment.id]);
        const saved=await manager.query("UPDATE shipping_command SET status=$3,last_error=$4,next_attempt_at=now()+interval '30 seconds',lease_until=NULL,lease_token=NULL WHERE id=$1 AND lease_token=$2 RETURNING id",[id,command.lease_token,rejected?'FAILED':'UNKNOWN',code]);
        const row=Array.isArray(saved[0])?saved[0][0]:saved[0];if(!row)return;
        await manager.query(`UPDATE shipping_shipment SET last_error=$2,next_sync_at=now(),
          status=CASE WHEN $3 AND tracking_code IS NULL THEN 'CREATE_FAILED' WHEN $4 AND status='CREATING' AND tracking_code IS NULL THEN 'CREATE_UNKNOWN' ELSE status END,
          version=version+1,updated_at=now() WHERE id=$1`,[shipment.id,code,invalidCreate,command.kind==='CREATE']);
      });
    }
  }
  async tick(){
    const events=await this.source.query('SELECT * FROM delivery_callback_receipt WHERE processed_at IS NULL AND next_attempt_at<=now() ORDER BY received_at LIMIT 20');
    for(const event of events){
      try{if(!await this.apply(event.snapshot_json))throw new Error('UNMAPPED');await this.source.query('UPDATE delivery_callback_receipt SET processed_at=now(),last_error=NULL WHERE event_id=$1',[event.event_id]);}
      catch{await this.source.query("UPDATE delivery_callback_receipt SET last_error='DELIVERY_RECONCILIATION_REQUIRED',next_attempt_at=now()+interval '30 seconds' WHERE event_id=$1",[event.event_id]);}
    }
    if(!deliveryApiConfigured())return;
    const commands=await this.source.query("SELECT c.id FROM shipping_command c JOIN shipping_shipment s ON s.id=c.shipment_id WHERE s.provider='PLATFORM' AND c.status IN ('PENDING','UNKNOWN') AND c.next_attempt_at<=now() AND (c.lease_until IS NULL OR c.lease_until<now()) ORDER BY c.created_at LIMIT 3");
    for(const command of commands)await this.processCommand(command.id);
    const shipments=await this.source.query("SELECT * FROM shipping_shipment WHERE provider='PLATFORM' AND (tracking_code IS NOT NULL OR status='CREATE_UNKNOWN') AND next_sync_at<=now() AND (status NOT IN ('CANCELLED','RETURNED','DELIVERED') OR status='DELIVERED' AND cod_vnd>0 AND cod_remitted_at IS NULL) ORDER BY next_sync_at LIMIT 3");
    for(const shipment of shipments){try{await this.apply(await this.api.lookup(shipment.client_order_code));await this.source.query("UPDATE shipping_shipment SET next_sync_at=now()+interval '2 minutes' WHERE id=$1",[shipment.id]);}catch{await this.source.query("UPDATE shipping_shipment SET last_error='DELIVERY_SYNC_RETRY',next_sync_at=now()+interval '1 minute' WHERE id=$1",[shipment.id]);}}
  }
}
