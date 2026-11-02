import {randomUUID} from 'node:crypto';
import type {DataSource,EntityManager} from 'typeorm';
import {ApiError} from '../../../shared/src/errors';
import {audit} from '../../../shared/src/audit';
import {schemaErrors} from '../../../shared/src/contract-validation';
import contracts from '../../../shared/src/contracts.runtime.generated.json';

type StockCall=(operation:'RestockReceivedItems'|'DispatchExchangeItems',body:any,trace:string)=>Promise<any>;
const SYSTEM='00000000-0000-0000-0000-000000000000';
/** Persist a frozen command before RPC; never announce receipt/dispatch stock success on an unknown ACK. */
export class ReturnsRunner {
  constructor(private readonly source:DataSource,private readonly call:StockCall){}
  private async lock(manager:EntityManager,id:string){
    const [target]=await manager.query('SELECT order_id FROM order_return_request WHERE id=$1',[id]);if(!target)return;
    await manager.query('SELECT id FROM "order" WHERE id=$1 FOR UPDATE',[target.order_id]);
    const [row]=await manager.query('SELECT * FROM order_return_request WHERE id=$1 FOR UPDATE',[id]);return row;
  }
  async process(id:string){
    const claim=await this.source.transaction(async manager=>{
      const row=await this.lock(manager,id);if(!row||row.status!=='RECEIVED'||row.lease_until&&new Date(row.lease_until).getTime()>Date.now())return;
      const receiving=row.inventory_status==='PENDING',dispatching=row.exchange_status==='PENDING'&&row.inventory_status==='APPLIED';if(!receiving&&!dispatching)return;
      const token=randomUUID(),body=receiving?row.inventory_command_json:row.exchange_command_json;
      if(!body)return;
      await manager.query("UPDATE order_return_request SET lease_token=$2,lease_until=now()+interval '30 seconds' WHERE id=$1",[id,token]);
      return {row,token,receiving,body};
    });
    if(!claim)return;
    let error:string|undefined,definitive=false,dispatch:any;
    try{const result=await this.call(claim.receiving?'RestockReceivedItems':'DispatchExchangeItems',claim.body,'return-operation-'+id);if(!['APPLIED','ALREADY_APPLIED'].includes(result?.status)||result.operation_id!==claim.body.operation_id)error='INVENTORY_RESULT_UNKNOWN';
      if(!claim.receiving&&result?.exchange_dispatch){
        const snapshot=result.exchange_dispatch,expected=claim.body.items;
        if(schemaErrors(result,contracts.operations.DispatchExchangeItems.responses['200']).length||snapshot.items.length!==expected.length||new Set(snapshot.items.map((v:any)=>v.original_variant_id)).size!==expected.length||snapshot.items.some((item:any)=>!expected.some((line:any)=>line.original_variant_id===item.original_variant_id&&line.variant_id===item.variant_id&&line.store_id===item.store_id&&line.quantity===item.quantity&&line.unit_price_vnd===item.unit_price_vnd)))error='EXCHANGE_SNAPSHOT_MISMATCH';
        else{
          const originals=await this.source.query('SELECT variant_id,product_id FROM order_item WHERE order_id=$1',[claim.row.order_id]);
          if(snapshot.items.some((item:any)=>!originals.some((line:any)=>line.variant_id===item.original_variant_id&&line.product_id===item.product_id)))error='EXCHANGE_SNAPSHOT_MISMATCH';
          else dispatch=snapshot;
        }
      }
    }
    catch(e){error=e instanceof ApiError?String((e.getResponse() as any).code??'INVENTORY_RESULT_UNKNOWN').slice(0,100):'INVENTORY_RESULT_UNKNOWN';definitive=!claim.receiving&&['EXCHANGE_OUT_OF_STOCK','EXCHANGE_VARIANT_UNAVAILABLE'].includes(error);}
    await this.source.transaction(async manager=>{
      const row=await this.lock(manager,id);if(!row||row.lease_token!==claim.token)return;
      if(error){
        await manager.query("UPDATE order_return_request SET lease_token=NULL,lease_until=NULL,last_error=$2,exchange_status=CASE WHEN $3 THEN 'BLOCKED' ELSE exchange_status END,version=version+CASE WHEN $3 THEN 1 ELSE 0 END,next_attempt_at=now()+interval '5 seconds',updated_at=now() WHERE id=$1",[id,error,definitive]);
        if(definitive)await manager.query("INSERT INTO return_operation_history(request_id,actor_user_id,action,detail_json) VALUES($1,$2,'EXCHANGE_NOT_DISPATCHED',$3)",[id,SYSTEM,JSON.stringify({error,operation_id:claim.body.operation_id})]);return;
      }
      if(claim.receiving){
        await manager.query("UPDATE order_return_request SET inventory_status='APPLIED',version=version+1 WHERE id=$1",[id]);
        await manager.query("UPDATE order_inventory_state SET state='RETURN_INSPECTED',last_error=NULL,updated_at=now() WHERE order_id=$1 AND state='CONSUMED' AND command_kind IS NULL",[row.order_id]);
      }else{
        await manager.query("UPDATE order_return_request SET exchange_status='APPLIED',status='EXCHANGE_SENT',exchange_dispatch_snapshot=$2,version=version+1 WHERE id=$1",[id,dispatch?JSON.stringify(dispatch):null]);
        await manager.query("INSERT INTO return_status_history(request_id,from_status,to_status,actor_user_id,reason) VALUES($1,'RECEIVED','EXCHANGE_SENT',$2,$3)",[id,claim.body.actor_user_id,'Hàng đổi đã được trừ tồn theo lệnh bàn giao '+row.replacement_reference]);
      }
      await manager.query('UPDATE order_return_request SET lease_token=NULL,lease_until=NULL,last_error=NULL,next_attempt_at=now(),updated_at=now() WHERE id=$1',[id]);
      const action=claim.receiving?'RECEIVED_STOCK_CONFIRMED':'EXCHANGE_STOCK_CONFIRMED';
      await manager.query('INSERT INTO return_operation_history(request_id,actor_user_id,action,detail_json) VALUES($1,$2,$3,$4)',[id,SYSTEM,action,JSON.stringify({operation_id:claim.body.operation_id,receipt_id:id})]);
      await audit(manager,'M2',SYSTEM,'ReturnRequest',id,action,'return-operation-'+id,{}, {order_id:row.order_id,operation_id:claim.body.operation_id});
    });
  }
  async tick(){
    const rows=await this.source.query("SELECT id FROM order_return_request WHERE status='RECEIVED' AND (inventory_status='PENDING' OR exchange_status='PENDING') AND next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<=now()) ORDER BY next_attempt_at,id LIMIT 20");
    for(const row of rows)try{await this.process(row.id);}catch{await this.source.query("UPDATE order_return_request SET last_error='RETURN_RECONCILIATION_REQUIRED',next_attempt_at=now()+interval '30 seconds' WHERE id=$1",[row.id]);}
  }
}
