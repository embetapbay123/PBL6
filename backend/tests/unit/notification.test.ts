jest.mock('../../shared/src/database',()=>({database:{manager:{query:(...args:any[])=>mockQuery(...args)}}}));
const mockQuery=jest.fn();
import { NotificationService } from '../../commerce-service/src/notification/notification.service';
const event='63000000-0000-4000-8000-000000000001';
const orderId='11111111-1111-4111-8111-111111111111';
beforeEach(()=>mockQuery.mockReset());

test('notification reads return grouped items with update_count and unread_count',async()=>{
  mockQuery.mockResolvedValueOnce([{total:1,unread:2}]).mockResolvedValueOnce([{
    kind:'ORDER_STATUS',event_id:event,order_id:orderId,status:'CANCELLED',
    occurred_at:new Date('2026-10-28T00:00:00Z'),read:false,update_count:3,unread_count:2
  }]);
  const result=await new NotificationService().list('buyer',1,20);
  expect(mockQuery.mock.calls[0][1]).toEqual(['buyer']);
  expect(mockQuery.mock.calls[1][1]).toEqual(['buyer',20,0]);
  expect(result.items[0]).toMatchObject({
    id:'ORDER_STATUS:'+event,kind:'ORDER_STATUS',order_id:orderId,
    event_status:'CANCELLED',read:false,update_count:3,unread_count:2
  });
  expect(result.total).toBe(1);
  expect(result.unread).toBe(2);
});

test('group history verifies ownership and returns paginated events of that group',async()=>{
  mockQuery.mockResolvedValueOnce([]); // not owner
  await expect(new NotificationService().listGroupHistory('other','ORDER_STATUS',orderId,1,10)).rejects.toMatchObject({status:404});

  mockQuery.mockResolvedValueOnce([{id:orderId}]) // owner check
    .mockResolvedValueOnce([{total:3,unread:1}]) // counts
    .mockResolvedValueOnce([{kind:'ORDER_STATUS',event_id:event,order_id:orderId,status:'PENDING',occurred_at:new Date('2026-10-28T00:00:00Z'),read:true}]);
  const history=await new NotificationService().listGroupHistory('buyer','ORDER_STATUS',orderId,1,10);
  expect(history.items).toHaveLength(1);
  expect(history.items[0]).toMatchObject({id:'ORDER_STATUS:'+event,event_status:'PENDING',read:true});
  expect(history.total).toBe(3);
});

test('markGroupRead verifies ownership and bounds mark-read to up_to timestamp',async()=>{
  mockQuery.mockResolvedValueOnce([]); // not owner
  await expect(new NotificationService().markGroupRead('other','ORDER_STATUS',orderId)).rejects.toMatchObject({status:404});

  const upTo='2026-10-28T12:00:00.123456Z';
  mockQuery.mockResolvedValueOnce([{id:orderId}]) // owner check
    .mockResolvedValueOnce([{event_id:event}]); // update result
  const res=await new NotificationService().markGroupRead('buyer','ORDER_STATUS',orderId,upTo);
  expect(res).toEqual({updated:1});
  const updateCall=mockQuery.mock.calls[2];
  expect(updateCall[0]).toContain('occurred_at <= $4');
  expect(updateCall[1]).toEqual(['buyer','ORDER_STATUS',orderId,upTo]);
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
