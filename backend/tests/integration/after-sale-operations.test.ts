import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {InventoryService} from '../../catalog-service/src/inventory/inventory.service';
import {ReturnsService} from '../../commerce-service/src/returns/returns.service';
import {ReturnsRunner} from '../../commerce-service/src/returns/returns.runner';
import {PaymentService} from '../../commerce-service/src/payment/payment.service';
import {CodRefundService} from '../../commerce-service/src/payment/cod-refund.service';
import {RefundRunner} from '../../commerce-service/src/payment/refund.runner';
import {ApiError} from '../../shared/src/errors';
const suite=process.env.M1_DATABASE_URL&&process.env.M2_DATABASE_URL?describe:describe.skip;
suite('inspected after-sale returns across isolated M1 and M2 schemas',()=>{
 let root1:DataSource,root2:DataSource,m1:DataSource,m2:DataSource,schema1:string,schema2:string,inventory:InventoryService,service:ReturnsService;
 const store=randomUUID(),user=randomUUID(),actor=randomUUID(),type=randomUUID();
 const owner={user_id:actor,roles:['CUSTOMER','STORE_OWNER'],store_membership:{store_id:store,role:'OWNER',status:'ACTIVE',permissions:[]}};
 const employee={user_id:randomUUID(),roles:['CUSTOMER','SELLER'],store_membership:{store_id:store,role:'SELLER',status:'ACTIVE',permissions:['order.store.read_status_cancel']}};
 beforeAll(async()=>{
  root1=await new DataSource({type:'postgres',url:process.env.M1_DATABASE_URL}).initialize();root2=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL}).initialize();
  schema1='aftersale_m1_'+randomUUID().replace(/-/g,'');schema2='aftersale_m2_'+randomUUID().replace(/-/g,'');await root1.query('CREATE SCHEMA '+schema1);await root2.query('CREATE SCHEMA '+schema2);
  m1=await new DataSource({type:'postgres',url:process.env.M1_DATABASE_URL,extra:{options:'-csearch_path='+schema1+',public'}}).initialize();m2=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL,extra:{options:'-csearch_path='+schema2+',public'}}).initialize();
  for(const [source,folder] of [[m1,'catalog-service'],[m2,'commerce-service']] as const){const dir=resolve(__dirname,'../../'+folder+'/migrations');for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())await source.query(readFileSync(resolve(dir,file),'utf8'));}
  const category=randomUUID();await m1.query("INSERT INTO category(id,name,slug,status) VALUES($1,'Test','test','ACTIVE')",[category]);await m1.query("INSERT INTO product_type(id,category_id,name,status) VALUES($1,$2,'Áo','ACTIVE')",[type,category]);
  await m1.query("INSERT INTO attribute_definition(product_type_id,code,name,data_type,required,variant_factor,allowed_values) VALUES($1,'color','Màu','STRING',false,true,NULL),($1,'size','Cỡ','STRING',false,true,NULL)",[type]);
  inventory=new InventoryService(undefined,m1);service=new ReturnsService(m2);
 });
 afterAll(async()=>{if(m1?.isInitialized)await m1.destroy();if(m2?.isInitialized)await m2.destroy();for(const [root,schema] of [[root1,schema1],[root2,schema2]] as const)if(root?.isInitialized){if(/^aftersale_m[12]_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();}});
 async function fixture(collected=true,online=false){
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
  await m2.query("UPDATE \"order\" SET status='COMPLETED' WHERE id=$1",[order]);
  return {order,variant,item,payment,product};
 }
 const runner=()=>new ReturnsRunner(m2,async(op,body)=>op==='RestockReceivedItems'?inventory.restockReceived(body):inventory.dispatchExchange(body));
 const buyer={user_id:user};
 const admin={user_id:randomUUID(),roles:['ADMIN'],role_permissions:['platform.admin']};
 const quantity=async(variant:string)=>(await m1.query('SELECT quantity FROM inventory WHERE variant_id=$1',[variant]))[0].quantity;
 async function approved(f:any,type:'REFUND'|'EXCHANGE'='REFUND',fault:'STORE'|'CUSTOMER'|'DISPUTED'='STORE'){
  const request=await service.create(f.order,{type,reason:'Hàng cần xử lý sau mua',expected_order_version:0},buyer,'create');
  return service.transition(request.id,{status:'APPROVED',operation_id:randomUUID(),expected_version:request.version,decision_note:'Đã kiểm tra thông tin, chấp thuận xử lý',fault_party:fault,return_instructions:'Gửi đến kho trả kiểm thử, 0900000000, địa chỉ nhận trả đã thống nhất'},employee,'STORE','approve');
 }
 async function received(f:any,request:any){return service.transition(request.id,{status:'RECEIVED',operation_id:randomUUID(),expected_version:request.version,inspection:[{order_item_id:f.item,received_quantity:3,resellable_quantity:2,damaged_quantity:1,pending_quantity:0}],inspection_note:'Đã nhận đủ ba, hai còn bán được và một hỏng'},employee,'STORE','inspect');}
 async function current(id:string){return (await service.list(owner,'STORE',{order_id:id})).items[0];}
 async function replacement(f:any,stock=10,price=100000){const variant=randomUUID();await m1.query("INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status) VALUES($1,$2,$3,$4,$5,'{\"size\":\"L\"}',$4,false,'ACTIVE')",[variant,f.product,store,'REPLACE-'+variant,price]);await m1.query('INSERT INTO inventory(variant_id,store_id,quantity) VALUES($1,$2,$3)',[variant,store,stock]);return variant;}
 const proof=(f:any,r:any)=>({operation_id:randomUUID(),expected_order_version:0,expected_return_version:r.version,receipt_reference:'TEST-'+randomUUID(),recipient_name:'Người nhận test',refunded_at:new Date().toISOString(),full_amount_confirmed:true});
 test('writer rollback pauses new exchange effects, preserves the command, then resumes once',async()=>{
  const previous=process.env.EXCHANGE_DISPATCH_WRITES_ENABLED;
  try{
   process.env.EXCHANGE_DISPATCH_WRITES_ENABLED='false';
   const f=await fixture(),variant=await replacement(f),r=await received(f,await approved(f,'EXCHANGE'));
   await runner().process(r.id);let now=await current(f.order);expect(now.inventory_status).toBe('APPLIED');expect(await quantity(f.variant)).toBe(9);
   await service.transition(r.id,{operation_id:randomUUID(),status:'EXCHANGE_SENT',expected_version:now.version,replacement_reference:'ROLLBACK-PAUSE',replacements:[{order_item_id:f.item,variant_id:variant}]},owner,'STORE','pause');
   const command=(await m2.query('SELECT exchange_command_json FROM order_return_request WHERE id=$1',[r.id]))[0].exchange_command_json;
   await runner().process(r.id);now=await current(f.order);
   expect(now).toMatchObject({status:'RECEIVED',exchange_status:'PENDING',last_error:'EXCHANGE_DISPATCH_PAUSED'});
   expect(now.exchange_dispatch).toBeUndefined();expect(await quantity(variant)).toBe(10);
   expect(await m1.query('SELECT receipt_id FROM inventory_exchange_dispatch WHERE receipt_id=$1',[r.id])).toHaveLength(0);
   expect(await m1.query('SELECT id FROM stock_movement WHERE operation_id=$1',[command.operation_id])).toHaveLength(0);
   expect(await m1.query("SELECT operation_id FROM operation_result WHERE caller='M2.Inventory.exchange-dispatch' AND operation_id=$1",[command.operation_id])).toHaveLength(0);
   process.env.EXCHANGE_DISPATCH_WRITES_ENABLED='true';await runner().process(r.id);now=await current(f.order);
   expect(now).toMatchObject({status:'EXCHANGE_SENT',exchange_status:'APPLIED',exchange_dispatch:{items:[{variant_id:variant,quantity:3}]}});expect(await quantity(variant)).toBe(7);
   expect((await m2.query('SELECT exchange_command_json FROM order_return_request WHERE id=$1',[r.id]))[0].exchange_command_json).toEqual(command);
   process.env.EXCHANGE_DISPATCH_WRITES_ENABLED='false';expect((await inventory.dispatchExchange(command)).exchange_dispatch).toEqual(now.exchange_dispatch);
   await expect(inventory.dispatchExchange({...command,items:command.items.map((item:any)=>({...item,quantity:2}))})).rejects.toMatchObject({status:409});
   await runner().process(r.id);expect(await quantity(variant)).toBe(7);
  }finally{if(previous===undefined)delete process.env.EXCHANGE_DISPATCH_WRITES_ENABLED;else process.env.EXCHANGE_DISPATCH_WRITES_ENABLED=previous;}
 });
 test('writer rollback recovers a committed exchange after lost ACK while writes are disabled',async()=>{
  const previous=process.env.EXCHANGE_DISPATCH_WRITES_ENABLED;
  try{
   process.env.EXCHANGE_DISPATCH_WRITES_ENABLED='true';
   const f=await fixture(),variant=await replacement(f),r=await received(f,await approved(f,'EXCHANGE'));await runner().process(r.id);const now=await current(f.order);
   await service.transition(r.id,{operation_id:randomUUID(),status:'EXCHANGE_SENT',expected_version:now.version,replacement_reference:'ROLLBACK-ACK',replacements:[{order_item_id:f.item,variant_id:variant}]},owner,'STORE','dispatch');
   let lost=true;const calls:any[]=[];const worker=new ReturnsRunner(m2,async(_op,command)=>{calls.push(structuredClone(command));const result=await inventory.dispatchExchange(command);if(lost){lost=false;throw new ApiError(503,'LOST_ACK','Simulated response loss after commit');}return result;});
   await worker.process(r.id);expect(await current(f.order)).toMatchObject({status:'RECEIVED',exchange_status:'PENDING',last_error:'LOST_ACK'});expect(await quantity(variant)).toBe(7);
   process.env.EXCHANGE_DISPATCH_WRITES_ENABLED='false';
   await m1.query("UPDATE product SET title='Changed after commit' WHERE id=$1",[f.product]);await m1.query("UPDATE product_variant SET sku='CHANGED',price_vnd=110000,variant_values_json='{\"size\":\"XL\"}' WHERE id=$1",[variant]);
   await worker.process(r.id);const sent=await current(f.order);expect(calls[1]).toEqual(calls[0]);expect(sent).toMatchObject({status:'EXCHANGE_SENT',exchange_status:'APPLIED',exchange_dispatch:{items:[{quantity:3,unit_price_vnd:100000,product_snapshot:{variant_values:{size:'L'}}}]}});
   expect(sent.exchange_dispatch!.items[0].sku_snapshot).not.toBe('CHANGED');expect(await quantity(variant)).toBe(7);
   expect((await service.list(buyer,'CUSTOMER',{order_id:f.order})).items[0].exchange_dispatch).toEqual(sent.exchange_dispatch);expect((await service.list(admin,'ADMIN',{order_id:f.order})).items[0].exchange_dispatch).toEqual(sent.exchange_dispatch);
   expect((await m1.query('SELECT count(*)::int AS n FROM inventory_exchange_dispatch WHERE receipt_id=$1',[r.id]))[0].n).toBe(1);
  }finally{if(previous===undefined)delete process.env.EXCHANGE_DISPATCH_WRITES_ENABLED;else process.env.EXCHANGE_DISPATCH_WRITES_ENABLED=previous;}
 });
 test('receipt loss of ACK keeps exact command; only sellable units return and Owner must prove full COD refund',async()=>{
  const f=await fixture(),r=await received(f,await approved(f));expect(r).toMatchObject({status:'RECEIVED',inventory_status:'PENDING'});
  await expect(new CodRefundService(m2).confirm(f.order,proof(f,r),owner,'early')).rejects.toMatchObject({status:409});
  const calls:any[]=[];let lost=true;const worker=new ReturnsRunner(m2,async(_op,body)=>{calls.push(structuredClone(body));const response=await inventory.restockReceived(body);if(lost){lost=false;throw new ApiError(503,'LOST_ACK','Simulated');}return response;});
  await worker.process(r.id);expect(await quantity(f.variant)).toBe(9);expect((await current(f.order)).inventory_status).toBe('PENDING');await worker.process(r.id);expect(calls[0]).toEqual(calls[1]);expect(await quantity(f.variant)).toBe(9);
  const now=await current(f.order);expect(now.inventory_status).toBe('APPLIED');const command=proof(f,now);
  await expect(new CodRefundService(m2).confirm(f.order,command,employee,'employee')).rejects.toMatchObject({status:403});await new CodRefundService(m2).confirm(f.order,command,owner,'owner');await new CodRefundService(m2).confirm(f.order,command,owner,'retry');
  const done=await service.transition(r.id,{status:'COMPLETED',expected_version:now.version},owner,'STORE','complete');expect(done.status).toBe('COMPLETED');
  expect(await m2.query('SELECT kind,amount_vnd FROM money_movement WHERE order_id=$1 ORDER BY kind',[f.order])).toEqual([{kind:'COLLECTION',amount_vnd:'320000'},{kind:'REFUND',amount_vnd:'320000'}]);
  expect((await m2.query('SELECT state FROM order_inventory_state WHERE order_id=$1',[f.order]))[0].state).toBe('RETURN_INSPECTED');
 });
 test('same-price different size is consumed once before EXCHANGE_SENT; only owner Customer confirms receipt',async()=>{
  const f=await fixture(),variant=await replacement(f),r=await received(f,await approved(f,'EXCHANGE'));await runner().process(r.id);const before=await current(f.order);
  const body={operation_id:randomUUID(),status:'EXCHANGE_SENT' as const,expected_version:before.version,replacement_reference:'TEST-HANDOFF-1',replacements:[{order_item_id:f.item,variant_id:variant}]};
  const queued=await service.transition(r.id,body,employee,'STORE','dispatch');expect(queued).toMatchObject({status:'RECEIVED',exchange_status:'PENDING'});expect(await quantity(variant)).toBe(10);
  const calls:any[]=[];let lost=true;const worker=new ReturnsRunner(m2,async(_op,command)=>{calls.push(structuredClone(command));const result=await inventory.dispatchExchange(command);if(lost){lost=false;throw new ApiError(503,'LOST_ACK','Simulated');}return result;});
  await worker.process(r.id);expect((await current(f.order)).status).toBe('RECEIVED');expect(await quantity(variant)).toBe(7);
  await expect(service.resolve(r.id,{operation_id:randomUUID(),expected_version:queued.version,action:'PROPOSE_REFUND',note:'Cannot change an uncertain handoff'},owner,'STORE','race')).rejects.toMatchObject({status:409});
  await m1.query("UPDATE product SET title='Tên sửa sau bàn giao' WHERE id=$1",[f.product]);await m1.query("UPDATE product_variant SET sku='NEW-SKU',price_vnd=110000,variant_values_json='{\"color\":\"Đỏ\",\"size\":\"XL\"}' WHERE id=$1",[variant]);
  await worker.process(r.id);expect(calls[0]).toEqual(calls[1]);expect(await quantity(variant)).toBe(7);const sent=await current(f.order);expect(sent).toMatchObject({status:'EXCHANGE_SENT',exchange_status:'APPLIED',exchange_dispatch:{items:[{variant_id:variant,original_variant_id:f.variant,quantity:3,unit_price_vnd:100000,product_snapshot:{variant_values:{size:'L'}}}]}});
  expect(sent.exchange_dispatch!.items[0].sku_snapshot).not.toBe('NEW-SKU');expect(sent.exchange_dispatch!.items[0].product_snapshot.title).not.toBe('Tên sửa sau bàn giao');
  expect((await service.list(buyer,'CUSTOMER',{order_id:f.order})).items[0].exchange_dispatch).toEqual(sent.exchange_dispatch);expect((await service.list(admin,'ADMIN',{order_id:f.order})).items[0].exchange_dispatch).toEqual(sent.exchange_dispatch);
  await expect(m1.query("UPDATE inventory_exchange_dispatch SET dispatch_snapshot='{}' WHERE receipt_id=$1",[r.id])).rejects.toThrow('immutable');
  await expect(m2.query("UPDATE order_return_request SET exchange_dispatch_snapshot='{}' WHERE id=$1",[r.id])).rejects.toThrow('immutable');
  await expect(service.transition(r.id,{status:'COMPLETED',expected_version:sent.version},{user_id:randomUUID()},'CUSTOMER','wrong')).rejects.toMatchObject({status:404});
  expect((await service.transition(r.id,{status:'COMPLETED',expected_version:sent.version},buyer,'CUSTOMER','received')).status).toBe('COMPLETED');
  expect((await m1.query('SELECT count(*)::int AS n FROM inventory_exchange_dispatch WHERE receipt_id=$1',[r.id]))[0].n).toBe(1);
 });
 test('out-of-stock exchange keeps original type until explicit Customer consent, with one preserved receipt',async()=>{
  const f=await fixture(),variant=await replacement(f,0),r=await received(f,await approved(f,'EXCHANGE'));await runner().process(r.id);let now=await current(f.order);
  await service.transition(r.id,{operation_id:randomUUID(),status:'EXCHANGE_SENT',expected_version:now.version,replacement_reference:'NOT-HANDED-OFF',replacements:[{order_item_id:f.item,variant_id:variant}]},owner,'STORE','out-of-stock');await runner().process(r.id);now=await current(f.order);expect(now).toMatchObject({status:'RECEIVED',exchange_status:'BLOCKED',last_error:'EXCHANGE_OUT_OF_STOCK'});
  const proposed=await service.resolve(r.id,{operation_id:randomUUID(),expected_version:now.version,action:'PROPOSE_REFUND',note:'Hết size đổi, đề nghị hoàn đủ cả phí giao'},owner,'STORE','propose');expect(proposed.type).toBe('EXCHANGE');
  const consent={operation_id:randomUUID(),expected_version:proposed.version,action:'ACCEPT_REFUND' as const,note:'Tôi đồng ý hoàn đủ tiền'};
  await expect(service.resolve(r.id,consent,{user_id:randomUUID()},'CUSTOMER','wrong')).rejects.toMatchObject({status:404});const accepted=await service.resolve(r.id,consent,buyer,'CUSTOMER','accept');expect(accepted).toMatchObject({type:'REFUND',original_type:'EXCHANGE',conversion_status:'ACCEPTED'});expect(await service.resolve(r.id,consent,buyer,'CUSTOMER','retry')).toEqual(accepted);
  expect(await quantity(f.variant)).toBe(9);expect(await quantity(variant)).toBe(0);expect(await m1.query('SELECT receipt_id FROM inventory_exchange_dispatch WHERE receipt_id=$1',[r.id])).toHaveLength(0);
 });
 test('fault dispute blocks money until Admin decides; insufficient or foreign receipt has no stock effect',async()=>{
  const f=await fixture(),approvedRow=await approved(f,'REFUND','DISPUTED');
  await expect(service.transition(approvedRow.id,{operation_id:randomUUID(),status:'RECEIVED',expected_version:approvedRow.version,inspection_note:'Không đủ',inspection:[{order_item_id:f.item,received_quantity:4,resellable_quantity:4,damaged_quantity:0,pending_quantity:0}]},owner,'STORE','short')).rejects.toMatchObject({status:422});expect(await quantity(f.variant)).toBe(7);
  const r=await received(f,approvedRow);await runner().process(r.id);let now=await current(f.order);await expect(new CodRefundService(m2).confirm(f.order,proof(f,now),owner,'disputed')).rejects.toMatchObject({status:409});
  await expect(service.resolve(r.id,{operation_id:randomUUID(),expected_version:now.version,action:'RESOLVE',note:'Không đúng quyền',fault_party:'STORE'},owner,'STORE','wrong')).rejects.toMatchObject({status:403});
  now=await service.resolve(r.id,{operation_id:randomUUID(),expected_version:now.version,action:'RESOLVE',note:'Đã đối chiếu bằng chứng, Store gửi sai',fault_party:'STORE'},admin,'ADMIN','resolve');expect(now).toMatchObject({fault_party:'STORE',fee_payer:'STORE'});await new CodRefundService(m2).confirm(f.order,proof(f,now),owner,'confirmed');
 });
 test('legacy RECEIVED is not proof; Owner explicitly reconciles missing stock source without creating inventory',async()=>{
  const f=await fixture();await m2.query('DELETE FROM order_inventory_state WHERE order_id=$1',[f.order]);const r=await approved(f);await m2.query("UPDATE order_return_request SET status='RECEIVED' WHERE id=$1",[r.id]);
  await expect(new CodRefundService(m2).confirm(f.order,proof(f,r),owner,'legacy-early')).rejects.toMatchObject({status:409});
  const input={operation_id:randomUUID(),status:'RECEIVED' as const,expected_version:r.version,inspection_note:'Đã kiểm đủ, không tự cộng tồn khi thiếu nguồn cũ',inspection:[{order_item_id:f.item,received_quantity:3,resellable_quantity:0,damaged_quantity:3,pending_quantity:0}],legacy_reconciliation_note:'Owner đối chiếu sổ kho cũ; hàng chưa đưa vào bán, không cộng tự động.'};
  await expect(service.transition(r.id,input,employee,'STORE','employee')).rejects.toMatchObject({status:409});const now=await service.transition(r.id,input,owner,'STORE','owner');expect(now.inventory_status).toBe('LEGACY_RECONCILED');expect(await quantity(f.variant)).toBe(7);await new CodRefundService(m2).confirm(f.order,proof(f,now),owner,'legacy-money');
 });
 test('online REFUND requires inspection and fee decision before one UNKNOWN/lookup refund can complete',async()=>{
  const f=await fixture(false,true),r=await received(f,await approved(f));let issued=0,looked=0;const money=new RefundRunner(m2,{enabled:true,name:'SEPAY_TEST',refund:async()=>{issued++;return {status:'UNKNOWN'};},lookup:async c=>{looked++;return {...c,status:'SUCCEEDED',receipt_id:'TEST-'+c.operation_id};}});
  await money.enqueueReturnRefunds();expect(await m2.query('SELECT id FROM refund WHERE order_id=$1',[f.order])).toHaveLength(0);await runner().process(r.id);await money.enqueueReturnRefunds();await money.enqueueReturnRefunds();await money.tick();
  const now=await current(f.order);await expect(service.transition(r.id,{status:'COMPLETED',expected_version:now.version},owner,'STORE','early')).rejects.toMatchObject({status:409});await m2.query('UPDATE refund_job SET next_attempt_at=now() WHERE refund_id IN (SELECT id FROM refund WHERE order_id=$1)',[f.order]);await money.tick();expect(issued).toBe(1);expect(looked).toBe(1);expect((await service.transition(r.id,{status:'COMPLETED',expected_version:now.version},owner,'STORE','done')).status).toBe('COMPLETED');expect(await quantity(f.variant)).toBe(9);
 });
 test('partial receipt is saved as actual evidence and stays open without automatic stock or money effects',async()=>{
  const f=await fixture(),r=await approved(f);const partial=await service.transition(r.id,{operation_id:randomUUID(),status:'RECEIVED',expected_version:r.version,inspection_note:'Mới nhận một, còn hai đang gửi về',inspection:[{order_item_id:f.item,received_quantity:1,resellable_quantity:1,damaged_quantity:0,pending_quantity:0}]},employee,'STORE','partial');
  expect(partial).toMatchObject({status:'APPROVED',inventory_status:'NOT_STARTED',inspection:[{received_quantity:1}]});await runner().process(r.id);expect(await quantity(f.variant)).toBe(7);expect(await m1.query('SELECT id FROM inventory_return_receipt WHERE id=$1',[r.id])).toHaveLength(0);await received(f,partial);await runner().process(r.id);expect(await quantity(f.variant)).toBe(9);
 });

 test('same-variant receive and dispatch have distinct unique ledger effects; retry cannot repeat either',async()=>{
  const f=await fixture(),r=await received(f,await approved(f,'EXCHANGE'));await runner().process(r.id);const now=await current(f.order);
  await service.transition(r.id,{operation_id:randomUUID(),status:'EXCHANGE_SENT',expected_version:now.version,replacement_reference:'SAME-VARIANT-HANDOFF',replacements:[{order_item_id:f.item,variant_id:f.variant}]},owner,'STORE','dispatch-same');await runner().process(r.id);await runner().process(r.id);expect((await current(f.order)).status).toBe('EXCHANGE_SENT');expect(await quantity(f.variant)).toBe(6);
  expect(await m1.query('SELECT reason,delta_quantity FROM stock_movement WHERE receipt_id=$1 ORDER BY reason',[r.id])).toEqual([{reason:'EXCHANGE_DISPATCH',delta_quantity:-3},{reason:'RETURN_RECEIVED',delta_quantity:2}]);
 });

 test('a mismatching dispatch identity cannot announce sent; retry accepts the original immutable receipt once',async()=>{
  const f=await fixture(),variant=await replacement(f),r=await received(f,await approved(f,'EXCHANGE'));await runner().process(r.id);const before=await current(f.order);
  await service.transition(r.id,{operation_id:randomUUID(),status:'EXCHANGE_SENT',expected_version:before.version,replacement_reference:'MISMATCH-TEST',replacements:[{order_item_id:f.item,variant_id:variant}]},owner,'STORE','dispatch');
  let corrupt=true;const worker=new ReturnsRunner(m2,async(_op,body)=>{const result=await inventory.dispatchExchange(body);return corrupt?{...result,exchange_dispatch:{...result.exchange_dispatch!,items:result.exchange_dispatch!.items.map(item=>({...item,variant_id:randomUUID()}))}}:result;});
  await worker.process(r.id);expect(await current(f.order)).toMatchObject({status:'RECEIVED',exchange_status:'PENDING',last_error:'EXCHANGE_SNAPSHOT_MISMATCH'});expect((await current(f.order)).exchange_dispatch).toBeUndefined();expect(await quantity(variant)).toBe(7);corrupt=false;await worker.process(r.id);expect(await current(f.order)).toMatchObject({status:'EXCHANGE_SENT',exchange_dispatch:{items:[{variant_id:variant}]}});expect(await quantity(variant)).toBe(7);
 });
 test('competing dispatch and refund proposal cannot cross the frozen handoff boundary',async()=>{
  const f=await fixture(),variant=await replacement(f),r=await received(f,await approved(f,'EXCHANGE'));await runner().process(r.id);const currentRow=await current(f.order);
  const outcomes=await Promise.allSettled([service.transition(r.id,{operation_id:randomUUID(),status:'EXCHANGE_SENT',expected_version:currentRow.version,replacement_reference:'RACE-HANDOFF',replacements:[{order_item_id:f.item,variant_id:variant}]},owner,'STORE','dispatch-race'),service.resolve(r.id,{operation_id:randomUUID(),expected_version:currentRow.version,action:'PROPOSE_REFUND',note:'Cạnh tranh quyết định'},employee,'STORE','proposal-race')]);expect(outcomes.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(outcomes.filter(r=>r.status==='rejected')).toHaveLength(1);
  const after=await current(f.order);if(after.exchange_status==='PENDING'){await runner().process(r.id);const sent=await current(f.order);await expect(service.resolve(r.id,{operation_id:randomUUID(),expected_version:sent.version,action:'PROPOSE_REFUND',note:'Too late'},owner,'STORE','late')).rejects.toMatchObject({status:409});expect(await quantity(variant)).toBe(7);}else{expect(after.conversion_status).toBe('PROPOSED');await expect(service.transition(r.id,{operation_id:randomUUID(),status:'EXCHANGE_SENT',expected_version:after.version,replacement_reference:'AFTER-PROPOSAL',replacements:[{order_item_id:f.item,variant_id:variant}]},owner,'STORE','blocked')).rejects.toMatchObject({status:409});expect(await quantity(variant)).toBe(10);}
 });

});
