import {createHash,randomUUID} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {CreateParcel,DeliveryAction,DeliverySnapshot,deliveryTransitions} from './contracts';

export class DeliveryError extends Error {
  constructor(readonly status:number,readonly code:string,message:string){super(message);}
}
export function snapshot(row:any):DeliverySnapshot {
  return {...row.request_json,tracking_code:row.tracking_code,status:row.status,version:row.version,
    courier_name:row.courier_name,note:row.note,collected_vnd:Number(row.collected_vnd),
    remitted_at:row.remitted_at?new Date(row.remitted_at).toISOString():null,updated_at:new Date(row.updated_at).toISOString()};
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function text(value:unknown,max:number){return typeof value==='string'&&value.trim().length>0&&value.length<=max;}
export function validateParcel(body:any):asserts body is CreateParcel {
  const address=(a:any)=>a&&text(a.name,200)&&text(a.phone,30)&&text(a.address,1000)&&Object.keys(a).every(k=>['name','phone','address'].includes(k));
  if(!body||!text(body.client_reference,100)||!address(body.pickup)||!address(body.destination)||!text(body.contents,2000)||
    !Number.isSafeInteger(body.cod_amount)||body.cod_amount<0||body.cod_amount>50000000||!Number.isSafeInteger(body.weight)||body.weight<1||body.weight>50000||
    (body.handling_note!==undefined&&!text(body.handling_note,500))||
    Object.keys(body).some(k=>!['client_reference','pickup','destination','contents','cod_amount','weight','handling_note'].includes(k)))
    throw new DeliveryError(422,'INVALID_PARCEL','Thông tin kiện hàng chưa hợp lệ.');
}
export class DeliveryService {
  constructor(private readonly pool:Pool){}
  private async transaction<T>(work:(db:PoolClient)=>Promise<T>){
    const db=await this.pool.connect();
    try{await db.query('BEGIN');const result=await work(db);await db.query('COMMIT');return result;}
    catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  }
  private async event(db:PoolClient,row:any,actor:string){
    const data=snapshot(row);
    await db.query('INSERT INTO delivery_event(id,parcel_id,snapshot_json,actor) VALUES($1,$2,$3,$4)',[randomUUID(),row.id,data,actor]);
    return data;
  }
  async create(body:CreateParcel){
    validateParcel(body);
    return this.transaction(async db=>{
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[body.client_reference]);
      const prior=(await db.query('SELECT * FROM delivery_parcel WHERE client_reference=$1',[body.client_reference])).rows[0];
      if(prior){
        if(JSON.stringify(prior.request_json)!==JSON.stringify(JSON.parse(JSON.stringify(body)))){
          // PostgreSQL JSONB key order is canonicalized, so compare structured values in SQL.
          const match=await db.query('SELECT request_json=$2::jsonb AS same FROM delivery_parcel WHERE id=$1',[prior.id,JSON.stringify(body)]);
          if(!match.rows[0].same)throw new DeliveryError(409,'REFERENCE_CONFLICT','Mã yêu cầu đã được dùng cho kiện khác.');
        }
        return snapshot(prior);
      }
      const id=randomUUID(),code='DLV-'+id.replace(/-/g,'').toUpperCase();
      const row=(await db.query('INSERT INTO delivery_parcel(id,client_reference,tracking_code,request_json) VALUES($1,$2,$3,$4) RETURNING *',[id,body.client_reference,code,body])).rows[0];
      return this.event(db,row,'MERCHANT');
    });
  }
  async lookup(reference:string){
    const row=(await this.pool.query('SELECT * FROM delivery_parcel WHERE client_reference=$1',[reference])).rows[0];
    if(!row)throw new DeliveryError(404,'PARCEL_NOT_FOUND','Không tìm thấy vận đơn.');
    return snapshot(row);
  }
  async list(page=1){
    const result=await this.pool.query('SELECT * FROM delivery_parcel ORDER BY created_at DESC,id LIMIT 20 OFFSET $1',[(page-1)*20]);
    const count=await this.pool.query('SELECT count(*)::int AS total FROM delivery_parcel');
    return {items:result.rows.map(snapshot),page,total:count.rows[0].total};
  }
  async advance(reference:string,input:any,actor:'OPERATOR'|'MERCHANT'){
    if(!input||!uuid.test(input.operation_id)||!Number.isSafeInteger(input.expected_version)||!text(input.action,60)||
      input.note!==undefined&&!text(input.note,1000)||input.courier_name!==undefined&&!text(input.courier_name,200)||
      input.collected_vnd!==undefined&&(!Number.isSafeInteger(input.collected_vnd)||input.collected_vnd<0)||
      Object.keys(input).some(k=>!['operation_id','expected_version','action','note','courier_name','collected_vnd'].includes(k)))
      throw new DeliveryError(422,'INVALID_ACTION','Thao tác giao nhận chưa hợp lệ.');
    if(actor==='MERCHANT'&&!['CANCEL','REDELIVER','RETURN'].includes(input.action))throw new DeliveryError(403,'OPERATOR_REQUIRED','Chỉ bộ phận giao hàng được xác nhận hành trình.');
    const hash=createHash('sha256').update(JSON.stringify([reference,actor,input])).digest('hex');
    return this.transaction(async db=>{
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[input.operation_id]);
      const prior=(await db.query('SELECT * FROM delivery_operation WHERE operation_id=$1',[input.operation_id])).rows[0];
      if(prior){if(prior.payload_hash!==hash)throw new DeliveryError(409,'OPERATION_CONFLICT','Mã thao tác đã có nội dung khác.');return prior.response_json as DeliverySnapshot;}
      const row=(await db.query('SELECT * FROM delivery_parcel WHERE client_reference=$1 FOR UPDATE',[reference])).rows[0];
      if(!row)throw new DeliveryError(404,'PARCEL_NOT_FOUND','Không tìm thấy vận đơn.');
      if(row.version!==input.expected_version)throw new DeliveryError(409,'VERSION_CONFLICT','Vận đơn đã thay đổi. Hãy tải lại.');
      if(input.action==='ASSIGN'){
        if(!text(input.courier_name,200)||['DELIVERED','RETURNED','CANCELLED'].includes(row.status))throw new DeliveryError(409,'ASSIGNMENT_INVALID','Cần tên người giao và kiện đang hoạt động.');
        row.courier_name=input.courier_name.trim();
      }else if(input.action==='REMIT_COD'){
        if(!row.collected_vnd||Number(row.collected_vnd)<=0||row.remitted_at||!input.note)throw new DeliveryError(409,'COD_NOT_COLLECTED','Cần khoản tiền đã thu và tham chiếu bàn giao.');
        row.remitted_at=new Date();
      }else{
        const transition=deliveryTransitions[input.action as DeliveryAction];
        if(!transition?.from.includes(row.status))throw new DeliveryError(409,'INVALID_TRANSITION','Không thể chuyển trạng thái giao nhận.');
        if(actor==='OPERATOR'&&input.action!=='CANCEL'&&!row.courier_name)throw new DeliveryError(409,'COURIER_REQUIRED','Phân công người giao trước khi bàn giao.');
        if(['DELIVER','FAIL','RETURN','RECEIVE_RETURN','CANCEL'].includes(input.action)&&!input.note)throw new DeliveryError(422,'NOTE_REQUIRED','Ghi lý do hoặc bằng chứng bàn giao.');
        if(input.action==='DELIVER'){
          if(input.collected_vnd!==row.request_json.cod_amount)throw new DeliveryError(422,'COD_MISMATCH','Số tiền phải khớp nghĩa vụ thu hộ.');
          row.collected_vnd=input.collected_vnd;
        }
        row.status=transition.to;
      }
      const updated=(await db.query(`UPDATE delivery_parcel SET status=$2,courier_name=$3,note=$4,collected_vnd=$5,remitted_at=$6,version=version+1,updated_at=clock_timestamp() WHERE id=$1 RETURNING *`,
        [row.id,row.status,row.courier_name,input.note??null,row.collected_vnd,row.remitted_at])).rows[0];
      const response=await this.event(db,updated,actor);
      await db.query('INSERT INTO delivery_operation(operation_id,payload_hash,response_json) VALUES($1,$2,$3)',[input.operation_id,hash,response]);
      return response;
    });
  }
}
