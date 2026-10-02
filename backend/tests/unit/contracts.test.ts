import { validateOperation, operationContracts } from '../../shared/src/request-contract';
import { schemaErrors } from '../../shared/src/contract-validation';
import { validateBusinessEvent } from '../../shared/src/event-contracts';
import { internalRequest } from '../../shared/src/http-client';
import { moneyNumber } from '../../shared/src/money';
import { ListProductsQueryDto } from '../../shared/src/dtos.generated';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

// Included in the backend image and available without reading files outside the checkout.
const fixtures=require('../../shared/src/fixtures.generated.json');
const events=require('../../shared/src/event-fixtures.generated.json');
test('every operation has executable DTO validation and valid request/response fixtures',()=>{
  expect(Object.keys(operationContracts)).toHaveLength(110);
  expect(Object.values(operationContracts).filter(r=>!r.internal)).toHaveLength(99);
  for(const [id,f] of Object.entries(fixtures) as [any,any][]) {
    expect(()=>validateOperation(id,f.request)).not.toThrow();
    const spec=(operationContracts as any)[id].responses[String(f.status)];
    expect(schemaErrors(f.response,spec)).toEqual([]);
  }
});
test('strict body, nested arrays, maps, UUID, nullability and query defaults',()=>{
  const valid=JSON.parse(JSON.stringify(fixtures.addCartItem.request));
  expect(()=>validateOperation('addCartItem',valid)).not.toThrow();
  for(const quantity of [0,'1',null,9007199254740992]) {
    expect(()=>validateOperation('addCartItem',{...valid,body:{...valid.body,quantity}})).toThrow();
  }
  expect(()=>validateOperation('addCartItem',{...valid,body:{...valid.body,extra:true}})).toThrow();
  expect(()=>validateOperation('getProduct',{path:{id:'bad'},query:{},headers:{}})).toThrow();
  expect(validateOperation('listProducts',{query:{page:'2' as any},path:{},headers:{}}).query).toEqual({page:2,size:20});
  expect(()=>validateOperation('listProducts',{query:{size:101},path:{},headers:{}})).toThrow();
  expect(()=>validateOperation('listProducts',{query:{q:null} as any,path:{},headers:{}})).toThrow();
  expect(()=>validateOperation('addCartItem',{...valid,body:JSON.parse(JSON.stringify(valid.body).slice(0,-1)+',"__proto__":{"polluted":true}}')})).toThrow();
  const checkout=JSON.parse(JSON.stringify(fixtures.confirmCheckout.request));
  checkout.body.payment_methods={bad:'COD'};
  expect(()=>validateOperation('confirmCheckout',checkout)).toThrow();
  const reserve=JSON.parse(JSON.stringify(fixtures.ReserveInventory.request));
  reserve.body.items[0].quantity='1';
  expect(()=>validateOperation('ReserveInventory',reserve)).toThrow();
});
test('generated query DTOs work with Nest transformation and keep defaults',()=>{
  const query=plainToInstance(ListProductsQueryDto,{page:'2'});
  expect(validateSync(query)).toEqual([]);expect(query.page).toBe(2);expect(query.size).toBe(20);
});
test('business event envelope and producer pairing are validated',()=>{
  for(const event of Object.values(events))expect(()=>validateBusinessEvent(event)).not.toThrow();
  expect(()=>validateBusinessEvent({...events.InteractionRecorded,producer:'M2'})).toThrow();
  expect(()=>validateBusinessEvent({...events.OrderCompleted,schema_version:'2.0'})).toThrow();
});
test('BIGINT mapper rejects unsafe money and fractional strings',()=>{
  expect(moneyNumber('120000')).toBe(120000);
  expect(()=>moneyNumber('9007199254740992')).toThrow();
  expect(()=>moneyNumber('1.5')).toThrow();
});
describe('internal HTTP failure behavior',()=>{
  const original=global.fetch;
  afterEach(()=>{global.fetch=original;});
  test.each([404,409,422,501])('preserves business status %i and correlation',async(status)=>{
    const mock=jest.fn().mockResolvedValue(new Response(JSON.stringify({code:'BUSINESS_ERROR',message:'reason',details:[]}),{status}));global.fetch=mock;
    await expect(internalRequest('http://m1/internal/variants/quote','M2','key','correlation',{})).rejects.toMatchObject({response:{code:'BUSINESS_ERROR'},status});
    expect(mock.mock.calls[0][1].headers['X-Correlation-Id']).toBe('correlation');expect(mock).toHaveBeenCalledTimes(1);
  });
  test('timeout/transport failures become 503 without retry',async()=>{
    const mock=jest.fn().mockRejectedValue(new DOMException('timeout','TimeoutError'));global.fetch=mock;
    await expect(internalRequest('http://m1/internal/variants/quote','M2','key','c',{})).rejects.toMatchObject({status:503});expect(mock).toHaveBeenCalledTimes(1);
  });
  test('service credentials failure becomes operational error',async()=>{
    global.fetch=jest.fn().mockResolvedValue(new Response(JSON.stringify({code:'INVALID_SERVICE_IDENTITY'}),{status:401}));
    await expect(internalRequest('http://m1/internal/variants/quote','M2','key','c',{})).rejects.toMatchObject({status:503,response:{code:'SERVICE_AUTH_FAILED'}});
  });
});
