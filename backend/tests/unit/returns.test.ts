jest.mock('../../shared/src/database',()=>({database:{manager:{query:(...args:any[])=>mockQuery(...args)},transaction:(fn:any)=>fn({query:(...args:any[])=>mockQuery(...args)})}}));
jest.mock('../../shared/src/audit',()=>({audit:jest.fn()}));
const mockQuery=jest.fn();
import { ReturnsService } from '../../commerce-service/src/returns/returns.service';
import { audit } from '../../shared/src/audit';
const buyer={user_id:'buyer'},owner={user_id:'owner',store_membership:{store_id:'store',role:'OWNER',status:'ACTIVE',permissions:[]}};
const request=(over:Record<string,unknown>={})=>({id:'request',order_id:'order',customer_user_id:'buyer',store_id:'store',inventory_status:'APPLIED',fault_party:'STORE',fee_payer:'STORE',type:'EXCHANGE',reason:'Sai kích thước',status:'RECEIVED',version:3,payment_method:'COD',payable_vnd:'100000',created_at:new Date('2026-10-28T00:00:00Z'),updated_at:new Date('2026-10-28T00:00:00Z'),...over});
function locked(before:any){mockQuery.mockResolvedValueOnce([{order_id:'order'}]).mockResolvedValueOnce([{id:'order'}]).mockResolvedValueOnce([{id:'request'}]).mockResolvedValueOnce([before]);}
beforeEach(()=>{mockQuery.mockReset();(audit as jest.Mock).mockClear();});
test('Store return status is applied to count and page inside the current Store',async()=>{
  mockQuery.mockResolvedValueOnce([{total:1}]).mockResolvedValueOnce([request({status:'REQUESTED'})]);
  const result=await new ReturnsService().list(owner,'STORE',{page:2,size:10,status:'REQUESTED'});
  expect(result).toMatchObject({total:1,page:2,items:[{status:'REQUESTED'}]});
  expect(mockQuery.mock.calls[0][1]).toEqual([null,'store',null,'REQUESTED']);
  expect(mockQuery.mock.calls[1][1]).toEqual([null,'store',null,'REQUESTED',10,10]);
});
test('Store and Admin permissions are enforced before querying',async()=>{
  const service=new ReturnsService();
  await expect(service.list({user_id:'staff',store_membership:{store_id:'store',role:'SELLER',status:'ACTIVE',permissions:[]}},'STORE',{})).rejects.toMatchObject({status:403});
  await expect(service.list({user_id:'admin',roles:['ADMIN'],role_permissions:[]},'ADMIN',{})).rejects.toMatchObject({status:403});expect(mockQuery).not.toHaveBeenCalled();
});
test('return creation is scoped to an owned completed Order and retries reuse the request',async()=>{
  mockQuery.mockResolvedValueOnce([{id:'order',customer_user_id:'buyer',store_id:'store',status:'COMPLETED',version:7}]).mockResolvedValueOnce([request()]);
  await expect(new ReturnsService().create('order',{type:'EXCHANGE',reason:'Sai kích thước',expected_order_version:7},buyer,'trace')).resolves.toMatchObject({id:'request'});
  expect(mockQuery.mock.calls.some(([sql])=>sql.startsWith('INSERT'))).toBe(false);
  mockQuery.mockReset();mockQuery.mockResolvedValueOnce([{id:'order',customer_user_id:'other',store_id:'store',status:'COMPLETED',version:7}]);
  await expect(new ReturnsService().create('order',{type:'EXCHANGE',reason:'Sai kích thước',expected_order_version:7},buyer,'trace')).rejects.toMatchObject({status:404});
});
test('stale or foreign requests cannot be changed',async()=>{
  locked(request({store_id:'foreign'}));
  await expect(new ReturnsService().transition('request',{status:'EXCHANGE_SENT',expected_version:3,replacement_reference:'SHIP-1'},owner,'STORE','trace')).rejects.toMatchObject({status:404});
  mockQuery.mockReset();locked(request());
  await expect(new ReturnsService().transition('request',{status:'EXCHANGE_SENT',expected_version:2,replacement_reference:'SHIP-1'},owner,'STORE','trace')).rejects.toMatchObject({status:409,response:{code:'VERSION_CONFLICT'}});
  expect(mockQuery.mock.calls.some(([sql])=>sql.startsWith('UPDATE'))).toBe(false);
});
// Historical status-only success is archived; dispatch is now a durable stock command.
test('a reference alone cannot announce an exchange without a persisted operation and checked stock',async()=>{
  locked(request());
  await expect(new ReturnsService().transition('request',{status:'EXCHANGE_SENT',expected_version:3},owner,'STORE','trace')).rejects.toMatchObject({status:422});
  mockQuery.mockReset();locked(request());
  await expect(new ReturnsService().transition('request',{status:'EXCHANGE_SENT',expected_version:3,replacement_reference:'SHIP-1'},owner,'STORE','trace')).rejects.toMatchObject({status:422,response:{code:'REPLACEMENT_REFERENCE_REQUIRED'}});
  expect(mockQuery.mock.calls.some(([sql])=>sql.startsWith('UPDATE'))).toBe(false);
});

test('only the Customer can confirm an exchange that has been sent',async()=>{
  locked(request({status:'EXCHANGE_SENT'}));
  await expect(new ReturnsService().transition('request',{status:'COMPLETED',expected_version:3},owner,'STORE','trace')).rejects.toMatchObject({status:409});
  mockQuery.mockReset();locked(request({status:'EXCHANGE_SENT'}));mockQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([request({status:'COMPLETED',version:4})]);
  await expect(new ReturnsService().transition('request',{status:'COMPLETED',expected_version:3},buyer,'CUSTOMER','trace')).resolves.toMatchObject({status:'COMPLETED',version:4});
});
test('a refund request cannot complete without confirmed full financial evidence',async()=>{
  locked(request({type:'REFUND',refund_status:'REQUESTED',refunded_vnd:'0'}));
  await expect(new ReturnsService().transition('request',{status:'COMPLETED',expected_version:3},owner,'STORE','trace')).rejects.toMatchObject({status:409,response:{code:'REFUND_NOT_CONFIRMED'}});
  expect(mockQuery.mock.calls.some(([sql])=>sql.startsWith('UPDATE'))).toBe(false);
});

test('partial refunds cannot complete, a proven full refund can',async()=>{
  locked(request({type:'REFUND',refund_status:'SUCCEEDED',refunded_vnd:'50000'}));
  await expect(new ReturnsService().transition('request',{status:'COMPLETED',expected_version:3},owner,'STORE','trace')).rejects.toMatchObject({status:409,response:{code:'REFUND_NOT_CONFIRMED'}});
  mockQuery.mockReset();locked(request({type:'REFUND',refund_status:'SUCCEEDED',refunded_vnd:'100000'}));
  mockQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([request({type:'REFUND',status:'COMPLETED',version:4,refund_status:'SUCCEEDED',refunded_vnd:'100000'})]);
  await expect(new ReturnsService().transition('request',{status:'COMPLETED',expected_version:3},owner,'STORE','trace')).resolves.toMatchObject({status:'COMPLETED',version:4});
});

test('new requests check current order version and completed state before inserting',async()=>{
  for(const order of [{status:'COMPLETED',version:8},{status:'SHIPPED',version:7}]){
    mockQuery.mockResolvedValueOnce([{id:'order',customer_user_id:'buyer',...order}]).mockResolvedValueOnce([]);
    await expect(new ReturnsService().create('order',{type:'EXCHANGE',reason:'Sai kích thước',expected_order_version:7},buyer,'trace')).rejects.toMatchObject({status:409});
  }
  expect(mockQuery.mock.calls.some(([sql])=>sql.startsWith('INSERT'))).toBe(false);
});

test('a legacy RECEIVED label alone cannot close even when a full refund row exists',async()=>{
  locked(request({type:'REFUND',refund_status:'SUCCEEDED',refunded_vnd:'100000',inventory_status:'NOT_STARTED'}));
  await expect(new ReturnsService().transition('request',{status:'COMPLETED',expected_version:3},owner,'STORE','trace')).rejects.toMatchObject({status:409,response:{code:'REFUND_NOT_CONFIRMED'}});
  expect(mockQuery.mock.calls.some(([sql])=>sql.startsWith('UPDATE'))).toBe(false);
});
