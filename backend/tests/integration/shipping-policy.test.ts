import {randomUUID} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {OrderRepository} from '../../commerce-service/src/order/order.repository';
import {OrderService} from '../../commerce-service/src/order/order.service';
import {ShippingService} from '../../commerce-service/src/shipping/shipping.service';

const url=process.env.SHIPPING_TEST_DATABASE_URL;
(url?describe:describe.skip)('platform-managed shipping policy',()=>{
  it('migrates only unhanded orders, preserves history and requires a carrier even without a configured pickup',async()=>{
    if(new URL(url!).pathname!=='/shipping_test')throw new Error('Dedicated test database required');
    const root=await new DataSource({type:'postgres',url}).initialize(),schema='shipping_policy_'+randomUUID().replace(/-/g,'');
    await root.query('CREATE SCHEMA '+schema);
    const db=await new DataSource({type:'postgres',url,extra:{options:'-csearch_path='+schema+',public'}}).initialize();
    try{
      const folder=resolve(__dirname,'../../commerce-service/migrations'),migration='027_managed_shipping_default.sql';
      for(const file of readdirSync(folder).filter(f=>f.endsWith('.sql')&&f<migration).sort())await db.query(readFileSync(resolve(folder,file),'utf8'));
      const store=randomUUID(),customer=randomUUID(),owner={user_id:randomUUID(),roles:['STORE_OWNER'],store_membership:{store_id:store,role:'OWNER',status:'ACTIVE',permissions:[]}};
      async function insert(status:string){
        const id=randomUUID();
        await db.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,address_snapshot,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd)
          VALUES($1,$1,$2,$3,'{}',$4,'COD',100000,0,0,20000,120000)`,[id,customer,store,status]);return id;
      }
      const pending=await insert('PENDING'),processing=await insert('PROCESSING'),shipped=await insert('SHIPPED'),complete=await insert('COMPLETED'),cancelled=await insert('CANCELLED'),recorded=await insert('PROCESSING');
      await db.query("INSERT INTO shipment(order_id,status,shipped_at) VALUES($1,'SHIPPED',now()),($2,'DELIVERED',now()),($3,'SHIPPED',now())",[shipped,complete,recorded]);
      await db.transaction(manager=>manager.query(readFileSync(resolve(folder,migration),'utf8')));
      const rows=await db.query('SELECT id,shipping_mode,version,status FROM "order"');
      for(const id of [pending,processing])expect(rows.find((r:any)=>r.id===id)).toMatchObject({shipping_mode:'PLATFORM',version:1});
      for(const id of [shipped,complete,cancelled,recorded])expect(rows.find((r:any)=>r.id===id)).toMatchObject({shipping_mode:'LEGACY_MANUAL',version:0});
      const created=await new OrderRepository(db.manager).createOrder({id:randomUUID(),purchase_group_id:randomUUID(),customer_user_id:customer,store_id:store,address_snapshot:{},status:'PROCESSING',payment_method:'COD',goods_vnd:100000,store_discount_vnd:0,platform_discount_vnd:0,shipping_vnd:20000,payable_vnd:120000});
      expect(created.shipping_mode).toBe('PLATFORM');
      const orders=new OrderService(undefined,{source:db});
      for(const id of [created.id,processing])for(const status of ['SHIPPED','COMPLETED'])await expect(orders.transitionStoreOrder(id,{to_status:status as 'SHIPPED'|'COMPLETED',expected_version:id===created.id?0:1},owner,'test')).rejects.toMatchObject({response:{code:'CARRIER_MANAGED_ORDER'}});
      const timeline=await new ShippingService(db).timeline(created.id,owner,'STORE');
      expect(timeline.mode).toBe('PLATFORM');expect(timeline.locations).toEqual([]);
      const next=await insert('PENDING');expect((await db.query('SELECT shipping_mode FROM "order" WHERE id=$1',[next]))[0].shipping_mode).toBe('PLATFORM');
      expect((await db.query('SELECT status FROM "order" WHERE id=$1',[shipped]))[0].status).toBe('SHIPPED');
    }finally{
      await db.destroy();await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();
    }
  });
});
