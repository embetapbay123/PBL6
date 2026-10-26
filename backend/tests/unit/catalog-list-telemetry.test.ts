jest.mock('../../shared/src/database',()=>({database:{manager:{}}}));
jest.mock('../../catalog-service/src/catalog/catalog.repository',()=>({CatalogRepository:jest.fn(()=>({page:jest.fn(async()=>({items:[],total:0,page:1,size:20}))}))}));
jest.mock('../../catalog-service/src/catalog/catalog.telemetry',()=>({optionalUserId:jest.fn(),recordInteraction:jest.fn()}));
import { CatalogService } from '../../catalog-service/src/catalog/catalog.service';
import { optionalUserId, recordInteraction } from '../../catalog-service/src/catalog/catalog.telemetry';

beforeEach(()=>jest.clearAllMocks());
test('ordinary listing checks Store visibility without resolving an unused personal identity',async()=>{
  const service=new CatalogService();
  const stores=jest.spyOn(service as any,'stores').mockResolvedValue(['active-store']);
  await service.list({},'Bearer user-token','list-flow');
  expect(stores).toHaveBeenCalledWith('list-flow');
  expect(optionalUserId).not.toHaveBeenCalled();
  expect(recordInteraction).not.toHaveBeenCalled();
});
test.each(['current-user',null])('search keeps live identity and only records a valid current User (%s)',async user=>{
  const service=new CatalogService();jest.spyOn(service as any,'stores').mockResolvedValue(['active-store']);
  (optionalUserId as jest.Mock).mockResolvedValue(user);
  await service.list({q:'camera'},'Bearer user-token','search-flow');
  expect(optionalUserId).toHaveBeenCalledWith('Bearer user-token','search-flow');
  if(user)expect(recordInteraction).toHaveBeenCalledWith('SearchRecorded',{user_id:user,query:'camera'},'search-flow');
  else expect(recordInteraction).not.toHaveBeenCalled();
});
