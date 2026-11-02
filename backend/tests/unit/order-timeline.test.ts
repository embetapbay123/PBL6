import {orderTimelineActor,ORDER_SYSTEM_ACTOR} from '../../commerce-service/src/order/order-timeline';

const customer='11111111-1111-4111-8111-111111111111',employee='22222222-2222-4222-8222-222222222222';
test.each([
  [null,'AWAITING_PAYMENT',customer,'CUSTOMER'],
  [null,'PENDING',customer,'CUSTOMER'],
  ['PREPARING','PENDING',customer,'SYSTEM'],
  ['AWAITING_PAYMENT','RECOVERING',customer,'SYSTEM'],
  ['AWAITING_PAYMENT','EXPIRED',customer,'SYSTEM'],
  ['SHIPPED','CANCELLED',ORDER_SYSTEM_ACTOR,'SYSTEM'],
  ['CONFIRMED','CANCELLED',customer,'CUSTOMER'],
  ['PENDING','CONFIRMED',employee,'STORE'],
  ['CONFIRMED','CANCELLED',employee,'STORE'],
])('timeline %s → %s reports the actual actor', (from,to,actor,expected)=>{
  expect(orderTimelineActor({from_status:from,to_status:to!,actor_user_id:actor!,created_at:'2026-11-01T00:00:00Z'},customer)).toBe(expected);
});
