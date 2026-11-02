import {randomUUID} from 'node:crypto';
import type {DataSource,EntityManager} from 'typeorm';
import {database} from '../../../shared/src/database';
import {ApiError} from '../../../shared/src/errors';
import {once} from '../../../shared/src/idempotency';
import {audit} from '../../../shared/src/audit';
import {moneyNumber} from '../../../shared/src/money';
import {requireStorePermission} from '../scope';

export interface InspectionLine {order_item_id:string;received_quantity:number;resellable_quantity:number;damaged_quantity:number;pending_quantity:number}
export interface CaseCommand {operation_id:string;expected_version:number}
const projection=`SELECT c.*,o.store_id,o.customer_user_id,o.payment_method,o.payable_vnd,p.status AS payment_status,p.collected_vnd,p.refunded_vnd
 FROM delivery_return_case c JOIN "order" o ON o.id=c.order_id LEFT JOIN payment p ON p.order_id=o.id`;
const iso=(value:Date|string)=>new Date(value).toISOString();
export function deliveryMoneySettled(row:any):boolean {
 if(BigInt(row.payable_vnd)===0n&&BigInt(row.collected_vnd??-1)===0n&&BigInt(row.refunded_vnd??-1)===0n&&['SUCCEEDED','CANCELLED'].includes(row.payment_status))return true;
 if(row.payment_method==='COD'&&row.payment_status==='CANCELLED'&&BigInt(row.collected_vnd??0)===0n&&BigInt(row.refunded_vnd??0)===0n)return true;
 return row.payment_status==='REFUNDED'&&BigInt(row.collected_vnd??0)>0n&&BigInt(row.collected_vnd)===BigInt(row.payable_vnd)&&BigInt(row.refunded_vnd??0)===BigInt(row.collected_vnd);
}
export class DeliveryReturnService {
 constructor(private readonly source:DataSource=database) {}
 private scope(auth:any):string {
  const store=requireStorePermission(auth,'order.store.read_status_cancel');
  if(auth.store_membership?.status!=='ACTIVE'||!['OWNER','SELLER'].includes(auth.store_membership?.role))throw new ApiError(403,'FORBIDDEN','Cần thành viên cửa hàng đang hoạt động.');return store;
 }
 private async view(manager:EntityManager,id:string) {
  const [row]=await manager.query(projection+' WHERE c.id=$1',[id]);
  if(!row)throw new ApiError(404,'NOT_FOUND','Không tìm thấy hồ sơ hoàn về.');
  const items=await manager.query('SELECT id,product_id,variant_id,product_snapshot,sku_snapshot,quantity FROM order_item WHERE order_id=$1 ORDER BY id',[row.order_id]);
  return {id:row.id,order_id:row.order_id,store_id:row.store_id,status:row.status,reason:row.reason,version:row.version,
   inventory_status:row.inventory_status,payment_method:row.payment_method,payment_status:row.payment_status??'UNKNOWN',amount_vnd:moneyNumber(row.payable_vnd),money_settled:deliveryMoneySettled(row),
   inspection:row.inspection_json,items:items.map((item:any)=>({order_item_id:item.id,product_id:item.product_id,variant_id:item.variant_id,product_snapshot:item.product_snapshot,sku_snapshot:item.sku_snapshot,quantity:item.quantity})),
   ...(row.inspection_note?{inspection_note:row.inspection_note}:{}),...(row.last_error?{last_error:row.last_error}:{}),created_at:iso(row.created_at),updated_at:iso(row.updated_at),...(row.closed_at?{closed_at:iso(row.closed_at)}:{})};
 }
 async list(auth:any,query:{page?:number;size?:number;order_id?:string},admin=false) {
  let store:string|null=null;
  if(admin){if(!auth?.roles?.includes('ADMIN')||!auth.role_permissions?.includes('platform.admin'))throw new ApiError(403,'FORBIDDEN','Cần quyền quản trị hiện hành.');}
  else store=this.scope(auth);
  const page=query.page??1,size=query.size??20;
  const [count]=await this.source.query('SELECT count(*)::int AS total FROM delivery_return_case c JOIN "order" o ON o.id=c.order_id WHERE ($1::uuid IS NULL OR o.store_id=$1) AND ($2::uuid IS NULL OR o.id=$2)',[store,query.order_id??null]);
  const rows=await this.source.query('SELECT c.id FROM delivery_return_case c JOIN "order" o ON o.id=c.order_id WHERE ($1::uuid IS NULL OR o.store_id=$1) AND ($2::uuid IS NULL OR o.id=$2) ORDER BY c.updated_at DESC,c.id LIMIT $3 OFFSET $4',[store,query.order_id??null,size,(page-1)*size]);
  return {page,size,total:count.total,items:await Promise.all(rows.map((row:any)=>this.view(this.source.manager,row.id)))};
 }
 async own(orderId:string,auth:any) {
  if(!auth?.user_id)throw new ApiError(401,'UNAUTHENTICATED','Vui lòng đăng nhập.');
  const [row]=await this.source.query('SELECT c.id FROM delivery_return_case c JOIN "order" o ON o.id=c.order_id WHERE o.id=$1 AND o.customer_user_id=$2',[orderId,auth.user_id]);
  if(!row)throw new ApiError(404,'NOT_FOUND','Không có hồ sơ hoàn về thuộc đơn của bạn.');return this.view(this.source.manager,row.id);
 }
 private async history(manager:EntityManager,id:string,actor:string,action:string,before:any,after:any,trace:string) {
  await manager.query('INSERT INTO delivery_return_history(case_id,actor_user_id,action,before_json,after_json) VALUES($1,$2,$3,$4,$5)',[id,actor,action,before,after]);
  await audit(manager,'M2',actor,'DeliveryReturn',id,action,trace,before,after);
 }
 async open(orderId:string,input:{operation_id:string;expected_order_version:number;reason:string},auth:any,trace:string) {
  const store=this.scope(auth),reason=input.reason.trim();
  if(!reason)throw new ApiError(422,'REASON_REQUIRED','Cần lý do giao thất bại hoặc khách từ chối.');
  return this.source.transaction(async manager=>{
   const [order]=await manager.query('SELECT * FROM "order" WHERE id=$1 AND store_id=$2 FOR UPDATE',[orderId,store]);
   if(!order)throw new ApiError(404,'NOT_FOUND','Không tìm thấy đơn thuộc cửa hàng.');
   return once(manager,'M2.DeliveryReturn.open',input.operation_id,{...input,order_id:orderId,store_id:store,actor:auth.user_id},async()=>{
    if(order.version!==input.expected_order_version)throw new ApiError(409,'VERSION_CONFLICT','Đơn đã thay đổi. Đọc lại trước khi ghi nhận.');
    if(order.status!=='SHIPPED')throw new ApiError(409,'DELIVERY_RETURN_NOT_ALLOWED','Chỉ ghi nhận giao thất bại sau khi bàn giao.');
    if((await manager.query('SELECT id FROM delivery_return_case WHERE order_id=$1',[orderId])).length)throw new ApiError(409,'DELIVERY_RETURN_EXISTS','Đơn đã có hồ sơ hoàn về.');
    const [row]=await manager.query('INSERT INTO delivery_return_case(order_id,reason,opened_by_user_id) VALUES($1,$2,$3) RETURNING id',[orderId,reason,auth.user_id]);
    await manager.query('UPDATE "order" SET version=version+1 WHERE id=$1',[orderId]);
    await manager.query("UPDATE shipment SET status='DELIVERY_FAILED' WHERE order_id=$1",[orderId]);
    await this.history(manager,row.id,auth.user_id,'DELIVERY_FAILED',null,{status:'OPEN',order_id:orderId,reason},trace);
    return this.view(manager,row.id);
   });
  });
 }
 private async lock(manager:EntityManager,id:string,store:string) {
  const [target]=await manager.query('SELECT order_id FROM delivery_return_case WHERE id=$1',[id]);if(!target)throw new ApiError(404,'NOT_FOUND','Không tìm thấy hồ sơ.');
  const [order]=await manager.query('SELECT * FROM "order" WHERE id=$1 AND store_id=$2 FOR UPDATE',[target.order_id,store]);
  if(!order)throw new ApiError(404,'NOT_FOUND','Không tìm thấy hồ sơ của cửa hàng.');
  const [row]=await manager.query('SELECT * FROM delivery_return_case WHERE id=$1 FOR UPDATE',[id]);return {order,row};
 }
 async inspect(id:string,input:CaseCommand&{lines:InspectionLine[];note:string},auth:any,trace:string) {
  const store=this.scope(auth);
  return this.source.transaction(async manager=>{
   const {order,row}=await this.lock(manager,id,store);
   return once(manager,'M2.DeliveryReturn.inspect',input.operation_id,{...input,case_id:id,actor:auth.user_id},async()=>{
    if(row.version!==input.expected_version)throw new ApiError(409,'VERSION_CONFLICT','Biên bản đã thay đổi.');
    if(!['OPEN','RECEIVED'].includes(row.status))throw new ApiError(409,'INSPECTION_FROZEN','Biên bản đang đối chiếu hoặc đã đóng; không sửa im lặng lịch sử.');
    const originals=await manager.query('SELECT id,quantity FROM order_item WHERE order_id=$1',[order.id]);
    if(!originals.length||input.lines.length!==originals.length||new Set(input.lines.map(line=>line.order_item_id)).size!==originals.length)throw new ApiError(422,'INSPECTION_LINES_REQUIRED','Cần kiểm từng dòng của chính đơn, kể cả dòng chưa nhận đủ.');
    for(const line of input.lines){const original=originals.find((item:any)=>item.id===line.order_item_id);const counts=[line.received_quantity,line.resellable_quantity,line.damaged_quantity,line.pending_quantity];
     if(!original||counts.some(value=>!Number.isSafeInteger(value)||value<0)||line.received_quantity>original.quantity||line.resellable_quantity+line.damaged_quantity+line.pending_quantity!==line.received_quantity)throw new ApiError(422,'INSPECTION_QUANTITY_INVALID','Lượng thực nhận phải khớp tổng bán lại / hỏng / chờ xử lý và không vượt lượng đã giao.');}
    if(!input.note.trim())throw new ApiError(422,'INSPECTION_NOTE_REQUIRED','Cần ghi kết quả kiểm hàng thực nhận.');
    await manager.query("UPDATE delivery_return_case SET status='RECEIVED',inspection_json=$2,inspection_note=$3,version=version+1,updated_at=now() WHERE id=$1",[id,JSON.stringify(input.lines),input.note.trim()]);
    await manager.query("UPDATE shipment SET status='RETURN_RECEIVED' WHERE order_id=$1",[order.id]);
    await this.history(manager,id,auth.user_id,'INSPECTION_RECORDED',{status:row.status,lines:row.inspection_json},{status:'RECEIVED',lines:input.lines,note:input.note.trim()},trace);return this.view(manager,id);
   });
  });
 }
 async settle(id:string,input:CaseCommand,auth:any,trace:string) {
  const store=this.scope(auth);
  return this.source.transaction(async manager=>{
   const {order,row}=await this.lock(manager,id,store);
   return once(manager,'M2.DeliveryReturn.settle',input.operation_id,{...input,case_id:id,actor:auth.user_id},async()=>{
    if(row.version!==input.expected_version)throw new ApiError(409,'VERSION_CONFLICT','Biên bản đã thay đổi.');
    if(row.status!=='RECEIVED'||!row.inspection_json.length||row.inspection_json.some((line:InspectionLine)=>line.pending_quantity>0))throw new ApiError(409,'INSPECTION_PENDING','Cần nhận và phân loại xong hàng trước khi đối chiếu tồn/tiền.');
    const originals=await manager.query('SELECT id,variant_id,quantity FROM order_item WHERE order_id=$1',[order.id]);
    if(row.inspection_json.some((line:InspectionLine)=>line.received_quantity!==originals.find((item:any)=>item.id===line.order_item_id)?.quantity))throw new ApiError(409,'RETURN_RECEIPT_INCOMPLETE','Chưa nhận đủ hàng của toàn đơn. Ghi đúng số thực nhận và liên hệ hỗ trợ; chưa đóng hồ sơ hoặc tự coi hàng thiếu đã về.');
    const items=row.inspection_json.filter((line:InspectionLine)=>line.resellable_quantity>0).map((line:InspectionLine)=>({variant_id:originals.find((item:any)=>item.id===line.order_item_id).variant_id,store_id:store,quantity:line.resellable_quantity}));
    const command={operation_id:randomUUID(),receipt_id:id,order_id:order.id,actor_user_id:auth.user_id,items};
    await manager.query("UPDATE delivery_return_case SET status='SETTLING',inventory_command_json=$2,version=version+1,updated_at=now(),next_attempt_at=now() WHERE id=$1",[id,command]);
    const [payment]=await manager.query('SELECT * FROM payment WHERE order_id=$1 FOR UPDATE',[order.id]);
    if(payment?.method==='COD'&&payment.status==='PENDING'&&BigInt(payment.collected_vnd)===0n&&BigInt(payment.refunded_vnd)===0n){
     const [cod]=await manager.query('SELECT * FROM c_o_d_collection WHERE order_id=$1 FOR UPDATE',[order.id]);
     if(!cod||cod.status!=='PENDING'||BigInt(cod.amount_collected_vnd)!==0n)throw new ApiError(409,'COD_RECONCILIATION_REQUIRED','Nghĩa vụ COD không khớp; cần đối chiếu trước khi đóng thu.');
     await manager.query("UPDATE c_o_d_collection SET status='CANCELLED' WHERE order_id=$1",[order.id]);
     await manager.query("UPDATE payment SET status='CANCELLED',collectible_vnd=0,version=version+1 WHERE id=$1",[payment.id]);
    }
    await manager.query('UPDATE "order" SET version=version+1 WHERE id=$1',[order.id]);
    await this.history(manager,id,auth.user_id,'SETTLEMENT_STARTED',{status:row.status},{status:'SETTLING',inventory_operation_id:command.operation_id},trace);return this.view(manager,id);
   });
  });
 }
}
