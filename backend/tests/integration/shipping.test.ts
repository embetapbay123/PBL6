import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {ShippingService} from '../../commerce-service/src/shipping/shipping.service';
import {getStorePickupStatus} from '../../commerce-service/src/shipping/store-pickup-status';
import {ShippingRunner} from '../../commerce-service/src/shipping/shipping.runner';
import {CarrierError,shippingConfig} from '../../commerce-service/src/shipping/ghn.adapter';
import {PaymentService} from '../../commerce-service/src/payment/payment.service';
import {OrderService} from '../../commerce-service/src/order/order.service';
import {DeliveryReturnService} from '../../commerce-service/src/returns/delivery-return.service';
import {InventoryService} from '../../catalog-service/src/inventory/inventory.service';
import {PlatformDeliveryService} from '../../commerce-service/src/shipping/platform-delivery.service';
import {schemaErrors} from '../../shared/src/contract-validation';
import contracts from '../../shared/src/contracts.runtime.generated.json';

const url=process.env.SHIPPING_TEST_DATABASE_URL;
const suite=url?describe:describe.skip;
suite('platform shipping with isolated PostgreSQL and fake carrier',()=>{
  let db:DataSource,catalog:DataSource,root:DataSource,schema:string,catalogSchema:string,service:ShippingService,runner:ShippingRunner;
  const cfg={...shippingConfig({}),token:'fake-token',webhookSecret:'test-webhook-secret-at-least-24',enabled:true};
  const store=randomUUID(),customer=randomUUID(),actor=randomUUID(),pickup=randomUUID();
  const owner={user_id:actor,roles:['STORE_OWNER'],store_membership:{store_id:store,role:'OWNER',status:'ACTIVE',permissions:[]}};
  const admin={user_id:randomUUID(),roles:['ADMIN'],role_permissions:['platform.admin']};
  const address={recipient_name:'Test customer',phone:'0900000000',line1:'123 Test street',ward:'Test Ward',district:'Test District',city:'Test City'};
  const carrier={create:jest.fn(),lookup:jest.fn(),command:jest.fn(),label:jest.fn()};
  beforeAll(async()=>{
    if(new URL(url!).pathname!=='/shipping_test')throw new Error('Use a dedicated shipping_test database');
    root=await new DataSource({type:'postgres',url}).initialize();schema='shipping_'+randomUUID().replace(/-/g,'');await root.query('CREATE SCHEMA '+schema);
    db=await new DataSource({type:'postgres',url,extra:{options:'-csearch_path='+schema+',public'}}).initialize();
    catalogSchema=schema+'_catalog';await root.query('CREATE SCHEMA '+catalogSchema);
    catalog=await new DataSource({type:'postgres',url,extra:{options:'-csearch_path='+catalogSchema+',public'}}).initialize();
    for(const [source,service] of [[db,'commerce-service'],[catalog,'catalog-service']] as const){
      const folder=resolve(__dirname,'../../'+service+'/migrations');
      for(const file of readdirSync(folder).filter(f=>f.endsWith('.sql')).sort())await source.query(readFileSync(resolve(folder,file),'utf8'));
    }
    service=new ShippingService(db,cfg,carrier);runner=new ShippingRunner(db,cfg,carrier);
    await service.saveLocation({id:pickup,store_id:store,name:'Test warehouse',shop_id:123,environment:'staging',address,enabled:true,expected_version:0},admin,'test');
  });
  afterAll(async()=>{
    for(const source of [db,catalog])if(source?.isInitialized)await source.destroy();
    if(root?.isInitialized){
      for(const name of [schema,catalogSchema])if(/^shipping_[a-f0-9]{32}(_catalog)?$/.test(name))await root.query('DROP SCHEMA '+name+' CASCADE');
      await root.destroy();
    }
  });
  beforeEach(()=>{Object.values(carrier).forEach(fn=>fn.mockReset());});
  async function orderFixture(storeId=store){
    const id=randomUUID();
    await db.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,address_snapshot,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd)
      VALUES($1,$1,$2,$3,$4,'PREPARING','COD',100000,0,0,20000,120000)`,[id,customer,storeId,address]);
    await db.query(`INSERT INTO order_item(order_id,product_id,variant_id,product_snapshot,sku_snapshot,unit_price_vnd,quantity,line_total_vnd) VALUES($1,$2,$3,'{"title":"Test item"}','TEST',100000,1,100000)`,[id,randomUUID(),randomUUID()]);
    await db.transaction(m=>new PaymentService(m).createForOrder({order_id:id,method:'COD',payable_vnd:120000n,operation_id:randomUUID()}));
    await db.query('UPDATE "order" SET status=$2 WHERE id=$1',[id,'PROCESSING']);
    return id;
  }
  async function book(){
    const id=await orderFixture();const input={operation_id:randomUUID(),expected_order_version:0,pickup_location_id:pickup,weight:600,length:20,width:15,height:8};
    const shipment=await service.book(id,input,owner,'test');const [row]=await db.query('SELECT * FROM shipping_shipment WHERE id=$1',[shipment.id]);
    return {id,input,shipment,row};
  }
  const detail=(row:any,status='ready_to_pick',extra={})=>({order_code:'T-'+row.id,shop_id:123,client_order_code:row.client_order_code,status,updated_date:new Date().toISOString(),...extra});
  async function callback(row:any,status:string,time=new Date().toISOString()){
    await service.webhook(cfg.webhookSecret,{ShopID:123,OrderCode:'T-'+row.id,ClientOrderCode:row.client_order_code,Type:'switch_status',Status:status,Time:time});
    const [receipt]=await db.query('SELECT id FROM shipping_webhook_receipt WHERE tracking_code=$1 AND payload_json->>\'Time\'=$2',['T-'+row.id,time]);
    await runner.processReceipt(receipt.id);
  }
  it('reports only a usable pickup location in the current active Store',async()=>{
    const staff={user_id:actor,roles:['SELLER'],store_membership:{store_id:store,role:'SELLER',status:'ACTIVE',permissions:[]}};
    const forStore=(store_id:string)=>({...staff,store_membership:{...staff.store_membership,store_id}});
    const status=(auth:Parameters<typeof getStorePickupStatus>[0])=>getStorePickupStatus(auth,db,cfg);
    const ready=await status(staff);
    expect(ready).toEqual({configured:true});
    expect(schemaErrors(ready,contracts.operations.getStorePickupStatus.responses['200'])).toEqual([]);
    await expect(getStorePickupStatus(staff,db,{...cfg,accountKey:'different-account'})).resolves.toEqual({configured:false});
    await expect(status(forStore(randomUUID()))).resolves.toEqual({configured:false});
    await expect(status({...staff,store_membership:{...staff.store_membership,status:'LOCKED'}})).rejects.toMatchObject({status:403});

    const platformStore=randomUUID(),platformLocation=randomUUID();
    const platform=new PlatformDeliveryService(db);
    const input={id:platformLocation,store_id:platformStore,name:'Kho nền tảng',address,enabled:false,expected_version:0};
    const saved=await platform.savePickup(input,admin,'test');
    await expect(status(forStore(platformStore))).resolves.toEqual({configured:false});
    await platform.savePickup({...input,enabled:true,expected_version:saved.version},admin,'test');
    await expect(status(forStore(platformStore))).resolves.toEqual({configured:true});
  });
  it('books once, freezes COD/fee payer and rejects other stores and manual delivery',async()=>{
    const {id,input,shipment,row}=await book();
    expect((await service.book(id,input,owner,'test')).id).toBe(shipment.id);
    expect(row.request_json.cod_amount).toBe(120000);expect(row.request_json.payment_type_id).toBe(1);
    expect(schemaErrors(shipment,contracts.operations.bookStoreShipment.responses['200'])).toEqual([]);
    await expect(service.timeline(id,{...owner,store_membership:{...owner.store_membership,store_id:randomUUID()}},'STORE')).rejects.toMatchObject({status:404});
    await expect(new OrderService(undefined,{source:db}).transitionStoreOrder(id,{to_status:'SHIPPED',expected_version:1},owner,'test')).rejects.toThrow('hãng vận chuyển');
  });
  it('recovers a lost create response using the original client code without another create',async()=>{
    const {input,row}=await book();carrier.create.mockRejectedValueOnce(new CarrierError('CARRIER_RESULT_UNKNOWN'));
    await runner.processCommand(input.operation_id);
    expect((await db.query('SELECT status FROM shipping_command WHERE id=$1',[input.operation_id]))[0].status).toBe('UNKNOWN');
    carrier.lookup.mockResolvedValue(detail(row));await runner.processCommand(input.operation_id);
    expect(carrier.create).toHaveBeenCalledTimes(1);
    expect((await db.query('SELECT status FROM shipping_command WHERE id=$1',[input.operation_id]))[0].status).toBe('APPLIED');
  });
  it('accepts an early callback, ignores duplicate and old callbacks, and requires COD evidence before completion',async()=>{
    const {id,row}=await book();
    await callback(row,'picked','2026-01-02T00:00:00Z');await callback(row,'picked','2026-01-02T00:00:00Z');
    await callback(row,'ready_to_pick','2026-01-01T00:00:00Z');
    expect((await db.query('SELECT status FROM "order" WHERE id=$1',[id]))[0].status).toBe('SHIPPED');
    await callback(row,'delivered','2026-01-03T00:00:00Z');
    expect((await db.query('SELECT status FROM "order" WHERE id=$1',[id]))[0].status).toBe('SHIPPED');
    const timeline=await service.timeline(id,{user_id:customer},'CUSTOMER');
    expect(schemaErrors(timeline,contracts.operations.getOwnShipping.responses['200'])).toEqual([]);
    expect(timeline.items[0]).not.toHaveProperty('request_json');expect(timeline.items[0]).not.toHaveProperty('cod_vnd');
    const [current]=await db.query('SELECT * FROM shipping_shipment WHERE id=$1',[row.id]);
    await expect(service.confirmCod(row.id,{operation_id:randomUUID(),expected_version:current.version,amount_vnd:1,reference:'test'},admin,'test')).rejects.toThrow();
    const command={operation_id:randomUUID(),expected_version:current.version,amount_vnd:120000,reference:'test collection receipt'};
    await service.confirmCod(row.id,command,admin,'test');await service.confirmCod(row.id,command,admin,'test');
    expect((await db.query('SELECT status FROM "order" WHERE id=$1',[id]))[0].status).toBe('COMPLETED');
    expect((await db.query("SELECT id FROM outbox WHERE event_type='OrderCompleted' AND payload->>'order_id'=$1",[id]))).toHaveLength(1);
    expect((await db.query('SELECT id FROM shipping_event WHERE shipment_id=$1',[row.id]))).toHaveLength(2);
  });
  it('does not open a return on one failed attempt; opens one on confirmed return and waits for receipt',async()=>{
    const {id,row}=await book();
    await callback(row,'delivery_fail','2026-01-02T00:00:00Z');
    expect(await db.query('SELECT id FROM delivery_return_case WHERE order_id=$1',[id])).toHaveLength(0);
    await callback(row,'delivering','2026-01-03T00:00:00Z');
    await callback(row,'return','2026-01-04T00:00:00Z');await callback(row,'returning','2026-01-05T00:00:00Z');
    const rows=await db.query('SELECT * FROM delivery_return_case WHERE order_id=$1',[id]);expect(rows).toHaveLength(1);
    await expect(new DeliveryReturnService(db).inspect(rows[0].id,{operation_id:randomUUID(),expected_version:0,lines:[],note:'test'},owner,'test')).rejects.toThrow('Chờ hãng');
    expect((await db.query('SELECT status FROM "order" WHERE id=$1',[id]))[0].status).toBe('SHIPPED');
  });
  it('authenticates webhook before parsing and refuses unregistered ShopIds',async()=>{
    await expect(service.webhook('wrong',null)).rejects.toMatchObject({status:401});
    await expect(service.webhook(cfg.webhookSecret,{ShopID:999,OrderCode:'OTHER',Time:new Date().toISOString(),Type:'switch_status'})).rejects.toMatchObject({status:422});
    const noConfig=new ShippingService(db,{...cfg,enabled:false},carrier);
    expect(noConfig.connection(admin).booking_enabled).toBe(false);
    await expect(noConfig.book(await orderFixture(),{operation_id:randomUUID(),expected_order_version:0,pickup_location_id:pickup,weight:1,length:1,width:1,height:1},owner,'test')).rejects.toThrow('chưa bật');
  });
  it('restores only the replacement variant after a failed exchange and keeps the original order complete',async()=>{
    const order=await orderFixture(),request=randomUUID(),variant=randomUUID(),product=randomUUID(),category=randomUUID(),type=randomUUID();
    await catalog.query("INSERT INTO category(id,name,slug,status) VALUES($1,'Test','shipping-test','ACTIVE')",[category]);
    await catalog.query("INSERT INTO product_type(id,category_id,name,status) VALUES($1,$2,'Test','ACTIVE')",[type,category]);
    await catalog.query("INSERT INTO product(id,store_id,product_type_id,title,status,moderation_status) VALUES($1,$2,$3,'Test','ACTIVE','VISIBLE')",[product,store,type]);
    await catalog.query("INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status) VALUES($1,$2,$3,'EXCHANGE',100000,'{}','exchange',true,'ACTIVE')",[variant,product,store]);
    await catalog.query('INSERT INTO inventory(variant_id,store_id,quantity) VALUES($1,$2,9)',[variant,store]);
    const items=[{variant_id:variant,store_id:store,quantity:1,sku_snapshot:'EXCHANGE',unit_price_vnd:100000,product_snapshot:{title:'Replacement'}}];
    await catalog.query("INSERT INTO inventory_return_receipt(id,order_id,operation_id,payload_hash,actor_user_id,items_json) VALUES($1,$2,$3,'test',$4,'[]')",[request,order,randomUUID(),actor]);
    await catalog.query("INSERT INTO inventory_exchange_dispatch(receipt_id,operation_id,payload_hash,actor_user_id,items_json) VALUES($1,$2,'test',$3,$4)",[request,randomUUID(),actor,JSON.stringify(items)]);
    await db.query("UPDATE \"order\" SET status='COMPLETED' WHERE id=$1",[order]);
    await db.query("INSERT INTO order_return_request(id,order_id,type,reason,status,inventory_status,exchange_status,exchange_dispatch_snapshot) VALUES($1,$2,'EXCHANGE','test','RECEIVED','APPLIED','APPLIED',$3)",[request,order,{items}]);
    const shipment=await service.book(order,{operation_id:randomUUID(),expected_order_version:0,pickup_location_id:pickup,return_request_id:request,weight:100,length:10,width:10,height:10},owner,'test');
    const [row]=await db.query('SELECT * FROM shipping_shipment WHERE id=$1',[shipment.id]);
    await callback(row,'picked','2026-01-02T00:00:00Z');
    expect((await db.query('SELECT status FROM order_return_request WHERE id=$1',[request]))[0].status).toBe('EXCHANGE_SENT');
    await callback(row,'returned','2026-01-03T00:00:00Z');
    const [current]=await db.query('SELECT version FROM shipping_shipment WHERE id=$1',[row.id]);
    const input={operation_id:randomUUID(),expected_version:current.version,note:'Đã nhận đủ',lines:[{variant_id:variant,received_quantity:1,resellable_quantity:1,damaged_quantity:0}]};
    await service.inspectExchange(row.id,input,owner,'STORE','test');
    const inventory=new InventoryService(undefined,catalog);
    // M1 commits but the first acknowledgement is lost before M2 can finish.
    const exchangeRunner=new ShippingRunner(db,cfg,carrier,async body=>{await inventory.restockExchange(body);throw new Error('lost acknowledgement');});
    await expect(exchangeRunner.processExchangeReceipt(row.id)).rejects.toThrow('lost acknowledgement');
    await new ShippingRunner(db,cfg,carrier,body=>inventory.restockExchange(body)).processExchangeReceipt(row.id);
    expect((await catalog.query('SELECT quantity FROM inventory WHERE variant_id=$1',[variant]))[0].quantity).toBe(10);
    expect(await catalog.query("SELECT id FROM stock_movement WHERE order_id=$1 AND reason='EXCHANGE_RETURN'",[order])).toHaveLength(1);
    expect((await db.query('SELECT conversion_status FROM order_return_request WHERE id=$1',[request]))[0].conversion_status).toBe('PROPOSED');
    expect((await db.query('SELECT status FROM "order" WHERE id=$1',[order]))[0].status).toBe('COMPLETED');
  });

});
