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

const url=process.env.SHIPPING_TEST_DATABASE_URL;
(url?describe:describe.skip)('independent delivery service through HTTP and signed callbacks',()=>{
  it('creates, dispatches and collects COD across isolated databases with callback replay protection',async()=>{
    if(new URL(url!).pathname!=='/shipping_test')throw new Error('Dedicated test database required');
    const saved={...process.env};
    const root=await new DataSource({type:'postgres',url}).initialize();
    const schema='carrier_api_'+randomUUID().replace(/-/g,'');
    const merchantSchema=schema+'_merchant';
    await root.query('CREATE SCHEMA '+schema);await root.query('CREATE SCHEMA '+merchantSchema);
    const m2=await new DataSource({type:'postgres',url,extra:{options:'-csearch_path='+merchantSchema+',public'}}).initialize();
    let app:Awaited<ReturnType<typeof startDeliveryServer>>|undefined;
    const sync=new DeliverySync(m2);
    const receipts:Array<{body:Buffer;timestamp:string;signature:string}>=[];
    const callback=createServer(async(req,res)=>{
      const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));const body=Buffer.concat(chunks);
      try{
        const timestamp=String(req.headers['x-delivery-timestamp']),signature=String(req.headers['x-delivery-signature']);
        await sync.receive(body,timestamp,signature);receipts.push({body,timestamp,signature});res.writeHead(200).end('{}');
      }catch{res.writeHead(401).end('{}');}
    });
    try{
      const folder=resolve(__dirname,'../../commerce-service/migrations');
      for(const file of readdirSync(folder).filter(f=>f.endsWith('.sql')).sort())await m2.query(readFileSync(resolve(folder,file),'utf8'));
      callback.listen(0,'127.0.0.1');await once(callback,'listening');
      const providerDb=new URL(url!);providerDb.searchParams.set('options','-csearch_path='+schema+',public');
      Object.assign(process.env,{DELIVERY_DATABASE_URL:providerDb.toString(),DELIVERY_API_KEY:'test-merchant-key-at-least-24-characters',DELIVERY_OPERATOR_PASSWORD:'operator-test-password',DELIVERY_SESSION_KEY:'test-session-key-at-least-24-characters',DELIVERY_WEBHOOK_SECRET:'test-webhook-key-at-least-24-characters',DELIVERY_WEBHOOK_URL:'http://127.0.0.1:'+(callback.address() as any).port,PORT:'0',DELIVERY_PUBLIC_PATH:'/',DELIVERY_COOKIE_SECURE:'0'});
      app=await startDeliveryServer();if(!app.server.listening)await once(app.server,'listening');
      const base='http://127.0.0.1:'+(app.server.address() as any).port;process.env.DELIVERY_API_URL=base;
      const api=new DeliveryApi(),worker=new DeliverySync(m2,api),admin={user_id:randomUUID(),roles:['ADMIN'],role_permissions:['platform.admin']};
      const store=randomUUID(),customer=randomUUID(),pickup=randomUUID(),order=randomUUID();
      const address={recipient_name:'Người nhận',phone:'0900000000',line1:'123 Test',ward:'Test',city:'Đà Nẵng'};
      await new PlatformDeliveryService(m2).savePickup({id:pickup,store_id:store,name:'Kho thử',address,enabled:true,expected_version:0},admin,'test');
      await m2.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,address_snapshot,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd) VALUES($1,$1,$2,$3,$4,'PREPARING','COD',100000,0,0,20000,120000)`,[order,customer,store,address]);
      await m2.query("INSERT INTO order_item(order_id,product_id,variant_id,product_snapshot,sku_snapshot,unit_price_vnd,quantity,line_total_vnd) VALUES($1,$2,$3,'{\"title\":\"Test item\"}','TEST',100000,1,100000)",[order,randomUUID(),randomUUID()]);
      await m2.transaction(m=>new PaymentService(m).createForOrder({order_id:order,method:'COD',payable_vnd:120000n,operation_id:randomUUID()}));
      await m2.query("UPDATE \"order\" SET status='PROCESSING' WHERE id=$1",[order]);
      const operation=randomUUID();
      const shipment=await new ShippingService(m2).book(order,{operation_id:operation,expected_order_version:0,pickup_location_id:pickup,weight:500,length:10,width:10,height:10,note:'Hàng dễ vỡ'},{user_id:admin.user_id,store_membership:{store_id:store,role:'OWNER'}},'test');
      expect(shipment.status).toBe('CREATING');expect(shipment.tracking_code).toBeUndefined();
      await worker.processCommand(operation);
      const [local]=await m2.query('SELECT * FROM shipping_shipment WHERE id=$1',[shipment.id]);
      expect(local.tracking_code).toMatch(/^DLV-/);
      expect((await api.create(local.client_order_code,local.request_json)).tracking_code).toBe(local.tracking_code);
      expect((await fetch(base+'/api/v1/parcels/'+local.client_order_code)).status).toBe(401);
      await expect(api.command(local.client_order_code,{operation_id:randomUUID(),expected_version:1,action:'DELIVER',note:'forged',collected_vnd:120000})).rejects.toThrow();
      const login=await fetch(base+'/ops/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:process.env.DELIVERY_OPERATOR_PASSWORD})});
      expect(login.status).toBe(200);
      const cookie=login.headers.get('set-cookie')!.split(';')[0];
      let snapshot=await api.lookup(local.client_order_code);
      expect(snapshot.handling_note).toBe('Hàng dễ vỡ');
      const operatorList=await fetch(base+'/ops/api/parcels?page=1',{headers:{Cookie:cookie}});
      expect((await operatorList.json()).items).toEqual(expect.arrayContaining([expect.objectContaining({tracking_code:local.tracking_code,handling_note:'Hàng dễ vỡ'})]));
      async function act(action:string,extra={}){
        const body={operation_id:randomUUID(),expected_version:snapshot.version,action,...extra};
        const send=()=>fetch(base+'/ops/api/parcels/'+local.client_order_code+'/actions',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
        const response=await send();expect(response.status).toBe(200);snapshot=await response.json();
        const replay=await send();expect(replay.status).toBe(200);expect((await replay.json()).version).toBe(snapshot.version);
      }
      await act('ASSIGN',{courier_name:'Nhân viên giao hàng'});await act('PICK_UP');await act('OUT_FOR_DELIVERY');await act('FAIL',{note:'Không gặp khách'});await act('REDELIVER');await act('OUT_FOR_DELIVERY');await act('DELIVER',{note:'Khách nhận đủ',collected_vnd:120000});
      expect(snapshot).toMatchObject({handling_note:'Hàng dễ vỡ',note:'Khách nhận đủ'});
      const deadline=Date.now()+12000;
      while(Date.now()<deadline){await worker.tick();const [row]=await m2.query('SELECT status FROM "order" WHERE id=$1',[order]);if(row.status==='COMPLETED')break;await new Promise(r=>setTimeout(r,200));}
      expect((await m2.query('SELECT status FROM "order" WHERE id=$1',[order]))[0].status).toBe('COMPLETED');
      expect(receipts.length).toBeGreaterThan(0);
      const receipt=receipts[0];await sync.receive(receipt.body,receipt.timestamp,receipt.signature);await worker.tick();
      await expect(sync.receive(receipt.body,receipt.timestamp,'tampered')).rejects.toMatchObject({status:401});
      expect(await m2.query("SELECT id FROM outbox WHERE event_type='OrderCompleted' AND payload->>'order_id'=$1",[order])).toHaveLength(1);
      expect((await m2.query('SELECT carrier_version FROM shipping_shipment WHERE id=$1',[shipment.id]))[0].carrier_version).toBe(snapshot.version);
      const rejected=randomUUID();
      await m2.query("INSERT INTO shipping_command(id,shipment_id,kind) VALUES($1,$2,'CANCEL')",[rejected,shipment.id]);
      await worker.processCommand(rejected);
      expect((await m2.query('SELECT status FROM shipping_command WHERE id=$1',[rejected]))[0].status).toBe('FAILED');
    }finally{
      if(app)await app.close();callback.closeAllConnections();await new Promise<void>(done=>callback.close(()=>done()));
      await m2.destroy();await root.query('DROP SCHEMA '+merchantSchema+' CASCADE');await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();
      for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);
    }
  },45000);
});
