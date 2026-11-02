import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource,EntityManager} from 'typeorm';
import {ReportService} from '../../commerce-service/src/report/report.service';
import {PaymentService} from '../../commerce-service/src/payment/payment.service';

const suite=process.env.M2_DATABASE_URL?describe:describe.skip;
suite('Reports remain internally consistent when cash commits between report queries',()=>{
 let root:DataSource,db:DataSource,schema:string;
 beforeAll(async()=>{root=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL}).initialize();schema='cash_snapshot_'+randomUUID().replace(/-/g,'');await root.query('CREATE SCHEMA '+schema);db=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public'}}).initialize();const dir=resolve(__dirname,'../../commerce-service/migrations');for(const f of readdirSync(dir).filter(n=>n.endsWith('.sql')).sort())await db.query(readFileSync(resolve(dir,f),'utf8'));});
 afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(root?.isInitialized){if(/^cash_snapshot_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();}});
 test.each(['OWNER','ADMIN'] as const)('%s sees one snapshot; the following report includes the newly committed payment',async(role)=>{
  const order=randomUUID(),store=randomUUID(),owner=randomUUID(),operation=randomUUID();
  await db.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd) VALUES($1,$1,$2,$3,'PREPARING','COD',100000,0,0,20000,120000)`,[order,owner,store]);
  await db.transaction(m=>new PaymentService(m).createForOrder({order_id:order,method:'COD',payable_vnd:120000n,operation_id:randomUUID()}));await db.query("UPDATE \"order\" SET status='SHIPPED' WHERE id=$1",[order]);
  let inserted=false;
  function observe(manager:EntityManager){return new Proxy(manager,{get(target,key){if(key==='query')return async(sql:string,args?:unknown[])=>{const result=await target.query(sql,args);if(!inserted&&sql.includes('FROM money_movement WHERE')&&sql.includes('AS refunded_vnd')&&!sql.includes('GROUP BY')){inserted=true;await db.transaction(m=>new PaymentService(m).recordCodCollection({order_id:order,amount_vnd:120000n,operation_id:operation,actor_user_id:owner}));}return result;};const value=(target as any)[key];return typeof value==='function'?value.bind(target):value;}});}
  const source={manager:observe(db.manager),transaction:(isolation:any,work:any)=>db.transaction(isolation,m=>work(observe(m)))} as DataSource;
  const clients=()=>({call:async()=>({items:[],total:0,page:1,size:100})}) as any,service=new ReportService(clients,undefined,source),plain=new ReportService(clients,undefined,db),auth={user_id:owner,access_token:'fixture',roles:role==='OWNER'?['STORE_OWNER']:['ADMIN'],role_permissions:['platform.admin'],store_membership:{store_id:store,role:'OWNER',status:'ACTIVE',permissions:[]}},period={from:'2000-01-01T00:00:00Z',to:'2100-01-01T00:00:00Z',store_id:store};
  const report=role==='OWNER'?await service.getStoreReport(period,auth,'snapshot-test'):await service.getPlatformMoneyReport(period,auth);
  expect(inserted).toBe(true);expect(report.collected_vnd).toBe(0);expect(report.cash_series!.reduce((n,r)=>n+r.collected_vnd,0)).toBe(report.collected_vnd);expect(report.unresolved_collected_vnd).toBe(0);
  const next=role==='OWNER'?await plain.getStoreReport(period,auth,'fresh-report'):await plain.getPlatformMoneyReport(period,auth);expect(next.collected_vnd).toBe(120000);expect(next.cash_series!.reduce((n,r)=>n+r.collected_vnd,0)).toBe(120000);expect(next.unresolved_collected_vnd).toBe(0);
  expect((await db.query('SELECT count(*)::int n FROM money_movement WHERE order_id=$1',[order]))[0].n).toBe(1);
 });
});
