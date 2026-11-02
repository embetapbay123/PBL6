import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {ReportRepository} from '../../commerce-service/src/report/report.repository';
import {ReportService} from '../../commerce-service/src/report/report.service';
import {schemaErrors} from '../../shared/src/contract-validation';
import {validateOperation} from '../../shared/src/request-contract';
import contracts from '../../shared/src/contracts.runtime.generated.json';
const suite=process.env.M2_DATABASE_URL?describe:describe.skip;
suite('Confirmed event periods and historical money gaps, isolated M2 PostgreSQL',()=>{
 let root:DataSource,db:DataSource,schema:string,repo:ReportRepository,service:ReportService;
 const store=randomUUID(),other=randomUUID(),owner=randomUUID(),admin={user_id:randomUUID(),roles:['ADMIN'],role_permissions:['platform.admin']};
 const auth={user_id:owner,roles:['STORE_OWNER'],store_membership:{store_id:store,role:'OWNER',status:'ACTIVE',permissions:[]}};
 const from='2026-11-01T00:00:00+07:00',to='2026-11-02T00:00:00+07:00';
 const missing:string[]=[],outside:string[]=[];
 beforeAll(async()=>{
  root=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL}).initialize();schema='cash_report_'+randomUUID().replace(/-/g,'');await root.query('CREATE SCHEMA '+schema);db=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public'}}).initialize();const dir=resolve(__dirname,'../../commerce-service/migrations');for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(dir,file),'utf8'));repo=new ReportRepository(db.manager);service=new ReportService(undefined,undefined,db);
  async function event(s:string,amount:number,kind:'COLLECTION'|'REFUND',at?:string){
   const order=randomUUID(),payment=randomUUID();await db.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd,created_at) VALUES($1,$1,$2,$3,'COMPLETED','COD',$4,0,0,0,$4,'2020-01-01')`,[order,owner,s,amount]);await db.query("INSERT INTO payment(id,order_id,method,status,payable_vnd,collectible_vnd,collected_vnd,refunded_vnd) VALUES($1,$2,'COD',$3,$4,0,$4,$5)",[payment,order,kind==='REFUND'?'REFUNDED':'SUCCEEDED',amount,kind==='REFUND'?amount:0]);
   if(at)await db.query("INSERT INTO money_movement(payment_id,order_id,store_id,kind,amount_vnd,source_type,source_id,occurred_at,time_source) VALUES($1,$2,$3,$4,$5,'TEST_CONFIRMED_EVENT',$6,$7,'OWNER_ATTESTED')",[payment,order,s,kind,amount,randomUUID(),at]);return {order,payment};
  }
  await event(store,110000,'COLLECTION','2026-10-31T16:59:59.999Z');await event(store,120000,'COLLECTION','2026-10-31T17:00:00Z');await event(store,120000,'REFUND','2026-11-01T16:59:59.999Z');await event(store,130000,'COLLECTION','2026-11-01T17:00:00Z');await event(other,990000,'COLLECTION','2026-10-31T17:00:00Z');
  for(let n=0;n<25;n++)missing.push((await event(store,1000+n,'COLLECTION')).payment);
  outside.push((await event(other,777000,'COLLECTION')).payment);
 });
 afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(root?.isInitialized){if(/^cash_report_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();}});
 test('old orders with collection/refund in the selected Vietnam day are counted by event time with both boundaries correct',async()=>{
  const data=await repo.getStoreReportData(store,new Date(from),new Date(to),'DAY');expect(data.order_count).toBe(0);expect(data.order_value_vnd).toBe('0');expect(data.collected_vnd).toBe('120000');expect(data.refunded_vnd).toBe('120000');expect(data.cash_series).toEqual([{bucket_start:new Date('2026-10-31T17:00:00Z'),collected_vnd:'120000',refunded_vnd:'120000'}]);
  const month=await repo.getStoreReportData(store,new Date(from),new Date(to),'MONTH');expect(new Date(month.cash_series![0].bucket_start).toISOString()).toBe('2026-10-31T17:00:00.000Z');
 });
 test('Admin report has the same event definition, optional Store scope and valid public contract',async()=>{
  const scoped=await service.getPlatformMoneyReport({from,to,store_id:store},admin);expect(scoped).toMatchObject({store_id:store,order_count:0,collected_vnd:120000,refunded_vnd:120000,timezone:'Asia/Ho_Chi_Minh'});expect(schemaErrors(scoped,contracts.operations.getPlatformMoneyReport.responses['200'])).toEqual([]);
  const all=await service.getPlatformMoneyReport({from,to},admin);expect(all.collected_vnd).toBe(1110000);expect(all.refunded_vnd).toBe(120000);expect(all).not.toHaveProperty('store_id');
 });
 test('unresolved balances are visible outside periods, paginate before returning and have no fabricated event timestamp',async()=>{
  const a=await service.listUnresolvedMoney({size:20},auth),b=await service.listUnresolvedMoney({page:2,size:20},auth);expect(a.total).toBe(26);expect(b.items).toHaveLength(6);const all=[...a.items,...b.items];expect(new Set(all.map(row=>row.payment_id+row.kind)).size).toBe(26);expect(all.every(row=>row.store_id===store)).toBe(true);expect(all.some(row=>outside.includes(row.payment_id))).toBe(false);for(const row of all){expect(row).not.toHaveProperty('occurred_at');expect(row.reconciliation_reason).toBe('MISSING_VERIFIED_EVENT_TIME');}expect(schemaErrors(a,contracts.operations.listStoreUnresolvedMoneyMovements.responses['200'])).toEqual([]);
  const expected=25*1000+24*25/2+120000;const summary=await service.getPlatformMoneyReport({from,to,store_id:store},admin);expect(summary.unresolved_collected_vnd).toBe(expected);expect(summary.unresolved_refunded_vnd).toBe(0);
 });
 test('Admin can identify an unresolved balance in another Store; Owner cannot choose that scope and date filters are rejected for date-unknown records',async()=>{
  const own=await service.listUnresolvedMoney({store_id:other},auth);expect(own.items.every(row=>row.store_id===store)).toBe(true);expect((await service.listUnresolvedMoney({store_id:other},admin,true)).items[0]).toMatchObject({payment_id:outside[0],store_id:other});
  expect(()=>validateOperation('listStoreUnresolvedMoneyMovements',{query:{store_id:other} as any})).toThrow();expect(()=>validateOperation('listAdminUnresolvedMoneyMovements',{query:{from} as any})).toThrow();
 });
 test('confirmed journal page reconciles to report totals and includes time source and durable source IDs',async()=>{
  const rows=await service.listMoney({from,to,store_id:store},admin,true);expect(rows.total).toBe(2);expect(rows.items.reduce((sum,row)=>sum+(row.kind==='COLLECTION'?row.amount_vnd:0),0)).toBe(120000);expect(rows.items.reduce((sum,row)=>sum+(row.kind==='REFUND'?row.amount_vnd:0),0)).toBe(120000);expect(rows.items.every(row=>row.time_source==='OWNER_ATTESTED'&&row.source_id)).toBe(true);expect(rows.items.every(row=>Date.parse(row.occurred_at)>=Date.parse(from)&&Date.parse(row.occurred_at)<Date.parse(to))).toBe(true);
 });
 test('insufficient Admin permission, wrong role and invalid periods fail before producing a report',async()=>{
  await expect(service.getPlatformMoneyReport({from,to},{...admin,role_permissions:[]})).rejects.toMatchObject({status:403});await expect(service.getPlatformMoneyReport({from,to},auth)).rejects.toMatchObject({status:403});await expect(service.listUnresolvedMoney({}, {...auth,store_membership:{...auth.store_membership,role:'SELLER'} })).rejects.toMatchObject({status:403});for(const q of [{from:to,to:from},{from:'bad',to}])await expect(service.getPlatformMoneyReport(q,admin)).rejects.toMatchObject({status:422});
 });
});
