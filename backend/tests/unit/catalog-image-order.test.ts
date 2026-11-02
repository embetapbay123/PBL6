jest.mock('../../shared/src/database',()=>({database:{transaction:(fn:any)=>fn({})}}));
jest.mock('../../shared/src/audit',()=>({audit:jest.fn()}));
jest.mock('../../catalog-service/src/catalog/catalog.repository',()=>({CatalogRepository:jest.fn(()=>mockRepository)}));
const mockRepository={lockProductForVariants:jest.fn(),activeImageIds:jest.fn(),setImagePosition:jest.fn()};
import { CatalogService } from '../../catalog-service/src/catalog/catalog.service';
import { audit } from '../../shared/src/audit';

beforeEach(()=>jest.clearAllMocks());
function setup(){const service=new CatalogService();jest.spyOn(service as any,'storeForWrite').mockResolvedValue({storeId:'store',actorUserId:'user'});mockRepository.lockProductForVariants.mockResolvedValue({id:'product'});mockRepository.activeImageIds.mockResolvedValue(['a','b']);return service;}
test('reorders the complete current image set and records one audit',async()=>{
  const service=setup();
  await expect(service.reorderProductImages('product',{expected_image_ids:['a','b'],image_ids:['b','a']},{},'trace')).resolves.toEqual({product_id:'product',image_ids:['b','a']});
  expect(mockRepository.lockProductForVariants).toHaveBeenCalledWith('product','store');
  expect(mockRepository.setImagePosition.mock.calls).toEqual([['b','product',0],['a','product',1]]);
  expect(audit).toHaveBeenCalledTimes(1);
});
test('rejects stale order or missing images without writing',async()=>{
  const service=setup();
  await expect(service.reorderProductImages('product',{expected_image_ids:['b','a'],image_ids:['a','b']},{},'trace')).rejects.toMatchObject({status:409});
  await expect(service.reorderProductImages('product',{expected_image_ids:['a','b'],image_ids:['a','c']},{},'trace')).rejects.toMatchObject({status:422});
  expect(mockRepository.setImagePosition).not.toHaveBeenCalled();expect(audit).not.toHaveBeenCalled();
});
test('rejects a foreign product and does not rewrite an unchanged order',async()=>{
  const service=setup();mockRepository.lockProductForVariants.mockResolvedValueOnce(undefined);
  await expect(service.reorderProductImages('foreign',{expected_image_ids:[],image_ids:[]},{},'trace')).rejects.toMatchObject({status:404});
  await service.reorderProductImages('product',{expected_image_ids:['a','b'],image_ids:['a','b']},{},'trace');
  expect(mockRepository.setImagePosition).not.toHaveBeenCalled();expect(audit).not.toHaveBeenCalled();
});
test('adding an image rejects a product already at the contract limit',async()=>{
  const service=setup();mockRepository.activeImageIds.mockResolvedValue(Array.from({length:20},(_,i)=>String(i)));
  await expect(service.addProductImage('product',{image_url:'https://example.test/a.jpg'},{},'trace')).rejects.toMatchObject({status:422,response:{code:'IMAGE_LIMIT_REACHED'}});
  expect(audit).not.toHaveBeenCalled();
});
