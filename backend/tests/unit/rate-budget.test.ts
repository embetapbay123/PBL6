import { rateBudget } from '../../shared/src/rate-budget';
const keys = { M2: 'test-m2', M4: 'test-m4' };
const budget = (headers:Record<string,unknown>={}, method='GET', path='/api/v1/products') => rateBudget('M1',method,path,'127.0.0.1',headers,keys);
test('ordinary public and login limits remain unchanged', () => {
  expect(budget()).toEqual({scope:'api:127.0.0.1',limit:600});
  expect(budget({},'POST','/api/v1/auth/login')).toEqual({scope:'login:127.0.0.1',limit:30});
});
test.each(['M2','M4'])('authenticated %s Catalog reads use their own bounded shared budget', caller => {
  expect(budget({'x-service-id':caller,'x-service-key':keys[caller as keyof typeof keys]})).toEqual({scope:'catalog-service:'+caller,limit:6000});
});
test.each([{'x-service-id':'M2'}, {'x-service-key':'test-m2'}, {'x-service-id':'M2','x-service-key':'forged'}, {'x-service-id':'M1','x-service-key':'test-m2'}, {'x-service-id':['M2'],'x-service-key':'test-m2'}])('forged or incomplete identity never obtains a service budget', headers => {
  expect(()=>budget(headers)).toThrow(expect.objectContaining({status:401}));
});
test('service identity cannot raise mutation or other API budgets', () => {
  const headers={'x-service-id':'M2','x-service-key':'test-m2'};
  expect(budget(headers,'POST')).toEqual({scope:'api:127.0.0.1',limit:600});
  expect(budget(headers,'GET','/api/v1/store/products')).toEqual({scope:'api:127.0.0.1',limit:600});
  expect(rateBudget('M3','GET','/api/v1/products','127.0.0.1',headers,keys).limit).toBe(600);
});
