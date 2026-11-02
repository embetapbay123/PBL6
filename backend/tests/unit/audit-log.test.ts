jest.mock('../../shared/src/database',()=>({database:{manager:{query:(...args:any[])=>mockQuery(...args)}}}));
const mockQuery=jest.fn();
import {AuditLogService} from '../../shared/src/audit-log';
const admin={user_id:'admin',roles:['ADMIN'],role_permissions:['platform.admin']};
beforeEach(()=>mockQuery.mockReset());
test('audit reads require an actual Admin permission before any query',async()=>{
  await expect(new AuditLogService('M1').list({},undefined)).rejects.toMatchObject({status:401});
  await expect(new AuditLogService('M1').list({},{...admin,role_permissions:[]})).rejects.toMatchObject({status:403});
  await expect(new AuditLogService('M1').list({},{...admin,roles:['CUSTOMER']})).rejects.toMatchObject({status:403});expect(mockQuery).not.toHaveBeenCalled();
});
test('audit filtering is parameterized, paginated and omits private snapshots',async()=>{
  mockQuery.mockResolvedValueOnce([{total:1}]).mockResolvedValueOnce([{id:'event',actor_user_id:null,target_type:'User',target_id:'target',action:'UPDATE',request_id:'trace',created_at:new Date('2026-10-28T00:00:00Z'),before_json:{email:'private'},after_json:{token:'private'}}]);
  const result=await new AuditLogService('M3').list({page:2,size:5,action:'UPDATE',target_type:'User'},admin);
  expect(mockQuery.mock.calls[1]).toEqual([expect.stringContaining('FROM m3_audit'),['UPDATE','User',5,5]]);
  expect(result.items[0]).toEqual({id:'event',service:'M3',actor_kind:'UNKNOWN',target_type:'User',target_id:'target',action:'UPDATE',request_id:'trace',created_at:'2026-10-28T00:00:00.000Z'});
  expect(mockQuery.mock.calls[1][0]).not.toContain('before_json');
});
