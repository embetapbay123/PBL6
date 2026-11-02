import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {auditPreview,ownerStore,StoreAuditService} from '../../shared/src/store-audit';
import {AuditActorsService} from '../../identity-store-service/src/administration/audit-actors.controller';
import {auditExecutor,SYSTEM_AUDIT_ACTOR} from '../../shared/src/audit-actor';
const user=randomUUID(),store=randomUUID();
const owner={user_id:user,roles:['STORE_OWNER'],store_membership:{store_id:store,role:'OWNER',status:'ACTIVE'}};
test('Store preview retains actionable changes while dropping private fields recursively',()=>{
 const value=auditPreview({title:'Liên hệ private@example.test 0912345678',password_hash:'private',recipient_name:'private',address:{line1:'private'},variants:[{sku:'009264',price_vnd:100500,variant_values:{size:'M',color:'Đỏ',email:'private'}}],attributes:{material:'Cotton',phone:'private'},unknown:'private'});
 expect(value).toEqual({title:'Liên hệ [ẩn email] [ẩn số điện thoại]',variants:[{sku:'009264',price_vnd:100500,variant_values:{size:'M',color:'Đỏ'}}],attributes:{material:'Cotton'}});
 expect(auditPreview(null)).toEqual({});expect(auditPreview([])).toEqual({});
});
test('only active current Store Owner can read the log',()=>{
 expect(ownerStore(owner)).toBe(store);
 for(const auth of [undefined,{...owner,roles:['SELLER']},{...owner,store_membership:{...owner.store_membership,role:'SELLER'}},{...owner,store_membership:{...owner.store_membership,status:'REVOKED'}},{...owner,store_membership:{...owner.store_membership,store_id:'invalid'}}])expect(()=>ownerStore(auth)).toThrow();
});
test('list scopes count and rows before filters and pagination, and never mislabels unknown accounts as System',async()=>{
 const query=jest.fn().mockResolvedValueOnce([{total:1}]).mockResolvedValueOnce([{id:randomUUID(),actor_user_id:user,target_type:'Product',target_id:randomUUID(),target_label:'Áo đỏ',action:'UPDATE',request_id:'trace',created_at:'2026-10-30T00:00:00Z',before_json:{price_vnd:100000,email:'private'},after_json:{price_vnd:100500,token:'private'}}]);
 const result=await new StoreAuditService('M1',{manager:{query}} as any).list({page:2,size:5,action:'UPDATE',from:'2026-10-30T00:00:00+07:00',to:'2026-10-31T00:00:00+07:00'},owner);
 expect(query.mock.calls[0][0]).toContain('a.store_id=$1');expect(query.mock.calls[1][1]).toEqual([store,'UPDATE','2026-10-30T00:00:00+07:00','2026-10-31T00:00:00+07:00',5,5]);
 expect(query.mock.calls[0][0]).toContain('a.created_at>=$3 AND a.created_at<$4');
 expect(result.items[0]).toMatchObject({actor_kind:'ACCOUNT',actor_user_id:user,before:{price_vnd:100000},after:{price_vnd:100500},store_id:store});
});
test('invalid periods and revoked access are rejected before database access',async()=>{
 const query=jest.fn(),service=new StoreAuditService('M2',{manager:{query}} as any);
 await expect(service.list({from:'bad'},owner)).rejects.toMatchObject({status:422});
 await expect(service.list({from:'2026-10-31',to:'2026-10-30'},owner)).rejects.toMatchObject({status:422});
 await expect(service.list({},undefined)).rejects.toMatchObject({status:403});expect(query).not.toHaveBeenCalled();
});
test('actor lookup is bounded and requires Store membership history; Admin lookup requires platform permission',async()=>{
 const query=jest.fn().mockResolvedValue([{id:user,email:'private@example.test',display_name:null}]),service=new AuditActorsService({query} as any);
 expect(await service.lookup([user,user],owner)).toEqual({users:[{id:user,label:'Tài khoản '+user.slice(0,8)}]});expect(query.mock.calls[0][0]).toContain('m.store_id=$2');expect(query.mock.calls[0][1]).toEqual([[user],store]);
 await expect(service.lookup(['not-a-uuid'],owner)).rejects.toMatchObject({status:422});
 await expect(service.lookup(Array.from({length:101},()=>randomUUID()),owner)).rejects.toMatchObject({status:422});
 await expect(service.lookup([user],{user_id:user,roles:['ADMIN']},true)).rejects.toMatchObject({status:403});
 expect(await service.lookup([user],{user_id:user,roles:['ADMIN'],role_permissions:['platform.admin']},true)).toEqual({users:[{id:user,label:'private@example.test',email:'private@example.test'}]});expect(query.mock.calls[1][0]).not.toContain('m.store_id=$2');
});
test('only known automated commerce actions change executor; human commands and unknown history keep their recorded actor',()=>{
 for(const [kind,action] of [['Order','INVENTORY_CONSUMED'],['Order','INVENTORY_RESTOCKED'],['Payment','CALLBACK'],['Refund','REQUEST'],['Refund','PROVIDER_RESULT']])expect(auditExecutor('M2',kind,action,user,{state:action==='INVENTORY_CONSUMED'?'CONSUMED':'RESTOCKED'})).toBe(SYSTEM_AUDIT_ACTOR);
 for(const [source,kind,action] of [['M2','Order','TRANSITION_ORDER'],['M2','Payment','COD_COLLECT'],['M2','Refund','COD_REFUND_MANUALLY_CONFIRMED'],['M3','StaffInvitation','STAFF_INVITATION_CREATED'],['M1','Inventory','ADJUST'],['M2','Order','UNKNOWN_OLD_ACTION']])expect(auditExecutor(source,kind,action,user)).toBe(user);
});
test('user-supplied cancellation reasons cannot forge an automated executor',()=>{
 for(const action of ['INVENTORY_CONSUMED','INVENTORY_RELEASED','INVENTORY_RESTOCKED'])expect(auditExecutor('M2','Order',action,user,{status:'CANCELLED',version:2})).toBe(user);
 expect(auditExecutor('M2','Order','INVENTORY_CONSUMED',user,{status:'PENDING'})).toBe(SYSTEM_AUDIT_ACTOR);
 expect(auditExecutor('M2','Order','INVENTORY_CONSUMED',user)).toBe(user);
});
test('an absent historical executor is UNKNOWN rather than an invented System actor',async()=>{
 const query=jest.fn().mockResolvedValueOnce([{total:1}]).mockResolvedValueOnce([{id:randomUUID(),actor_user_id:null,target_type:'Product',target_id:randomUUID(),target_label:'Legacy',action:'UNKNOWN',request_id:'legacy',created_at:'2026-10-30T00:00:00Z',before_json:{},after_json:{}}]);
 const row=(await new StoreAuditService('M1',{manager:{query}} as any).list({},owner)).items[0];expect(row.actor_kind).toBe('UNKNOWN');expect(row).not.toHaveProperty('actor_user_id');
});
