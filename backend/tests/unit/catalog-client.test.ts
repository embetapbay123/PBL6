jest.mock('../../shared/src/config',()=>({config:()=>({catalogUrl:'http://catalog',internalKeys:{M2:'test-service-key'}})}));
import { CatalogClient } from '../../commerce-service/src/catalog-client';
const original=global.fetch;
afterEach(()=>{global.fetch=original;});
test.each([404,503,302])('Catalog read authenticates, preserves correlation and never follows redirects/retries (%s)',async status=>{
  const mocked=jest.fn().mockResolvedValue(new Response(JSON.stringify({code:status===404?'NOT_FOUND':'DEPENDENCY_UNAVAILABLE',message:'Controlled response'}),{status}));
  global.fetch=mocked;
  await expect(new CatalogClient().product('product-id','same-flow')).rejects.toMatchObject({status:status===404?404:503});
  expect(mocked).toHaveBeenCalledTimes(1);
  expect(mocked.mock.calls[0][1]).toMatchObject({redirect:'error',headers:{'X-Correlation-Id':'same-flow','X-Service-Id':'M2','X-Service-Key':'test-service-key'}});
});
