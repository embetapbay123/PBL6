import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {ReturnsService} from '../../commerce-service/src/returns/returns.service';
const suite=process.env.M2_DATABASE_URL?describe:describe.skip;
suite('non-retroactive return policy on real PostgreSQL',()=>{
 let admin:DataSource,db:DataSource,schema:string,service:ReturnsService;
 const user=randomUUID(),store=randomUUID(),auth={user_id:user};
 const policy={version:'PLATFORM_2026_10_30',window_hours:168,full_refund_includes_original_shipping:true,fault_fee_rule:'STORE_IF_STORE_FAULT_CUSTOMER_IF_CHANGE_OF_MIND_ADMIN_IF_DISPUTED',return_address:{recipient_name:'Kho trả',phone:'0900000000',line1:'Địa chỉ trả lúc mua',ward:'A',district:'B',city:'Huế'}};
 beforeAll(async()=>{admin=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL}).initialize();schema='policy_fix_'+randomUUID().replace(/-/g,'');await admin.query('CREATE SCHEMA '+schema);db=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public'}}).initialize();const dir=resolve(__dirname,'../../commerce-service/migrations');for(const f of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(dir,f),'utf8'));service=new ReturnsService(db);});
 afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(admin?.isInitialized){if(/^policy_fix_[a-f0-9]{32}$/.test(schema))await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.destroy();}});
 async function order(ageHours:number,snapshot:any=policy,history=true){const id=randomUUID();await db.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd,return_policy_snapshot) VALUES($1,$1,$2,$3,'COMPLETED','COD',100000,0,0,20000,120000,$4)`,[id,user,store,snapshot]);if(history)await db.query("INSERT INTO order_status_history(order_id,from_status,to_status,actor_user_id,operation_id,created_at) VALUES($1,'SHIPPED','COMPLETED',$2,$3,now()-$4*interval '1 hour')",[id,user,randomUUID(),ageHours]);return id;}
 const body={type:'REFUND' as const,reason:'Đề nghị trả hàng',expected_order_version:0};
 test('new order just inside 168h is eligible; outside it is refused without request/history effects',async()=>{
  const inside=await order(167.99),outside=await order(168.01);const request=await service.create(inside,body,auth,'inside');expect(request.return_policy_snapshot).toEqual(policy);expect(request.legacy_policy).toBe(false);
  await expect(service.create(outside,body,auth,'outside')).rejects.toMatchObject({status:409,response:{code:'RETURN_WINDOW_EXPIRED'}});expect(await db.query('SELECT id FROM order_return_request WHERE order_id=$1',[outside])).toHaveLength(0);
 });
 test('timely request continues after expiry with the original policy/address snapshot',async()=>{
  const id=await order(167.99),request=await service.create(id,body,auth,'timely');await db.query("UPDATE order_status_history SET created_at=now()-interval '30 days' WHERE order_id=$1",[id]);
  expect((await service.create(id,body,auth,'retry')).id).toBe(request.id);
  const owner={user_id:randomUUID(),store_membership:{store_id:store,role:'OWNER',status:'ACTIVE'}};
  const result=await service.transition(request.id,{status:'APPROVED',expected_version:0,decision_note:'Chấp thuận và hướng dẫn gửi trả',fault_party:'STORE'},owner,'STORE','after-window');expect(result.status).toBe('APPROVED');expect(result.return_policy_snapshot?.return_address.line1).toBe('Địa chỉ trả lúc mua');
 });
 test('legacy orders have no retrospective deadline, while a new order missing completion evidence requires reconciliation',async()=>{
  const legacy=await order(24*365,null,false);expect((await service.create(legacy,body,auth,'legacy')).legacy_policy).toBe(true);
  const partial=await order(24*365,{},false);expect((await service.create(partial,body,auth,'partial-policy')).legacy_policy).toBe(true);
  const missing=await order(0,policy,false);await expect(service.create(missing,body,auth,'missing')).rejects.toMatchObject({status:409,response:{code:'RETURN_POLICY_RECONCILIATION_REQUIRED'}});
 });
});
