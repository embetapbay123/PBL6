import {exchangeDispatchWritesEnabled} from '../../catalog-service/src/inventory/inventory.service';
import {internalRequest} from '../../shared/src/http-client';

test.each([
  [undefined,true],['true',true],['false',false],['',false],
  ['1',false],['0',false],['TRUE',false],['invalid',false],
])('exchange writer gate %s enables new effects: %s',(value,expected)=>{
  const previous=process.env.EXCHANGE_DISPATCH_WRITES_ENABLED;
  try{
    if(value===undefined)delete process.env.EXCHANGE_DISPATCH_WRITES_ENABLED;
    else process.env.EXCHANGE_DISPATCH_WRITES_ENABLED=value;
    expect(exchangeDispatchWritesEnabled()).toBe(expected);
  }finally{
    if(previous===undefined)delete process.env.EXCHANGE_DISPATCH_WRITES_ENABLED;
    else process.env.EXCHANGE_DISPATCH_WRITES_ENABLED=previous;
  }
});

test.each([
  [503,'EXCHANGE_DISPATCH_PAUSED','EXCHANGE_DISPATCH_PAUSED'],
  [503,'SOME_PRIVATE_ERROR','DEPENDENCY_UNAVAILABLE'],
  [500,'EXCHANGE_DISPATCH_PAUSED','DEPENDENCY_UNAVAILABLE'],
])('internal HTTP %s/%s preserves only a deliberate writer pause',async(status,code,expected)=>{
  const previous=global.fetch,mock=jest.fn().mockResolvedValue(new Response(JSON.stringify({code,message:'Private dependency detail'}),{status}));
  try{global.fetch=mock;await expect(internalRequest('http://m1/internal/inventory/exchange-dispatch','M2','test-key','same-correlation',{})).rejects.toMatchObject({status:503,response:{code:expected}});expect(mock).toHaveBeenCalledTimes(1);}
  finally{global.fetch=previous;}
});
