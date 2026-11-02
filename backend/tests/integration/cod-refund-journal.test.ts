import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {CodRefundService} from '../../commerce-service/src/payment/cod-refund.service';
import {PaymentService} from '../../commerce-service/src/payment/payment.service';
import {schemaErrors} from '../../shared/src/contract-validation';
import contracts from '../../shared/src/contracts.runtime.generated.json';
import {ReportRepository} from '../../commerce-service/src/report/report.repository';
const suite=process.env.M2_DATABASE_URL?describe:describe.skip;
suite('Owner-attested COD refund and immutable cash journal',()=>{
 let admin:DataSource,db:DataSource,schema:string,service:CodRefundService;
 const store=randomUUID(),user=randomUUID(),owner=randomUUID();
 const auth={user_id:owner,roles:['CUSTOMER','STORE_OWNER'],store_membership:{store_id:store,role:'OWNER',status:'ACTIVE',permissions:[]}};
 beforeAll(async()=>{
  admin=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL}).initialize();schema='cod_fix_'+randomUUID().replace(/-/g,'');await admin.query('CREATE SCHEMA '+schema);
  db=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public'}}).initialize();
  const dir=resolve(__dirname,'../../commerce-service/migrations');for(const f of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(dir,f),'utf8'));
  service=new CodRefundService(db);
 });
 afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(admin?.isInitialized){if(/^cod_fix_[a-f0-9]{32}$/.test(schema))await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.destroy();}});
 async function fixture(collected=true){
  const order=randomUUID(),payment=randomUUID(),request=randomUUID();
  await db.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd,created_at)
    VALUES($1,$1,$2,$3,'PREPARING','COD',100000,0,0,20000,120000,'2020-01-01')`,[order,user,store]);
  await db.transaction(m=>new PaymentService(m).createForOrder({order_id:order,method:'COD',payable_vnd:120000n,operation_id:payment}));
  await db.query("UPDATE \"order\" SET status='SHIPPED' WHERE id=$1",[order]);
  if(collected)await db.transaction(m=>new PaymentService(m).recordCodCollection({order_id:order,amount_vnd:120000n,operation_id:randomUUID(),actor_user_id:owner}));
  await db.query("UPDATE \"order\" SET status='COMPLETED' WHERE id=$1",[order]);
  await db.query("INSERT INTO order_return_request(id,order_id,type,reason,status,inventory_status,fault_party,fee_payer,legacy_reconciliation_note) VALUES($1,$2,'REFUND','Đã nhận hàng trả','RECEIVED','LEGACY_RECONCILED','STORE','STORE','Fixture đã đối chiếu kho riêng, không giả cộng tồn')",[request,order]);
  return {order,request,input:{operation_id:randomUUID(),expected_order_version:0,expected_return_version:0,receipt_reference:'RECEIPT-'+randomUUID(),recipient_name:'Người nhận kiểm thử',refunded_at:new Date().toISOString(),full_amount_confirmed:true}};
 }
 test('two concurrent confirmations and a lost-ACK replay persist one full refund including shipping',async()=>{
  const f=await fixture(),[a,b]=await Promise.all([service.confirm(f.order,f.input,auth,'test'),service.confirm(f.order,f.input,auth,'retry')]);expect(a).toEqual(b);expect(a.amount_vnd).toBe(120000);
  expect(schemaErrors(a,contracts.operations.confirmCodRefund.responses['201'])).toEqual([]);
  expect(await service.confirm(f.order,f.input,auth,'reload')).toEqual(a);
  expect((await db.query('SELECT count(*)::int AS n FROM cod_refund_receipt WHERE refund_id=$1',[a.id]))[0].n).toBe(1);
  expect(await db.query('SELECT kind,amount_vnd,time_source FROM money_movement WHERE order_id=$1 ORDER BY kind',[f.order])).toEqual([{kind:'COLLECTION',amount_vnd:'120000',time_source:'SYSTEM_CONFIRMED'},{kind:'REFUND',amount_vnd:'120000',time_source:'OWNER_ATTESTED'}]);
  expect((await db.query('SELECT status,collected_vnd,refunded_vnd FROM payment WHERE order_id=$1',[f.order]))[0]).toEqual({status:'REFUNDED',collected_vnd:'120000',refunded_vnd:'120000'});
  await expect(service.confirm(f.order,{...f.input,receipt_reference:'Different'},auth,'changed')).rejects.toMatchObject({status:409});
  await expect(service.confirm(f.order,{...f.input,operation_id:randomUUID(),expected_order_version:1},auth,'new')).rejects.toMatchObject({status:409});
 });
 test('Seller, Admin, inactive Owner and other Store cannot attest this refund',async()=>{
  const f=await fixture();
  for(const context of [{...auth,roles:['CUSTOMER','SELLER'],store_membership:{...auth.store_membership,role:'SELLER'}},{...auth,roles:['ADMIN']},{...auth,store_membership:{...auth.store_membership,status:'REVOKED'}}])await expect(service.confirm(f.order,f.input,context,'bad-scope')).rejects.toMatchObject({status:403});
  await expect(service.confirm(f.order,f.input,{...auth,store_membership:{...auth.store_membership,store_id:randomUUID()}},'other-store')).rejects.toMatchObject({status:404});
  expect(await db.query('SELECT id FROM refund WHERE order_id=$1',[f.order])).toHaveLength(0);
 });
 test('missing attestation, receipt, recipient or invalid time cannot produce money; order/return versions are checked',async()=>{
  const f=await fixture();
  for(const delta of [{full_amount_confirmed:false},{receipt_reference:' '},{recipient_name:' '},{refunded_at:'bad'},{refunded_at:'2100-01-01T00:00:00Z'},{refunded_at:'2010-01-01T00:00:00Z'}])await expect(service.confirm(f.order,{...f.input,...delta},auth,'bad-proof')).rejects.toMatchObject({status:422});
  for(const delta of [{expected_order_version:1},{expected_return_version:1}])await expect(service.confirm(f.order,{...f.input,...delta},auth,'stale')).rejects.toMatchObject({status:409});
  expect(await db.query('SELECT id FROM refund WHERE order_id=$1',[f.order])).toHaveLength(0);
 });
 test('COD never collected cannot create a refund or collection fiction',async()=>{
  const f=await fixture(false);await expect(service.confirm(f.order,f.input,auth,'not-collected')).rejects.toMatchObject({status:409});expect(await db.query('SELECT id FROM money_movement WHERE order_id=$1',[f.order])).toHaveLength(0);
 });
 test('money timestamps are independent of old order date and journal rows cannot be updated or deleted',async()=>{
  const f=await fixture();await service.confirm(f.order,f.input,auth,'cash-time');
  expect((await db.query("SELECT count(*)::int AS n FROM money_movement WHERE order_id=$1 AND occurred_at>='2026-01-01'",[f.order]))[0].n).toBe(2);
  await expect(db.query('UPDATE money_movement SET amount_vnd=1 WHERE order_id=$1',[f.order])).rejects.toThrow('append-only');
  await expect(db.query('DELETE FROM money_movement WHERE order_id=$1',[f.order])).rejects.toThrow('append-only');
 });
 test('report cash uses event period, half-open bounds and Vietnam day buckets; uncertain history is separated',async()=>{
  const repository=new ReportRepository(db.manager),start=new Date('2026-01-01T00:00:00+07:00'),end=new Date('2027-01-01T00:00:00+07:00');
  const report=await repository.getStoreReportData(store,start,end,'DAY');
  expect(report.order_count).toBe(0);expect(BigInt(report.collected_vnd)).toBeGreaterThan(0n);
  const [cash]=await db.query("SELECT sum(amount_vnd) FILTER(WHERE kind='COLLECTION')::text AS collected,sum(amount_vnd) FILTER(WHERE kind='REFUND')::text AS refunded FROM money_movement WHERE store_id=$1 AND occurred_at >= $2 AND occurred_at < $3",[store,start,end]);
  expect(report.collected_vnd).toBe(cash.collected);expect(report.refunded_vnd).toBe(cash.refunded);
  for(const row of report.cash_series!)expect(new Date(row.bucket_start).toISOString().slice(11)).toBe('17:00:00.000Z');
  const first=(await repository.pageMoney(store,start,end,1,1)).items[0];
  const exclusive=await repository.pageMoney(store,new Date('2020-01-01'),new Date(first.occurred_at),1,100);
  expect(exclusive.items.some((r:any)=>r.id===first.id)).toBe(false);
  expect((await repository.pageMoney(randomUUID(),start,end,1,100)).total).toBe(0);
 });
});
