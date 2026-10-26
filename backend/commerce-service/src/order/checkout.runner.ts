import { createHash, randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { ApiError } from '../../../shared/src/errors';
import type { OperationInputs, OperationOutputs } from '../../../shared/src/operations.generated';

export function commandId(seed:string):string {
  const hex=createHash('sha256').update(seed).digest('hex').split('');
  hex[12]='4';hex[16]=((parseInt(hex[16],16)&3)|8).toString(16);
  return `${hex.slice(0,8).join('')}-${hex.slice(8,12).join('')}-${hex.slice(12,16).join('')}-${hex.slice(16,20).join('')}-${hex.slice(20,32).join('')}`;
}
export type OrderCommand='ReserveInventory'|'ConsumeReservation'|'ReleaseReservation'|'RestockOrder';
export type CommandCall=(operation:OrderCommand,body:any,correlation:string)=>Promise<any>;
export interface CheckoutPlan {
  userId:string; purchaseGroupId:string; correlation:string; input:OperationInputs['confirmCheckout']['body'];
  storeOrders:any[]; context:any; payable:number; platformVoucherId?:string;
  reserve:OperationInputs['ReserveInventory']['body'];
}
interface Failure {status:number;code:string;message:string}
type Attempt={id:string;customer_user_id:string;key:string;payload_hash:string;phase:string;plan_json:CheckoutPlan;
  reserve_result:any;response_json:any;failure_json:Failure|null;released_orders:string[];lease_token:string|null;lease_until:Date|null;correlation_id:string;attempts:number};
export const recoveryPending=()=>new ApiError(503,'ORDER_RECOVERY_PENDING','Yêu cầu chưa rõ kết quả; hãy thử lại cùng Idempotency-Key và payload.');
const failure=(e:unknown):Failure|undefined=>{
  if(!(e instanceof ApiError) || e.getStatus()<400 || e.getStatus()>=500)return;
  const body=e.getResponse() as any;
  return {status:e.getStatus(),code:String(body.code),message:String(body.message).slice(0,500)};
};
const reject=(f:Failure):never=>{throw new ApiError(f.status,f.code,f.message);};

// Network commands always run outside transactions. A lease is persisted before sending and
// every resumed command uses the immutable payload, including its original expiry timestamp.
export class CheckoutRunner {
  constructor(private readonly source:DataSource,private readonly call:CommandCall,
    private readonly commit:(plan:CheckoutPlan,reservations:any,manager:EntityManager)=>Promise<OperationOutputs['confirmCheckout']>) {}

  private async byKey(user:string,key:string):Promise<Attempt|undefined> {
    const [row]=await this.source.query('SELECT * FROM checkout_attempt WHERE customer_user_id=$1 AND key=$2',[user,key]);return row;
  }
  async confirm(user:string,key:string,hash:string,correlation:string,prepare:()=>Promise<CheckoutPlan>) {
    let row=await this.byKey(user,key);
    if(!row){
      // Preserve any previously committed idempotency response; never replace an incomplete legacy attempt.
      const [legacy]=await this.source.query('SELECT * FROM idempotency_record WHERE customer_user_id=$1 AND key=$2',[user,key]);
      if(legacy){
        if(legacy.payload_hash!==hash)throw new ApiError(409,'IDEMPOTENCY_CONFLICT','Idempotency-Key đã dùng với payload khác.');
        if(Array.isArray(legacy.response_json?.orders))return legacy.response_json;
        throw recoveryPending();
      }
      const plan=await prepare();
      await this.source.query(`INSERT INTO checkout_attempt(customer_user_id,key,payload_hash,phase,plan_json,correlation_id)
        VALUES($1,$2,$3,'RESERVING',$4,$5) ON CONFLICT(customer_user_id,key) DO NOTHING`,[user,key,hash,JSON.stringify(plan),correlation]);
      row=await this.byKey(user,key);
    }
    if(!row || row.payload_hash!==hash)throw new ApiError(409,'IDEMPOTENCY_CONFLICT','Idempotency-Key đã dùng với payload khác.');
    if(row.phase==='COMMITTED')return row.response_json;
    if(row.phase==='FAILED')return reject(row.failure_json!);
    const claimed=await this.claim(row.id);
    if(!claimed)throw recoveryPending();
    return this.execute(claimed);
  }
  private async claim(id:string):Promise<Attempt|undefined> {
    return this.source.transaction(async manager=>{
      const [row]:Attempt[]=await manager.query('SELECT * FROM checkout_attempt WHERE id=$1 FOR UPDATE',[id]);
      if(!row || !['RESERVING','READY','COMPENSATING'].includes(row.phase) || row.lease_until && new Date(row.lease_until).getTime()>Date.now())return;
      const token=randomUUID();
      await manager.query("UPDATE checkout_attempt SET lease_token=$2,lease_until=now()+interval '30 seconds',attempts=attempts+1,updated_at=now() WHERE id=$1",[id,token]);
      return {...row,lease_token:token,attempts:row.attempts+1};
    });
  }
  private async locked(manager:EntityManager,claim:Attempt):Promise<Attempt> {
    const [row]:Attempt[]=await manager.query('SELECT * FROM checkout_attempt WHERE id=$1 FOR UPDATE',[claim.id]);
    if(row?.lease_token!==claim.lease_token)throw recoveryPending();return row;
  }
  private validateReservations(plan:CheckoutPlan,result:any) {
    if(!Array.isArray(result?.reservations))throw recoveryPending();
    const expected=new Map(plan.reserve.items.map(i=>[i.order_id+':'+i.variant_id,i]));
    const seen=new Set<string>();
    for(const r of result.reservations){
      const key=r.order_id+':'+r.variant_id,line=expected.get(key);
      if(!line || r.quantity!==line.quantity || typeof r.id!=='string' || seen.has(key))throw recoveryPending();
      seen.add(key);
    }
    if(seen.size!==expected.size)throw recoveryPending();
  }
  private async execute(claim:Attempt):Promise<OperationOutputs['confirmCheckout']> {
    try {
      if(claim.phase==='RESERVING'){
        let result:any;
        try {result=await this.call('ReserveInventory',claim.plan_json.reserve,claim.correlation_id);}
        catch(e){
          const known=failure(e);
          if(known)await this.source.transaction(async m=>{await this.locked(m,claim);await m.query("UPDATE checkout_attempt SET phase='FAILED',failure_json=$2,lease_token=NULL,lease_until=NULL WHERE id=$1",[claim.id,JSON.stringify(known)]);});
          throw e;
        }
        this.validateReservations(claim.plan_json,result);
        await this.source.transaction(async m=>{
          await this.locked(m,claim);
          await m.query("UPDATE checkout_attempt SET phase='READY',reserve_result=$2,updated_at=now() WHERE id=$1",[claim.id,JSON.stringify(result)]);
        });
        claim={...claim,phase:'READY',reserve_result:result};
      }
      if(claim.phase==='READY'){
        try {
          return await this.source.transaction(async manager=>{
            const current=await this.locked(manager,claim);
            if(current.phase==='COMMITTED')return current.response_json;
            const response=await this.commit(current.plan_json,current.reserve_result,manager);
            await manager.query("UPDATE checkout_attempt SET phase='COMMITTED',response_json=$2,lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=$1",[claim.id,JSON.stringify(response)]);
            return response;
          });
        } catch(e){
          // A connection can fail after COMMIT: first reread the durable phase. Never compensate
          // a transaction whose committed outcome is unknown because the database is unavailable.
          const [current]:Attempt[]=await this.source.query('SELECT * FROM checkout_attempt WHERE id=$1',[claim.id]);
          if(current?.phase==='COMMITTED')return current.response_json;
          const known=failure(e);
          if(!known)throw e;
          await this.source.transaction(async m=>{
            await this.locked(m,claim);
            await m.query("UPDATE checkout_attempt SET phase='COMPENSATING',failure_json=$2 WHERE id=$1",[claim.id,JSON.stringify(known)]);
          });
          claim={...claim,phase:'COMPENSATING',failure_json:known};
        }
      }
      if(claim.phase==='COMPENSATING'){
        for(const order of claim.plan_json.storeOrders){
          if(claim.released_orders.includes(order.orderId))continue;
          const ids=[...new Set<string>(claim.reserve_result.reservations.filter((r:any)=>r.order_id===order.orderId).map((r:any)=>r.id))].sort();
          const body={operation_id:commandId('checkout-release:'+claim.id+':'+order.orderId),order_id:order.orderId,reservation_ids:ids,reason:'CHECKOUT_ABORTED'};
          const result=await this.call('ReleaseReservation',body,claim.correlation_id);
          if(result?.operation_id!==body.operation_id || !['APPLIED','ALREADY_APPLIED'].includes(result?.status))throw recoveryPending();
          await this.source.transaction(async m=>{await this.locked(m,claim);await m.query('UPDATE checkout_attempt SET released_orders=array_append(released_orders,$2) WHERE id=$1',[claim.id,order.orderId]);});
        }
        await this.source.transaction(async m=>{await this.locked(m,claim);await m.query("UPDATE checkout_attempt SET phase='FAILED',lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=$1",[claim.id]);});
        return reject(claim.failure_json!);
      }
      throw recoveryPending();
    } catch(e){
      const [row]:Attempt[]=await this.source.query('SELECT * FROM checkout_attempt WHERE id=$1',[claim.id]);
      if(row?.phase==='COMMITTED')return row.response_json;
      if(row?.phase==='FAILED')return reject(row.failure_json!);
      await this.source.query("UPDATE checkout_attempt SET lease_token=NULL,lease_until=NULL,last_error='RETRY_REQUIRED',next_attempt_at=now()+least(60,attempts)*interval '1 second',updated_at=now() WHERE id=$1 AND lease_token=$2",[claim.id,claim.lease_token]);
      throw recoveryPending();
    }
  }
  async tick() {
    const rows=await this.source.query("SELECT id FROM checkout_attempt WHERE phase IN ('RESERVING','READY','COMPENSATING') AND next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<=now()) ORDER BY created_at LIMIT 20");
    for(const row of rows){const claim=await this.claim(row.id);if(claim)try{await this.execute(claim);}catch{/* Durable phase, not an in-memory retry, determines the next tick. */}}
  }
}
