import {once} from '../../../shared/src/idempotency';
import {commandId} from '../order/checkout.runner';
import type {OperationInputs,OperationOutputs} from '../../../shared/src/operations.generated';
import {readReturnPolicy} from './return-policy';
import {zeroDueSettled} from '../payment/zero-due';
import type {DataSource} from 'typeorm';
import type { EntityManager } from 'typeorm';
import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import { audit } from '../../../shared/src/audit';
import { moneyNumber } from '../../../shared/src/money';
type Scope='CUSTOMER'|'STORE'|'ADMIN';
const projection=`SELECT r.*,o.return_policy_snapshot,o.customer_user_id,o.store_id,o.created_at AS order_created_at,o.status AS order_status,o.payment_method,o.payable_vnd,p.status AS payment_status,p.payable_vnd AS payment_payable_vnd,p.collected_vnd,p.refunded_vnd,f.status AS refund_status,(SELECT coalesce(jsonb_agg(jsonb_build_object('order_item_id',i.id,'product_id',i.product_id,'variant_id',i.variant_id,'product_snapshot',i.product_snapshot,'sku_snapshot',i.sku_snapshot,'quantity',i.quantity,'unit_price_vnd',i.unit_price_vnd) ORDER BY i.id),'[]'::jsonb) FROM order_item i WHERE i.order_id=o.id) AS items
  FROM order_return_request r JOIN "order" o ON o.id=r.order_id LEFT JOIN payment p ON p.order_id=o.id LEFT JOIN refund f ON f.order_id=o.id`;
const map=(row:any):OperationOutputs['createReturnRequest']=>({legacy_policy:!readReturnPolicy(row.return_policy_snapshot),...(readReturnPolicy(row.return_policy_snapshot)?{return_policy_snapshot:readReturnPolicy(row.return_policy_snapshot)}:{}),...Object.fromEntries(['original_type','fault_party','fee_payer','return_instructions','inspection_note','inventory_status','exchange_status','conversion_status','conversion_note','last_error'].filter(key=>row[key]!=null).map(key=>[key,row[key]])),...(row.exchange_dispatch_snapshot?{exchange_dispatch:row.exchange_dispatch_snapshot}:{}),inspection:row.inspection_json??[],items:(row.items??[]).map((item:any)=>({...item,...(item.unit_price_vnd==null?{}:{unit_price_vnd:moneyNumber(item.unit_price_vnd)})})),id:row.id,order_id:row.order_id,type:row.type,reason:row.reason,status:row.status,version:row.version,payment_method:row.payment_method,amount_vnd:moneyNumber(row.payable_vnd),created_at:new Date(row.created_at).toISOString(),updated_at:new Date(row.updated_at).toISOString(),...(row.decision_note?{decision_note:row.decision_note}:{}),...(row.replacement_reference?{replacement_reference:row.replacement_reference}:{}),...(row.refund_status?{refund_status:row.refund_status}:{})});
export class ReturnsService {
  constructor(private readonly source?:DataSource) {}
  private get db():DataSource{return this.source ?? database;}
  private scope(auth:any,scope:Scope):{customer:string|null;store:string|null}{
    if(!auth?.user_id)throw new ApiError(401,'UNAUTHENTICATED','Vui lòng đăng nhập.');
    if(scope==='CUSTOMER')return {customer:auth.user_id,store:null};
    if(scope==='ADMIN'){
      if(!auth.roles?.includes('ADMIN')||!auth.role_permissions?.includes('platform.admin'))throw new ApiError(403,'FORBIDDEN','Không có quyền quản trị.');
      return {customer:null,store:null};
    }
    const member=auth.store_membership;
    if(!member?.store_id||member.status!=='ACTIVE'||!['OWNER','SELLER'].includes(member.role)||(member.role!=='OWNER'&&!member.permissions?.includes('order.store.read_status_cancel')))
      throw new ApiError(403,'FORBIDDEN','Cần quyền xử lý đơn hàng của gian hàng.');
    return {customer:null,store:member.store_id};
  }
  private authorize(row:any,auth:any,scope:Scope){
    const allowed=this.scope(auth,scope);
    if(!row || (allowed.customer&&row.customer_user_id!==allowed.customer) || (allowed.store&&row.store_id!==allowed.store))throw new ApiError(404,'NOT_FOUND','Không tìm thấy yêu cầu thuộc phạm vi của bạn.');
  }
  async list(auth:any,scope:Scope,query:{page?:number;size?:number;order_id?:string}){
    const allowed=this.scope(auth,scope),page=query.page ?? 1,size=query.size ?? 20;
    const args=[allowed.customer,allowed.store,query.order_id ?? null];
    const where=' WHERE ($1::uuid IS NULL OR o.customer_user_id=$1) AND ($2::uuid IS NULL OR o.store_id=$2) AND ($3::uuid IS NULL OR o.id=$3)';
    const [count]=await this.db.manager.query('SELECT count(*)::int AS total FROM order_return_request r JOIN "order" o ON o.id=r.order_id'+where,args);
    const rows=await this.db.manager.query(projection+where+' ORDER BY r.updated_at DESC,r.id LIMIT $4 OFFSET $5',[...args,size,(page-1)*size]);
    return {items:rows.map((row:any)=>({...map(row),...(scope==='ADMIN'?{admin_context:{store_id:row.store_id,customer_user_id:row.customer_user_id,order_created_at:new Date(row.order_created_at).toISOString(),order_status:row.order_status,...(row.payment_status?{payment_status:row.payment_status}:{}),...(row.collected_vnd==null?{}:{collected_vnd:moneyNumber(row.collected_vnd)}),...(row.refunded_vnd==null?{}:{refunded_vnd:moneyNumber(row.refunded_vnd)})}}:{})})),page,size,total:count.total};
  }
  async create(orderId:string,input:{type:'REFUND'|'EXCHANGE';reason:string;expected_order_version:number},auth:any,trace:string){
    const reason=input.reason.trim();if(!reason)throw new ApiError(422,'VALIDATION_FAILED','Cần lý do đổi trả.');
    return this.db.transaction(async manager=>{
      const [order]=await manager.query('SELECT * FROM "order" WHERE id=$1 FOR UPDATE',[orderId]);this.authorize(order,auth,'CUSTOMER');
      const [existing]=await manager.query(projection+' WHERE r.order_id=$1',[orderId]);
      if(existing){if(existing.type!==input.type||existing.reason!==reason)throw new ApiError(409,'RETURN_ALREADY_EXISTS','Đơn hàng đã có yêu cầu đổi trả.');return map(existing);}
      if(order.version!==input.expected_order_version)throw new ApiError(409,'VERSION_CONFLICT','Đơn hàng đã thay đổi. Vui lòng tải lại.');
      if(order.status!=='COMPLETED')throw new ApiError(409,'RETURN_NOT_ELIGIBLE','Chỉ yêu cầu đổi trả cho đơn đã hoàn tất.');
      if(readReturnPolicy(order.return_policy_snapshot)) {
        const [completion]=await manager.query("SELECT created_at,now() AS checked_at FROM order_status_history WHERE order_id=$1 AND to_status='COMPLETED' ORDER BY created_at,id LIMIT 1",[orderId]);
        if(!completion)throw new ApiError(409,'RETURN_POLICY_RECONCILIATION_REQUIRED','Thiếu thời điểm hoàn tất để xác định quyền đổi trả. Cần đối chiếu đơn.');
        if(new Date(completion.checked_at).getTime()>new Date(completion.created_at).getTime()+168*3600000)throw new ApiError(409,'RETURN_WINDOW_EXPIRED','Đã quá 7×24 giờ từ lúc đơn hoàn tất. Yêu cầu đã gửi đúng hạn vẫn tiếp tục được xử lý.');
      }

      const [row]=await manager.query('INSERT INTO order_return_request(order_id,type,reason,original_type) VALUES($1,$2,$3,$2) RETURNING id',[orderId,input.type,reason]);
      await this.history(manager,row.id,null,'REQUESTED',auth.user_id,reason);
      const [result]=await manager.query(projection+' WHERE r.id=$1',[row.id]);
      await audit(manager,'M2',auth.user_id,'ReturnRequest',row.id,'CREATE',trace,{},map(result));return map(result);
    });
  }
  private async history(manager:EntityManager,id:string,from:string|null,to:string,actor:string,reason?:string){
    await manager.query('INSERT INTO return_status_history(request_id,from_status,to_status,actor_user_id,reason) VALUES($1,$2,$3,$4,$5)',[id,from,to,actor,reason ?? null]);
  }
  private async locked(manager:EntityManager,id:string,auth:any,scope:Scope){
    const [target]=await manager.query('SELECT order_id FROM order_return_request WHERE id=$1',[id]);
    if(!target)throw new ApiError(404,'NOT_FOUND','Không tìm thấy yêu cầu đổi trả.');
    await manager.query('SELECT id FROM "order" WHERE id=$1 FOR UPDATE',[target.order_id]);
    await manager.query('SELECT id FROM order_return_request WHERE id=$1 FOR UPDATE',[id]);
    const [before]=await manager.query(projection+' WHERE r.id=$1',[id]);this.authorize(before,auth,scope);return before;
  }
  private async record(manager:EntityManager,id:string,auth:any,action:string,detail:any){
    await manager.query('INSERT INTO return_operation_history(request_id,actor_user_id,action,detail_json) VALUES($1,$2,$3,$4)',[id,auth.user_id,action,JSON.stringify(detail)]);
  }
  private receipt(before:any,input:OperationInputs['updateStoreReturnRequest']['body']){
    const lines=input.inspection,note=input.inspection_note?.trim(),items=before.items as any[];
    if(!note||!items.length||!lines||lines.length!==items.length||new Set(lines.map(row=>row.order_item_id)).size!==items.length)
      throw new ApiError(422,'RETURN_INSPECTION_REQUIRED','Cần ghi từng dòng thực nhận, tình trạng và ghi chú kiểm hàng.');
    for(const line of lines){const item=items.find(row=>row.order_item_id===line.order_item_id);
      if(!item||![line.received_quantity,line.resellable_quantity,line.damaged_quantity,line.pending_quantity].every(n=>Number.isSafeInteger(n)&&n>=0)||line.received_quantity>item.quantity||line.resellable_quantity+line.damaged_quantity+line.pending_quantity!==line.received_quantity)
        throw new ApiError(422,'RETURN_INSPECTION_INCOMPLETE','Số thực nhận không được vượt lượng đã giao; bán lại + hỏng + chờ kiểm phải khớp thực nhận.');
    }
    return {lines,note,items,complete:lines.every(line=>line.pending_quantity===0&&line.received_quantity===items.find(item=>item.order_item_id===line.order_item_id).quantity)};
  }
  async transition(id:string,input:OperationInputs['updateStoreReturnRequest']['body'],auth:any,scope:Scope,trace:string){
    this.scope(auth,scope);
    return this.db.transaction(async manager=>{
      const before=await this.locked(manager,id,auth,scope);
      const execute=async()=>{
        if(before.version!==input.expected_version)throw new ApiError(409,'VERSION_CONFLICT','Yêu cầu đã thay đổi. Vui lòng tải lại.');
        const note=input.decision_note?.trim(),reference=input.replacement_reference?.trim();
        let nextStatus=input.status;
        const receiving=input.status==='RECEIVED'&&['APPROVED','RECEIVED'].includes(before.status)&&['NOT_STARTED'].includes(before.inventory_status);
        const allowed=scope==='CUSTOMER'?before.type==='EXCHANGE'&&before.status==='EXCHANGE_SENT'&&input.status==='COMPLETED'
          :(before.status==='REQUESTED'&&['APPROVED','REJECTED'].includes(input.status))||receiving||(before.status==='RECEIVED'&&((before.type==='EXCHANGE'&&input.status==='EXCHANGE_SENT')||(before.type==='REFUND'&&input.status==='COMPLETED')));
        if(!allowed)throw new ApiError(409,'RETURN_STATE_CONFLICT','Không thể chuyển trạng thái yêu cầu.');
        if(['APPROVED','REJECTED'].includes(input.status)&&!note)throw new ApiError(422,'DECISION_NOTE_REQUIRED','Cần ghi rõ nội dung quyết định.');
        if(input.status==='APPROVED'){
          if(!input.fault_party)throw new ApiError(422,'RETURN_FAULT_DECISION_REQUIRED','Ghi kết luận bên có lỗi; nếu tranh chấp phải chuyển Admin, không tự suy từ lời khai.');
          const policy=readReturnPolicy(before.return_policy_snapshot),address=policy?.return_address;
          const instructions=input.return_instructions?.trim()||(address?'Gửi trả tới: '+[address.recipient_name,address.phone,address.line1,address.ward,address.district,address.city].join(', '):'');
          if(!instructions)throw new ApiError(422,'RETURN_INSTRUCTIONS_REQUIRED','Đơn cũ cần hướng dẫn và địa chỉ nhận trả cụ thể cho trường hợp này.');
          await manager.query('UPDATE order_return_request SET fault_party=$2,fee_payer=$3,return_instructions=$4 WHERE id=$1',[id,input.fault_party,input.fault_party==='DISPUTED'?null:input.fault_party,instructions]);
          await this.record(manager,id,auth,'RETURN_DECISION',{fault_party:input.fault_party,fee_payer:input.fault_party==='DISPUTED'?null:input.fault_party,note,instructions});
        }
        if(receiving){
          if(!input.operation_id)throw new ApiError(422,'OPERATION_ID_REQUIRED','Cần mã thao tác nhận hàng để retry an toàn.');
          const {lines,note:inspectionNote,items,complete}=this.receipt(before,input);
          if(!complete)nextStatus='APPROVED';
          const [stock]=await manager.query('SELECT * FROM order_inventory_state WHERE order_id=$1 FOR UPDATE',[before.order_id]);
          let inventoryStatus=complete?'PENDING':'NOT_STARTED',command:any=null;
          if(complete&&!stock){
            const reconciliation=input.legacy_reconciliation_note?.trim();
            if(scope!=='ADMIN'&&auth.store_membership?.role!=='OWNER'||!reconciliation||lines.some(line=>line.resellable_quantity>0))throw new ApiError(409,'LEGACY_STOCK_RECONCILIATION_REQUIRED','Thiếu nguồn xuất tồn cũ. Owner/Admin phải ghi đối chiếu riêng, không cộng tồn tự động; dùng điều chỉnh bù có lý do nếu cần.');
            inventoryStatus='LEGACY_RECONCILED';await manager.query('UPDATE order_return_request SET legacy_reconciliation_note=$2 WHERE id=$1',[id,reconciliation]);
          }else if(complete){
            if(stock.state!=='CONSUMED'||stock.command_kind)throw new ApiError(409,'RETURN_STOCK_RECONCILIATION_REQUIRED','Lệnh kho của đơn chưa được đối chiếu consume.');
            command={operation_id:commandId('return-receipt:'+id),receipt_id:id,order_id:before.order_id,actor_user_id:auth.user_id,items:lines.filter(line=>line.resellable_quantity>0).map(line=>({variant_id:items.find(item=>item.order_item_id===line.order_item_id).variant_id,store_id:before.store_id,quantity:line.resellable_quantity}))};
          }
          await manager.query('UPDATE order_return_request SET inspection_json=$2,inspection_note=$3,inventory_status=$4,inventory_command_json=$5,next_attempt_at=now(),last_error=NULL WHERE id=$1',[id,JSON.stringify(lines),inspectionNote,inventoryStatus,command?JSON.stringify(command):null]);
          await this.record(manager,id,auth,'RECEIPT_INSPECTED',{lines,note:inspectionNote,inventory_status:inventoryStatus,legacy_reconciliation_note:input.legacy_reconciliation_note});
        }
        if(input.status==='EXCHANGE_SENT'){
          if(!input.operation_id||!reference)throw new ApiError(422,'REPLACEMENT_REFERENCE_REQUIRED','Cần mã thao tác và tham chiếu bàn giao hàng đổi.');
          if(before.inventory_status!=='APPLIED'||!['NOT_STARTED','BLOCKED'].includes(before.exchange_status)||before.fault_party==='DISPUTED'||!before.fee_payer||before.conversion_status==='PROPOSED')throw new ApiError(409,'EXCHANGE_NOT_READY','Chờ đối chiếu kho, quyết định phí hoặc phản hồi đề nghị hoàn tiền trước khi gửi đổi.');
          const replacements=input.replacements,items=before.items as any[];
          if(!replacements||replacements.length!==items.length||new Set(replacements.map(row=>row.order_item_id)).size!==items.length||replacements.some(row=>!items.some(item=>item.order_item_id===row.order_item_id)))throw new ApiError(422,'EXCHANGE_ITEMS_REQUIRED','Chọn phân loại hàng đổi cho đủ từng dòng; không đổi một phần hoặc khác giá.');
          const prices=await manager.query('SELECT id,unit_price_vnd FROM order_item WHERE order_id=$1',[before.order_id]);
          const command={operation_id:commandId('return-exchange:'+id+':'+input.operation_id),receipt_id:id,order_id:before.order_id,actor_user_id:auth.user_id,items:items.map(item=>({original_variant_id:item.variant_id,variant_id:replacements.find(row=>row.order_item_id===item.order_item_id)!.variant_id,store_id:before.store_id,quantity:item.quantity,unit_price_vnd:moneyNumber(prices.find((row:any)=>row.id===item.order_item_id).unit_price_vnd)}))};
          await manager.query("UPDATE order_return_request SET exchange_status='PENDING',exchange_command_json=$2,replacement_reference=$3,version=version+1,next_attempt_at=now(),last_error=NULL,updated_at=now() WHERE id=$1",[id,JSON.stringify(command),reference]);
          await this.record(manager,id,auth,'EXCHANGE_DISPATCH_REQUESTED',{reference,items:command.items});
          const [result]=await manager.query(projection+' WHERE r.id=$1',[id]);return map(result);
        }
        const noMoney=zeroDueSettled(before,{status:before.payment_status,payable_vnd:before.payment_payable_vnd,collected_vnd:before.collected_vnd,refunded_vnd:before.refunded_vnd});
        if(before.type==='REFUND'&&input.status==='COMPLETED'&&(!returnSettlementReady(before)||!noMoney&&(before.refund_status!=='SUCCEEDED'||BigInt(before.refunded_vnd??0)!==BigInt(before.payable_vnd))))throw new ApiError(409,'REFUND_NOT_CONFIRMED','Chưa đối chiếu kiểm hàng và bằng chứng hoàn đủ tiền, gồm phí giao ban đầu. Đơn 0đ không tạo khoản hoàn giả.');
        await manager.query('UPDATE order_return_request SET status=$2,decision_note=coalesce($3,decision_note),version=version+1,updated_at=now() WHERE id=$1',[id,nextStatus,note??null]);
        await this.history(manager,id,before.status,nextStatus,auth.user_id,note);
        const [after]=await manager.query(projection+' WHERE r.id=$1',[id]);await audit(manager,'M2',auth.user_id,'ReturnRequest',id,input.status,trace,map(before),map(after));return map(after);
      };
      return input.operation_id?once(manager,'M2.Return.transition',input.operation_id,{...input,id,actor:auth.user_id,scope},execute):execute();
    });
  }
  async resolve(id:string,input:OperationInputs['resolveStoreReturn']['body'],auth:any,scope:Scope,trace:string){
    this.scope(auth,scope);
    return this.db.transaction(async manager=>{
      const before=await this.locked(manager,id,auth,scope);
      return once(manager,'M2.Return.resolution',input.operation_id,{...input,id,actor:auth.user_id,scope},async()=>{
        if(before.version!==input.expected_version)throw new ApiError(409,'VERSION_CONFLICT','Yêu cầu đã thay đổi. Đọc lại trước khi quyết định.');
        const note=input.note.trim();if(!note)throw new ApiError(422,'DECISION_NOTE_REQUIRED','Cần giải thích quyết định.');
        if(['COMPLETED','REJECTED','EXCHANGE_SENT'].includes(before.status)||before.exchange_status==='PENDING'||before.exchange_status==='APPLIED')throw new ApiError(409,'RETURN_RESOLUTION_CLOSED','Không thay quyết định sau khi hàng đổi đang bàn giao hoặc yêu cầu đã kết thúc.');
        if(input.action==='PROPOSE_REFUND'){
          if(scope!=='STORE'||before.type!=='EXCHANGE'||!['APPROVED','RECEIVED'].includes(before.status))throw new ApiError(409,'RETURN_CONVERSION_NOT_ALLOWED','Store chỉ đề nghị hoàn tiền trước khi gửi hàng đổi.');
          await manager.query("UPDATE order_return_request SET conversion_status='PROPOSED',conversion_note=$2 WHERE id=$1",[id,note]);
        }else if(['ACCEPT_REFUND','DECLINE_REFUND'].includes(input.action)){
          if(scope!=='CUSTOMER'||before.type!=='EXCHANGE'||before.conversion_status!=='PROPOSED')throw new ApiError(409,'RETURN_CONSENT_REQUIRED','Chỉ khách của đơn được phản hồi đề nghị đang chờ.');
          await manager.query("UPDATE order_return_request SET conversion_status=$2::varchar,type=CASE WHEN $2::varchar='ACCEPTED' THEN 'REFUND' ELSE type END WHERE id=$1",[id,input.action==='ACCEPT_REFUND'?'ACCEPTED':'DECLINED']);
        }else if(input.action==='DISPUTE'){
          if(scope!=='CUSTOMER'||!['APPROVED','RECEIVED'].includes(before.status))throw new ApiError(409,'RETURN_DISPUTE_NOT_ALLOWED','Khách có thể yêu cầu Admin xem xét quyết định trước khi xử lý xong.');
          if((await manager.query('SELECT id FROM refund WHERE order_id=$1',[before.order_id])).length)throw new ApiError(409,'REFUND_ALREADY_IN_PROGRESS','Khoản hoàn đã đang xử lý. Giữ nguyên giao dịch và liên hệ Admin từ đơn để xem xét phí riêng.');
          await manager.query("UPDATE order_return_request SET fault_party='DISPUTED',fee_payer=NULL WHERE id=$1",[id]);
        }else{
          if(scope!=='ADMIN'||before.fault_party!=='DISPUTED'||!input.fault_party)throw new ApiError(403,'ADMIN_RESOLUTION_REQUIRED','Chỉ Admin có quyền chốt bên chịu trách nhiệm cho tranh chấp.');
          await manager.query('UPDATE order_return_request SET fault_party=$2,fee_payer=$2 WHERE id=$1',[id,input.fault_party]);
        }
        await manager.query('UPDATE order_return_request SET version=version+1,updated_at=now() WHERE id=$1',[id]);
        await this.record(manager,id,auth,input.action,{note,...(input.fault_party?{fault_party:input.fault_party}:{})});
        await this.history(manager,id,before.status,before.status,auth.user_id,note);
        const [after]=await manager.query(projection+' WHERE r.id=$1',[id]);await audit(manager,'M2',auth.user_id,'ReturnRequest',id,input.action,trace,map(before),map(after));return map(after);
      });
    });
  }
}
/** Shared gates for COD proof, online jobs and request completion; legacy status alone is insufficient. */
export function returnSettlementReady(row:any):boolean {
  return ['APPLIED','LEGACY_RECONCILED'].includes(row.inventory_status)&&['STORE','CUSTOMER'].includes(row.fault_party)&&row.fee_payer===row.fault_party;
}
