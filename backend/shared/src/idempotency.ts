import { createHash } from 'node:crypto';
import { EntityManager } from 'typeorm';
import { ApiError } from './errors';
function canonical(value: any): any {
  if(Array.isArray(value)) return value.map(canonical);
  if(value && typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
export const fingerprint=(value:unknown)=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
// Invoke inside a caller-owned transaction. The same manager must perform all effects.
export async function once<T>(manager:EntityManager,caller:string,operationId:string,payload:unknown,effect:()=>Promise<T>):Promise<T> {
  await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[caller+':'+operationId]);
  const hash=fingerprint(payload);
  const [record]=await manager.query('SELECT fingerprint,result FROM operation_result WHERE caller=$1 AND operation_id=$2',[caller,operationId]);
  if(record) {if(record.fingerprint!==hash) throw new ApiError(409,'IDEMPOTENCY_CONFLICT','Mã thao tác đã dùng với dữ liệu khác.');return record.result;}
  const result=await effect();
  await manager.query('INSERT INTO operation_result(caller,operation_id,fingerprint,result) VALUES($1,$2,$3,$4)',[caller,operationId,hash,JSON.stringify(result)]);
  return result;
}
