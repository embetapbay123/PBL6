import { EntityManager } from 'typeorm';
import { randomUUID } from 'node:crypto';
export function validSampleEnvelope(event:any):boolean {
  return !!event && event.schema_version==='1.0' && event.event_type==='bootstrap.example.v1'
    && typeof event.event_id==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event.event_id)
    && ['M1','M2','M3','M4'].includes(event.producer)
    && typeof event.correlation_id==='string' && /^[a-zA-Z0-9-]{1,64}$/.test(event.correlation_id)
    && typeof event.occurred_at==='string' && Number.isFinite(Date.parse(event.occurred_at))
    && !!event.payload && typeof event.payload==='object' && !Array.isArray(event.payload);
}
export async function emitEvent(manager:EntityManager,eventType:string,payload:unknown,correlationId:string) {
  const id=randomUUID();
  await manager.query('INSERT INTO outbox(id,event_type,payload,correlation_id) VALUES($1,$2,$3,$4)',[id,eventType,JSON.stringify(payload),correlationId]);
  return id;
}
export async function applyEvent(manager:EntityManager,producer:string,id:string,effect:()=>Promise<void>) {
  const rows=await manager.query('INSERT INTO inbox(producer,event_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING event_id',[producer,id]);
  if(!rows.length) return false;
  await effect();return true;
}
