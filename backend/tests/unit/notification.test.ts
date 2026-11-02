jest.mock('../../shared/src/database',()=>({database:{manager:{query:(...args:any[])=>mockQuery(...args)}}}));
const mockQuery=jest.fn();
import { NotificationService } from '../../commerce-service/src/notification/notification.service';
const event='63000000-0000-4000-8000-000000000001';
beforeEach(()=>mockQuery.mockReset());
test('notification reads bind the authenticated owner and preserve event status',async()=>{
  mockQuery.mockResolvedValueOnce([{total:1,unread:1}]).mockResolvedValueOnce([{kind:'PAYMENT_EVENT',event_id:event,order_id:'order',status:'SUCCESS',occurred_at:new Date('2026-10-28T00:00:00Z'),read:false}]);
  const result=await new NotificationService().list('buyer',2,10);
  expect(mockQuery.mock.calls[0][1]).toEqual(['buyer']);expect(mockQuery.mock.calls[1][1]).toEqual(['buyer',10,10]);
  expect(result.items[0]).toMatchObject({id:'PAYMENT_EVENT:'+event,event_status:'SUCCESS',read:false});
});
test('marking read verifies ownership before writing and is idempotent',async()=>{
  mockQuery.mockResolvedValueOnce([]);
  await expect(new NotificationService().markRead('ORDER_STATUS:'+event,'other')).rejects.toMatchObject({status:404});
  expect(mockQuery).toHaveBeenCalledTimes(1);
  mockQuery.mockResolvedValueOnce([{id:event}]).mockResolvedValueOnce([]);
  await new NotificationService().markRead('ORDER_STATUS:'+event,'buyer');
  expect(mockQuery.mock.calls[2]).toEqual([expect.stringContaining('ON CONFLICT DO NOTHING'),['buyer','ORDER_STATUS',event]]);
});
test('malformed ids fail before querying the database',async()=>{
  await expect(new NotificationService().markRead('unknown','buyer')).rejects.toMatchObject({status:422});expect(mockQuery).not.toHaveBeenCalled();
});

test('bulk read binds the owner in all three event sources and duplicate receipts do nothing',async()=>{
 mockQuery.mockResolvedValueOnce([{event_id:event}]).mockResolvedValueOnce([]);
 expect(await new NotificationService().markAllRead('buyer')).toEqual({updated:1});expect(await new NotificationService().markAllRead('buyer')).toEqual({updated:0});
 for(const [sql,args] of mockQuery.mock.calls){expect(sql.match(/o.customer_user_id=\$1/g)).toHaveLength(3);expect(sql).toContain('ON CONFLICT DO NOTHING');expect(args).toEqual(['buyer']);}
});
