import { randomUUID } from 'node:crypto';
import { readFileSync,readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { PaymentService } from '../../commerce-service/src/payment/payment.service';
import { PaymentApiService } from '../../commerce-service/src/payment/payment.api.service';
import { RefundRunner,RefundProvider,RefundCommand,RefundOutcome,DisabledRefundProvider } from '../../commerce-service/src/payment/refund.runner';
import { schemaErrors } from '../../shared/src/contract-validation';
import bundle from '../../shared/src/contracts.runtime.generated.json';

const schema='refund_test_'+randomUUID().replace(/-/g,'');
const root=new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL});
const source=new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public'}});
beforeAll(async()=>{
  await root.initialize();await root.query('CREATE SCHEMA '+schema);await source.initialize();
  const folder=resolve(process.cwd(),'commerce-service/migrations');
  for(const name of readdirSync(folder).filter(n=>n.endsWith('.sql')).sort())await source.query(readFileSync(resolve(folder,name),'utf8'));
});
afterAll(async()=>{await source.destroy();await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();});
async function fixture(){
  const order=randomUUID(),payment=randomUUID(),user=randomUUID(),operation=randomUUID(),reference='PBL6'+randomUUID().replace(/-/g,'').toUpperCase();
  await source.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd) VALUES($1,$1,$2,$3,'CANCELLED','SANDBOX',100,0,0,0,100)`,[order,user,randomUUID()]);
  await source.query("INSERT INTO payment(id,order_id,method,status,payable_vnd,collectible_vnd,collected_vnd) VALUES($1,$2,'SANDBOX','SUCCEEDED',100,0,100)",[payment,order]);
  await source.query("INSERT INTO payment_attempt(payment_id,provider_reference,status,amount_vnd) VALUES($1,$2,'SUCCEEDED',100)",[payment,reference]);
  const draft={order_id:order,payment_id:payment,amount_vnd:100n,operation_id:operation,correlation_id:'refund-integration'};
  return {order,payment,user,operation,reference,draft};
}
async function request(draft:any){return source.transaction(m=>new PaymentService(m).requestRefund(draft));}
function provider(outcome:(command:RefundCommand,lookup:boolean)=>Promise<RefundOutcome>|RefundOutcome):RefundProvider {
  return {enabled:true,name:'SEPAY_TEST',refund:async c=>outcome(c,false),lookup:async c=>outcome(c,true)};
}
function succeeded(c:RefundCommand):RefundOutcome{return {status:'SUCCEEDED',...c,receipt_id:'TEST-'+c.operation_id};}
async function due(id:string){await source.query('UPDATE refund_job SET next_attempt_at=now() WHERE refund_id=$1',[id]);}
// Separate cases share an isolated schema; finish old cases so ticks only target their new fixture.
beforeEach(async()=>{await source.query("UPDATE refund_job SET status='FAILED' WHERE status IN ('PENDING','RECONCILE','LEASED')");});

test('same transaction, stable ID and payload; competing IDs cannot create a second refund',async()=>{
  const f=await fixture();const [a,b]=await Promise.all([request(f.draft),request(f.draft)]);expect(a).toEqual(b);
  expect(schemaErrors(a,bundle.operations.getOrderRefund.responses['200'])).toEqual([]);
  expect(await source.query('SELECT * FROM refund WHERE payment_id=$1',[f.payment])).toHaveLength(1);
  await expect(request({...f.draft,amount_vnd:99n})).rejects.toMatchObject({status:409});
  await expect(request({...f.draft,operation_id:randomUUID()})).rejects.toMatchObject({status:409});
  await expect(new PaymentService(source.manager).requestRefund(f.draft)).rejects.toThrow('PAYMENT_REQUIRES_CALLER_TRANSACTION');
});
test('caller rollback removes refund/job/audit/idempotency; bad amount or active Order is rejected',async()=>{
  const f=await fixture();await expect(request({...f.draft,amount_vnd:99n})).rejects.toMatchObject({status:422});
  await source.query("UPDATE \"order\" SET status='PENDING' WHERE id=$1",[f.order]);await expect(request(f.draft)).rejects.toMatchObject({status:409});
  await source.query("UPDATE \"order\" SET status='CANCELLED' WHERE id=$1",[f.order]);
  await expect(source.transaction(async m=>{await new PaymentService(m).requestRefund(f.draft);throw new Error('Order failed');})).rejects.toThrow('Order failed');
  expect(await source.query('SELECT * FROM refund WHERE order_id=$1',[f.order])).toHaveLength(0);
  expect(await source.query('SELECT * FROM refund_job WHERE operation_id=$1',[f.operation])).toHaveLength(0);
  expect(await source.query('SELECT * FROM operation_result WHERE operation_id=$1',[f.operation])).toHaveLength(0);
});
test('owned read, disabled provider and missing refund never pretend money was returned',async()=>{
  const f=await fixture(),api=new PaymentApiService(source);
  await expect(api.getOrderRefund(f.order,{user_id:f.user})).rejects.toMatchObject({status:404});
  const created=await request(f.draft);expect(await api.getOrderRefund(f.order,{user_id:f.user})).toEqual(created);
  await expect(api.getOrderRefund(f.order,{user_id:randomUUID()})).rejects.toMatchObject({status:404});
  expect(await new RefundRunner(source,new DisabledRefundProvider()).tick()).toBe('DISABLED');
  expect((await source.query('SELECT status,refunded_vnd FROM payment WHERE id=$1',[f.payment]))[0]).toEqual({status:'SUCCEEDED',refunded_vnd:'0'});
  await expect(source.query('UPDATE refund_job SET operation_id=$2 WHERE refund_id=$1',[created.id,randomUUID()])).rejects.toMatchObject({code:'23503'});
  await expect(source.query('UPDATE refund_job SET amount_vnd=99 WHERE refund_id=$1',[created.id])).rejects.toMatchObject({code:'23503'});
});
test('concurrent workers command once; successful receipt atomically updates Payment, refund, event and audit',async()=>{
  const f=await fixture(),r=await request(f.draft);let calls=0;
  const p=provider(async c=>{calls++;expect(c.operation_id).toBe(f.operation);expect((await source.query('SELECT status FROM refund WHERE id=$1',[r.id]))[0].status).toBe('PROCESSING');return succeeded(c);});
  const runner=new RefundRunner(source,p);await Promise.all([runner.tick(),runner.tick()]);expect(calls).toBe(1);
  expect((await source.query('SELECT status,refunded_vnd FROM payment WHERE id=$1',[f.payment]))[0]).toEqual({status:'REFUNDED',refunded_vnd:'100'});
  expect((await source.query('SELECT status FROM refund WHERE id=$1',[r.id]))[0].status).toBe('SUCCEEDED');
  expect(await source.query('SELECT * FROM payment_event WHERE payment_id=$1',[f.payment])).toHaveLength(1);
  expect(await runner.tick()).toBe('IDLE');
});
test('UNKNOWN after provider error only performs lookup; authoritative NOT_FOUND retries same command ID',async()=>{
  const f=await fixture(),r=await request(f.draft);const commands:string[]=[],lookups:string[]=[];
  const p=provider(c=>{commands.push(c.operation_id);return {status:'UNKNOWN'};});
  await new RefundRunner(source,p).tick();expect((await source.query('SELECT status FROM refund WHERE id=$1',[r.id]))[0].status).toBe('UNKNOWN');
  await due(r.id);
  await new RefundRunner(source,provider((c,lookup)=>{expect(lookup).toBe(true);lookups.push(c.operation_id);return {status:'NOT_FOUND',...c};})).tick();
  expect(commands).toEqual([f.operation]);expect(lookups).toEqual([f.operation]);
  await new RefundRunner(source,provider((c,lookup)=>{expect(lookup).toBe(false);commands.push(c.operation_id);return succeeded(c);})).tick();
  expect(commands).toEqual([f.operation,f.operation]);
});
test('expired lease after crash resolves with lookup rather than resending',async()=>{
  const f=await fixture(),r=await request(f.draft);
  await source.query("UPDATE refund_job SET status='LEASED',lease_token=$2,lease_until=now()-interval '1 second' WHERE refund_id=$1",[r.id,randomUUID()]);
  await source.query("UPDATE refund SET status='PROCESSING' WHERE id=$1",[r.id]);
  const runner=new RefundRunner(source,provider((c,lookup)=>{expect(lookup).toBe(true);return succeeded(c);}));
  await runner.tick();expect((await source.query('SELECT status FROM refund WHERE id=$1',[r.id]))[0].status).toBe('SUCCEEDED');
});
test('mismatched receipt leaves ledger unchanged, keeps UNKNOWN and disallows retry as FAILED',async()=>{
  const f=await fixture(),r=await request(f.draft),runner=new RefundRunner(source,provider(c=>({...succeeded(c),amount_vnd:'99'} as RefundOutcome)));
  await runner.tick();expect((await source.query('SELECT status FROM refund WHERE id=$1',[r.id]))[0].status).toBe('UNKNOWN');
  expect((await source.query('SELECT refunded_vnd FROM payment WHERE id=$1',[f.payment]))[0].refunded_vnd).toBe('0');
  await expect(source.transaction(m=>runner.retryKnownFailure(m,r.id))).rejects.toMatchObject({status:409});
});
test('definitive FAILED can retry with the same ID; changed Order state prevents command',async()=>{
  const f=await fixture(),r=await request(f.draft),runner=new RefundRunner(source,provider(c=>({status:'FAILED',...c})));
  await runner.tick();await source.transaction(m=>runner.retryKnownFailure(m,r.id));
  await new RefundRunner(source,provider(c=>{expect(c.operation_id).toBe(f.operation);return succeeded(c);})).tick();
  expect((await source.query('SELECT status FROM refund WHERE id=$1',[r.id]))[0].status).toBe('SUCCEEDED');
  const changed=await fixture();await request(changed.draft);
  await source.query("UPDATE \"order\" SET status='PENDING' WHERE id=$1",[changed.order]);
  let calls=0;await new RefundRunner(source,provider(c=>{calls++;return succeeded(c);})).tick();expect(calls).toBe(0);
});
test('audit failure rolls back receipt ledger; restart looks up successful external operation once',async()=>{
  const f=await fixture(),r=await request(f.draft);let commands=0,lookups=0;
  const p=provider((c,lookup)=>{if(lookup)lookups++;else commands++;return succeeded(c);});
  await source.query("CREATE FUNCTION reject_refund_result() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='PROVIDER_RESULT' THEN RAISE EXCEPTION 'audit unavailable'; END IF; RETURN NEW; END $$");
  await source.query('CREATE TRIGGER reject_refund_result BEFORE INSERT ON m2_audit FOR EACH ROW EXECUTE FUNCTION reject_refund_result()');
  try {await expect(new RefundRunner(source,p).tick()).rejects.toThrow('audit unavailable');}
  finally {await source.query('DROP TRIGGER reject_refund_result ON m2_audit');await source.query('DROP FUNCTION reject_refund_result()');}
  expect((await source.query('SELECT refunded_vnd FROM payment WHERE id=$1',[f.payment]))[0].refunded_vnd).toBe('0');
  await source.query("UPDATE refund_job SET lease_until=now()-interval '1 second' WHERE refund_id=$1",[r.id]);
  await new RefundRunner(source,p).tick();expect(commands).toBe(1);expect(lookups).toBe(1);
  expect((await source.query('SELECT status FROM refund WHERE id=$1',[r.id]))[0].status).toBe('SUCCEEDED');
});
test('closed late-payment followup enqueues stable request; only verified refund closes it, extra transfer stays separate',async()=>{
  const f=await fixture(),followup=randomUUID(),extra=randomUUID();
  const [attempt]=await source.query('SELECT id FROM payment_attempt WHERE payment_id=$1',[f.payment]);
  await source.query("INSERT INTO payment_followup(operation_id,attempt_id,payment_id,order_id,kind,correlation_id) VALUES($1,$2,$3,$4,'REFUND_REQUIRED','refund-test')",[followup,attempt.id,f.payment,f.order]);
  await source.query("INSERT INTO payment_callback_receipt(provider,event_id,payload_hash,disposition,attempt_id,amount_vnd) VALUES('SEPAY_TEST',$1,'fixture','EXTRA_TRANSFER_RECONCILE_REQUIRED',$2,100)",[extra,attempt.id]);
  const disabled=new RefundRunner(source,new DisabledRefundProvider());await disabled.tick();await disabled.tick();
  const [r]=await source.query('SELECT * FROM refund WHERE payment_id=$1',[f.payment]);expect(r.status).toBe('REQUESTED');expect(r.operation_id).toBe(followup);
  await new RefundRunner(source,provider(succeeded)).tick();
  expect((await source.query('SELECT status,resolution FROM payment_followup WHERE operation_id=$1',[followup]))[0]).toEqual({status:'DONE',resolution:'REFUNDED'});
  expect((await source.query('SELECT disposition,amount_vnd FROM payment_callback_receipt WHERE event_id=$1',[extra]))[0]).toEqual({disposition:'EXTRA_TRANSFER_RECONCILE_REQUIRED',amount_vnd:'100'});
  expect((await source.query('SELECT refunded_vnd FROM payment WHERE id=$1',[f.payment]))[0].refunded_vnd).toBe('100');
});
