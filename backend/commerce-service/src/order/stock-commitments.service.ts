import type {DataSource} from 'typeorm';
import {database} from '../../../shared/src/database';
import {ApiError} from '../../../shared/src/errors';
import {searchPattern} from '../../../shared/src/search';
import type {OperationInputs,OperationOutputs} from '../../../shared/src/operations.generated';

const count=(value:unknown)=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<0)throw new ApiError(503,'STOCK_TOTAL_UNAVAILABLE','Không thể xác nhận tổng lượng hàng.');return n;};
export class StockCommitmentsService{
 constructor(private readonly source:DataSource=database){}
 async list(query:OperationInputs['listStockCommitments']['query'],auth:any):Promise<OperationOutputs['listStockCommitments']>{
  const member=auth?.store_membership;
  if(!auth?.user_id||!member?.store_id||!['OWNER','SELLER'].includes(member.role)||(member.role!=='OWNER'&&!member.permissions?.some((p:string)=>['inventory.store.*','inventory.store.read_adjust'].includes(p))))throw new ApiError(403,'FORBIDDEN','Cần quyền kho của Store hiện hành.');
  const page=query.page??1,size=query.size??20;
  if(!Number.isInteger(page)||page<1||page>1000000||!Number.isInteger(size)||size<1||size>100)throw new ApiError(422,'VALIDATION_FAILED','Trang đối chiếu kho không hợp lệ.');
  const values:unknown[]=[member.store_id],conditions=['o.store_id=$1',`((s.state='CONSUMED' AND o.status IN ('PENDING','CONFIRMED','PROCESSING','CANCELLED','EXPIRED')) OR (s.command_kind IS NOT NULL AND o.status NOT IN ('SHIPPED','COMPLETED')))`];
  for(const [expression,value] of [["(line->>'variant_id')::uuid",query.variant_id],['item.product_id',query.product_id]] as const)if(value){values.push(value);conditions.push(expression+'=$'+values.length+'::uuid');}
  const pattern=searchPattern(query.q);if(pattern){values.push(pattern);const arg='$'+values.length;conditions.push(`(marketplace_search(o.id::text) LIKE ${arg} OR marketplace_search(item.sku_snapshot) LIKE ${arg} OR marketplace_search(item.product_snapshot::text) LIKE ${arg})`);}
  const sql=`FROM order_inventory_state s JOIN "order" o ON o.id=s.order_id CROSS JOIN LATERAL jsonb_array_elements(s.items_json) line
    JOIN LATERAL (SELECT product_id,sku_snapshot,product_snapshot FROM order_item WHERE order_id=o.id AND variant_id=(line->>'variant_id')::uuid ORDER BY id LIMIT 1) item ON true WHERE ${conditions.join(' AND ')}`;
  const certain="s.state='CONSUMED' AND s.command_kind IS NULL AND o.status IN ('PENDING','CONFIRMED','PROCESSING')";
  return this.source.transaction('REPEATABLE READ',async manager=>{
   const [totals]=await manager.query(`SELECT count(*) AS total,coalesce(sum(CASE WHEN ${certain} THEN (line->>'quantity')::bigint ELSE 0 END),0) AS consumed_quantity,coalesce(sum(CASE WHEN NOT (${certain}) THEN (line->>'quantity')::bigint ELSE 0 END),0) AS uncertain_quantity ${sql}`,values);
   const rows:any[]=await manager.query(`SELECT o.id AS order_id,o.status AS order_status,(line->>'variant_id')::uuid AS variant_id,(line->>'quantity')::int AS quantity,item.*,s.state AS inventory_state,s.command_kind,CASE WHEN ${certain} THEN 'CONSUMED_NOT_HANDED_OVER' ELSE 'PENDING_RECONCILIATION' END AS reconciliation ${sql} ORDER BY o.created_at,o.id,variant_id LIMIT $${values.length+1} OFFSET $${values.length+2}`,[...values,size,(page-1)*size]);
   const [clock]=await manager.query('SELECT clock_timestamp() AS as_of');
   return {page,size,total:count(totals.total),consumed_quantity:count(totals.consumed_quantity),uncertain_quantity:count(totals.uncertain_quantity),as_of:new Date(clock.as_of).toISOString(),items:rows.map(row=>({order_id:row.order_id,order_status:row.order_status,variant_id:row.variant_id,product_id:row.product_id,product_title:typeof row.product_snapshot?.title==='string'?row.product_snapshot.title:'Đơn cũ chưa lưu tên món',...(row.sku_snapshot?{sku:row.sku_snapshot}:{}),...(row.product_snapshot?.variant_values?{variant_values:Object.fromEntries(Object.entries(row.product_snapshot.variant_values).filter(([,value])=>['string','number','boolean'].includes(typeof value)).map(([key,value])=>[key,String(value)]))}:{}),quantity:row.quantity,inventory_state:row.inventory_state,...(row.command_kind?{command_kind:row.command_kind}:{}),reconciliation:row.reconciliation}))};
  });
 }
}
