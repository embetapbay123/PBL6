import { EntityManager } from 'typeorm';
import { randomUUID } from 'node:crypto';
// Table names are fixed by service ID, never accepted from a request.
export async function audit(manager:EntityManager,service:'M1'|'M2'|'M3',actor:string,targetType:string,targetId:string,action:string,correlation:string,before:unknown,after:unknown) {
  const table={M1:'m1_audit',M2:'m2_audit',M3:'m3_audit'}[service];
  await manager.query(`INSERT INTO ${table}(id,actor_user_id,target_type,target_id,action,request_id,before_json,after_json,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now())`,[randomUUID(),actor,targetType,targetId,action,correlation,JSON.stringify(before),JSON.stringify(after)]);
}
