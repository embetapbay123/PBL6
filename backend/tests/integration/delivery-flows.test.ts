import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {startDeliveryServer} from '../../delivery-service/src/server';
import {PlatformDeliveryService} from '../../commerce-service/src/shipping/platform-delivery.service';
import {ShippingService} from '../../commerce-service/src/shipping/shipping.service';
import {DeliverySync} from '../../commerce-service/src/shipping/delivery-sync';
import {DeliveryApi} from '../../commerce-service/src/shipping/delivery-api';
import {PaymentService} from '../../commerce-service/src/payment/payment.service';
import {DeliveryReturnService} from '../../commerce-service/src/returns/delivery-return.service';
import {ReturnsService} from '../../commerce-service/src/returns/returns.service';
import {ApiError} from '../../shared/src/errors';

const url=process.env.SHIPPING_TEST_DATABASE_URL;
(url?describe:describe.skip)('Delivery recovery and reverse logistics over the merchant API',()=>{
  const saved={...process.env},schema='delivery_flows_'+randomUUID().replace(/-/g,''),merchantSchema=schema+'_merchant';
  const store=randomUUID(),customer=randomUUID(),pickup=randomUUID();
  const admin={user_id:randomUUID(),roles:['ADMIN'],role_permissions:['platform.admin']};
  const owner={user_id:randomUUID(),store_membership:{store_id:store,role:'OWNER',status:'ACTIVE',permissions:[]}};
  const buyer={user_id:customer};
  const address={recipient_name:'Khách thử',phone:'0900000000',line1:'123 Địa chỉ khách',ward:'Hải Châu',city:'Đà Nẵng'};
  const warehouse={...address,recipient_name:'Kho nhận trả',line1:'456 Địa chỉ kho'};
  let root:DataSource,db:DataSource,api:DeliveryApi,worker:DeliverySync,shipping:ShippingService,platform:PlatformDeliveryService;
  let app:Awaited<ReturnType<typeof startDeliveryServer>>|undefined,base:string,cookie:string;
  // Deliberately reject callbacks: these cases must recover through the carrier lookup API.
  const callback=createServer((_req,res)=>res.writeHead(503).end('{}'));

  beforeAll(async()=>{
    if(new URL(url!).pathname!=='/shipping_test')throw new Error('Dedicated test database required');
    root=await new DataSource({type:'postgres',url}).initialize();
    await root.query('CREATE SCHEMA '+schema);await root.query('CREATE SCHEMA '+merchantSchema);
    db=await new DataSource({type:'postgres',url,extra:{options:'-csearch_path='+merchantSchema+',public'}}).initialize();
    const folder=resolve(__dirname,'../../commerce-service/migrations');
    for(const file of readdirSync(folder).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(folder,file),'utf8'));
    callback.listen(0,'127.0.0.1');await once(callback,'listening');
    const providerDb=new URL(url!);providerDb.searchParams.set('options','-csearch_path='+schema+',public');
    Object.assign(process.env,{DELIVERY_DATABASE_URL:providerDb.toString(),DELIVERY_API_KEY:'test-flows-merchant-key-at-least-24',DELIVERY_OPERATOR_PASSWORD:'operator-test-password',DELIVERY_SESSION_KEY:'test-flows-session-key-at-least-24',DELIVERY_WEBHOOK_SECRET:'test-flows-webhook-key-at-least-24',DELIVERY_WEBHOOK_URL:'http://127.0.0.1:'+(callback.address() as any).port,PORT:'0',DELIVERY_PUBLIC_PATH:'/',DELIVERY_COOKIE_SECURE:'0'});
    app=await startDeliveryServer();if(!app.server.listening)await once(app.server,'listening');
    base='http://127.0.0.1:'+(app.server.address() as any).port;process.env.DELIVERY_API_URL=base;
    api=new DeliveryApi();worker=new DeliverySync(db,api);shipping=new ShippingService(db);platform=new PlatformDeliveryService(db);
    await platform.savePickup({id:pickup,store_id:store,name:'Kho thử',address:warehouse,enabled:true,expected_version:0},admin,'test');
    const login=await fetch(base+'/ops/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:process.env.DELIVERY_OPERATOR_PASSWORD})});
    expect(login.status).toBe(200);cookie=login.headers.get('set-cookie')!.split(';')[0];
  });
  afterAll(async()=>{
    jest.restoreAllMocks();
    if(app)await app.close();
    callback.closeAllConnections();if(callback.listening)await new Promise<void>(done=>callback.close(()=>done()));
    if(db?.isInitialized)await db.destroy();
    if(root?.isInitialized){await root.query('DROP SCHEMA IF EXISTS '+merchantSchema+' CASCADE');await root.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');await root.destroy();}
    for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);
  });

  async function orderFixture(){
    const id=randomUUID();
    await db.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,address_snapshot,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd)
      VALUES($1,$1,$2,$3,$4,'PREPARING','COD',100000,0,0,20000,120000)`,[id,customer,store,address]);
    const [item]=await db.query(`INSERT INTO order_item(order_id,product_id,variant_id,product_snapshot,sku_snapshot,unit_price_vnd,quantity,line_total_vnd) VALUES($1,$2,$3,'{"title":"Test item"}','TEST',100000,1,100000) RETURNING *`,[id,randomUUID(),randomUUID()]);
    await db.transaction(m=>new PaymentService(m).createForOrder({order_id:id,method:'COD',payable_vnd:120000n,operation_id:randomUUID()}));
    await db.query('UPDATE "order" SET status=$2 WHERE id=$1',[id,'PROCESSING']);
    return {id,item};
  }
  async function book(order:string,request?:string){
    const [current]=await db.query('SELECT version FROM "order" WHERE id=$1',[order]);
    const operation=randomUUID();
    const result=await shipping.book(order,{operation_id:operation,expected_order_version:current.version,pickup_location_id:pickup,weight:500,length:10,width:10,height:10,...(request?{return_request_id:request}:{})},owner,'test');
    return {result,operation};
  }
  async function local(id:string){return (await db.query('SELECT * FROM shipping_shipment WHERE id=$1',[id]))[0];}
  async function reconcile(id:string){
    await db.query('UPDATE shipping_shipment SET next_sync_at=now() WHERE id=$1',[id]);await worker.tick();return local(id);
  }
  async function act(reference:string,action:string,extra={}){
    const before=await api.lookup(reference);
    const response=await fetch(base+'/ops/api/parcels/'+reference+'/actions',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({operation_id:randomUUID(),expected_version:before.version,action,...extra})});
    expect(response.status).toBe(200);return response.json();
  }
  async function merchant(id:string,kind:'CANCEL'|'REDELIVER'|'RETURN'){
    const row=await local(id),operation=randomUUID();
    await shipping.command(id,{operation_id:operation,expected_version:row.version,kind},owner,'STORE','test');
    await worker.processCommand(operation);
    expect((await db.query('SELECT status FROM shipping_command WHERE id=$1',[operation]))[0].status).toBe('APPLIED');
    return local(id);
  }
  async function dispatch(reference:string){await act(reference,'ASSIGN',{courier_name:'Shipper demo'});await act(reference,'PICK_UP');await act(reference,'OUT_FOR_DELIVERY');}

  it('recovers a lost create acknowledgement once and releases a definitively rejected booking',async()=>{
    const {id}=await orderFixture(),first=await book(id);
    const create=api.create.bind(api);
    jest.spyOn(api,'create').mockImplementationOnce(async(reference,body)=>{await create(reference,body);throw new ApiError(503,'DELIVERY_RESULT_UNKNOWN','lost acknowledgement');});
    await worker.processCommand(first.operation);
    expect((await local(first.result.id)).status).toBe('CREATE_UNKNOWN');
    await worker.processCommand(first.operation);
    const recovered=await local(first.result.id),provider=await api.lookup(recovered.client_order_code);
    expect(recovered.status).toBe('READY_FOR_PICKUP');expect(recovered.tracking_code).toBe(provider.tracking_code);expect(provider.version).toBe(1);
    await merchant(first.result.id,'CANCEL');
    const second=await book(id);
    await db.query("UPDATE shipping_shipment SET request_json=jsonb_set(request_json,'{weight}','0'::jsonb) WHERE id=$1",[second.result.id]);
    await worker.processCommand(second.operation);
    const rejected=await local(second.result.id);
    expect(rejected.status).toBe('CREATE_FAILED');expect(rejected.last_error).toBe('DELIVERY_CREATE_REJECTED');
    expect((await db.query('SELECT status FROM shipping_command WHERE id=$1',[second.operation]))[0].status).toBe('FAILED');
    await expect(api.lookup(rejected.client_order_code)).rejects.toMatchObject({status:404});
    await shipping.command(rejected.id,{operation_id:randomUUID(),expected_version:rejected.version,kind:'CANCEL'},owner,'STORE','test');
    const third=await book(id);await worker.processCommand(third.operation);
    expect((await local(third.result.id)).status).toBe('READY_FOR_PICKUP');
    expect(await db.query("SELECT id FROM shipping_shipment WHERE order_id=$1 AND status<>'CANCELLED'",[id])).toHaveLength(1);
  });

  it('requests redelivery and return from PBL6, waits for physical receipt and never collects failed COD',async()=>{
    const {id,item}=await orderFixture(),{result,operation}=await book(id);await worker.processCommand(operation);
    const row=await local(result.id);await dispatch(row.client_order_code);await act(row.client_order_code,'FAIL',{note:'Khách vắng mặt'});
    expect((await reconcile(row.id)).status).toBe('DELIVERY_ATTEMPT_FAILED');
    expect(await db.query('SELECT id FROM delivery_return_case WHERE order_id=$1',[id])).toHaveLength(0);
    expect((await merchant(row.id,'REDELIVER')).status).toBe('IN_TRANSIT');
    await act(row.client_order_code,'OUT_FOR_DELIVERY');await act(row.client_order_code,'FAIL',{note:'Khách từ chối nhận'});await reconcile(row.id);
    expect((await merchant(row.id,'RETURN')).status).toBe('RETURNING');
    const cases=await db.query('SELECT * FROM delivery_return_case WHERE order_id=$1',[id]);expect(cases).toHaveLength(1);
    const inspection={operation_id:randomUUID(),expected_version:cases[0].version,note:'Đã nhận đủ',lines:[{order_item_id:item.id,received_quantity:1,resellable_quantity:1,damaged_quantity:0,pending_quantity:0}]};
    const returns=new DeliveryReturnService(db);
    await expect(returns.inspect(cases[0].id,inspection,owner,'test')).rejects.toMatchObject({response:{code:'CARRIER_RETURN_NOT_RECEIVED'}});
    await act(row.client_order_code,'RECEIVE_RETURN',{note:'Kho nhận đủ kiện'});await reconcile(row.id);await reconcile(row.id);
    const received=await returns.inspect(cases[0].id,inspection,owner,'test');expect(received.status).toBe('RECEIVED');
    await returns.settle(cases[0].id,{operation_id:randomUUID(),expected_version:received.version},owner,'test');
    expect((await db.query('SELECT status,collected_vnd FROM payment WHERE order_id=$1',[id]))[0]).toMatchObject({status:'CANCELLED',collected_vnd:'0'});
    expect((await db.query('SELECT status FROM "order" WHERE id=$1',[id]))[0].status).toBe('SHIPPED');
    expect(await db.query('SELECT id FROM delivery_return_case WHERE order_id=$1',[id])).toHaveLength(1);
  });

  it('delivers a separate zero-COD customer return before seller inspection and gates exchange acceptance on carrier delivery',async()=>{
    const {id,item}=await orderFixture(),request=randomUUID();
    await db.query("UPDATE \"order\" SET status='COMPLETED' WHERE id=$1",[id]);
    await db.query("INSERT INTO order_inventory_state(order_id,reservation_ids,items_json,state,correlation_id) VALUES($1,$2,'[]','CONSUMED','test')",[id,[randomUUID()]]);
    await db.query("INSERT INTO order_return_request(id,order_id,type,reason,status,fault_party,fee_payer) VALUES($1,$2,'EXCHANGE','Đổi phân loại','APPROVED','STORE','STORE')",[request,id]);
    const pickupOperation=randomUUID(),input={operation_id:pickupOperation,expected_version:0};
    const reverse=await platform.requestReturnPickup(request,input,buyer);
    expect((await platform.requestReturnPickup(request,input,buyer)).id).toBe(reverse.id);
    await worker.processCommand(pickupOperation);const row=await local(reverse.id),parcel=await api.lookup(row.client_order_code);
    expect(parcel.pickup.name).toBe(address.recipient_name);expect(parcel.destination.name).toBe(warehouse.recipient_name);expect(parcel.cod_amount).toBe(0);
    const returns=new ReturnsService(db),inspection={operation_id:randomUUID(),expected_version:1,status:'RECEIVED' as const,inspection_note:'Nhận đủ và nguyên vẹn',inspection:[{order_item_id:item.id,received_quantity:1,resellable_quantity:1,damaged_quantity:0,pending_quantity:0}]};
    await expect(returns.transition(request,inspection,owner,'STORE','test')).rejects.toMatchObject({response:{code:'RETURN_PICKUP_NOT_DELIVERED'}});
    await dispatch(row.client_order_code);await act(row.client_order_code,'DELIVER',{note:'Bàn giao cho kho',collected_vnd:0});await reconcile(row.id);
    expect((await returns.transition(request,inspection,owner,'STORE','test')).status).toBe('RECEIVED');
    // The inventory handoff is separately tested against M1 in shipping.test.ts.
    const replacement=randomUUID(),items=[{variant_id:replacement,quantity:1,unit_price_vnd:100000,sku_snapshot:'REPLACEMENT',product_snapshot:{title:'Hàng đổi'}}];
    await db.query("UPDATE order_return_request SET inventory_status='APPLIED',exchange_status='APPLIED',exchange_dispatch_snapshot=$2 WHERE id=$1",[request,{items}]);
    const exchange=await book(id,request);await worker.processCommand(exchange.operation);const outgoing=await local(exchange.result.id);
    expect((await api.lookup(outgoing.client_order_code)).cod_amount).toBe(0);
    expect(outgoing.tracking_code).not.toBe(row.tracking_code);
    await dispatch(outgoing.client_order_code);await reconcile(outgoing.id);
    const [current]=await db.query('SELECT version,status FROM order_return_request WHERE id=$1',[request]);expect(current.status).toBe('EXCHANGE_SENT');
    const acceptance={operation_id:randomUUID(),expected_version:current.version,status:'COMPLETED' as const};
    await expect(returns.transition(request,acceptance,buyer,'CUSTOMER','test')).rejects.toMatchObject({response:{code:'EXCHANGE_NOT_DELIVERED'}});
    await act(outgoing.client_order_code,'DELIVER',{note:'Khách nhận kiện đổi',collected_vnd:0});await reconcile(outgoing.id);
    expect((await returns.transition(request,acceptance,buyer,'CUSTOMER','test')).status).toBe('COMPLETED');
    expect((await db.query('SELECT status FROM "order" WHERE id=$1',[id]))[0].status).toBe('COMPLETED');
    expect(await db.query('SELECT id FROM delivery_return_case WHERE order_id=$1',[id])).toHaveLength(0);
  });

  it('keeps a failed customer collection intact and permits exactly one new collection after return to the customer',async()=>{
    const {id}=await orderFixture(),request=randomUUID();
    await db.query("UPDATE \"order\" SET status='COMPLETED' WHERE id=$1",[id]);
    await db.query("INSERT INTO order_return_request(id,order_id,type,reason,status) VALUES($1,$2,'REFUND','Trả sản phẩm','APPROVED')",[request,id]);
    const operation=randomUUID(),first=await platform.requestReturnPickup(request,{operation_id:operation,expected_version:0},buyer);
    await worker.processCommand(operation);const row=await local(first.id);await dispatch(row.client_order_code);
    await act(row.client_order_code,'FAIL',{note:'Kho chưa nhận được kiện'});await reconcile(row.id);await merchant(row.id,'RETURN');
    await expect(platform.requestReturnPickup(request,{operation_id:randomUUID(),expected_version:1},buyer)).rejects.toMatchObject({response:{code:'RETURN_PICKUP_EXISTS'}});
    await act(row.client_order_code,'RECEIVE_RETURN',{note:'Đã bàn giao lại cho khách'});await reconcile(row.id);
    const secondOperation=randomUUID(),second=await platform.requestReturnPickup(request,{operation_id:secondOperation,expected_version:1},buyer);
    await worker.processCommand(secondOperation);
    expect(second.id).not.toBe(first.id);expect((await local(first.id)).status).toBe('RETURNED');expect((await local(second.id)).status).toBe('READY_FOR_PICKUP');
    await expect(platform.requestReturnPickup(request,{operation_id:randomUUID(),expected_version:2},buyer)).rejects.toMatchObject({response:{code:'RETURN_PICKUP_EXISTS'}});
    expect(await db.query('SELECT id FROM delivery_return_case WHERE order_id=$1',[id])).toHaveLength(0);
    expect((await db.query('SELECT status FROM "order" WHERE id=$1',[id]))[0].status).toBe('COMPLETED');
  });

  it('records one external-return receipt event and replays inspection without duplicating it',async()=>{
    const {id,item}=await orderFixture(),request=randomUUID();
    await db.query("UPDATE \"order\" SET status='COMPLETED',shipping_mode='GHN' WHERE id=$1",[id]);
    await db.query("INSERT INTO order_inventory_state(order_id,reservation_ids,items_json,state,correlation_id) VALUES($1,$2,'[]','CONSUMED','test')",[id,[randomUUID()]]);
    await db.query("INSERT INTO order_return_request(id,order_id,type,reason,status) VALUES($1,$2,'REFUND','Trả sản phẩm','APPROVED')",[request,id]);
    const external=await shipping.externalReturn(request,{operation_id:randomUUID(),expected_version:0,carrier_name:'Hãng tự gửi',tracking_code:'EXTERNAL-DEMO'},buyer);
    const returns=new ReturnsService(db),inspection={operation_id:randomUUID(),expected_version:1,status:'RECEIVED' as const,inspection_note:'Nhận đủ',inspection:[{order_item_id:item.id,received_quantity:1,resellable_quantity:1,damaged_quantity:0,pending_quantity:0}]};
    expect((await returns.transition(request,inspection,owner,'STORE','test')).status).toBe('RECEIVED');
    await returns.transition(request,inspection,owner,'STORE','test');
    expect((await local(external.id)).status).toBe('MANUAL_RECEIVED');
    expect(await db.query("SELECT id FROM shipping_event WHERE shipment_id=$1 AND status='MANUAL_RECEIVED'",[external.id])).toHaveLength(1);
  });
});
