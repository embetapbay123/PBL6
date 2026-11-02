jest.mock('../../shared/src/database',()=>({database:{manager:{query:(...args:any[])=>mockQuery(...args)}}}));
const mockQuery=jest.fn();
import {StoreRepository} from '../../identity-store-service/src/store/store.repository';
beforeEach(()=>mockQuery.mockReset());
test('public profile only selects active Stores and strips private fields',async()=>{
  mockQuery.mockResolvedValueOnce([{id:'store',name:'Demo Store',description:null,shipping_fee_vnd:'25000',contact:'private-contact',application_id:'private-application'}]);
  await expect(new StoreRepository().getPublicStore('store')).resolves.toEqual({id:'store',name:'Demo Store',shipping_fee_vnd:25000});
  expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("status='ACTIVE'"),['store']);
  mockQuery.mockResolvedValueOnce([]);await expect(new StoreRepository().getPublicStore('missing')).rejects.toMatchObject({status:404});
});
