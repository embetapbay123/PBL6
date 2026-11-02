export const SYSTEM_AUDIT_ACTOR = '00000000-0000-0000-0000-000000000000';

// These events are emitted only by provider/worker workflows. Earlier writers
// used the ordering customer as a correlation identity, not the executor.
const automatedM2: Record<string, readonly string[]> = {
  Payment: ['CALLBACK'],
  Refund: ['REQUEST', 'LEASE_EXPIRED', 'STATE_CHANGED', 'LOOKUP_STARTED', 'COMMAND_STARTED', 'PROVIDER_RESULT', 'RETRY_REQUEUED'],
};
export function isHumanCancellation(service:string,type:string,action:string,actor:string|null,after:unknown) {
  const state=after&&typeof after==='object'?(after as Record<string,unknown>).status:undefined;
  return service==='M2'&&type==='Order'&&state==='CANCELLED'&&!(action==='DELIVERY_RETURN_CLOSED'&&actor===SYSTEM_AUDIT_ACTOR);
}
export function auditActionSql(service:string) {
  return service==='M2'?`(CASE WHEN a.target_type='Order' AND a.after_json->>'status'='CANCELLED' AND NOT (a.action='DELIVERY_RETURN_CLOSED' AND coalesce(a.actor_user_id='${SYSTEM_AUDIT_ACTOR}'::uuid,false)) THEN 'CANCEL_ORDER' ELSE a.action END)`:'a.action';
}
export function auditExecutor(service: string, type: string, action: string, recorded: string, after?: unknown) {
  if(service === 'M2' && type === 'Order') {
    // A cancellation reason is user supplied and used as the legacy action.
    // Require the worker's postcondition as well, never the action text alone.
    const result = after && typeof after === 'object' ? after as Record<string,unknown> : {};
    const state = ({INVENTORY_CONSUMED:'CONSUMED',INVENTORY_RELEASED:'RELEASED',INVENTORY_RESTOCKED:'RESTOCKED'} as Record<string,string>)[action];
    return state && (result.state === state || action === 'INVENTORY_CONSUMED' && result.status === 'PENDING') ? SYSTEM_AUDIT_ACTOR : recorded;
  }
  return service === 'M2' && automatedM2[type]?.includes(action) ? SYSTEM_AUDIT_ACTOR : recorded;
}
/** Fixed identifiers and literals only; never interpolate a request into this expression. */
export function auditExecutorSql(service: string) {
  if(service !== 'M2')return 'a.actor_user_id';
  const order = `(a.target_type='Order' AND ((a.action='INVENTORY_CONSUMED' AND (a.after_json->>'state'='CONSUMED' OR a.after_json->>'status'='PENDING')) OR (a.action='INVENTORY_RELEASED' AND a.after_json->>'state'='RELEASED') OR (a.action='INVENTORY_RESTOCKED' AND a.after_json->>'state'='RESTOCKED')))`;
  const known = [order,...Object.entries(automatedM2).map(([type, actions]) => `(a.target_type='${type}' AND a.action IN (${actions.map(action => `'${action}'`).join(',')}))`)].join(' OR ');
  return `(CASE WHEN ${known} THEN '${SYSTEM_AUDIT_ACTOR}'::uuid ELSE a.actor_user_id END)`;
}
