import type {OrderTimelineRow} from './order.repository';

export const ORDER_SYSTEM_ACTOR='00000000-0000-0000-0000-000000000000';

export function orderTimelineActor(event:OrderTimelineRow,customerId:string):'SYSTEM'|'CUSTOMER'|'STORE'{
  if(event.actor_user_id===ORDER_SYSTEM_ACTOR)return 'SYSTEM';
  // Old inventory workers wrote the Customer ID. These transitions are exclusively
  // worker-owned (Store commands cannot target them). Keep raw history unchanged;
  // do not infer actor from free-text cancellation reasons supplied by a user.
  if(event.from_status&&['PENDING','RECOVERING','EXPIRED'].includes(event.to_status))return 'SYSTEM';
  return event.actor_user_id===customerId?'CUSTOMER':'STORE';
}
