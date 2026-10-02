import bundle from './contracts.runtime.generated.json';
import type { EventEnvelope } from './operations.generated';
import { assertSchema } from './contract-validation';
export type BusinessEvent = keyof typeof bundle.events;
export function validateBusinessEvent(event:unknown) {
  const name=(event as any)?.event_type as BusinessEvent;
  if (!bundle.events[name]) throw new Error('Unknown business event');
  assertSchema(event,bundle.events[name].schema);
  const payload=(event as any).payload;
  if(name==='InteractionRecorded' && ((payload.event_type==='VIEW' && (event as any).producer!=='M1') || (payload.event_type==='CART' && (event as any).producer!=='M2'))) throw new Error('Invalid interaction producer');
  return event as EventEnvelope;
}
