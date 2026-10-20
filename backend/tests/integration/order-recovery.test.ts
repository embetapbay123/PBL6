import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { OrderService } from '../../commerce-service/src/order/order.service';
import { CheckoutRunner, CheckoutPlan } from '../../commerce-service/src/order/checkout.runner';
import { OrderInventoryRunner } from '../../commerce-service/src/order/order-inventory.runner';
import { PaymentService } from '../../commerce-service/src/payment/payment.service';
import { ApiError } from '../../shared/src/errors';
import { schemaErrors } from '../../shared/src/contract-validation';
import bundle from '../../shared/src/contracts.runtime.generated.json';

// Real PostgreSQL transactions, constraints and concurrent connections; M1 is an explicit
// command-ledger stand-in. Never truncate/seed the shared M2 schema or call a money provider.
const suite=process.env.M2_DATABASE_URL?describe:describe.skip;
suite('durable Order recovery in an isolated M2 schema',()=>{
  let admin:DataSource,db:DataSource,schema:string;
  const user=randomUUID(),store=randomUUID(),product=randomUUID(),variant=randomUUID(),address=randomUUID(),cart=randomUUID();
  const auth={user_id:user,access_token:'integration-token',roles:['CUSTOMER']};
  let records:Map<string,any>,ledger:Map<string,{payload:string;result:any}>,calls:Array<{op:string;body:any;corr:string}>;
  let lost:Set<string>,effects:Map<string,number>,pause:Promise<void>|undefined,arrived:(()=>void)|undefined;
  const unavailable=()=>new ApiError(503,'DEPENDENCY_UNAVAILABLE','Simulated lost response');
  const call=async(op:string,body:any,corr:string):Promise<any>=>{
    calls.push({op,body:structuredClone(body),corr});
    if(op==='QuoteVariants')return {items:body.items.map((i:any)=>({...i,price_vnd:1000,available_quantity:10,version:0}))};
    if(op==='ResolveCheckoutContext')return {address_snapshot:{id:address},stores:body.store_ids.map((id:string)=>({id,name:'Test Store',shipping_fee_vnd:0,version:0}))};
    const saved=ledger.get(body.operation_id),payload=JSON.stringify(body);
    if(saved){expect(saved.payload).toBe(payload);return saved.result;}
    const result=op==='ReserveInventory'?{reservations:body.items.map((i:any)=>({id:randomUUID(),order_id:i.order_id,variant_id:i.variant_id,quantity:i.quantity,expires_at:body.expires_at}))}:
      {operation_id:body.operation_id,status:'APPLIED'};
    ledger.set(body.operation_id,{payload,result});effects.set(op,(effects.get(op)??0)+1);
    if(op==='ReserveInventory' && pause){arrived?.();await pause;}
    if(lost.delete(op))throw unavailable();
    return result;
  };
  function service(extra:Record<string,any>={}) {
    return new OrderService((()=>({call})) as any,{source:db,
      catalog:{product:async()=>({id:product,store_id:store,title:'Recovery product',variants:[{id:variant,sku:'R',price_vnd:1000}]})} as any,
      quotes:{put:async(id,r)=>{records.set(id,r);},get:async id=>records.get(id)},...extra});
  }
  async function checkout(method:'COD'|'SANDBOX'='COD',extra:Record<string,any>={}) {
    const item=randomUUID();await db.query('INSERT INTO cart_item(id,cart_id,variant_id,product_id,store_id,quantity,added_at) VALUES($1,$2,$3,$4,$5,1,now())',[item,cart,variant,product,store]);
    const input={cart_item_ids:[item],address_id:address,payment_methods:{[store]:method},...extra};
    const s=service(),q=await s.quoteCheckout(input,auth,'order-integration');
    return {s,input:{...input,quote_id:q.quote_id,expected_payable_total_vnd:q.payable_total_vnd},item};
  }
  async function count(table:string){return (await db.query(`SELECT count(*)::int AS n FROM ${table}`))[0].n;}
  async function due(){await db.query("UPDATE checkout_attempt SET next_attempt_at=now(),lease_until=CASE WHEN lease_token IS NULL THEN NULL ELSE now()-interval '1 second' END");await db.query("UPDATE order_inventory_state SET next_attempt_at=now(),lease_until=CASE WHEN lease_token IS NULL THEN NULL ELSE now()-interval '1 second' END");}
  beforeAll(async()=>{
    admin=new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL});await admin.initialize();
    schema='order_test_'+randomUUID().replace(/-/g,'');await admin.query('CREATE SCHEMA '+schema);
    db=new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public',statement_timeout:10000}});await db.initialize();
    const dir=resolve(__dirname,'../../commerce-service/migrations');
    for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(dir,file),'utf8'));
  });
  afterAll(async()=>{
    if(db?.isInitialized)await db.destroy();
    if(admin?.isInitialized){if(/^order_test_[a-f0-9]{32}$/.test(schema))await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.destroy();}
  });
  beforeEach(async()=>{
    // All tables below live only in this suite's unique schema.
    await db.query('TRUNCATE checkout_attempt,cart,"order",voucher,operation_result CASCADE');
    await db.query('TRUNCATE m2_audit,outbox');
    await db.query('INSERT INTO cart(id,customer_user_id,updated_at) VALUES($1,$2,now())',[cart,user]);
    records=new Map();ledger=new Map();calls=[];lost=new Set();effects=new Map();pause=undefined;arrived=undefined;
  });
  test('concurrent same-key Confirm has one durable attempt, one reserve effect and a contract-valid saved response',async()=>{
    const {s,input}=await checkout();let release!:()=>void,started!:()=>void;
    pause=new Promise(r=>{release=r;});const entered=new Promise<void>(r=>{started=r;});arrived=started;
    const first=s.confirmCheckout(input,'same-key',auth,'order-integration');await entered;
    await expect(service().confirmCheckout(input,'same-key',auth,'retry')).rejects.toMatchObject({status:503});
    await expect(service().confirmCheckout({...input,expected_payable_total_vnd:999},'same-key',auth,'retry')).rejects.toMatchObject({status:409});
    release();const result=await first;
    expect(schemaErrors(result,bundle.operations.confirmCheckout.responses['201'])).toEqual([]);
    expect(result.orders[0].items![0].id).toMatch(/^[a-f0-9-]{36}$/);
    expect(result.orders[0].status).toBe('PREPARING');
    records.clear();expect(await service().confirmCheckout(input,'same-key',auth,'retry')).toEqual(result);
    expect(await count('checkout_attempt')).toBe(1);expect(await count('"order"')).toBe(1);expect(effects.get('ReserveInventory')).toBe(1);
    expect(await count('payment')).toBe(1);expect(await count('cart_item')).toBe(0);
    expect((await db.query('SELECT reservation_ids,command_kind FROM order_inventory_state'))[0]).toMatchObject({command_kind:'CONSUME'});
    expect(calls.filter(x=>x.op==='ConsumeReservation')).toHaveLength(0);
  });
  test('lost Reserve response resumes after restart with the exact original expiry, IDs and correlation, without Redis',async()=>{
    const {s,input}=await checkout();lost.add('ReserveInventory');
    await expect(s.confirmCheckout(input,'lost-reserve',auth,'original-correlation')).rejects.toMatchObject({status:503});
    records.clear();await due();await service().recoverOrders();
    const reserves=calls.filter(x=>x.op==='ReserveInventory');expect(reserves).toHaveLength(2);expect(reserves[0]).toEqual(reserves[1]);
    expect(effects.get('ReserveInventory')).toBe(1);expect(await count('"order"')).toBe(1);
    expect((await db.query('SELECT status FROM "order"'))[0].status).toBe('PENDING');
    const result=await service().confirmCheckout(input,'lost-reserve',auth,'retry');expect(result.orders[0].status).toBe('PREPARING');
  });
  test('unknown database failure after Reserve retains READY and worker commits without a second Reserve',async()=>{
    const {input}=await checkout();let fail=true;
    const s=service({payments:(m:any)=>{const port=new PaymentService(m);return {...port,manager:m,createForOrder:async(p:any)=>{if(fail){fail=false;throw new Error('DB response lost');}return port.createForOrder(p);}};}});
    await expect(s.confirmCheckout(input,'db-retry',auth,'corr')).rejects.toMatchObject({status:503});
    expect(await count('"order"')).toBe(0);expect((await db.query('SELECT phase FROM checkout_attempt'))[0].phase).toBe('READY');
    await due();await service().recoverOrders();expect(await count('"order"')).toBe(1);expect(effects.get('ReserveInventory')).toBe(1);
  });
  test('Payment business failure rolls back Order, items, audit, vouchers and Cart removal; lost Release is replayed exactly',async()=>{
    const voucher=randomUUID();await db.query(`INSERT INTO voucher(id,code,scope,store_id,owner_user_id,discount_type,discount_value,min_goods_vnd,starts_at,ends_at,usage_limit,per_customer_limit,status,version)
      VALUES($1,'TEST','STORE',$2,$3,'FIXED',100,0,now()-interval '1 day',now()+interval '1 day',5,5,'ACTIVE',0)`,[voucher,store,user]);
    const {input}=await checkout('COD',{store_vouchers:{[store]:'TEST'}});lost.add('ReleaseReservation');
    const s=service({payments:(m:any)=>({manager:m,createForOrder:async()=>{throw new ApiError(409,'PAYMENT_DRAFT_CONFLICT','Rejected');}})});
    await expect(s.confirmCheckout(input,'rollback',auth,'corr')).rejects.toMatchObject({status:503});
    for(const table of ['"order"','order_item','payment','voucher_reservation','voucher_redemption','m2_audit','order_inventory_state'])expect(await count(table)).toBe(0);
    expect(await count('cart_item')).toBe(1);expect((await db.query('SELECT phase FROM checkout_attempt'))[0].phase).toBe('COMPENSATING');
    await due();await service().recoverOrders();
    await expect(service().confirmCheckout(input,'rollback',auth,'retry')).rejects.toMatchObject({status:409,response:{code:'PAYMENT_DRAFT_CONFLICT'}});
    const releases=calls.filter(x=>x.op==='ReleaseReservation');expect(releases).toHaveLength(2);expect(releases[0]).toEqual(releases[1]);expect(effects.get('ReleaseReservation')).toBe(1);
    expect((await db.query('SELECT phase FROM checkout_attempt'))[0].phase).toBe('FAILED');
  });
  test('two different keys for the same Cart commit only one purchase and release the losing hold',async()=>{
    const {s,input}=await checkout();let release!:()=>void,entered!:()=>void;pause=new Promise(r=>{release=r;});const barrier=new Promise<void>(r=>{entered=r;});let n=0;arrived=()=>{if(++n===2)entered();};
    const a=s.confirmCheckout(input,'key-a',auth,'corr'),b=service().confirmCheckout(input,'key-b',auth,'corr');await barrier;release();
    const outcomes=await Promise.allSettled([a,b]);expect(outcomes.filter(x=>x.status==='fulfilled')).toHaveLength(1);expect(await count('"order"')).toBe(1);expect(effects.get('ReleaseReservation')).toBe(1);
  });
  test('lost COD Consume ACK leaves RECOVERING and replays the saved reservation IDs before PENDING',async()=>{
    const {s,input}=await checkout();const result=await s.confirmCheckout(input,'consume',auth,'corr');lost.add('ConsumeReservation');
    await service().recoverOrders();expect((await db.query('SELECT status FROM "order"'))[0].status).toBe('RECOVERING');
    await due();await service().recoverOrders();
    const commands=calls.filter(x=>x.op==='ConsumeReservation');expect(commands).toHaveLength(2);expect(commands[0]).toEqual(commands[1]);expect(effects.get('ConsumeReservation')).toBe(1);
    expect(commands[0].body.reservation_ids).toEqual((await db.query('SELECT reservation_ids FROM order_inventory_state'))[0].reservation_ids);
    expect(commands[0].body.reservation_ids).not.toEqual(result.order_ids);
    expect((await db.query('SELECT status FROM "order"'))[0].status).toBe('PENDING');
    const history=await count('order_status_history');await due();await service().recoverOrders();expect(await count('order_status_history')).toBe(history);
    expect((await db.query('SELECT count(*)::int AS n FROM outbox WHERE event_type IN (\'OrderCreated\',\'OrderCancelled\')'))[0].n).toBe(0);
  });
  test('two-Store mixed-method group commits platform allocations and Payments with one manager',async()=>{
    const otherStore=randomUUID(),otherProduct=randomUUID(),otherVariant=randomUUID(),ids=[randomUUID(),randomUUID()];
    for(let i=0;i<2;i++)await db.query('INSERT INTO cart_item(id,cart_id,variant_id,product_id,store_id,quantity,added_at) VALUES($1,$2,$3,$4,$5,1,now())',[ids[i],cart,i?otherVariant:variant,i?otherProduct:product,i?otherStore:store]);
    const voucher=randomUUID();await db.query(`INSERT INTO voucher(id,code,scope,owner_user_id,discount_type,discount_value,min_goods_vnd,starts_at,ends_at,usage_limit,per_customer_limit,status,version)
      VALUES($1,'PLATFORM','PLATFORM',$2,'FIXED',101,0,now()-interval '1 day',now()+interval '1 day',5,5,'ACTIVE',0)`,[voucher,user]);
    const s=service({catalog:{product:async(id:string)=>({id,store_id:id===product?store:otherStore,title:'Mixed group',variants:[{id:id===product?variant:otherVariant,sku:id,price_vnd:1000}]})}});
    const quoteInput={cart_item_ids:ids,address_id:address,payment_methods:{[store]:'COD' as const,[otherStore]:'SANDBOX' as const},platform_voucher_code:'PLATFORM'};
    const quote=await s.quoteCheckout(quoteInput,auth,'mixed');const result=await s.confirmCheckout({...quoteInput,quote_id:quote.quote_id,expected_payable_total_vnd:1899},'mixed',auth,'mixed');
    expect(result.orders).toHaveLength(2);expect(result.orders.map(x=>x.status).sort()).toEqual(['AWAITING_PAYMENT','PREPARING']);
    expect(result.orders.reduce((sum,x)=>sum+x.amounts.platform_discount_vnd,0)).toBe(101);expect(await count('payment')).toBe(2);expect(await count('voucher_redemption')).toBe(2);
    expect((await db.query('SELECT status FROM voucher_reservation'))[0].status).toBe('RESERVED');
    expect(schemaErrors(result,bundle.operations.confirmCheckout.responses['201'])).toEqual([]);
    await s.recoverOrders();expect((await db.query("SELECT status FROM \"order\" WHERE payment_method='COD'"))[0].status).toBe('PENDING');expect(effects.get('ConsumeReservation')).toBe(1);
  });
  test('stale inventory lease cannot finalize a command twice after a replacement worker acknowledges it',async()=>{
    const {s,input}=await checkout();const result=await s.confirmCheckout(input,'lease',auth,'corr');const id=result.order_ids[0];
    let release!:()=>void,entered!:()=>void;const started=new Promise<void>(r=>{entered=r;});const wait=new Promise<void>(r=>{release=r;});
    const first=new OrderInventoryRunner(db,async(op,body,corr)=>{const result=await call(op,body,corr);entered();await wait;return result;}).process(id);
    await started;await due();await new OrderInventoryRunner(db,call).process(id);const history=await count('order_status_history');release();await first;
    expect(await count('order_status_history')).toBe(history);expect(effects.get('ConsumeReservation')).toBe(1);expect((await db.query('SELECT status FROM "order"'))[0].status).toBe('PENDING');
  });
  test('SANDBOX waits for successful payment proof, consumes, and atomically completes its Payment follow-up',async()=>{
    const {s,input}=await checkout('SANDBOX');const result=await s.confirmCheckout(input,'online',auth,'corr');expect(result.orders[0].status).toBe('AWAITING_PAYMENT');expect(result.orders[0].payment_expires_at).toBeDefined();
    await service().recoverOrders();expect(effects.get('ConsumeReservation')).toBeUndefined();
    const [p]=await db.query('SELECT * FROM payment');const attempt=randomUUID();
    await db.query("INSERT INTO payment_attempt(id,payment_id,provider_reference,status,amount_vnd) VALUES($1,$2,$3,'SUCCEEDED',1000)",[attempt,p.id,randomUUID()]);
    await db.query("UPDATE payment SET status='SUCCEEDED',collected_vnd=payable_vnd WHERE id=$1",[p.id]);
    await db.query("INSERT INTO payment_followup(attempt_id,payment_id,order_id,kind,correlation_id) VALUES($1,$2,$3,'CONSUME_REQUIRED','corr')",[attempt,p.id,result.order_ids[0]]);
    await due();await service().recoverOrders();expect((await db.query('SELECT status FROM "order"'))[0].status).toBe('PENDING');expect((await db.query('SELECT status,resolution FROM payment_followup'))[0]).toEqual({status:'DONE',resolution:'CONSUMED'});
  });
  test('expired online order with UNKNOWN payment remains RECOVERING without releasing stock',async()=>{
    const {s,input}=await checkout('SANDBOX');await s.confirmCheckout(input,'uncertain',auth,'corr');const [p]=await db.query('SELECT * FROM payment');
    await db.query("INSERT INTO payment_attempt(payment_id,provider_reference,status,amount_vnd) VALUES($1,$2,'UNKNOWN',1000)",[p.id,randomUUID()]);await db.query("UPDATE \"order\" SET payment_expires_at=now()-interval '1 second'");
    await service().recoverOrders();expect((await db.query('SELECT status FROM "order"'))[0].status).toBe('RECOVERING');expect(effects.get('ReleaseReservation')).toBeUndefined();
    expect((await db.query('SELECT status FROM payment_attempt'))[0].status).toBe('UNKNOWN');
  });
  test('expired unpaid order releases stock; late proved payment queues an actual Refund and never reports it succeeded',async()=>{
    const {s,input}=await checkout('SANDBOX');const result=await s.confirmCheckout(input,'expired',auth,'corr');await db.query("UPDATE \"order\" SET payment_expires_at=now()-interval '1 second'");
    await service().recoverOrders();expect((await db.query('SELECT status FROM "order"'))[0].status).toBe('EXPIRED');expect(effects.get('ReleaseReservation')).toBe(1);
    const [p]=await db.query('SELECT * FROM payment');const attempt=randomUUID();
    await db.query("INSERT INTO payment_attempt(id,payment_id,provider_reference,status,amount_vnd) VALUES($1,$2,$3,'SUCCEEDED',1000)",[attempt,p.id,randomUUID()]);await db.query("UPDATE payment SET status='SUCCEEDED',collected_vnd=payable_vnd WHERE id=$1",[p.id]);
    await db.query("INSERT INTO payment_followup(attempt_id,payment_id,order_id,kind,correlation_id) VALUES($1,$2,$3,'REFUND_REQUIRED','corr')",[attempt,p.id,result.order_ids[0]]);
    await due();await service().recoverOrders();expect(await count('refund')).toBe(1);expect(await count('refund_job')).toBe(1);
    expect((await db.query('SELECT status FROM refund'))[0].status).not.toBe('SUCCEEDED');expect((await db.query('SELECT status FROM payment_followup'))[0].status).toBe('PENDING');
    await due();await service().recoverOrders();expect(await count('refund')).toBe(1);
  });
  test('READY attempt survives process loss and a fresh runner completes its saved plan',async()=>{
    let commits=0;const orderId=randomUUID(),group=randomUUID();
    const plan:CheckoutPlan={userId:user,purchaseGroupId:group,correlation:'corr',input:{} as any,storeOrders:[{orderId}],context:{},payable:1000,reserve:{operation_id:randomUUID(),purchase_group_id:group,expires_at:new Date(Date.now()+60000).toISOString(),items:[{order_id:orderId,variant_id:variant,store_id:store,quantity:1}]}};
    const response={purchase_group_id:group,order_ids:[orderId],orders:[],payable_total_vnd:1000};
    const runner=new CheckoutRunner(db,call,async()=>{commits++;throw new Error('process interrupted');});
    await expect(runner.confirm(user,'ready','hash','corr',async()=>plan)).rejects.toMatchObject({status:503});
    await due();await new CheckoutRunner(db,call,async()=>response).tick();expect((await db.query("SELECT phase,response_json FROM checkout_attempt WHERE key='ready'"))[0]).toMatchObject({phase:'COMMITTED',response_json:response});expect(commits).toBe(1);expect(effects.get('ReserveInventory')).toBe(1);
  });
});
