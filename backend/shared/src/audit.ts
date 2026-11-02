import { EntityManager } from 'typeorm';
import { randomUUID } from 'node:crypto';
import {auditExecutor,isHumanCancellation} from './audit-actor';
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
async function storeScope(manager:EntityManager,service:'M1'|'M2'|'M3',type:string,id:string,before:unknown,after:unknown,explicit?:string){
  if(uuid(explicit))return explicit;
  for(const value of [after,before])if(value&&typeof value==='object'&&uuid((value as any).store_id))return (value as any).store_id;
  if(!uuid(id))return null;
  const lookups:Record<string,Record<string,string>>={
    M1:{Product:'SELECT store_id FROM product WHERE id=$1',Variant:'SELECT store_id FROM product_variant WHERE id=$1',Inventory:'SELECT store_id FROM inventory WHERE id=$1'},
    M2:{Order:'SELECT store_id FROM "order" WHERE id=$1',Voucher:'SELECT store_id FROM voucher WHERE id=$1',Payment:'SELECT o.store_id FROM payment t JOIN "order" o ON o.id=t.order_id WHERE t.id=$1',PaymentAttempt:'SELECT o.store_id FROM payment_attempt a JOIN payment p ON p.id=a.payment_id JOIN "order" o ON o.id=p.order_id WHERE a.id=$1',Refund:'SELECT o.store_id FROM refund t JOIN "order" o ON o.id=t.order_id WHERE t.id=$1',ReturnRequest:'SELECT o.store_id FROM order_return_request t JOIN "order" o ON o.id=t.order_id WHERE t.id=$1',DeliveryReturn:'SELECT o.store_id FROM delivery_return_case t JOIN "order" o ON o.id=t.order_id WHERE t.id=$1'},
    M3:{Store:'SELECT id AS store_id FROM store WHERE id=$1',StoreMembership:'SELECT store_id FROM store_membership WHERE id=$1',StaffInvitation:'SELECT store_id FROM staff_invitation WHERE id=$1',StoreApplication:'SELECT id AS store_id FROM store WHERE application_id=$1'},
  };
  const sql=lookups[service][type];if(!sql)return null;
  const [row]=await manager.query(sql,[id]);return uuid(row?.store_id)?row.store_id:null;
}
// Table names are fixed by service ID, never accepted from a request.
export async function audit(manager:EntityManager,service:'M1'|'M2'|'M3',actor:string,targetType:string,targetId:string,action:string,correlation:string,before:unknown,after:unknown,storeId?:string) {
  const table={M1:'m1_audit',M2:'m2_audit',M3:'m3_audit'}[service];
  const scopedStore=await storeScope(manager,service,targetType,targetId,before,after,storeId);
  const cancellation=isHumanCancellation(service,targetType,action,actor,after);
  const payload=cancellation?{...after as Record<string,unknown>,reason:(after as Record<string,unknown>).reason??action}:after;
  await manager.query(`INSERT INTO ${table}(id,actor_user_id,target_type,target_id,action,request_id,before_json,after_json,created_at,store_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now(),$9)`,[randomUUID(),auditExecutor(service,targetType,action,actor,after),targetType,targetId,cancellation?'CANCEL_ORDER':action,correlation,JSON.stringify(before),JSON.stringify(payload),scopedStore]);
}
