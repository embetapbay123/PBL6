jest.mock('../../shared/src/database',()=>({database:{manager:{query:jest.fn()}}}));
jest.mock('../../catalog-service/src/catalog/catalog.repository',()=>({CatalogRepository:jest.fn(()=>({publicProduct:mockPublicProduct}))}));
const mockPublicProduct=jest.fn();
import { database } from '../../shared/src/database';
import { CatalogService } from '../../catalog-service/src/catalog/catalog.service';

const query=database.manager.query as jest.Mock;
beforeEach(()=>{jest.clearAllMocks();});
test('list and removal are scoped to the authenticated user',async()=>{
  query.mockResolvedValueOnce([{total:1}]).mockResolvedValueOnce([{product_id:'p'}]).mockResolvedValueOnce([]);
  const service=new CatalogService();
  await expect(service.listFavorites({page:2,size:10},{user_id:'u'})).resolves.toEqual({items:['p'],total:1,page:2,size:10});
  expect(query.mock.calls[0][1]).toEqual(['u']);
  expect(query.mock.calls[1][1]).toEqual(['u',10,10]);
  await service.removeFavorite('p',{user_id:'u'});
  expect(query.mock.calls[2][1]).toEqual(['u','p']);
});
test('adding a favorite only stores a publicly visible product',async()=>{
  const service=new CatalogService();jest.spyOn(service as any,'stores').mockResolvedValue(['store']);
  mockPublicProduct.mockResolvedValueOnce(undefined).mockResolvedValueOnce({id:'p'});
  await expect(service.addFavorite('p',{user_id:'u'},'trace')).rejects.toMatchObject({status:404});
  expect(query).not.toHaveBeenCalled();
  await expect(service.addFavorite('p',{user_id:'u'},'trace')).resolves.toEqual({product_id:'p'});
  expect(query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT DO NOTHING'),['u','p']);
});
