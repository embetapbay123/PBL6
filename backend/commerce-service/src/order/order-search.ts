import {searchPattern} from '../../../shared/src/search';
export type OrderSearch={q?:string;status?:string;payment_status?:string;refund_status?:string;store_id?:string};
/** Append bound predicates to an already established Customer/Store/Platform scope. */
export function orderSearch(query:OrderSearch,args:unknown[]):string{
 const conditions:string[]=[];
 if(query.q?.trim()){
  args.push(searchPattern(query.q));const n=args.length;
  conditions.push(`(marketplace_search(concat_ws(' ',o.id::text,o.purchase_group_id::text,o.store_id::text,o.address_snapshot->>'recipient_name',o.address_snapshot->>'phone')) LIKE $${n} OR EXISTS(SELECT 1 FROM order_item search_item WHERE search_item.order_id=o.id AND marketplace_search(concat_ws(' ',search_item.sku_snapshot,search_item.product_snapshot->>'title',search_item.product_snapshot->>'variant_title',(search_item.product_snapshot->'variant_values')::text)) LIKE $${n}))`);
 }
 if(query.status){args.push(query.status);conditions.push(`o.status=$${args.length}`);}
 if(query.payment_status){args.push(query.payment_status);conditions.push(`EXISTS(SELECT 1 FROM payment search_payment WHERE search_payment.order_id=o.id AND search_payment.status=$${args.length})`);}
 if(query.refund_status){args.push(query.refund_status);conditions.push(`(SELECT search_refund.status FROM refund search_refund WHERE search_refund.order_id=o.id ORDER BY search_refund.created_at DESC,search_refund.id DESC LIMIT 1)=$${args.length}`);}
 if(query.store_id){args.push(query.store_id);conditions.push(`o.store_id=$${args.length}`);}
 return conditions.length?' AND '+conditions.join(' AND '):'';
}
