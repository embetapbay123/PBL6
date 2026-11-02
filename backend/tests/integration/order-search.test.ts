import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {OrderRepository} from '../../commerce-service/src/order/order.repository';
import {ReportRepository} from '../../commerce-service/src/report/report.repository';
import {adminOrderResponse} from '../../commerce-service/src/report/report.service';
import {schemaErrors} from '../../shared/src/contract-validation';
import contracts from '../../shared/src/contracts.runtime.generated.json';
const suite=process.env.M2_DATABASE_URL?describe:describe.skip;
suite('Order search uses immutable snapshots across scoped full datasets',()=>{
 let root:DataSource,db:DataSource,schema:string,repo:OrderRepository,admin:ReportRepository;
 const store=randomUUID(),otherStore=randomUUID(),customer=randomUUID(),otherCustomer=randomUUID(),target=randomUUID(),group=randomUUID();
 beforeAll(async()=>{
  root=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL}).initialize();schema='order_search_'+randomUUID().replace(/-/g,'');await root.query('CREATE SCHEMA '+schema);db=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public'}}).initialize();
  const dir=resolve(__dirname,'../../commerce-service/migrations');for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(dir,file),'utf8'));repo=new OrderRepository(db.manager);admin=new ReportRepository(db.manager);
  async function order(id:string,owner:string,s:string,status:string,title:string,sku:string,payment:string,number:number){
   await db.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,address_snapshot,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd,created_at) VALUES($1,$2,$3,$4,$5,$6,'SANDBOX',100000,0,0,20000,120000,now()-$7*interval '1 minute')`,[id,id===target?group:id,owner,s,{recipient_name:'Nguyễn Ánh Đỏ',phone:'0912345678',line1:'123 đường kiểm thử'},status,number]);
   await db.query("INSERT INTO order_item(order_id,product_id,variant_id,product_snapshot,sku_snapshot,unit_price_vnd,quantity,line_total_vnd) VALUES($1,$2,$3,$4,$5,100000,1,100000)",[id,randomUUID(),randomUUID(),{title,variant_values:{color:'Đỏ',size:id===target?'M-12':'M'}},sku]);
   await db.query("INSERT INTO payment(order_id,method,status,payable_vnd,collectible_vnd,collected_vnd,refunded_vnd) VALUES($1,'SANDBOX',$2,120000,0,$3,0)",[id,payment,payment==='SUCCEEDED'?120000:0]);
  }
  for(let n=0;n<45;n++)await order(randomUUID(),customer,store,'COMPLETED',n%2?'Áo phổ thông':'Áo phổ thông'.normalize('NFD'),'SKU-'+n,'SUCCEEDED',n);
  await order(target,customer,store,'AWAITING_PAYMENT','Điện thoại Đỏ %_','009264','UNKNOWN',100);
  await order(randomUUID(),otherCustomer,otherStore,'AWAITING_PAYMENT','Điện thoại Đỏ %_','009264','UNKNOWN',101);
 });
 afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(root?.isInitialized){if(/^order_search_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();}});
 test('Customer finds the old target by snapshot title, SKU, variant, recipient, phone, full ID or group without another Customer data',async()=>{
  for(const q of ['dien thoai do','ĐIỆN THOẠI ĐỎ'.normalize('NFD'),'009264','M-12','0912345678','nguyen anh do',target,group]){const result=await repo.pageCustomerOrders(customer,1,20,{q,status:'AWAITING_PAYMENT',payment_status:'UNKNOWN'});expect(result.total).toBe(1);expect(result.items[0].id).toBe(target);expect(result.items[0].items[0].sku_snapshot).toBe('009264');}
  const foreign=await repo.pageCustomerOrders(otherCustomer,1,20,{q:target});expect(foreign.total).toBe(0);
 });
 test('Store filters before count/page and cannot see another Store even if search and payment status match',async()=>{
  const result=await repo.pageStoreOrders(store,1,20,{q:'009264',payment_status:'UNKNOWN'});expect(result.total).toBe(1);expect(result.items[0].id).toBe(target);expect((await repo.pageStoreOrders(otherStore,1,20,{q:target})).total).toBe(0);expect((await repo.pageStoreOrders(store,2,20,{q:'009264'}))).toMatchObject({items:[],total:1});
 });
 test('Vietnamese normalization and stable paging operate on all snapshot rows; LIKE metacharacters stay literal',async()=>{
  const a=await repo.pageCustomerOrders(customer,1,20,{q:'ao pho thong'}),b=await repo.pageCustomerOrders(customer,2,20,{q:'ÁO PHỔ THÔNG'}),c=await repo.pageCustomerOrders(customer,3,20,{q:'áo phổ thông'.normalize('NFD')});expect([a.total,b.total,c.total]).toEqual([45,45,45]);expect(new Set([...a.items,...b.items,...c.items].map(row=>row.id)).size).toBe(45);
  expect((await repo.pageStoreOrders(store,1,20,{q:'%_'})).total).toBe(1);expect((await repo.pageCustomerOrders(customer,1,20,{q:"' OR 1=1 --"})).total).toBe(0);
 });
 test('Admin gets matched Store data plus original recipient, snapshot items, money and timestamp for the selected page',async()=>{
  const result=await admin.pageAllOrders(1,20,{q:'009264',store_id:store,payment_status:'UNKNOWN'});expect(result.total).toBe(1);const dto=adminOrderResponse(result.items[0]);expect(dto).toMatchObject({id:target,store_id:store,address_snapshot:{recipient_name:'Nguyễn Ánh Đỏ'},items:[{sku_snapshot:'009264',quantity:1,unit_price_vnd:100000}],amounts:{payable_vnd:120000}});expect(dto.created_at).toBeDefined();expect(schemaErrors({page:1,size:20,...result,items:[dto]},contracts.operations.listAllOrders.responses['200'])).toEqual([]);
  expect((await admin.pageAllOrders(1,20,{q:'009264'})).total).toBe(2);expect((await admin.pageAllOrders(2,20,{q:target}))).toMatchObject({items:[],total:1});
 });
 test('refund request and UNKNOWN remain distinct from collected money and confirmed full refund',async()=>{
  const order=randomUUID(),payment=randomUUID(),refund=randomUUID();
  await db.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd) VALUES($1,$1,$2,$3,'CANCELLED','SANDBOX',100000,0,0,20000,120000)`,[order,customer,store]);
  await db.query("INSERT INTO payment(id,order_id,method,status,payable_vnd,collectible_vnd,collected_vnd,refunded_vnd) VALUES($1,$2,'SANDBOX','SUCCEEDED',120000,0,120000,0)",[payment,order]);
  await db.query("INSERT INTO refund(id,payment_id,order_id,amount_vnd,status,operation_id) VALUES($1,$2,$3,120000,'REQUESTED',$1)",[refund,payment,order]);
  const requested=await admin.pageAllOrders(1,20,{q:order,payment_status:'SUCCEEDED',refund_status:'REQUESTED'});expect(requested.total).toBe(1);expect(adminOrderResponse(requested.items[0])).toMatchObject({payment_status:'SUCCEEDED',refund_status:'REQUESTED'});expect((await repo.pageCustomerOrders(customer,1,20,{q:order,refund_status:'SUCCEEDED'})).total).toBe(0);
  await db.query("UPDATE refund SET status='UNKNOWN' WHERE id=$1",[refund]);const unknown=await repo.pageStoreOrders(store,1,20,{q:order,refund_status:'UNKNOWN'});expect(unknown.total).toBe(1);expect(unknown.items[0].refund_status).toBe('UNKNOWN');expect((await db.query('SELECT refunded_vnd FROM payment WHERE id=$1',[payment]))[0].refunded_vnd).toBe('0');
 });
 test('Admin retains the recorded policy and timeline, including the real completed timestamp, without raw actor IDs',async()=>{
  const [completed]=await db.query("SELECT id,created_at FROM \"order\" WHERE store_id=$1 AND status='COMPLETED' ORDER BY id LIMIT 1",[store]);
  const address={recipient_name:'Kho đã chốt',phone:'0900000000',line1:'123 Kho cũ',ward:'Phường A',district:'Quận B',city:'Huế'},policy={version:'PLATFORM_2026_10_30',window_hours:168,full_refund_includes_original_shipping:true,fault_fee_rule:'STORE_IF_STORE_FAULT_CUSTOMER_IF_CHANGE_OF_MIND_ADMIN_IF_DISPUTED',return_address:address};
  await db.query('UPDATE "order" SET return_policy_snapshot=$2 WHERE id=$1',[completed.id,policy]);const when=new Date(Date.now()-1000),actor=randomUUID();await db.query("INSERT INTO order_status_history(order_id,from_status,to_status,actor_user_id,created_at,operation_id) VALUES($1,'SHIPPED','COMPLETED',$2,$3,$4)",[completed.id,actor,when,randomUUID()]);
  const result=await admin.pageAllOrders(1,20,{q:completed.id,store_id:store}),dto=adminOrderResponse(result.items[0]);expect(dto.return_policy_snapshot).toEqual(policy);expect(dto.completed_at).toBe(when.toISOString());expect(dto.timeline).toEqual([{status:'COMPLETED',from_status:'SHIPPED',occurred_at:when.toISOString(),actor_kind:'STORE'}]);expect(JSON.stringify(dto)).not.toContain(actor);expect(schemaErrors({page:1,size:20,...result,items:[dto]},contracts.operations.listAllOrders.responses['200'])).toEqual([]);
 });
 test('Admin does not invent policy or completion time for a historical order with no recorded evidence',async()=>{
  const result=await admin.pageAllOrders(1,20,{q:target,store_id:store}),dto=adminOrderResponse(result.items[0]);expect(dto.return_policy_snapshot).toBeUndefined();expect(dto.completed_at).toBeUndefined();expect(dto.timeline).toBeUndefined();
 });
 test('empty or legacy snapshot stays empty and is not replaced by a current catalog lookup',async()=>{
  await db.query("UPDATE order_item SET product_snapshot='{}',sku_snapshot='LEGACY-ONLY' WHERE order_id=$1",[target]);const result=await repo.pageCustomerOrders(customer,1,20,{q:'LEGACY-ONLY'});expect(result.total).toBe(1);expect(result.items[0].items[0].product_snapshot).toEqual({});expect((await repo.pageCustomerOrders(customer,1,20,{q:'dien thoai do'})).total).toBe(0);
 });
});
