jest.mock('../../shared/src/database',()=>({database:{transaction:(fn:any)=>fn({})}}));
jest.mock('../../shared/src/audit',()=>({audit:jest.fn()}));
jest.mock('../../catalog-service/src/catalog/catalog.repository',()=>({CatalogRepository:jest.fn(()=>mockRepository)}));
const mockRepository={lockProductForVariants:jest.fn(),lockImage:jest.fn(),stopImage:jest.fn()};
import { CatalogService } from '../../catalog-service/src/catalog/catalog.service';
import { audit } from '../../shared/src/audit';

beforeEach(()=>jest.clearAllMocks());
test('removing an image verifies Store and Product ownership and records the change once',async()=>{
  const service=new CatalogService();
  jest.spyOn(service as any,'storeForWrite').mockResolvedValue({storeId:'store',actorUserId:'user'});
  mockRepository.lockProductForVariants.mockResolvedValue({id:'product'});
  mockRepository.lockImage.mockResolvedValueOnce({id:'image',status:'ACTIVE'}).mockResolvedValueOnce({id:'image',status:'STOPPED'});
  await expect(service.removeProductImage('product','image',{},'trace')).resolves.toEqual({id:'image',product_id:'product'});
  await service.removeProductImage('product','image',{},'trace');
  expect(mockRepository.lockProductForVariants).toHaveBeenCalledWith('product','store');
  expect(mockRepository.lockImage).toHaveBeenCalledWith('image','product');
  expect(mockRepository.stopImage).toHaveBeenCalledTimes(1);
  expect(audit).toHaveBeenCalledTimes(1);
});
test('removing a foreign product or image fails without modifying it',async()=>{
  const service=new CatalogService();jest.spyOn(service as any,'storeForWrite').mockResolvedValue({storeId:'store',actorUserId:'user'});
  mockRepository.lockProductForVariants.mockResolvedValueOnce(undefined).mockResolvedValueOnce({id:'product'});
  mockRepository.lockImage.mockResolvedValue(undefined);
  await expect(service.removeProductImage('foreign','image',{},'trace')).rejects.toMatchObject({status:404});
  await expect(service.removeProductImage('product','foreign-image',{},'trace')).rejects.toMatchObject({status:404});
  expect(mockRepository.stopImage).not.toHaveBeenCalled();
});
