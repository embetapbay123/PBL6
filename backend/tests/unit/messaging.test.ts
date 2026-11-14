jest.mock('../../shared/src/database',()=>({database:{manager:{query:(...args:any[])=>mockQuery(...args)},transaction:(fn:any)=>fn({query:(...args:any[])=>mockQuery(...args)})}}));
const mockQuery=jest.fn();
import { MessagingService } from '../../identity-store-service/src/messaging/messaging.service';
const customer={user_id:'buyer'},owner={user_id:'owner',store_membership:{store_id:'store',role:'OWNER',status:'ACTIVE',permissions:[]}};
const sent={id:'message',conversation_id:'thread',sender_user_id:'buyer',sender_side:'CUSTOMER',content:'Xin chào',client_message_id:'key',created_at:new Date('2026-10-28T00:00:00Z')};
beforeEach(()=>mockQuery.mockReset());
test('Store customer search is scoped before pagination and escapes LIKE input',async()=>{
  mockQuery.mockResolvedValueOnce([{total:1}]).mockResolvedValueOnce([{id:'thread',store_id:'store',store_name:'Shop',customer_name:'Nguyễn An',updated_at:new Date('2026-10-28T00:00:00Z'),last_message:null,last_order_id:'order-linked',unread_count:2}]).mockResolvedValueOnce([{total:2}]);
  const result=await new MessagingService().list(owner,'STORE',2,20,'Nguyễn An');
  expect(result).toMatchObject({total:1,page:2,items:[{customer_name:'Nguyễn An',last_order_id:'order-linked'}]});
  expect(mockQuery.mock.calls[1][0]).toContain('order_id IS NOT NULL');
  expect(mockQuery.mock.calls[0][0]).toContain('c.store_id=$1');
  expect(mockQuery.mock.calls[0][1]).toEqual(['store','%nguyen an%',false]);
  expect(mockQuery.mock.calls[1][1]).toEqual(['store','%nguyen an%',false,20,20]);
  expect(result.unread_total).toBe(2);
});
test('Customer search uses Store names and historical content without reading another Customer scope',async()=>{
 mockQuery.mockResolvedValueOnce([{total:0}]).mockResolvedValueOnce([]);
 const result=await new MessagingService().list(customer,'CUSTOMER',2,20,'Giày 20%_');
 expect(result).toMatchObject({total:0,page:2,items:[]});
 expect(mockQuery.mock.calls[0][0]).toContain('c.customer_user_id=$1');
 expect(mockQuery.mock.calls[0][0]).toContain('marketplace_search(s.name)');
 expect(mockQuery.mock.calls[0][0]).toContain('search_message.conversation_id=c.id');
 expect(mockQuery.mock.calls[1][1]).toEqual(['buyer','%giay 20\\%\\_%',null,20,20]);
 expect(mockQuery.mock.calls).toHaveLength(2);
});
test('mark read checks Store and message identity, advancing only the confirmed sequence',async()=>{
 mockQuery.mockResolvedValueOnce([{id:'thread'}]).mockResolvedValueOnce([{store_sequence:'7'}]).mockResolvedValueOnce([]).mockResolvedValueOnce([{id:'thread',store_archived_at:null,unread_count:1}]);
 const result=await new MessagingService().markRead('thread','seen',owner);
 expect(result).toEqual({id:'thread',archived:false,unread_count:1});
 expect(mockQuery.mock.calls[0][1]).toEqual(['thread','store']);
 expect(mockQuery.mock.calls[1][1]).toEqual(['seen','thread']);
 expect(mockQuery.mock.calls[2][0]).toContain('greatest(store_read_sequence');
 expect(mockQuery.mock.calls[2][1]).toEqual(['thread','7']);
});
test('foreign Store or unrelated message cannot change read state',async()=>{
 mockQuery.mockResolvedValueOnce([]);await expect(new MessagingService().markRead('foreign','seen',owner)).rejects.toMatchObject({status:404});expect(mockQuery).toHaveBeenCalledTimes(1);
 mockQuery.mockReset();mockQuery.mockResolvedValueOnce([{id:'thread'}]).mockResolvedValueOnce([]);await expect(new MessagingService().markRead('thread','foreign-message',owner)).rejects.toMatchObject({status:404});expect(mockQuery).toHaveBeenCalledTimes(2);
});
test('archive cannot affect another Store and is reversible',async()=>{
 mockQuery.mockResolvedValueOnce([]);await expect(new MessagingService().archive('foreign',true,owner)).rejects.toMatchObject({status:404});expect(mockQuery.mock.calls[0][1]).toEqual(['foreign','store',true]);
 mockQuery.mockReset();mockQuery.mockResolvedValueOnce([{id:'thread'}]).mockResolvedValueOnce([{id:'thread',store_archived_at:null,unread_count:1}]);await expect(new MessagingService().archive('thread',false,owner)).resolves.toEqual({id:'thread',archived:false,unread_count:1});
});
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
