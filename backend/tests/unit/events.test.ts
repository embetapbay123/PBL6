import { randomUUID } from 'node:crypto';
import { validSampleEnvelope } from '../../shared/src/events';
test('sample consumer rejects poison IDs, unknown versions and missing payload before DB effect',()=>{
 const sample={event_id:randomUUID(),event_type:'bootstrap.example.v1',schema_version:'1.0',producer:'M1',occurred_at:new Date().toISOString(),correlation_id:'fixture-1',payload:{}};
 expect(validSampleEnvelope(sample)).toBe(true);
 expect(validSampleEnvelope({...sample,event_id:'-'.repeat(36)})).toBe(false);
 expect(validSampleEnvelope({...sample,schema_version:'2.0'})).toBe(false);
 expect(validSampleEnvelope({...sample,payload:null})).toBe(false);
});
