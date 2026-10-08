import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { PaymentService } from '../../commerce-service/src/payment/payment.service';
import { PaymentApiService } from '../../commerce-service/src/payment/payment.api.service';
import { schemaErrors } from '../../shared/src/contract-validation';
import bundle from '../../shared/src/contracts.runtime.generated.json';
const source=new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL});
const user=randomUUID(),store=randomUUID(),ids:string[]=[];
const env={mode:process.env.PAYMENT_PROVIDER_MODE,account:process.env.SEPAY_TEST_ACCOUNT,bank:process.env.SEPAY_TEST_BANK};
beforeAll(async()=>{await source.initialize();process.env.PAYMENT_PROVIDER_MODE='sepay_test';process.env.SEPAY_TEST_ACCOUNT='0000000000';process.env.SEPAY_TEST_BANK='VCB';});
afterAll(async()=>{
  for(const id of ids){
    await source.query('DELETE FROM payment_event WHERE payment_id IN (SELECT id FROM payment WHERE order_id=$1)',[id]);
    await source.query('DELETE FROM m2_audit WHERE target_id=$1 OR target_id IN (SELECT id FROM payment WHERE order_id=$1) OR target_id IN (SELECT a.id FROM payment_attempt a JOIN payment p ON p.id=a.payment_id WHERE p.order_id=$1)',[id]);
    await source.query('DELETE FROM payment_attempt WHERE payment_id IN (SELECT id FROM payment WHERE order_id=$1)',[id]);
    await source.query('DELETE FROM c_o_d_collection WHERE order_id=$1',[id]);
    await source.query('DELETE FROM operation_result WHERE result->>\'order_id\'=$1',[id]);
    await source.query('DELETE FROM payment WHERE order_id=$1',[id]);
    for(const table of ['shipment','order_status_history','order_item'])await source.query(`DELETE FROM ${table} WHERE order_id=$1`,[id]);
    await source.query('DELETE FROM outbox WHERE payload->>\'order_id\'=$1',[id]);
    await source.query('DELETE FROM "order" WHERE id=$1',[id]);
  }
  for(const [key,value] of Object.entries({PAYMENT_PROVIDER_MODE:env.mode,SEPAY_TEST_ACCOUNT:env.account,SEPAY_TEST_BANK:env.bank}))if(value===undefined)delete process.env[key];else process.env[key]=value;
  await source.destroy();
});
async function order(method='COD',state='PREPARING',amount=100){
  const id=randomUUID();ids.push(id);
  await source.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd,payment_expires_at) VALUES($1,$1,$2,$3,$4,$5,$6,0,0,0,$6,now()+interval '15 minutes')`,[id,user,store,state,method,amount]);return id;
}
async function create(id:string,method:'COD'|'SANDBOX'='COD',amount=100n,op=randomUUID()){
  return source.transaction(m=>new PaymentService(m).createForOrder({order_id:id,method,payable_vnd:amount,operation_id:op}));
}
test('create uses caller transaction; replay/concurrent calls make one Payment/obligation',async()=>{
  const id=await order(),op=randomUUID();
  const results=await Promise.all([create(id,'COD',100n,op),create(id,'COD',100n,op)]);
  expect(results[0]).toEqual(results[1]);expect(results[0]).toMatchObject({status:'PENDING',collectible_vnd:100,collected_vnd:0});
  expect(schemaErrors(results[0],bundle.operations.getPayment.responses['200'])).toEqual([]);
  expect(await source.query('SELECT * FROM payment WHERE order_id=$1',[id])).toHaveLength(1);
  expect(await source.query('SELECT * FROM c_o_d_collection WHERE order_id=$1',[id])).toHaveLength(1);
  await expect(create(id,'COD',101n,op)).rejects.toMatchObject({status:409});
  await expect(new PaymentService(source.manager).createForOrder({order_id:id,method:'COD',payable_vnd:100n,operation_id:op})).rejects.toThrow('PAYMENT_REQUIRES_CALLER_TRANSACTION');
});
test('caller rollback removes Order, Payment, obligation, audit and replay result',async()=>{
  const id=randomUUID();ids.push(id);const op=randomUUID();
  await expect(source.transaction(async m=>{
    await m.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd) VALUES($1,$1,$2,$3,'PREPARING','COD',100,0,0,0,100)`,[id,user,store]);
    await new PaymentService(m).createForOrder({order_id:id,method:'COD',payable_vnd:100n,operation_id:op});throw new Error('caller failed');
  })).rejects.toThrow('caller failed');
  for(const table of ['payment','c_o_d_collection'])expect(await source.query(`SELECT * FROM ${table} WHERE order_id=$1`,[id])).toHaveLength(0);
  expect(await source.query('SELECT * FROM "order" WHERE id=$1',[id])).toHaveLength(0);
  expect(await source.query('SELECT * FROM operation_result WHERE operation_id=$1',[op])).toHaveLength(0);
});
test('COD same ID replays once; changed payload conflicts and competing IDs cannot collect twice',async()=>{
  const id=await order(),p=await create(id);await source.query('UPDATE "order" SET status=\'SHIPPED\' WHERE id=$1',[id]);
  const draft={order_id:id,amount_vnd:100n,operation_id:randomUUID(),actor_user_id:user};
  const run=(input=draft)=>source.transaction(m=>new PaymentService(m).recordCodCollection(input));
  const results=await Promise.all([run(),run()]);expect(results[0]).toEqual(results[1]);expect(results[0].status).toBe('SUCCEEDED');
  await expect(run({...draft,amount_vnd:99n})).rejects.toMatchObject({status:409});
  await expect(run({...draft,operation_id:randomUUID()})).rejects.toMatchObject({status:409});
  expect(await source.query('SELECT * FROM payment_event WHERE payment_id=$1',[p.id])).toHaveLength(1);
  expect((await source.query('SELECT * FROM payment WHERE id=$1',[p.id]))[0]).toMatchObject({collected_vnd:'100',version:1});
});
test('COD amount/state guard and caller rollback leave every money table unchanged',async()=>{
  const id=await order(),p=await create(id),draft={order_id:id,amount_vnd:100n,operation_id:randomUUID(),actor_user_id:user};
  await expect(source.transaction(m=>new PaymentService(m).recordCodCollection(draft))).rejects.toMatchObject({status:409});
  await source.query('UPDATE "order" SET status=\'SHIPPED\' WHERE id=$1',[id]);
  await expect(source.transaction(m=>new PaymentService(m).recordCodCollection({...draft,amount_vnd:99n}))).rejects.toMatchObject({status:422});
  await expect(source.transaction(async m=>{
    await new PaymentService(m).recordCodCollection(draft);await m.query('UPDATE "order" SET version=version+1 WHERE id=$1',[id]);throw new Error('order failed');
  })).rejects.toThrow('order failed');
  expect((await source.query('SELECT * FROM payment WHERE id=$1',[p.id]))[0]).toMatchObject({status:'PENDING',collected_vnd:'0'});
  expect((await source.query('SELECT * FROM c_o_d_collection WHERE order_id=$1',[id]))[0]).toMatchObject({status:'PENDING',amount_collected_vnd:'0'});
  expect(await source.query('SELECT * FROM payment_event WHERE payment_id=$1',[p.id])).toHaveLength(0);
  expect((await source.query('SELECT version FROM "order" WHERE id=$1',[id]))[0].version).toBe(0);
});
test('zero-payable COD can be collected without fabricating a provider attempt',async()=>{
  const id=await order('COD','PREPARING',0),p=await create(id,'COD',0n);await source.query('UPDATE "order" SET status=\'SHIPPED\' WHERE id=$1',[id]);
  const result=await source.transaction(m=>new PaymentService(m).recordCodCollection({order_id:id,amount_vnd:0n,operation_id:randomUUID(),actor_user_id:user}));
  expect(result).toMatchObject({status:'SUCCEEDED',collected_vnd:0});expect(await source.query('SELECT * FROM payment_attempt WHERE payment_id=$1',[p.id])).toHaveLength(0);
});
test('attempt concurrency/retry reuse server amount/reference; QR is never a payment success',async()=>{
  const id=await order('SANDBOX','AWAITING_PAYMENT'),p=await create(id,'SANDBOX'),service=new PaymentApiService(source);
  const args=[id,{expected_order_version:0},{user_id:user},'payment-attempt-test'] as const;
  const results=await Promise.all([service.createPaymentAttempt(...args),service.createPaymentAttempt(...args)]);
  expect(results[0]).toEqual(results[1]);expect(results[0].status).toBe('PENDING');expect(schemaErrors(results[0],bundle.operations.createPaymentAttempt.responses['201'])).toEqual([]);
  const qr=new URL(results[0].qr_url!);expect(qr.searchParams.get('amount')).toBe('100');expect(qr.searchParams.get('des')).toBe(results[0].provider_reference);
  expect((await service.getPayment(p.id,{user_id:user})).status).toBe('PENDING');
  await source.query("UPDATE payment_attempt SET status='UNKNOWN' WHERE id=$1",[results[0].id]);
  expect((await service.createPaymentAttempt(...args)).status).toBe('UNKNOWN');expect(await source.query('SELECT * FROM payment_attempt WHERE payment_id=$1',[p.id])).toHaveLength(1);
});
test('ownership/version/expiry/config guard and audit failure do not create an attempt',async()=>{
  const id=await order('SANDBOX','AWAITING_PAYMENT'),p=await create(id,'SANDBOX'),s=new PaymentApiService(source);
  await expect(s.getPayment(p.id,{user_id:randomUUID()})).rejects.toMatchObject({status:404});
  await expect(s.createPaymentAttempt(id,{expected_order_version:0},{user_id:randomUUID()},'guard')).rejects.toMatchObject({status:404});
  await expect(s.createPaymentAttempt(id,{expected_order_version:1},{user_id:user},'guard')).rejects.toMatchObject({status:409});
  process.env.PAYMENT_PROVIDER_MODE='disabled';
  await expect(s.createPaymentAttempt(id,{expected_order_version:0},{user_id:user},'guard')).rejects.toMatchObject({status:503});process.env.PAYMENT_PROVIDER_MODE='sepay_test';
  // Required audit correlation fails after attempt insert, proving atomic rollback.
  await expect(s.createPaymentAttempt(id,{expected_order_version:0},{user_id:user},null as any)).rejects.toBeDefined();
  expect(await source.query('SELECT * FROM payment_attempt WHERE payment_id=$1',[p.id])).toHaveLength(0);
  await source.query('UPDATE "order" SET payment_expires_at=now()-interval \'1 second\' WHERE id=$1',[id]);
  await expect(s.createPaymentAttempt(id,{expected_order_version:0},{user_id:user},'guard')).rejects.toMatchObject({status:409});
});
test('live HTTP guard/DTO/ownership and concurrent COD use the real shared Payment transaction',async()=>{
  const base=process.env.TEST_API_URL ?? 'http://gateway/api/v1';
  async function login(email:string){
    const r=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:process.env.SEED_PASSWORD,client_type:'MOBILE'})});expect(r.status).toBe(200);return (await r.json() as any).access_token;
  }
  const owner=await login('owner@pbl6.test'),customer=await login('customer1@pbl6.test'),other=await login('customer2@pbl6.test');
  const h=(token:string)=>({'Content-Type':'application/json',Authorization:'Bearer '+token,'X-Correlation-Id':'payment-http-test'});
  const ownerContext=await (await fetch(base+'/me/context',{headers:h(owner)})).json() as any;
  const customerContext=await (await fetch(base+'/me/context',{headers:h(customer)})).json() as any;
  const id=await order(),p=await create(id);
  await source.query('UPDATE "order" SET customer_user_id=$2,store_id=$3,status=\'SHIPPED\' WHERE id=$1',[id,customerContext.user_id,ownerContext.store_membership.store_id]);
  const read=await fetch(base+'/payments/'+p.id,{headers:h(customer)});expect(read.status).toBe(200);expect(schemaErrors(await read.json(),bundle.operations.getPayment.responses['200'])).toEqual([]);
  expect((await fetch(base+'/payments/'+p.id,{headers:h(other)})).status).toBe(404);
  expect((await fetch(base+'/orders/not-uuid/payment-attempts',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status).toBe(401);
  expect((await fetch(base+'/orders/'+id+'/payment-attempts',{method:'POST',headers:h(customer),body:JSON.stringify({expected_order_version:'0'})})).status).toBe(422);
  const cod=(amount=100)=>fetch(base+'/store/orders/'+id+'/cod-collection',{method:'POST',headers:h(owner),body:JSON.stringify({expected_version:0,amount_collected_vnd:amount})});
  expect((await cod(99)).status).toBe(422);
  const responses=await Promise.all([cod(),cod()]);expect(responses.map(x=>x.status).sort()).toEqual([200,409]);
  const data=await responses.find(x=>x.status===200)!.json();expect(schemaErrors(data,bundle.operations.collectCod.responses['200'])).toEqual([]);
  expect((await source.query('SELECT version,status FROM "order" WHERE id=$1',[id]))[0]).toEqual({version:1,status:'SHIPPED'});
  expect(await source.query('SELECT * FROM payment_event WHERE payment_id=$1',[p.id])).toHaveLength(1);
  expect((await source.query('SELECT request_id FROM m2_audit WHERE target_id=$1 AND action=\'COD_COLLECT\'',[p.id]))[0].request_id).toBe('payment-http-test');
});
