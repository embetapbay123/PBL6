import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {InventoryService} from '../../catalog-service/src/inventory/inventory.service';
import {DeliveryReturnService} from '../../commerce-service/src/returns/delivery-return.service';
import {DeliveryReturnRunner} from '../../commerce-service/src/returns/delivery-return.runner';
import {OrderInventoryRunner} from '../../commerce-service/src/order/order-inventory.runner';
import {OrderService} from '../../commerce-service/src/order/order.service';
import {PaymentService} from '../../commerce-service/src/payment/payment.service';
import {CodRefundService} from '../../commerce-service/src/payment/cod-refund.service';
import {RefundRunner,DisabledRefundProvider} from '../../commerce-service/src/payment/refund.runner';
import {ApiError} from '../../shared/src/errors';
import {schemaErrors} from '../../shared/src/contract-validation';
import contracts from '../../shared/src/contracts.runtime.generated.json';

// Real M1 + M2 PostgreSQL transactions, routed through their separate service APIs.
// The direct service transport is explicit; this suite is not a provider or HTTP proof.
const suite=process.env.M1_DATABASE_URL&&process.env.M2_DATABASE_URL?describe:describe.skip;
suite('inspected delivery returns across isolated M1 and M2 schemas',()=>{
 let root1:DataSource,root2:DataSource,m1:DataSource,m2:DataSource,schema1:string,schema2:string,inventory:InventoryService,service:DeliveryReturnService;
 const store=randomUUID(),user=randomUUID(),actor=randomUUID(),type=randomUUID();
 const owner={user_id:actor,roles:['CUSTOMER','STORE_OWNER'],store_membership:{store_id:store,role:'OWNER',status:'ACTIVE',permissions:[]}};
 const employee={user_id:randomUUID(),roles:['CUSTOMER','SELLER'],store_membership:{store_id:store,role:'SELLER',status:'ACTIVE',permissions:['order.store.read_status_cancel']}};
 beforeAll(async()=>{
  root1=await new DataSource({type:'postgres',url:process.env.M1_DATABASE_URL}).initialize();root2=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL}).initialize();
  schema1='delivery_m1_'+randomUUID().replace(/-/g,'');schema2='delivery_m2_'+randomUUID().replace(/-/g,'');await root1.query('CREATE SCHEMA '+schema1);await root2.query('CREATE SCHEMA '+schema2);
  m1=await new DataSource({type:'postgres',url:process.env.M1_DATABASE_URL,extra:{options:'-csearch_path='+schema1+',public'}}).initialize();m2=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL,extra:{options:'-csearch_path='+schema2+',public'}}).initialize();
  for(const [source,folder] of [[m1,'catalog-service'],[m2,'commerce-service']] as const){const dir=resolve(__dirname,'../../'+folder+'/migrations');for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())await source.query(readFileSync(resolve(dir,file),'utf8'));}
  const category=randomUUID();await m1.query("INSERT INTO category(id,name,slug,status) VALUES($1,'Test','test','ACTIVE')",[category]);await m1.query("INSERT INTO product_type(id,category_id,name,status) VALUES($1,$2,'Áo','ACTIVE')",[type,category]);
  await m1.query("INSERT INTO attribute_definition(product_type_id,code,name,data_type,required,variant_factor,allowed_values) VALUES($1,'color','Màu','STRING',false,true,NULL),($1,'size','Cỡ','STRING',false,true,NULL)",[type]);
  inventory=new InventoryService(undefined,m1);service=new DeliveryReturnService(m2);
 });
 afterAll(async()=>{if(m1?.isInitialized)await m1.destroy();if(m2?.isInitialized)await m2.destroy();for(const [root,schema] of [[root1,schema1],[root2,schema2]] as const)if(root?.isInitialized){if(/^delivery_m[12]_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();}});
 async function fixture(collected=false,online=false){
  const order=randomUUID(),variant=randomUUID(),product=randomUUID(),item=randomUUID();
  await m1.query("INSERT INTO product(id,store_id,product_type_id,title,status,moderation_status) VALUES($1,$2,$3,'Áo hoàn kiểm thử','ACTIVE','VISIBLE')",[product,store,type]);
  await m1.query("INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status) VALUES($1,$2,$3,$4,100000,'{\"color\":\"Đỏ\",\"size\":\"M\"}','red-m',true,'ACTIVE')",[variant,product,store,'R-'+variant]);await m1.query('INSERT INTO inventory(variant_id,store_id,quantity) VALUES($1,$2,10)',[variant,store]);
  const held=await inventory.reserve({operation_id:randomUUID(),purchase_group_id:order,expires_at:new Date(Date.now()+600000).toISOString(),items:[{variant_id:variant,store_id:store,order_id:order,quantity:3}]});await inventory.consume({operation_id:randomUUID(),order_id:order,reservation_ids:[held.reservations[0].id]});
  const method=online?'SANDBOX':'COD';await m2.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd) VALUES($1,$1,$2,$3,'PREPARING',$4,300000,0,0,20000,320000)`,[order,user,store,method]);
  await m2.query("INSERT INTO order_item(id,order_id,product_id,variant_id,product_snapshot,sku_snapshot,unit_price_vnd,quantity,line_total_vnd) VALUES($1,$2,$3,$4,'{\"title\":\"Áo snapshot\",\"variant_values\":{\"color\":\"Đỏ\",\"size\":\"M\"}}','R-SNAPSHOT',100000,3,300000)",[item,order,product,variant]);
  await m2.query("INSERT INTO order_inventory_state(order_id,reservation_ids,items_json,state,correlation_id) VALUES($1,$2,$3,'CONSUMED','delivery-test')",[order,[held.reservations[0].id],JSON.stringify([{variant_id:variant,store_id:store,quantity:3}])]);
  const payment=await m2.transaction(m=>new PaymentService(m).createForOrder({order_id:order,method,payable_vnd:320000n,operation_id:randomUUID()}));await m2.query("UPDATE \"order\" SET status='SHIPPED' WHERE id=$1",[order]);
  if(online){await m2.query("UPDATE payment SET status='SUCCEEDED',collected_vnd=320000 WHERE id=$1",[payment.id]);await m2.query("INSERT INTO payment_attempt(payment_id,provider_reference,status,amount_vnd) VALUES($1,$2,'SUCCEEDED',320000)",[payment.id,'PBL6'+randomUUID().replace(/-/g,'').toUpperCase()]);}
  else if(collected)await m2.transaction(m=>new PaymentService(m).recordCodCollection({order_id:order,amount_vnd:320000n,operation_id:randomUUID(),actor_user_id:actor}));
  return {order,variant,item,payment};
 }
 const open=(f:any)=>service.open(f.order,{operation_id:randomUUID(),expected_order_version:0,reason:'Khách từ chối nhận; đưa kiện về kiểm'},owner,'delivery-test');
 async function received(f:any){const row=await open(f);return service.inspect(row.id,{operation_id:randomUUID(),expected_version:row.version,lines:[{order_item_id:f.item,received_quantity:3,resellable_quantity:2,damaged_quantity:1,pending_quantity:0}],note:'Đã kiểm: hai bán lại, một hỏng'},employee,'delivery-test');}
 const settle=(row:any)=>service.settle(row.id,{operation_id:randomUUID(),expected_version:row.version},owner,'delivery-test');
 const quantity=async(f:any)=>(await m1.query('SELECT quantity FROM inventory WHERE variant_id=$1',[f.variant]))[0].quantity;
 const runner=()=>new DeliveryReturnRunner(m2,async(_op,body)=>inventory.restockReceived(body));
 test('uncollected COD closes after receipt, restores only sellable units and never fabricates cash/refund',async()=>{
  const f=await fixture(),row=await received(f);await settle(row);await runner().process(row.id);const result=await service.own(f.order,{user_id:user});
  expect(result).toMatchObject({status:'CLOSED',inventory_status:'APPLIED',money_settled:true,payment_status:'CANCELLED'});expect(schemaErrors(result,contracts.operations.getOwnDeliveryReturn.responses['200'])).toEqual([]);expect(await quantity(f)).toBe(9);
  expect(await m2.query('SELECT id FROM money_movement WHERE order_id=$1',[f.order])).toHaveLength(0);expect(await m2.query('SELECT id FROM refund WHERE order_id=$1',[f.order])).toHaveLength(0);
  expect((await m2.query('SELECT status FROM "order" WHERE id=$1',[f.order]))[0].status).toBe('CANCELLED');
  const calls:any[]=[];await new OrderInventoryRunner(m2,async(op,body)=>{calls.push(op);return inventory.restockOrder(body);}).tick();expect(calls).toEqual([]);expect(await quantity(f)).toBe(9);
 });
 test('lost receipt ACK replays the exact frozen command and cannot close early or increment twice',async()=>{
  const f=await fixture(),row=await received(f);await settle(row);const calls:any[]=[];let lost=true;
  const worker=new DeliveryReturnRunner(m2,async(_op,body)=>{calls.push(structuredClone(body));const result=await inventory.restockReceived(body);if(lost){lost=false;throw new ApiError(503,'LOST_ACK','Simulated');}return result;});
  await worker.process(row.id);expect(await quantity(f)).toBe(9);expect((await service.own(f.order,{user_id:user})).status).toBe('SETTLING');
  await worker.process(row.id);expect((await service.own(f.order,{user_id:user})).status).toBe('CLOSED');expect(calls[0]).toEqual(calls[1]);expect(await quantity(f)).toBe(9);
  expect((await m1.query("SELECT count(*)::int AS n FROM stock_movement WHERE order_id=$1 AND reason='RETURN_RECEIVED'",[f.order]))[0].n).toBe(1);
 });
 test('pending, missing or foreign inspection lines cannot settle; correction preserves history before freezing',async()=>{
  const f=await fixture(),row=await open(f);const body={operation_id:randomUUID(),expected_version:0,lines:[{order_item_id:f.item,received_quantity:2,resellable_quantity:1,damaged_quantity:0,pending_quantity:1}],note:'Chờ một món và kiểm một món'};
  await expect(service.inspect(row.id,{...body,lines:[{...body.lines[0],order_item_id:randomUUID()}]},owner,'foreign-line')).rejects.toMatchObject({status:422});
  let r=await service.inspect(row.id,body,employee,'inspect');await expect(settle(r)).rejects.toMatchObject({status:409});
  r=await service.inspect(row.id,{...body,operation_id:randomUUID(),expected_version:r.version,lines:[{...body.lines[0],pending_quantity:0,damaged_quantity:1}]},owner,'partial');await expect(settle(r)).rejects.toMatchObject({status:409,response:{code:'RETURN_RECEIPT_INCOMPLETE'}});
  r=await service.inspect(row.id,{...body,operation_id:randomUUID(),expected_version:r.version,lines:[{...body.lines[0],received_quantity:3,resellable_quantity:2,damaged_quantity:1,pending_quantity:0}]},owner,'correct');
  const settling=await settle(r);await expect(service.inspect(row.id,{...body,operation_id:randomUUID(),expected_version:settling.version},owner,'frozen')).rejects.toMatchObject({status:409});
  expect((await m2.query("SELECT count(*)::int AS n FROM delivery_return_history WHERE case_id=$1 AND action='INSPECTION_RECORDED'",[row.id]))[0].n).toBe(3);
 });
 test('paid COD waits for proof from the correct Owner; full refund including shipping unblocks closure',async()=>{
  const f=await fixture(true),row=await received(f);await settle(row);await runner().process(row.id);let current=await service.own(f.order,{user_id:user});expect(current).toMatchObject({status:'SETTLING',inventory_status:'APPLIED',money_settled:false});
  const order=(await m2.query('SELECT version FROM "order" WHERE id=$1',[f.order]))[0];const proof={operation_id:randomUUID(),expected_order_version:order.version,expected_case_version:current.version,receipt_reference:'TEST-'+row.id,recipient_name:'Người nhận kiểm thử',refunded_at:new Date().toISOString(),full_amount_confirmed:true};
  await expect(new CodRefundService(m2).confirm(f.order,proof,employee,'employee')).rejects.toMatchObject({status:403});
  await new CodRefundService(m2).confirm(f.order,proof,owner,'owner');await runner().process(row.id);current=await service.own(f.order,{user_id:user});expect(current).toMatchObject({status:'CLOSED',money_settled:true});expect(await quantity(f)).toBe(9);
  expect(await m2.query('SELECT kind,amount_vnd FROM money_movement WHERE order_id=$1 ORDER BY kind',[f.order])).toEqual([{kind:'COLLECTION',amount_vnd:'320000'},{kind:'REFUND',amount_vnd:'320000'}]);
 });
 test('online disabled/UNKNOWN never means refunded; reconciled success closes the case with one receipt',async()=>{
  const f=await fixture(false,true),row=await received(f);await settle(row);await runner().process(row.id);
  const disabled=new RefundRunner(m2,new DisabledRefundProvider());await disabled.enqueueDeliveryRefunds();expect(await disabled.tick()).toBe('DISABLED');expect((await service.own(f.order,{user_id:user})).status).toBe('SETTLING');
  let issued=0,looked=0;const moneyWorker=new RefundRunner(m2,{enabled:true,name:'SEPAY_TEST',refund:async()=>{issued++;return {status:'UNKNOWN'};},lookup:async command=>{looked++;return {...command,status:'SUCCEEDED',receipt_id:'TEST-'+command.operation_id};}});
  await moneyWorker.tick();expect((await service.own(f.order,{user_id:user})).money_settled).toBe(false);await m2.query('UPDATE refund_job SET next_attempt_at=now() WHERE refund_id IN (SELECT id FROM refund WHERE order_id=$1)',[f.order]);await moneyWorker.tick();await runner().process(row.id);
  expect((await service.own(f.order,{user_id:user})).status).toBe('CLOSED');expect(issued).toBe(1);expect(looked).toBe(1);expect(await quantity(f)).toBe(9);
 });
 test('opening a case fences stale cash collection and cross-Store/customer reads and writes',async()=>{
  const f=await fixture(),row=await open(f);
  await expect(m2.transaction(m=>new PaymentService(m).recordCodCollection({order_id:f.order,amount_vnd:320000n,operation_id:randomUUID(),actor_user_id:actor}))).rejects.toMatchObject({status:409,response:{code:'DELIVERY_RETURN_IN_PROGRESS'}});
  await expect(service.own(f.order,{user_id:randomUUID()})).rejects.toMatchObject({status:404});
  const foreign={...owner,store_membership:{...owner.store_membership,store_id:randomUUID()}};expect((await service.list(foreign,{})).total).toBe(0);
  await expect(service.inspect(row.id,{operation_id:randomUUID(),expected_version:0,lines:[],note:'Wrong Store'},foreign,'foreign')).rejects.toMatchObject({status:404});
 });

 test('failed-delivery opening races completion and COD collection on the same order lock',async()=>{
  const orders=new OrderService(undefined,{source:m2,quotes:{} as any});
  for(const action of ['COMPLETE','COLLECT'] as const){
   const f=await fixture(action==='COMPLETE');
   const results=await Promise.allSettled([open(f),action==='COMPLETE'
    ?orders.transitionStoreOrder(f.order,{expected_version:0,to_status:'COMPLETED'},owner,'race-complete')
    :orders.collectCod(f.order,{expected_version:0,amount_collected_vnd:320000},owner,'race-collect')]);
   expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
   const rejected=results.find(r=>r.status==='rejected') as PromiseRejectedResult;expect(rejected.reason).toMatchObject({status:409});
   const [order]=await m2.query('SELECT status,version FROM "order" WHERE id=$1',[f.order]),cases=await m2.query('SELECT status FROM delivery_return_case WHERE order_id=$1',[f.order]);
   expect(order.version).toBe(1);expect(await quantity(f)).toBe(7);
   if(results[0].status==='fulfilled'){expect(order.status).toBe('SHIPPED');expect(cases).toEqual([{status:'OPEN'}]);}
   else{expect(cases).toEqual([]);expect(order.status).toBe(action==='COMPLETE'?'COMPLETED':'SHIPPED');}
   const [payment]=await m2.query('SELECT collected_vnd,refunded_vnd FROM payment WHERE order_id=$1',[f.order]);expect(payment.refunded_vnd).toBe('0');
   expect(payment.collected_vnd).toBe(action==='COMPLETE'||results[1].status==='fulfilled'?'320000':'0');
  }
 });

 test('all-damaged receipt closes unpaid COD without stock movement or fabricated money',async()=>{
  const f=await fixture(),opened=await open(f),r=await service.inspect(opened.id,{operation_id:randomUUID(),expected_version:opened.version,lines:[{order_item_id:f.item,received_quantity:3,resellable_quantity:0,damaged_quantity:3,pending_quantity:0}],note:'Đã nhận đủ, cả ba hỏng; không đưa vào lượng bán lại'},employee,'all-damaged');
  await settle(r);await runner().process(r.id);expect(await service.own(f.order,{user_id:user})).toMatchObject({status:'CLOSED',inventory_status:'APPLIED',money_settled:true,payment_status:'CANCELLED'});expect(await quantity(f)).toBe(7);
  expect(await m1.query("SELECT id FROM stock_movement WHERE order_id=$1 AND reason='RETURN_RECEIVED'",[f.order])).toEqual([]);
  expect(await m2.query('SELECT id FROM money_movement WHERE order_id=$1',[f.order])).toEqual([]);
 });
});
