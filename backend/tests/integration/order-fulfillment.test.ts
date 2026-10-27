import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {OrderService} from '../../commerce-service/src/order/order.service';
import {OrderReturnService} from '../../commerce-service/src/order/order-return.service';
import {ReportRepository} from '../../commerce-service/src/report/report.repository';
import {schemaErrors} from '../../shared/src/contract-validation';
import bundle from '../../shared/src/contracts.runtime.generated.json';

(process.env.M2_DATABASE_URL?describe:describe.skip)('Scoped Order filters and manual fulfillment',()=>{
 let root:DataSource,db:DataSource,schema:string,service:OrderService;
 beforeAll(async()=>{
  const url=process.env.M2_DATABASE_URL!;schema='fulfillment_'+randomUUID().replace(/-/g,'');
  root=new DataSource({type:'postgres',url});await root.initialize();await root.query('CREATE SCHEMA '+schema);
  db=new DataSource({type:'postgres',url,extra:{options:'-csearch_path='+schema+',public',statement_timeout:10000}});await db.initialize();
  const folder=resolve(__dirname,'../../commerce-service/migrations');for(const name of readdirSync(folder).filter(n=>n.endsWith('.sql')).sort())await db.query(readFileSync(resolve(folder,name),'utf8'));
  service=new OrderService(undefined,{source:db});
 });
 afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(root?.isInitialized){if(/^fulfillment_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy()}});
 async function fixture(status='PROCESSING',user=randomUUID(),store=randomUUID(),date='2026-10-27T03:00:00Z'){
  const id=randomUUID(),actor=randomUUID(),variant=randomUUID();
  await db.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd,created_at) VALUES($1,$1,$2,$3,$4,'COD',1000,0,0,0,1000,$5)`,[id,user,store,status,date]);
  await db.query("INSERT INTO payment(order_id,method,status,payable_vnd,collectible_vnd,collected_vnd) VALUES($1,'COD','PENDING',1000,1000,0)",[id]);
  await db.query("INSERT INTO order_item(order_id,product_id,variant_id,sku_snapshot,unit_price_vnd,quantity,line_total_vnd,product_snapshot) VALUES($1,$2,$2,'TEST',1000,1,1000,$3)",[id,variant,{title:'Test purchase'}]);
  const auth={user_id:actor,store_membership:{store_id:store,role:'OWNER',status:'ACTIVE',permissions:[]}};
  return {id,user,store,actor,variant,auth};
 }
 const shipment={carrier_name:'Store delivery',tracking_code:'MANUAL-001',dispatch_note:'Handed over at counter'};
 test('Customer/Store filters scope every row and count; date end is exclusive and code is parameterized',async()=>{
  const a=await fixture('PENDING'),b=await fixture('PENDING',a.user,a.store),foreign=await fixture('PENDING',randomUUID(),a.store);
  await fixture('PENDING',a.user,randomUUID(),'2026-10-26T03:00:00Z');
  const query={status:'PENDING' as const,from:'2026-10-27T00:00:00Z',to:'2026-10-28T00:00:00Z',page:1,size:1};
  const own=await service.listOwnOrders(query,{user_id:a.user},'filters');expect(own.total).toBe(2);expect(own.items).toHaveLength(1);
  const next=await service.listOwnOrders({...query,page:2},{user_id:a.user},'filters');expect(next.total).toBe(2);expect(next.items[0].id).not.toBe(own.items[0].id);
  expect((await service.listStoreOrders({...query,size:20},a.auth,'filters')).total).toBe(3);
  const code='PBL-'+b.id.replace(/-/g,'').slice(-8).toUpperCase();expect((await service.listOwnOrders({q:code},{user_id:a.user},'code')).items.map(o=>o.id)).toEqual([b.id]);
  expect((await service.listOwnOrders({q:foreign.id},{user_id:a.user},'foreign')).total).toBe(0);
  await expect(service.listOwnOrders({q:"' OR true --"},{user_id:a.user},'bad')).rejects.toMatchObject({status:422});
  await expect(service.listOwnOrders({from:query.to,to:query.from},{user_id:a.user},'period')).rejects.toMatchObject({status:422});
  const admin=await new ReportRepository(db.manager).pageAllOrders(1,20,{q:b.id});expect(admin.total).toBe(1);expect(admin.items[0].id).toBe(b.id);
 });
 test('shipping requires evidence and serializes concurrent versions; response contains the committed Shipment/history',async()=>{
  const f=await fixture();await expect(service.transitionStoreOrder(f.id,{to_status:'SHIPPED',expected_version:0},f.auth,'missing')).rejects.toMatchObject({status:422});
  await expect(service.transitionStoreOrder(f.id,{to_status:'SHIPPED',expected_version:0,shipment},{...f.auth,store_membership:{...f.auth.store_membership,store_id:randomUUID()}},'scope')).rejects.toMatchObject({status:404});
  const results=await Promise.allSettled([1,2].map(()=>service.transitionStoreOrder(f.id,{to_status:'SHIPPED',expected_version:0,shipment},f.auth,'ship')));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);const shipped=(results.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<any>).value;
  expect(shipped).toMatchObject({status:'SHIPPED',version:1,shipment:{status:'SHIPPED',source:'MANUAL',tracking_code:shipment.tracking_code,dispatched_by:f.actor}});
  expect(shipped.status_history).toHaveLength(1);expect(schemaErrors(shipped,bundle.operations.transitionStoreOrder.responses['200'])).toEqual([]);
  expect(await db.query('SELECT id FROM shipment WHERE order_id=$1',[f.id])).toHaveLength(1);
 });
 test('collected money does not complete a delivery; explicit receipt evidence is required',async()=>{
  const f=await fixture();await service.transitionStoreOrder(f.id,{to_status:'SHIPPED',expected_version:0,shipment},f.auth,'ship');
  await expect(service.transitionStoreOrder(f.id,{to_status:'COMPLETED',expected_version:1,delivery_confirmation:{confirmed:true,note:'Recipient verified'}},f.auth,'unpaid')).rejects.toMatchObject({status:409,response:{code:'PAYMENT_NOT_COLLECTED'}});
  await db.query("UPDATE payment SET status='SUCCEEDED',collected_vnd=1000 WHERE order_id=$1",[f.id]);
  await expect(service.transitionStoreOrder(f.id,{to_status:'COMPLETED',expected_version:1},f.auth,'missing')).rejects.toMatchObject({status:422,response:{code:'DELIVERY_CONFIRMATION_REQUIRED'}});
  const complete=await service.transitionStoreOrder(f.id,{to_status:'COMPLETED',expected_version:1,delivery_confirmation:{confirmed:true,note:'Signed receipt checked'}},f.auth,'complete');
  expect(complete).toMatchObject({status:'COMPLETED',version:2,shipment:{status:'DELIVERED',delivered_by:f.actor,delivery_note:'Signed receipt checked'}});
  expect(complete.shipment?.delivered_at).toBeDefined();expect(complete.status_history).toHaveLength(2);
  expect(await db.query("SELECT id FROM outbox WHERE event_type='OrderCompleted' AND payload->>'order_id'=$1",[f.id])).toHaveLength(1);
 });
 test('audit failure rolls back Order, Shipment and history in the same transaction',async()=>{
  const f=await fixture();await db.query("CREATE FUNCTION fail_fulfillment_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='TRANSITION_ORDER' THEN RAISE EXCEPTION 'audit unavailable'; END IF; RETURN NEW; END $$");
  await db.query('CREATE TRIGGER fail_fulfillment_audit BEFORE INSERT ON m2_audit FOR EACH ROW EXECUTE FUNCTION fail_fulfillment_audit()');
  try{await expect(service.transitionStoreOrder(f.id,{to_status:'SHIPPED',expected_version:0,shipment},f.auth,'rollback')).rejects.toThrow('audit unavailable');
   expect((await db.query('SELECT status,version FROM "order" WHERE id=$1',[f.id]))[0]).toEqual({status:'PROCESSING',version:0});
   expect(await db.query('SELECT id FROM shipment WHERE order_id=$1',[f.id])).toHaveLength(0);expect(await db.query('SELECT id FROM order_status_history WHERE order_id=$1',[f.id])).toHaveLength(0);
  }finally{await db.query('DROP TRIGGER fail_fulfillment_audit ON m2_audit');await db.query('DROP FUNCTION fail_fulfillment_audit()')}
 });
 test('failed delivery updates Shipment and blocks completion; receipt returns stock only through recovery',async()=>{
  const f=await fixture();await service.transitionStoreOrder(f.id,{to_status:'SHIPPED',expected_version:0,shipment},f.auth,'ship');
  await db.query("INSERT INTO order_inventory_state(order_id,reservation_ids,items_json,state,correlation_id) VALUES($1,$2,$3,'CONSUMED','test')",[f.id,[randomUUID()],JSON.stringify([{variant_id:f.variant,store_id:f.store,quantity:1}])]);
  const returns=new OrderReturnService(db),created=await returns.create(f.id,{expected_order_version:1,operation_id:randomUUID(),reason:'Recipient unavailable'},f.auth,'failed',true);
  expect(created.shipment?.status).toBe('DELIVERY_FAILED');
  await expect(service.transitionStoreOrder(f.id,{to_status:'COMPLETED',expected_version:created.version,delivery_confirmation:{confirmed:true,note:'Invalid while returning'}},f.auth,'blocked')).rejects.toMatchObject({status:409,response:{code:'RETURN_IN_PROGRESS'}});
  const received=await returns.decide(f.id,{expected_order_version:created.version,expected_version:created.return_case!.version,operation_id:randomUUID(),action:'RECEIVE',restock:true,reason:'All items physically received'},f.auth,'received');
  expect(received).toMatchObject({status:'RETURNED',shipment:{status:'RETURNED'}});
  expect((await db.query('SELECT state,command_kind FROM order_inventory_state WHERE order_id=$1',[f.id]))[0]).toEqual({state:'CONSUMED',command_kind:'RESTOCK'});
 });
});
