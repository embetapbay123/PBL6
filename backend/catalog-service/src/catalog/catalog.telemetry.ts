import { database } from '../../../shared/src/database';
import { config } from '../../../shared/src/config';
import { emitEvent } from '../../../shared/src/events';
import { InternalClients } from '../../../shared/src/internal-clients';

/**
 * Resolve the optional end-user token of a public catalog read.
 *
 * Returns null for guests and for invalid/expired tokens: the catalog is public, so a bad token
 * must degrade to an anonymous read instead of failing the request. Resolving through M3 rather
 * than decoding the JWT locally keeps a revoked session from producing personal telemetry.
 */
export async function optionalUserId(authorization:unknown,correlation:string):Promise<string|null> {
  const token=typeof authorization==='string'?authorization.match(/^Bearer (.+)$/)?.[1]:undefined;
  if(!token) return null;
  try {
    const c=config('M1');
    const context=await new InternalClients('M1',c.internalKeys.M1,{M1:c.catalogUrl,M2:'',M3:c.identityUrl}).call('ResolveContext',{token},correlation);
    return context.user_id;
  } catch { return null; }
}

/**
 * Telemetry owns its own transaction and never throws. A failing side channel — an unreachable M4,
 * a broken outbox, a full disk — must not fail a catalog read. M1 only writes the local outbox;
 * it never touches M4 storage.
 */
export async function recordInteraction(eventType:'SearchRecorded'|'InteractionRecorded',payload:unknown,correlation:string):Promise<void> {
  try {
    await database.transaction(async manager=>{await emitEvent(manager,eventType,payload,correlation);});
  } catch { /* best effort: catalog reads never depend on telemetry */ }
}
