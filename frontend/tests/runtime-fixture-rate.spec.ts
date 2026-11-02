import {test,expect} from '@playwright/test';
import {privateMarket} from './runtime/private-market';

test.skip(process.env.CORE_FIX_FIXTURE_RATE!=='1','Private fixture transport verification, requires isolated stack label.');

test('fixture provisioning retries a clear429 with unchanged body/token after Retry-After, even if caller mutates its object',async()=>{
 const market=privateMarket('corecheckout'),previous=globalThis.fetch,calls:any[]=[],body={operation_id:'fixture-operation',quantity:1};
 try{
  globalThis.fetch=async(input,init)=>{calls.push({url:String(input),method:init?.method,body:init?.body,authorization:new Headers(init?.headers).get('Authorization'),time:Date.now()});return new Response(JSON.stringify(calls.length===1?{code:'RATE_LIMITED'}:{status:'ACCEPTED'}),{status:calls.length===1?429:200,headers:{'Content-Type':'application/json','Retry-After':'1'}});};
  const pending=market.api('/fixture-only','fixture-rate-token','POST',body);body.quantity=999;
  expect(await pending).toEqual({status:'ACCEPTED'});expect(calls).toHaveLength(2);expect(calls[0].body).toBe(calls[1].body);expect(JSON.parse(calls[1].body)).toEqual({operation_id:'fixture-operation',quantity:1});expect(calls.every(c=>c.authorization==='Bearer fixture-rate-token')).toBe(true);expect(calls[1].time-calls[0].time).toBeGreaterThanOrEqual(1000);expect(market.rateLimits.waits).toBe(1);
 }finally{globalThis.fetch=previous;}
});
for(const status of [401,503])test('fixture provisioning never automatically replays HTTP'+status,async()=>{
 const market=privateMarket('corecheckout'),previous=globalThis.fetch;let calls=0;
 try{globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({code:status===503?'UNKNOWN':'UNAUTHENTICATED'}),{status,headers:{'Retry-After':'1'}});};await expect(market.api('/fixture-only','fixture-rate-token','POST',{operation_id:'fixture-operation'})).rejects.toThrow(String(status));expect(calls).toBe(1);expect(market.rateLimits.waits).toBe(0);}finally{globalThis.fetch=previous;}
});
test('raw fixture HTTP exposes429 without waiting or hiding its status',async()=>{
 const market=privateMarket('corecheckout'),previous=globalThis.fetch;let calls=0;
 try{globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({code:'RATE_LIMITED'}),{status:429,headers:{'Retry-After':'1'}});};expect((await market.raw('/fixture-only')).status).toBe(429);expect(calls).toBe(1);expect(market.rateLimits.waits).toBe(0);}finally{globalThis.fetch=previous;}
});
test('fixture provisioning refuses an hour-long email-action wait',async()=>{
 const market=privateMarket('corecheckout'),previous=globalThis.fetch;let calls=0;
 try{globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({code:'RATE_LIMITED'}),{status:429,headers:{'Retry-After':'3600'}});};await expect(market.api('/fixture-only')).rejects.toThrow('429');expect(calls).toBe(1);expect(market.rateLimits.waits).toBe(0);}finally{globalThis.fetch=previous;}
});
test('fixture provisioning bounds minute-budget retries and still exposes persistent429',async()=>{
 const market=privateMarket('corecheckout'),previous=globalThis.fetch;let calls=0;
 try{globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({code:'RATE_LIMITED'}),{status:429,headers:{'Retry-After':'1'}});};await expect(market.api('/fixture-only')).rejects.toThrow('429');expect(calls).toBe(3);expect(market.rateLimits.waits).toBe(2);}finally{globalThis.fetch=previous;}
});
