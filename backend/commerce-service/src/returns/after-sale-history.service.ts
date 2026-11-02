import type {DataSource} from 'typeorm';
import {database} from '../../../shared/src/database';
import {ApiError} from '../../../shared/src/errors';
import {moneyNumber} from '../../../shared/src/money';
import type {OperationOutputs} from '../../../shared/src/operations.generated';

type Scope='CUSTOMER'|'STORE'|'ADMIN';
const SYSTEM='00000000-0000-0000-0000-000000000000';
const sources=['RETURN_STATUS','RETURN_OPERATION','DELIVERY','REFUND_ACTIVITY','MONEY'];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timestamp=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/;
export function readHistoryCursor(cursor?:string):[string,string,string]|undefined {
 if(cursor===undefined)return;
 try{
  if(cursor.length>512||!/^[A-Za-z0-9_-]+$/.test(cursor))throw Error();
  const value=JSON.parse(Buffer.from(cursor,'base64url').toString('utf8'));
  if(!Array.isArray(value)||value.length!==3||!timestamp.test(value[0])||(!Number.isFinite(Date.parse(value[0]))||new Date(value[0]).toISOString().slice(0,19)!==value[0].slice(0,19))||!sources.includes(value[1])||!uuid.test(value[2]))throw Error();
  return [value[0],value[1],value[2]];
 }catch{throw new ApiError(422,'INVALID_HISTORY_CURSOR','Mốc lịch sử không hợp lệ. Làm mới lịch sử để tiếp tục.');}
}

// Every branch is constrained by this order. No raw audit, command payload, return
// address, bank/provider reference, recipient or manual receipt is returned.
const events=`
 SELECT h.id,'RETURN_STATUS'::text AS source,h.created_at AS recorded_at,h.created_at AS occurred_at,
  'STATUS_CHANGED'::text AS action,h.actor_user_id,
  jsonb_build_object('from_status',h.from_status,'to_status',h.to_status,'note',h.reason) AS detail
 FROM return_status_history h JOIN order_return_request r ON r.id=h.request_id WHERE r.order_id=$1
 UNION ALL
 SELECT h.id,'RETURN_OPERATION',h.created_at,h.created_at,h.action,h.actor_user_id,h.detail_json
 FROM return_operation_history h JOIN order_return_request r ON r.id=h.request_id WHERE r.order_id=$1
 UNION ALL
 SELECT h.id,'DELIVERY',h.created_at,h.created_at,h.action,h.actor_user_id,
  jsonb_build_object('from_status',h.before_json->>'status','to_status',h.after_json->>'status',
   'note',coalesce(h.after_json->>'note',h.after_json->>'reason'),'lines',h.after_json->'lines')
 FROM delivery_return_history h JOIN delivery_return_case c ON c.id=h.case_id WHERE c.order_id=$1
 UNION ALL
 SELECT a.id,'REFUND_ACTIVITY',a.created_at,a.created_at,
  CASE a.action WHEN 'REQUEST' THEN 'REFUND_REQUESTED' WHEN 'RETRY_REQUESTED' THEN 'REFUND_RETRY_REQUESTED' WHEN 'RETRY_REQUEUED' THEN 'REFUND_RETRY' WHEN 'COMMAND_STARTED' THEN 'REFUND_PROCESSING' WHEN 'LOOKUP_STARTED' THEN 'REFUND_RECONCILING'
   WHEN 'LEASE_EXPIRED' THEN 'REFUND_RESULT_UNKNOWN' WHEN 'STATE_CHANGED' THEN 'REFUND_FAILED'
   WHEN 'RETRY_FAILED' THEN 'REFUND_RETRY' ELSE 'REFUND_RESULT' END,CASE WHEN a.action='RETRY_REQUESTED' THEN a.actor_user_id ELSE '${SYSTEM}'::uuid END,
  jsonb_build_object('to_status',a.after_json->>'status')
 FROM m2_audit a JOIN refund r ON a.target_id=r.id WHERE r.order_id=$1 AND a.target_type='Refund'
  AND a.action IN ('REQUEST','RETRY_REQUESTED','RETRY_REQUEUED','COMMAND_STARTED','LOOKUP_STARTED','LEASE_EXPIRED','STATE_CHANGED','RETRY_FAILED','PROVIDER_RESULT')
 UNION ALL
 SELECT m.id,'MONEY',m.recorded_at,m.occurred_at,'REFUND_CONFIRMED',
  CASE WHEN m.source_type='COD_REFUND_RECEIPT' THEN receipt.owner_user_id ELSE '${SYSTEM}'::uuid END,
  jsonb_build_object('amount_vnd',m.amount_vnd::text,'time_source',m.time_source)
 FROM money_movement m LEFT JOIN cod_refund_receipt receipt ON m.source_type='COD_REFUND_RECEIPT' AND m.source_id=receipt.id::text
 WHERE m.order_id=$1 AND m.kind='REFUND'`;
const formatted=(column:string)=>`to_char(${column} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const text=(value:unknown,max=2000)=>typeof value==='string'&&value.trim()?value.slice(0,max):undefined;
export function publicHistoryEvent(row:any,customerId:string,showActor:boolean):OperationOutputs['listOwnAfterSaleHistory']['items'][number] {
 const detail=row.detail??{},actor=row.actor_user_id;
 const kind=actor===SYSTEM?'SYSTEM':actor===customerId?'CUSTOMER':actor?'OPERATOR':'UNKNOWN';
 // Legacy role-at-time is unavailable; do not infer Owner/Seller/Admin from their
 // current role. Authorized Owner/Admin can resolve the account in their scope.
 const result:OperationOutputs['listOwnAfterSaleHistory']['items'][number]={id:row.id,source:row.source,action:row.action,
  occurred_at:row.occurred_at,recorded_at:row.recorded_at,actor_kind:kind,
  ...(showActor&&actor&&actor!==SYSTEM?{actor_user_id:actor}:{})};
 for(const key of ['note','from_status','to_status','fault_party','fee_payer','reference'] as const){
  const value=text(detail[key],['note'].includes(key)?2000:200);if(value)result[key]=value;
 }
 const lines=detail.lines;
 if(Array.isArray(lines))result.inspection=lines.map(line=>({order_item_id:line.order_item_id,received_quantity:line.received_quantity,resellable_quantity:line.resellable_quantity,damaged_quantity:line.damaged_quantity,pending_quantity:line.pending_quantity}));
 if(row.source==='MONEY'){result.amount_vnd=moneyNumber(detail.amount_vnd);result.time_source=detail.time_source;}
 return result;
}
export class AfterSaleHistoryService {
 constructor(private readonly source:DataSource=database){}
 async list(orderId:string,auth:any,scope:Scope,query:{cursor?:string;size?:number}={}):Promise<OperationOutputs['listOwnAfterSaleHistory']>{
  if(!auth?.user_id)throw new ApiError(401,'UNAUTHENTICATED','Vui lòng đăng nhập.');
  let customer:string|null=null,store:string|null=null;
  if(scope==='CUSTOMER'){if(!auth.roles?.includes('CUSTOMER'))throw new ApiError(403,'FORBIDDEN','Cần quyền khách hàng.');customer=auth.user_id;}
  else if(scope==='ADMIN'){if(!auth.roles?.includes('ADMIN')||!auth.role_permissions?.includes('platform.admin'))throw new ApiError(403,'FORBIDDEN','Cần quyền quản trị hiện hành.');}
  else{const member=auth.store_membership;if(!auth.roles?.some((r:string)=>['STORE_OWNER','SELLER'].includes(r))||!member?.store_id||member.status!=='ACTIVE'||!['OWNER','SELLER'].includes(member.role)||member.role==='SELLER'&&!member.permissions?.includes('order.store.read_status_cancel'))throw new ApiError(403,'FORBIDDEN','Cần quyền xử lý đơn của Store hiện hành.');store=member.store_id;}
  const [order]=await this.source.query('SELECT id,customer_user_id FROM "order" WHERE id=$1 AND ($2::uuid IS NULL OR customer_user_id=$2) AND ($3::uuid IS NULL OR store_id=$3)',[orderId,customer,store]);
  if(!order)throw new ApiError(404,'NOT_FOUND','Không tìm thấy đơn thuộc phạm vi của bạn.');
  const size=query.size??20;if(!Number.isInteger(size)||size<1||size>50)throw new ApiError(422,'INVALID_PAGE_SIZE','Mỗi lần đọc từ 1 tới 50 sự kiện.');
  const cursor=readHistoryCursor(query.cursor);
  const rows=await this.source.query(`WITH history AS (${events}) SELECT id,source,action,actor_user_id,detail,
   ${formatted('recorded_at')} AS recorded_at,${formatted('occurred_at')} AS occurred_at FROM history
   WHERE ($2::timestamptz IS NULL OR (recorded_at,source,id)<($2::timestamptz,$3::text,$4::uuid))
   ORDER BY history.recorded_at DESC,source DESC,id DESC LIMIT $5`,[orderId,...(cursor??[null,null,null]),size+1]);
  const items=rows.slice(0,size),last=items.at(-1);
  const showActor=scope==='ADMIN'||scope==='STORE'&&auth.store_membership.role==='OWNER';
  return {items:items.map((row:any)=>publicHistoryEvent(row,order.customer_user_id,showActor)),size,
   ...(rows.length>size?{next_cursor:Buffer.from(JSON.stringify([last.recorded_at,last.source,last.id])).toString('base64url')}:{})};
 }
}
