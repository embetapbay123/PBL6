import { ApiError } from '../../../shared/src/errors';
export interface OrderFilters {status?:string;q?:string;from?:string;to?:string}
export function orderWhere(filters:OrderFilters={},scope?:{column:'o.customer_user_id'|'o.store_id';id:string}) {
  const values:unknown[]=scope?[scope.id]:[],clauses=scope?[scope.column+' = $1']:['true'];
  const add=(column:string,operator:string,value:unknown)=>{values.push(value);clauses.push(column+' '+operator+' $'+values.length)};
  const from=filters.from?Date.parse(filters.from):undefined,to=filters.to?Date.parse(filters.to):undefined;
  if(from!==undefined&&!Number.isFinite(from)||to!==undefined&&!Number.isFinite(to)||from!==undefined&&to!==undefined&&from>=to)throw new ApiError(422,'INVALID_PERIOD','Khoảng ngày không hợp lệ.');
  if(filters.status)add('o.status','=',filters.status);
  if(filters.from)add('o.created_at','>=',filters.from);
  if(filters.to)add('o.created_at','<',filters.to);
  if(filters.q){
    const q=filters.q.replace(/^PBL-/i,'').replace(/-/g,'');
    if(!/^[a-f0-9]{8,36}$/i.test(q))throw new ApiError(422,'INVALID_ORDER_CODE','Nhập mã đơn hoặc ít nhất 8 ký tự của UUID.');
    add("replace(o.id::text,'-','')",'ILIKE','%'+q+'%');
  }
  return {sql:clauses.join(' AND '),values};
}
