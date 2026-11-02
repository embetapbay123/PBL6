import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {PaymentService} from '../../commerce-service/src/payment/payment.service';
import {PaymentApiService} from '../../commerce-service/src/payment/payment.api.service';
import {PaymentFollowupPort} from '../../commerce-service/src/payment/payment.followup.port';
import {OrderInventoryRunner} from '../../commerce-service/src/order/order-inventory.runner';
import {ReturnsService} from '../../commerce-service/src/returns/returns.service';
import {deliveryMoneySettled} from '../../commerce-service/src/returns/delivery-return.service';
import {settleZeroDue} from '../../commerce-service/src/payment/zero-due';
import {DeliveryReturnRunner} from '../../commerce-service/src/returns/delivery-return.runner';

const suite=process.env.M2_DATABASE_URL?describe:describe.skip;
suite('zero-due orders settle without external money in isolated PostgreSQL',()=>{
 let admin:DataSource,db:DataSource,schema:string;
 const customer=randomUUID(),store=randomUUID(),owner=randomUUID();
 const auth={user_id:owner,roles:['CUSTOMER','STORE_OWNER'],store_membership:{store_id:store,role:'OWNER',status:'ACTIVE',permissions:[]}};
 beforeAll(async()=>{
  admin=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL}).initialize();schema='zero_due_'+randomUUID().replace(/-/g,'');await admin.query('CREATE SCHEMA '+schema);
  db=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public'}}).initialize();
  for(const file of readdirSync(resolve(__dirname,'../../commerce-service/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(__dirname,'../../commerce-service/migrations',file),'utf8'));
 });
 afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(admin?.isInitialized){if(/^zero_due_[a-f0-9]{32}$/.test(schema))await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.destroy();}});
 async function fixture(method:'COD'|'SANDBOX',amount=0){
  const id=randomUUID();await db.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd,payment_expires_at) VALUES($1,$1,$2,$3,$4,$5,$6,0,0,0,$6,now()+interval '10 minutes')`,[id,customer,store,method==='COD'?'PREPARING':'AWAITING_PAYMENT',method,amount]);
  const payment=await db.transaction(m=>new PaymentService(m).createForOrder({order_id:id,method,payable_vnd:BigInt(amount),operation_id:randomUUID()}));return {id,payment};
 }
 async function noMoney(id:string){
  for(const table of ['money_movement','refund','payment_attempt','refund_job']){
   const q=table==='refund_job'?'SELECT j.* FROM refund_job j JOIN refund r ON r.id=j.refund_id WHERE r.order_id=$1':'SELECT * FROM '+table+' WHERE '+(table==='payment_attempt'?'payment_id IN (SELECT id FROM payment WHERE order_id=$1)':'order_id=$1');
   expect(await db.query(q,[id])).toEqual([]);
  }
 }
 test.each(['COD','SANDBOX'] as const)('%s zero payment is settled but has no collection/receipt/provider effects',async method=>{
  const f=await fixture(method);expect(f.payment).toMatchObject({status:'SUCCEEDED',payable_vnd:0,collectible_vnd:0,collected_vnd:0,refunded_vnd:0});
  expect(await db.query("SELECT * FROM c_o_d_collection WHERE order_id=$1 AND status='SUCCEEDED'",[f.id])).toEqual([]);await noMoney(f.id);
  await expect(new PaymentApiService(db).createPaymentAttempt(f.id,{expected_order_version:0},{user_id:customer},'zero')).rejects.toMatchObject({status:409,response:{code:'PAYMENT_NOT_REQUIRED'}});
  await expect(new PaymentApiService(db).createPaymentAttempt(f.id,{expected_order_version:0},{user_id:randomUUID()},'other')).rejects.toMatchObject({status:404});
 });
 test('a zero COD collection command is refused; no zero collection ledger is fabricated',async()=>{
  const f=await fixture('COD');await db.query("UPDATE \"order\" SET status='SHIPPED' WHERE id=$1",[f.id]);
  await expect(db.transaction(m=>new PaymentService(m).recordCodCollection({order_id:f.id,amount_vnd:0n,operation_id:randomUUID(),actor_user_id:owner}))).rejects.toMatchObject({status:409,response:{code:'PAYMENT_NOT_REQUIRED'}});await noMoney(f.id);
 });
 test('zero return can finish after stock/fault reconciliation, without a fake refund',async()=>{
  const f=await fixture('COD'),request=randomUUID();await db.query("UPDATE \"order\" SET status='COMPLETED' WHERE id=$1",[f.id]);
  await db.query("INSERT INTO order_return_request(id,order_id,type,reason,status,inventory_status,fault_party,fee_payer) VALUES($1,$2,'REFUND','zero fixture','RECEIVED','LEGACY_RECONCILED','STORE','STORE')",[request,f.id]);
  const service=new ReturnsService(db);const input={status:'COMPLETED' as const,expected_version:0,operation_id:randomUUID()};
  const completed=await service.transition(request,input,auth,'STORE','zero-return');expect(completed.status).toBe('COMPLETED');expect(await service.transition(request,input,auth,'STORE','replay')).toEqual(completed);await noMoney(f.id);
 });
 test('zero payable cannot bypass missing stock reconciliation, disputed fees or a mismatching payment',async()=>{
  for(const delta of ['STOCK','DISPUTED','MISSING_PAYMENT','POSITIVE_PAYMENT']){
   const f=await fixture('COD'),request=randomUUID();await db.query("UPDATE \"order\" SET status='COMPLETED' WHERE id=$1",[f.id]);
   await db.query("INSERT INTO order_return_request(id,order_id,type,reason,status,inventory_status,fault_party,fee_payer) VALUES($1,$2,'REFUND','zero guards','RECEIVED',$3,$4,$5)",[request,f.id,delta==='STOCK'?'NOT_STARTED':'LEGACY_RECONCILED',delta==='DISPUTED'?'DISPUTED':'STORE',delta==='DISPUTED'?null:'STORE']);
   if(delta==='MISSING_PAYMENT')await db.query('DELETE FROM c_o_d_collection WHERE order_id=$1',[f.id]).then(()=>db.query('DELETE FROM payment WHERE order_id=$1',[f.id]));
   if(delta==='POSITIVE_PAYMENT')await db.query('UPDATE payment SET payable_vnd=1 WHERE order_id=$1',[f.id]);
   await expect(new ReturnsService(db).transition(request,{status:'COMPLETED',expected_version:0,operation_id:randomUUID()},auth,'STORE','zero-guard')).rejects.toMatchObject({status:409,response:{code:'REFUND_NOT_CONFIRMED'}});
   expect((await db.query('SELECT status FROM order_return_request WHERE id=$1',[request]))[0].status).toBe('RECEIVED');
  }
 });
 test.each(['COD','SANDBOX'] as const)('%s zero cancel closes the obligation without refund/followup',async method=>{
  const f=await fixture(method);await db.query("UPDATE \"order\" SET status='CANCELLED' WHERE id=$1",[f.id]);await db.transaction(m=>new PaymentFollowupPort(m).closePending(f.id));
  expect((await db.query('SELECT status,collected_vnd,refunded_vnd FROM payment WHERE order_id=$1',[f.id]))[0]).toEqual({status:'CANCELLED',collected_vnd:'0',refunded_vnd:'0'});await noMoney(f.id);
 });
 test('legacy zero online pending recovers through the inventory runner without any provider attempt',async()=>{
  const f=await fixture('SANDBOX');await db.query("UPDATE payment SET status='PENDING' WHERE order_id=$1",[f.id]);
  await db.query("INSERT INTO order_inventory_state(order_id,reservation_ids,items_json,state,correlation_id) VALUES($1,$2,'[]','RESERVED','zero-legacy')",[f.id,[randomUUID()]]);
  const call=jest.fn(async(_op:string,body:any)=>({status:'APPLIED',operation_id:body.operation_id})),runner=new OrderInventoryRunner(db,call);await runner.tick();
  expect((await db.query('SELECT status FROM "order" WHERE id=$1',[f.id]))[0].status).toBe('PENDING');expect(call).toHaveBeenCalledTimes(1);expect(call.mock.calls[0][0]).toBe('ConsumeReservation');await noMoney(f.id);
 });
 test('uncertain legacy external activity is never erased by the zero-due recovery helper',async()=>{
  const f=await fixture('SANDBOX');await db.query("UPDATE payment SET status='UNKNOWN' WHERE order_id=$1",[f.id]);
  await db.transaction(async m=>{const [o]=await m.query('SELECT * FROM "order" WHERE id=$1 FOR UPDATE',[f.id]);const [p]=await m.query('SELECT * FROM payment WHERE order_id=$1 FOR UPDATE',[f.id]);expect((await settleZeroDue(m,o,p,'unknown')).status).toBe('UNKNOWN');});
  expect(deliveryMoneySettled({payable_vnd:'0',collected_vnd:'0',refunded_vnd:'0',payment_status:'UNKNOWN'})).toBe(false);
 });
 test('positive orders retain their payment requirement and zero payable delivery closure requires reconciled balances',async()=>{
  const f=await fixture('SANDBOX',1);expect(f.payment.status).toBe('PENDING');
  for(const status of ['SUCCEEDED','CANCELLED'])expect(deliveryMoneySettled({payable_vnd:'0',collected_vnd:'0',refunded_vnd:'0',payment_status:status})).toBe(true);
  expect(deliveryMoneySettled({payable_vnd:'0',collected_vnd:'1',refunded_vnd:'0',payment_status:'SUCCEEDED'})).toBe(false);await noMoney(f.id);
 });
 test.each(['COD','SANDBOX'] as const)('%s failed zero-due delivery closes its payment obligation in the same transaction',async method=>{
  const f=await fixture(method),caseId=randomUUID();await db.query("UPDATE \"order\" SET status='SHIPPED' WHERE id=$1",[f.id]);
  await db.query("INSERT INTO order_inventory_state(order_id,reservation_ids,items_json,state,correlation_id) VALUES($1,$2,'[]','RETURN_INSPECTED','zero-delivery')",[f.id,[randomUUID()]]);
  await db.query("INSERT INTO delivery_return_case(id,order_id,reason,opened_by_user_id,status,inventory_status,inventory_command_json) VALUES($1,$2,'zero delivered back',$3,'SETTLING','APPLIED',$4)",[caseId,f.id,owner,JSON.stringify({operation_id:randomUUID(),order_id:f.id,items:[]})]);
  const call=jest.fn();await new DeliveryReturnRunner(db,call).process(caseId);expect(call).not.toHaveBeenCalled();
  expect((await db.query('SELECT status FROM delivery_return_case WHERE id=$1',[caseId]))[0].status).toBe('CLOSED');
  expect((await db.query('SELECT status FROM "order" WHERE id=$1',[f.id]))[0].status).toBe('CANCELLED');
  expect((await db.query('SELECT status,collected_vnd,refunded_vnd FROM payment WHERE order_id=$1',[f.id]))[0]).toEqual({status:'CANCELLED',collected_vnd:'0',refunded_vnd:'0'});await noMoney(f.id);
 });
});
