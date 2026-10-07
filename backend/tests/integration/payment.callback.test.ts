import 'reflect-metadata';
import { randomUUID, createHmac } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PaymentCallbackService } from '../../commerce-service/src/payment/payment.callback.service';
import { PaymentFollowupPort } from '../../commerce-service/src/payment/payment.followup.port';
import { SePayController } from '../../commerce-service/src/payment/sepay.controller';
import { ErrorFilter } from '../../shared/src/errors';
import { schemaErrors } from '../../shared/src/contract-validation';
import bundle from '../../shared/src/contracts.runtime.generated.json';

const schema='callback_test_'+randomUUID().replace(/-/g,'');
const root=new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL});
const source=new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public'}});
const account='0000000000',secret='isolated-callback-test-secret';
const keys=['PAYMENT_PROVIDER_MODE','SEPAY_TEST_ACCOUNT','SEPAY_WEBHOOK_SECRET','SANDBOX_WEBHOOK_SECRET'] as const;
const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
let service:PaymentCallbackService,app:any,base:string;
beforeAll(async()=>{
  await root.initialize();await root.query('CREATE SCHEMA '+schema);await source.initialize();
  const folder=resolve(process.cwd(),'commerce-service/migrations');
  await source.transaction(async m=>{for(const file of readdirSync(folder).filter(x=>x.endsWith('.sql')).sort())await m.query(readFileSync(resolve(folder,file),'utf8'));});
  service=new PaymentCallbackService(source);
  process.env.PAYMENT_PROVIDER_MODE='sepay_test';process.env.SEPAY_TEST_ACCOUNT=account;
  process.env.SEPAY_WEBHOOK_SECRET=secret;process.env.SANDBOX_WEBHOOK_SECRET=secret;
  @Module({controllers:[SePayController]}) class TestApp {}
  app=await NestFactory.create(TestApp,{rawBody:true,logger:false});
  (app.get(SePayController) as any).service=service;
  app.use((req:any,_res:any,next:any)=>{req.correlationId='callback-http-test';next();});
  app.useGlobalFilters(new ErrorFilter());await app.listen(0,'127.0.0.1');base=await app.getUrl();
});
afterAll(async()=>{
  if(app)await app.close();if(source.isInitialized)await source.destroy();
  if(root.isInitialized){await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();}
  for(const key of keys)if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];
});
async function fixture(provider='SEPAY_TEST',state='AWAITING_PAYMENT',expired=false,group=randomUUID()){
  const id=randomUUID(),payment=randomUUID(),attempt=randomUUID(),reference='PBL6'+attempt.replace(/-/g,'').toUpperCase();
  await source.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,payment_expires_at,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd) VALUES($1,$2,$3,$4,$5,'SANDBOX',now()+$6*interval '1 minute',100,0,0,0,100)`,[id,group,randomUUID(),randomUUID(),state,expired?-1:15]);
  await source.query("INSERT INTO payment(id,order_id,method,status,payable_vnd,collectible_vnd) VALUES($1,$2,'SANDBOX','PENDING',100,0)",[payment,id]);
  await source.query("INSERT INTO payment_attempt(id,payment_id,provider_reference,status,amount_vnd,provider) VALUES($1,$2,$3,'PENDING',100,$4)",[attempt,payment,reference,provider]);
  return {id,payment,attempt,reference};
}
let eventId=1000;
function sepay(reference:string){return {id:++eventId,transferType:'in' as const,transferAmount:100,accountNumber:account,code:reference,content:reference+' payment',gateway:'MBBank',transactionDate:'2026-10-07 10:30:00',subAccount:null,description:'synthetic fixture',accumulated:1000,referenceCode:'SBTEST'+eventId};}
async function post(input:any,provider='sepay',raw=JSON.stringify(input),signature?:string,timestamp=String(Math.floor(Date.now()/1000))){
  const headers:Record<string,string>={'Content-Type':'application/json'};
  if(provider==='sepay'){
    headers['X-SePay-Timestamp']=timestamp;
    headers['X-SePay-Signature']=signature ?? 'sha256='+createHmac('sha256',secret).update(timestamp+'.').update(raw).digest('hex');
  }else headers['X-Sandbox-Signature']=signature ?? 'sha256='+createHmac('sha256',secret).update(raw).digest('hex');
  return fetch(base+'/payment-callbacks/'+provider,{method:'POST',headers,body:raw});
}
test('real HTTP authenticates raw bytes before DTO; official optional payload fields accepted',async()=>{
  const f=await fixture(),input=sepay(f.reference);
  expect((await post({},'sepay','{}','sha256='+'0'.repeat(64))).status).toBe(401);
  expect((await post({})).status).toBe(422);
  expect((await post(input,'sepay',JSON.stringify(input),undefined,String(Math.floor(Date.now()/1000)-301))).status).toBe(401);
  const response=await post(input,'sepay',JSON.stringify(input,null,2));expect(response.status).toBe(200);
  const body=await response.json();expect(body).toEqual({success:true});expect(schemaErrors(body,bundle.operations.sepayCallback.responses['200'])).toEqual([]);
  const [payment]=await source.query('SELECT * FROM payment WHERE id=$1',[f.payment]);expect(payment).toMatchObject({status:'SUCCEEDED',collected_vnd:'100',version:1});
  expect((await source.query('SELECT status FROM "order" WHERE id=$1',[f.id]))[0].status).toBe('AWAITING_PAYMENT');
  expect((await source.query('SELECT kind,status,correlation_id FROM payment_followup WHERE order_id=$1',[f.id]))[0]).toEqual({kind:'CONSUME_REQUIRED',status:'PENDING',correlation_id:'callback-http-test'});
});
test('concurrent replay persists exactly one effect and changed event payload conflicts',async()=>{
  const f=await fixture(),input=sepay(f.reference);
  const results=await Promise.all([service.sepay(input,'duplicate'),service.sepay(input,'duplicate')]);
  expect(results.filter(r=>r.duplicate)).toHaveLength(1);
  await expect(service.sepay({...input,transferAmount:99},'changed')).rejects.toMatchObject({status:409});
  expect(await source.query('SELECT * FROM payment_event WHERE payment_id=$1',[f.payment])).toHaveLength(1);
  expect(await source.query('SELECT * FROM payment_followup WHERE order_id=$1',[f.id])).toHaveLength(1);
  expect((await source.query('SELECT version FROM payment WHERE id=$1',[f.payment]))[0].version).toBe(1);
});
test('distinct concurrent success events and out-of-order failure never double collect or regress',async()=>{
  const f=await fixture();const results=await Promise.all([service.sepay(sepay(f.reference),'first'),service.sepay(sepay(f.reference),'second')]);
  expect(results.map(r=>r.disposition).sort()).toEqual(['CONSUME_REQUIRED','EXTRA_TRANSFER_RECONCILE_REQUIRED']);
  expect((await source.query("SELECT amount_vnd FROM payment_callback_receipt WHERE attempt_id=$1 AND disposition='EXTRA_TRANSFER_RECONCILE_REQUIRED'",[f.attempt]))[0].amount_vnd).toBe('100');
  expect((await source.query('SELECT collected_vnd,version FROM payment WHERE id=$1',[f.payment]))[0]).toEqual({collected_vnd:'100',version:1});
  // Legacy callbacks cannot mutate a SePay attempt even if they know its reference.
  await expect(service.sandbox({provider_event_id:randomUUID(),provider_reference:f.reference,result:'FAILED',signature:'unused'},'cross')).rejects.toMatchObject({status:404});
  expect(await source.query('SELECT * FROM payment_followup WHERE order_id=$1',[f.id])).toHaveLength(1);
});
test('account/amount/reference/body/config errors cannot record money',async()=>{
  const f=await fixture(),input=sepay(f.reference);
  for(const changed of [{...input,accountNumber:'other'},{...input,transferAmount:99},{...input,content:input.content+' PBL6'+'A'.repeat(32)}])
    await expect(service.sepay(changed,'invalid')).rejects.toMatchObject({status:422});
  await expect(service.sepay(sepay('PBL6'+'F'.repeat(32)),'unknown')).rejects.toMatchObject({status:404});
  expect((await post({...input,transferAmount:'100'})).status).toBe(422);
  expect((await post({...input,transferAmount:Number.MAX_SAFE_INTEGER+1})).status).toBe(422);
  expect((await post({...input,unexpected:true})).status).toBe(422);
  process.env.PAYMENT_PROVIDER_MODE='disabled';await expect(service.sepay(input,'disabled')).rejects.toMatchObject({status:503});process.env.PAYMENT_PROVIDER_MODE='sepay_test';
  expect((await source.query('SELECT status,collected_vnd FROM payment WHERE id=$1',[f.payment]))[0]).toEqual({status:'PENDING',collected_vnd:'0'});
  expect(await source.query('SELECT * FROM payment_callback_receipt WHERE attempt_id=$1',[f.attempt])).toHaveLength(0);
});
test('outgoing and unrelated transfers ACK durable ignored receipt without payment effects',async()=>{
  const f=await fixture();const input={...sepay(f.reference),transferType:'out' as const};
  expect((await service.sepay(input,'out')).disposition).toBe('IGNORED');
  expect((await service.sepay({...sepay(''),code:null,content:'unrelated bank transfer'},'unrelated')).disposition).toBe('IGNORED');
  expect((await source.query('SELECT status FROM payment WHERE id=$1',[f.payment]))[0].status).toBe('PENDING');
});
test('late success routes only its Order to refund/reconcile, never reopens or alters sibling Order',async()=>{
  const group=randomUUID(),expired=await fixture('SEPAY_TEST','EXPIRED',true,group),sibling=await fixture('SEPAY_TEST','AWAITING_PAYMENT',false,group);
  expect((await service.sepay(sepay(expired.reference),'late')).disposition).toBe('REFUND_REQUIRED');
  expect((await source.query('SELECT status FROM "order" WHERE id=$1',[expired.id]))[0].status).toBe('EXPIRED');
  expect((await source.query('SELECT status FROM payment WHERE id=$1',[sibling.payment]))[0].status).toBe('PENDING');
  expect(await source.query('SELECT * FROM refund WHERE order_id=$1',[expired.id])).toHaveLength(0); // No fake refund execution.
  const overdue=await fixture('SEPAY_TEST','AWAITING_PAYMENT',true);
  expect((await service.sepay(sepay(overdue.reference),'overdue')).disposition).toBe('RECONCILE_REQUIRED');
});
test('audit failure rolls back receipt, Payment, attempt and follow-up atomically',async()=>{
  const f=await fixture(),input=sepay(f.reference);
  await expect(service.sepay(input,null as any)).rejects.toBeDefined();
  expect((await source.query('SELECT status FROM payment WHERE id=$1',[f.payment]))[0].status).toBe('PENDING');
  expect((await source.query('SELECT status FROM payment_attempt WHERE id=$1',[f.attempt]))[0].status).toBe('PENDING');
  for(const table of ['payment_event','payment_followup'])expect(await source.query('SELECT * FROM '+table+' WHERE payment_id=$1',[f.payment])).toHaveLength(0);
  expect(await source.query('SELECT * FROM payment_callback_receipt WHERE event_id=$1',[String(input.id)])).toHaveLength(0);
  expect((await service.sepay(input,'retry')).disposition).toBe('CONSUME_REQUIRED');
});
test('legacy signed sandbox success/failure remains provider-scoped and terminal success wins',async()=>{
  const f=await fixture('LEGACY_SANDBOX'),input={provider_event_id:randomUUID(),provider_reference:f.reference,result:'SUCCESS' as const,signature:'compatibility-only'};
  expect((await post(input,'sandbox',JSON.stringify(input),'sha256='+'0'.repeat(64))).status).toBe(401);
  const response=await post(input,'sandbox');expect(response.status).toBe(200);
  expect(schemaErrors(await response.json(),bundle.operations.sandboxCallback.responses['200'])).toEqual([]);
  expect((await service.sandbox({...input,provider_event_id:randomUUID(),result:'FAILED'},'stale')).disposition).toBe('STALE');
  expect((await source.query('SELECT status,collected_vnd FROM payment WHERE id=$1',[f.payment]))[0]).toEqual({status:'SUCCEEDED',collected_vnd:'100'});
});
test('older failure does not fail Payment with a newer active attempt; late success is still recorded',async()=>{
  const f=await fixture('LEGACY_SANDBOX');
  await source.query("INSERT INTO payment_attempt(payment_id,provider_reference,status,amount_vnd,provider) VALUES($1,$2,'PENDING',100,'LEGACY_SANDBOX')",[f.payment,randomUUID()]);
  const input={provider_event_id:randomUUID(),provider_reference:f.reference,result:'FAILED' as const,signature:'compatibility-only'};
  expect((await service.sandbox(input,'old')).disposition).toBe('FAILED');
  expect((await source.query('SELECT status FROM payment WHERE id=$1',[f.payment]))[0].status).toBe('PENDING');
  expect((await service.sandbox({...input,provider_event_id:randomUUID(),result:'SUCCESS'},'late')).disposition).toBe('CONSUME_REQUIRED');
});
test('Order handoff keeps stable operation ID and completion shares caller rollback',async()=>{
  const f=await fixture();await service.sepay(sepay(f.reference),'followup');
  const port=new PaymentFollowupPort(source.manager),jobs=await port.pending();
  const job=jobs.find(j=>j.order_id===f.id)!;
  expect((await port.pending()).find(j=>j.order_id===f.id)!.operation_id).toBe(job.operation_id);
  await expect(port.complete(job.operation_id,'CONSUMED')).rejects.toThrow('PAYMENT_REQUIRES_CALLER_TRANSACTION');
  await expect(source.transaction(m=>new PaymentFollowupPort(m).complete(job.operation_id,'CONSUMED'))).rejects.toMatchObject({status:409});
  await expect(source.transaction(async m=>{
    // Simulates Order owner's verified consume transition; no real inventory success is claimed.
    await m.query("UPDATE \"order\" SET status='PENDING' WHERE id=$1",[f.id]);
    await new PaymentFollowupPort(m).complete(job.operation_id,'CONSUMED');throw new Error('caller failed');
  })).rejects.toThrow('caller failed');
  expect((await source.query('SELECT status FROM payment_followup WHERE operation_id=$1',[job.operation_id]))[0].status).toBe('PENDING');
  expect((await source.query('SELECT status FROM "order" WHERE id=$1',[f.id]))[0].status).toBe('AWAITING_PAYMENT');
});
test('follow-up completion replays after state changes and refuses false refund completion',async()=>{
  const f=await fixture();await service.sepay(sepay(f.reference),'completion');
  const [job]=await source.query('SELECT * FROM payment_followup WHERE order_id=$1',[f.id]);
  await expect(source.transaction(m=>new PaymentFollowupPort(m).complete(job.operation_id,'REFUNDED'))).rejects.toMatchObject({status:409});
  await source.transaction(async m=>{
    await m.query("UPDATE \"order\" SET status='PENDING' WHERE id=$1",[f.id]);
    await new PaymentFollowupPort(m).complete(job.operation_id,'CONSUMED');
  });
  await source.query("UPDATE \"order\" SET status='CANCELLED' WHERE id=$1",[f.id]);
  await source.transaction(m=>new PaymentFollowupPort(m).complete(job.operation_id,'CONSUMED'));
  await expect(source.transaction(m=>new PaymentFollowupPort(m).complete(job.operation_id,'REFUNDED'))).rejects.toMatchObject({status:409});
});
test('database refuses follow-up that mixes Attempt, Payment or Order identities',async()=>{
  const first=await fixture(),second=await fixture();
  await expect(source.query("INSERT INTO payment_followup(attempt_id,payment_id,order_id,kind,correlation_id) VALUES($1,$2,$3,'CONSUME_REQUIRED','invalid')",[first.attempt,second.payment,second.id])).rejects.toMatchObject({driverError:{code:'23503'}});
  await expect(source.query("INSERT INTO payment_followup(attempt_id,payment_id,order_id,kind,correlation_id) VALUES($1,$2,$3,'CONSUME_REQUIRED','invalid')",[first.attempt,first.payment,second.id])).rejects.toMatchObject({driverError:{code:'23503'}});
});
