jest.mock('../../shared/src/database',()=>({database:{manager:{query:(...args:any[])=>mockQuery(...args)},transaction:(fn:any)=>fn({query:(...args:any[])=>mockQuery(...args)})}}));
const mockQuery=jest.fn();
import { MessagingService } from '../../identity-store-service/src/messaging/messaging.service';
const customer={user_id:'buyer'},owner={user_id:'owner',store_membership:{store_id:'store',role:'OWNER',status:'ACTIVE',permissions:[]}};
const sent={id:'message',conversation_id:'thread',sender_user_id:'buyer',sender_side:'CUSTOMER',content:'Xin chào',client_message_id:'key',created_at:new Date('2026-10-28T00:00:00Z')};
beforeEach(()=>mockQuery.mockReset());
test('store listing requires an active membership with order permissions',async()=>{
  const service=new MessagingService();
  await expect(service.list({user_id:'staff',store_membership:{store_id:'store',role:'SELLER',status:'ACTIVE',permissions:[]}},'STORE')).rejects.toMatchObject({status:403});
  expect(mockQuery).not.toHaveBeenCalled();
});
test('a buyer and a different Store cannot read another conversation',async()=>{
  const service=new MessagingService();mockQuery.mockResolvedValue([{customer_user_id:'other',store_id:'foreign'}]);
  await expect(service.history('thread',customer,'CUSTOMER')).rejects.toMatchObject({status:404});
  await expect(service.history('thread',owner,'STORE')).rejects.toMatchObject({status:404});
  expect(mockQuery).toHaveBeenCalledTimes(2);
});
test('retrying an accepted message returns the same message without inserting again',async()=>{
  mockQuery.mockResolvedValueOnce([{customer_user_id:'buyer',store_id:'store'}]).mockResolvedValueOnce([sent]);
  const result=await new MessagingService().send('thread',{content:' Xin chào ',client_message_id:'key'},customer,'CUSTOMER');
  expect(result).toMatchObject({id:'message',content:'Xin chào',sender_side:'CUSTOMER'});
  expect(mockQuery.mock.calls.some(([sql])=>sql.startsWith('INSERT'))).toBe(false);
  expect(result).not.toHaveProperty('sender_user_id');
});
test('reusing a message key for another body fails without writing',async()=>{
  mockQuery.mockResolvedValueOnce([{customer_user_id:'buyer',store_id:'store'}]).mockResolvedValueOnce([sent]);
  await expect(new MessagingService().send('thread',{content:'Khác',client_message_id:'key'},customer,'CUSTOMER')).rejects.toMatchObject({status:409,response:{code:'MESSAGE_KEY_CONFLICT'}});
  expect(mockQuery.mock.calls.some(([sql])=>sql.startsWith('INSERT'))).toBe(false);
});
test('blank content fails before opening a transaction or reading data',async()=>{
  await expect(new MessagingService().send('thread',{content:'  ',client_message_id:'key'},customer,'CUSTOMER')).rejects.toMatchObject({status:422});
  expect(mockQuery).not.toHaveBeenCalled();
});
