import {randomUUID} from 'node:crypto';
import type {DataSource,EntityManager} from 'typeorm';
import {CarrierAdapter,CarrierError,ShippingConfig} from './ghn.adapter';
import {applyCarrierStatus,applyCodEvidence,completeDeliveredOrder} from './shipping.transitions';
import {SYSTEM_ACTOR,validTime} from './shipping-state';
import {InternalClients} from '../../../shared/src/internal-clients';
import {config} from '../../../shared/src/config';
import type {OperationInputs,OperationOutputs} from '../../../shared/src/operations.generated';

export class ShippingRunner {
  constructor(private readonly source:DataSource,private readonly cfg:ShippingConfig,private readonly carrier:CarrierAdapter,
    private readonly restock?:(body:OperationInputs['RestockExchangeItems']['body'])=>Promise<OperationOutputs['RestockExchangeItems']>){}
  private async lock(m:EntityManager,id:string){
    const [target]=await m.query('SELECT order_id FROM shipping_shipment WHERE id=$1',[id]);if(!target)return;
    await m.query('SELECT id FROM "order" WHERE id=$1 FOR UPDATE',[target.order_id]);
    const [row]=await m.query('SELECT * FROM shipping_shipment WHERE id=$1 FOR UPDATE',[id]);return row;
  }
  private matches(row:any){return row?.provider==='GHN'&&row.environment===this.cfg.environment&&row.account_key===this.cfg.accountKey;}
  async processCommand(id:string){
    const claim=await this.source.transaction(async m=>{
      const [target]=await m.query('SELECT shipment_id FROM shipping_command WHERE id=$1',[id]);if(!target)return;
      const row=await this.lock(m,target.shipment_id);
      if(!this.matches(row))return;
      const [cmd]=await m.query('SELECT * FROM shipping_command WHERE id=$1 FOR UPDATE',[id]);
      if(!['PENDING','UNKNOWN'].includes(cmd.status)||cmd.lease_until&&new Date(cmd.lease_until).getTime()>Date.now())return;
      const token=randomUUID();
      await m.query("UPDATE shipping_command SET lease_token=$2,lease_until=now()+interval '45 seconds',attempts=attempts+1 WHERE id=$1",[id,token]);
      return {row,cmd,token};
    });
    if(!claim)return;
    let detail:any,created:any,error:CarrierError|undefined;
    try{
      if(claim.cmd.kind==='CREATE'){
        if(claim.cmd.attempts>0||claim.row.tracking_code){
          // A lost response never causes another parcel with a new client_order_code.
          try{detail=await this.carrier.lookup(claim.row.shop_id,claim.row.client_order_code);}
          catch(e){if(!(e instanceof CarrierError)||e.code!=='CARRIER_ORDER_NOT_FOUND')throw e;}
        }
        if(!detail)created=await this.carrier.create(claim.row.shop_id,claim.row.request_json);
        const code=detail?.order_code??created?.order_code;
        if(typeof code!=='string'||!code||code.length>100)throw new CarrierError('CARRIER_RESULT_UNKNOWN');
        if(detail&&(detail.shop_id!==claim.row.shop_id||detail.client_order_code!==claim.row.client_order_code))throw new CarrierError('CARRIER_IDENTITY_MISMATCH');
      }else{
        detail=await this.carrier.lookup(claim.row.shop_id,claim.row.client_order_code);
        if(detail.shop_id!==claim.row.shop_id||detail.order_code!==claim.row.tracking_code||detail.client_order_code!==claim.row.client_order_code)throw new CarrierError('CARRIER_IDENTITY_MISMATCH');
        const achieved=claim.cmd.kind==='CANCEL'?detail.status==='cancel':claim.cmd.kind==='RETURN'?['return','return_transporting','return_sorting','returning','returned'].includes(detail.status):['storing','transporting','sorting','delivering','delivered'].includes(detail.status)&&claim.cmd.attempts>0;
        if(!achieved){
          // Retrying delivery-again can schedule another attempt; reconcile an uncertain ACK first.
          if(claim.cmd.status==='UNKNOWN'&&claim.cmd.kind==='REDELIVER')throw new CarrierError('CARRIER_COMMAND_RECONCILIATION_REQUIRED');
          await this.carrier.command(claim.row.shop_id,claim.row.tracking_code,claim.cmd.kind);
        }
      }
    }catch(e){error=e instanceof CarrierError?e:new CarrierError('CARRIER_RESULT_UNKNOWN');}
    await this.source.transaction(async m=>{
      const row=await this.lock(m,claim.row.id);
      const [cmd]=await m.query('SELECT * FROM shipping_command WHERE id=$1 FOR UPDATE',[id]);
      if(cmd.lease_token!==claim.token)return;
      if(error){
        const definitive=error.definitive&&claim.cmd.attempts===0;
        await m.query(`UPDATE shipping_command SET status=$2,last_error=$3,lease_token=NULL,lease_until=NULL,next_attempt_at=now()+$4*interval '1 second',updated_at=now() WHERE id=$1`,
          [id,definitive?'FAILED':'UNKNOWN',error.code,Math.min(600,5*2**Math.min(cmd.attempts,7))]);
        await m.query(`UPDATE shipping_shipment SET status=CASE WHEN $2 AND status IN ('CREATING','CREATE_UNKNOWN') THEN $3 ELSE status END,last_error=$4,version=version+1,updated_at=now() WHERE id=$1`,
          [row.id,cmd.kind==='CREATE',definitive?'CREATE_FAILED':'CREATE_UNKNOWN',error.code]);return;
      }
      if(cmd.kind==='CREATE'){
        const code=detail?.order_code??created.order_code;
        if(row.tracking_code&&row.tracking_code!==code)throw new CarrierError('CARRIER_IDENTITY_MISMATCH');
        const eta=validTime(created?.expected_delivery_time??detail?.leadtime);
        await m.query(`UPDATE shipping_shipment SET tracking_code=$2,status=CASE WHEN status IN ('CREATING','CREATE_UNKNOWN') THEN 'READY_FOR_PICKUP' ELSE status END,
          expected_delivery_at=coalesce($3,expected_delivery_at),actual_fee_vnd=coalesce($4,actual_fee_vnd),last_error=NULL,next_sync_at=now(),version=version+1,updated_at=now() WHERE id=$1`,
          [row.id,code,eta??null,Number.isSafeInteger(created?.total_fee)&&created.total_fee>=0?created.total_fee:null]);
      }
      await m.query("UPDATE shipping_command SET status='APPLIED',last_error=NULL,lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=$1",[id]);
      await m.query('UPDATE shipping_shipment SET next_sync_at=now(),last_error=NULL WHERE id=$1',[row.id]);
    });
    if(!error)await this.sync(claim.row.id);
  }
  async sync(id:string){
    const [target]=await this.source.query('SELECT * FROM shipping_shipment WHERE id=$1',[id]);if(!this.matches(target)||!target.tracking_code)return;
    let detail:any;
    try{
      detail=await this.carrier.lookup(target.shop_id,target.client_order_code);
      if(detail.order_code!==target.tracking_code||detail.shop_id!==target.shop_id||detail.client_order_code!==target.client_order_code)throw new CarrierError('CARRIER_IDENTITY_MISMATCH');
    }catch(e){await this.source.query("UPDATE shipping_shipment SET last_error=$2,next_sync_at=now()+interval '2 minutes' WHERE id=$1",[id,e instanceof CarrierError?e.code:'CARRIER_RESULT_UNKNOWN']);return;}
    await this.source.transaction(async m=>{
      const row=await this.lock(m,id);if(!row)return;
      const updated=await applyCarrierStatus(m,row,detail.status,detail.updated_date,'LOOKUP');
      const eta=validTime(detail.leadtime);
      await m.query("UPDATE shipping_shipment SET expected_delivery_at=coalesce($2,expected_delivery_at),next_sync_at=now()+interval '5 minutes' WHERE id=$1",[id,eta??null]);
      if(updated?.status==='DELIVERED'&&updated.leg==='OUTBOUND'){
        if(this.cfg.verifyCod&&detail.is_cod_collected===true&&validTime(detail.cod_collect_date)&&Number.isSafeInteger(detail.cod_amount)&&detail.cod_amount>0){
          const [order]=await m.query('SELECT * FROM "order" WHERE id=$1 FOR UPDATE',[row.order_id]);
          if(Number(row.cod_vnd)===detail.cod_amount&&order.payment_method==='COD')await applyCodEvidence(m,updated,order,detail.cod_amount,'GHN_LOOKUP',row.tracking_code,SYSTEM_ACTOR,'shipping-'+id);
          else await m.query("UPDATE shipping_shipment SET last_error='COD_AMOUNT_MISMATCH' WHERE id=$1",[id]);
        }
        await completeDeliveredOrder(m,updated,'shipping-'+id);
      }
      if(detail.is_cod_transferred===true&&validTime(detail.cod_transfer_date)&&Number(detail.cod_amount)===Number(row.cod_vnd)&&Number(row.cod_vnd)>0)
        await m.query('UPDATE shipping_shipment SET cod_remitted_at=coalesce(cod_remitted_at,$2) WHERE id=$1',[id,new Date(detail.cod_transfer_date)]);
    });
  }
  async processReceipt(id:string){
    await this.source.transaction(async m=>{
      const [receipt]=await m.query('SELECT * FROM shipping_webhook_receipt WHERE id=$1 AND processed_at IS NULL',[id]);if(!receipt)return;
      if(receipt.environment!==this.cfg.environment||receipt.account_key!==this.cfg.accountKey)return;
      const [target]=await m.query(`SELECT id FROM shipping_shipment WHERE environment=$1 AND account_key=$2 AND shop_id=$3 AND provider='GHN'
        AND (tracking_code=$4 OR client_order_code=$5)`,[receipt.environment,receipt.account_key,receipt.shop_id,receipt.tracking_code,receipt.client_order_code]);
      if(!target){await m.query("UPDATE shipping_webhook_receipt SET attempts=attempts+1,last_error='SHIPMENT_NOT_MAPPED',next_attempt_at=now()+interval '5 minutes' WHERE id=$1",[id]);return;}
      const row=await this.lock(m,target.id);
      if(row.tracking_code&&row.tracking_code!==receipt.tracking_code||receipt.client_order_code&&row.client_order_code!==receipt.client_order_code){
        await m.query("UPDATE shipping_webhook_receipt SET processed_at=now(),last_error='CARRIER_IDENTITY_MISMATCH' WHERE id=$1",[id]);return;
      }
      const [locked]=await m.query('SELECT * FROM shipping_webhook_receipt WHERE id=$1 FOR UPDATE',[id]);if(locked.processed_at)return;
      // A callback may beat the create response; stable client code identifies the same parcel.
      await m.query('UPDATE shipping_shipment SET tracking_code=coalesce(tracking_code,$2),next_sync_at=now() WHERE id=$1',[row.id,receipt.tracking_code]);
      row.tracking_code=receipt.tracking_code;
      if(['create','switch_status'].includes(receipt.payload_json.Type))await applyCarrierStatus(m,row,receipt.payload_json.Status,receipt.payload_json.Time,'WEBHOOK');
      // Financial fields in a webhook are hints. Re-read GHN or require Admin evidence.
      await m.query('UPDATE shipping_webhook_receipt SET processed_at=now(),last_error=NULL WHERE id=$1',[id]);
    });
  }
  async tick(){
    const receipts=await this.source.query('SELECT id FROM shipping_webhook_receipt WHERE processed_at IS NULL AND next_attempt_at<=now() AND environment=$1 AND account_key=$2 ORDER BY received_at LIMIT 20',[this.cfg.environment,this.cfg.accountKey]);
    for(const r of receipts)try{await this.processReceipt(r.id);}catch{await this.source.query("UPDATE shipping_webhook_receipt SET attempts=attempts+1,last_error='SHIPPING_RECONCILIATION_REQUIRED',next_attempt_at=now()+interval '1 minute' WHERE id=$1",[r.id]);}
    const exchangeReceipts=await this.source.query("SELECT shipment_id FROM shipping_exchange_receipt WHERE status='PENDING' AND next_attempt_at<=now() ORDER BY next_attempt_at LIMIT 2");
    for(const receipt of exchangeReceipts)try{await this.processExchangeReceipt(receipt.shipment_id);}catch{await this.source.query("UPDATE shipping_exchange_receipt SET last_error='EXCHANGE_STOCK_RECONCILIATION_REQUIRED',next_attempt_at=now()+interval '1 minute' WHERE shipment_id=$1",[receipt.shipment_id]);}
    if(!this.cfg.token)return;
    const commands=await this.source.query(`SELECT c.id FROM shipping_command c JOIN shipping_shipment s ON s.id=c.shipment_id
      WHERE c.status IN ('PENDING','UNKNOWN') AND c.next_attempt_at<=now() AND (c.lease_until IS NULL OR c.lease_until<=now()) AND s.environment=$1 AND s.account_key=$2 ORDER BY c.next_attempt_at LIMIT 2`,[this.cfg.environment,this.cfg.accountKey]);
    for(const c of commands)try{await this.processCommand(c.id);}catch{await this.source.query("UPDATE shipping_command SET last_error='SHIPPING_RECONCILIATION_REQUIRED',next_attempt_at=now()+interval '1 minute' WHERE id=$1",[c.id]);}
    const rows=await this.source.query(`SELECT id FROM shipping_shipment WHERE provider='GHN' AND environment=$1 AND account_key=$2 AND tracking_code IS NOT NULL AND next_sync_at<=now()
      AND (status NOT IN ('CANCELLED','RETURNED','DELIVERED') OR status='DELIVERED' AND cod_vnd>0 AND (cod_collected_at IS NULL OR cod_remitted_at IS NULL)) ORDER BY next_sync_at LIMIT 2`,[this.cfg.environment,this.cfg.accountKey]);
    for(const r of rows)try{await this.sync(r.id);}catch{await this.source.query("UPDATE shipping_shipment SET last_error='SHIPPING_RECONCILIATION_REQUIRED',next_sync_at=now()+interval '1 minute' WHERE id=$1",[r.id]);}
  }
  async processExchangeReceipt(id:string){
    const [receipt]=await this.source.query("SELECT * FROM shipping_exchange_receipt WHERE shipment_id=$1 AND status='PENDING'",[id]);if(!receipt)return;
    const body=receipt.command_json as OperationInputs['RestockExchangeItems']['body'];
    const call=this.restock??((input:OperationInputs['RestockExchangeItems']['body'])=>{const c=config('M2');return new InternalClients('M2',c.internalKeys.M2,{M1:c.catalogUrl,M2:'',M3:c.identityUrl}).call('RestockExchangeItems',input,'exchange-return-'+id);});
    const result=await call(body);
    if(result.operation_id!==body.operation_id||!['APPLIED','ALREADY_APPLIED'].includes(result.status))throw new CarrierError('EXCHANGE_STOCK_RESULT_UNKNOWN');
    await this.source.transaction(async m=>{
      const shipment=await this.lock(m,id);if(!shipment)return;
      const [current]=await m.query('SELECT * FROM shipping_exchange_receipt WHERE shipment_id=$1 FOR UPDATE',[id]);if(current.status==='APPLIED')return;
      await m.query("UPDATE shipping_exchange_receipt SET status='APPLIED',last_error=NULL WHERE shipment_id=$1",[id]);
      // A failed replacement becomes a customer-approved refund proposal. Original Order stays intact.
      await m.query("UPDATE order_return_request SET status='RECEIVED',exchange_status='BLOCKED',conversion_status='PROPOSED',conversion_note='Kiện đổi đã chuyển hoàn và kiểm hàng. Đề nghị chuyển sang hoàn tiền.',version=version+1,updated_at=now() WHERE id=$1",[shipment.return_request_id]);
      await m.query("INSERT INTO return_operation_history(request_id,actor_user_id,action,detail_json) VALUES($1,$2,'EXCHANGE_RETURN_INSPECTED',$3)",[shipment.return_request_id,SYSTEM_ACTOR,{shipment_id:id,operation_id:body.operation_id}]);
      await m.query("UPDATE shipping_shipment SET last_error=NULL,version=version+1,updated_at=now() WHERE id=$1",[id]);
    });
  }
}
