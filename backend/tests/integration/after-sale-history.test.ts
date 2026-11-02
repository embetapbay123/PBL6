import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {AfterSaleHistoryService,readHistoryCursor} from '../../commerce-service/src/returns/after-sale-history.service';
import {schemaErrors} from '../../shared/src/contract-validation';
import registry from '../../shared/src/contracts.runtime.generated.json';

const suite=process.env.M2_DATABASE_URL?describe:describe.skip;
suite('scoped after-sale history reader in isolated PostgreSQL',()=>{
 let root:DataSource,db:DataSource,schema:string,service:AfterSaleHistoryService;
 const customer=randomUUID(),owner=randomUUID(),employee=randomUUID(),store=randomUUID(),admin=randomUUID();
 const buyer={user_id:customer,roles:['CUSTOMER']},boss={user_id:owner,roles:['CUSTOMER','STORE_OWNER'],store_membership:{store_id:store,role:'OWNER',status:'ACTIVE',permissions:[]}};
 const staff={user_id:employee,roles:['CUSTOMER','SELLER'],store_membership:{store_id:store,role:'SELLER',status:'ACTIVE',permissions:['order.store.read_status_cancel']}},platform={user_id:admin,roles:['ADMIN'],role_permissions:['platform.admin']};
 beforeAll(async()=>{root=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL}).initialize();schema='after_history_'+randomUUID().replace(/-/g,'');await root.query('CREATE SCHEMA '+schema);db=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public'}}).initialize();for(const file of readdirSync(resolve(__dirname,'../../commerce-service/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(__dirname,'../../commerce-service/migrations',file),'utf8'));service=new AfterSaleHistoryService(db);});
 afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(root?.isInitialized){if(/^after_history_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();}});
 async function fixture(){const order=randomUUID(),request=randomUUID();await db.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd) VALUES($1,$1,$2,$3,'COMPLETED','COD',100000,0,0,20000,120000)`,[order,customer,store]);await db.query("INSERT INTO order_return_request(id,order_id,type,reason,status) VALUES($1,$2,'EXCHANGE','Đổi size M sang L','RECEIVED')",[request,order]);return {order,request};}
 test('all saved decisions, inspections, consent, worker and money events remain distinct and private detail is excluded',async()=>{
  const {order,request}=await fixture(),item=randomUUID(),caseId=randomUUID(),payment=randomUUID(),refund=randomUUID(),receipt=randomUUID();
  await db.query("INSERT INTO return_status_history(request_id,from_status,to_status,actor_user_id,reason) VALUES($1,NULL,'REQUESTED',$2,'Tôi chọn nhầm size')",[request,customer]);
  for(const [action,actor,detail] of [['RETURN_DECISION',owner,{fault_party:'CUSTOMER',fee_payer:'CUSTOMER',note:'Khách chịu phí gửi đổi',instructions:'PRIVATE_ADDRESS'}],['RECEIPT_INSPECTED',employee,{note:'Một tốt một hỏng',lines:[{order_item_id:item,received_quantity:2,resellable_quantity:1,damaged_quantity:1,pending_quantity:0,private:'PRIVATE_LINE'}],legacy_reconciliation_note:'PRIVATE_RECONCILIATION'}],['PROPOSE_REFUND',owner,{note:'Hết size đổi'}],['ACCEPT_REFUND',customer,{note:'Đồng ý hoàn đủ'}],['RECEIVED_STOCK_CONFIRMED','00000000-0000-0000-0000-000000000000',{operation_id:randomUUID()}]] as const)await db.query('INSERT INTO return_operation_history(request_id,actor_user_id,action,detail_json) VALUES($1,$2,$3,$4)',[request,actor,action,JSON.stringify(detail)]);
  await db.query("INSERT INTO delivery_return_case(id,order_id,reason,opened_by_user_id) VALUES($1,$2,'Từ chối nhận',$3)",[caseId,order,owner]);await db.query("INSERT INTO delivery_return_history(case_id,actor_user_id,action,after_json) VALUES($1,$2,'INSPECTION_RECORDED',$3)",[caseId,employee,{status:'RECEIVED',note:'Kiểm hàng hoàn về',lines:[],raw:'PRIVATE_DELIVERY'}]);
  await db.query("INSERT INTO payment(id,order_id,method,status,payable_vnd,collectible_vnd,collected_vnd,refunded_vnd) VALUES($1,$2,'COD','REFUNDED',120000,0,120000,120000)",[payment,order]);await db.query("INSERT INTO refund(id,payment_id,order_id,amount_vnd,status,operation_id) VALUES($1,$2,$3,120000,'SUCCEEDED',$4)",[refund,payment,order,randomUUID()]);
  await db.query("INSERT INTO cod_refund_receipt(id,refund_id,operation_id,owner_user_id,receipt_reference,recipient_name,refunded_at,amount_vnd,full_amount_confirmed) VALUES($1,$2,$3,$4,'PRIVATE_RECEIPT','PRIVATE_RECIPIENT','2026-11-01T01:00:00Z',120000,true)",[receipt,refund,randomUUID(),owner]);
  await db.query("INSERT INTO money_movement(payment_id,order_id,store_id,kind,amount_vnd,source_type,source_id,occurred_at,time_source) VALUES($1,$2,$3,'REFUND',120000,'COD_REFUND_RECEIPT',$4,'2026-11-01T01:00:00Z','OWNER_ATTESTED')",[payment,order,store,receipt]);
  for(const [action,status] of [['REQUEST','REQUESTED'],['COMMAND_STARTED','PROCESSING'],['PROVIDER_RESULT','UNKNOWN'],['LOOKUP_STARTED','UNKNOWN']] as const)await db.query("INSERT INTO m2_audit(id,actor_user_id,target_type,target_id,action,request_id,before_json,after_json,store_id) VALUES($1,$2,'Refund',$3,$4,'test','{}',$5,$6)",[randomUUID(),customer,refund,action,{status,provider_receipt:'PRIVATE_PROVIDER'},store]);
  const own=await service.list(order,buyer,'CUSTOMER'),merchant=await service.list(order,boss,'STORE'),seller=await service.list(order,staff,'STORE'),administration=await service.list(order,platform,'ADMIN');
  expect(own.items).toHaveLength(12);expect(own.items.map(e=>e.id)).toEqual(merchant.items.map(e=>e.id));expect(seller.items.map(e=>e.id)).toEqual(own.items.map(e=>e.id));expect(administration.items).toEqual(merchant.items);
  expect(own.items.every(e=>!('actor_user_id' in e))).toBe(true);expect(seller.items.every(e=>!('actor_user_id' in e))).toBe(true);expect(merchant.items.some(e=>e.actor_user_id===employee)).toBe(true);
  expect(own.items.find(e=>e.action==='ACCEPT_REFUND')?.actor_kind).toBe('CUSTOMER');expect(own.items.find(e=>e.action==='REFUND_RESULT')?.actor_kind).toBe('SYSTEM');expect(own.items.find(e=>e.action==='RECEIVED_STOCK_CONFIRMED')?.actor_kind).toBe('SYSTEM');
  const cash=merchant.items.find(e=>e.action==='REFUND_CONFIRMED')!;expect(cash).toMatchObject({amount_vnd:120000,time_source:'OWNER_ATTESTED',actor_user_id:owner});expect(cash.recorded_at).not.toBe(cash.occurred_at);
  expect(JSON.stringify(merchant)).not.toContain('PRIVATE_');expect(schemaErrors(own,registry.operations.listOwnAfterSaleHistory.responses['200'])).toEqual([]);
 });
 test('cursor includes microseconds and tie breakers; newer events do not duplicate or hide older pages',async()=>{
  const {order,request}=await fixture();
  for(let i=0;i<75;i++)await db.query("INSERT INTO return_operation_history(request_id,actor_user_id,action,detail_json,created_at) VALUES($1,$2,'RECEIPT_INSPECTED',$3,'2026-11-01T00:00:00Z'::timestamptz+$4*interval '1 microsecond')",[request,employee,{note:String(i)},i%3]);
  const before=await service.list(order,buyer,'CUSTOMER',{size:3});expect(before.items).toHaveLength(3);expect(before.next_cursor).toBeDefined();
  await db.query("INSERT INTO return_operation_history(request_id,actor_user_id,action,detail_json) VALUES($1,$2,'PROPOSE_REFUND','{}')",[request,owner]);
  let cursor=before.next_cursor,seen=before.items.map(e=>e.id),pages=1;while(cursor){const next=await service.list(order,buyer,'CUSTOMER',{size:3,cursor});seen.push(...next.items.map(e=>e.id));cursor=next.next_cursor;expect(++pages).toBeLessThan(30);}
  expect(seen).toHaveLength(75);expect(new Set(seen).size).toBe(75);expect((await service.list(order,buyer,'CUSTOMER')).items[0].action).toBe('PROPOSE_REFUND');
 });
 test('ownership, Store scope, active membership and Admin permission are checked before reading history',async()=>{
  const {order}=await fixture();await expect(service.list(order,{...buyer,user_id:randomUUID()},'CUSTOMER')).rejects.toMatchObject({status:404});await expect(service.list(order,{...boss,store_membership:{...boss.store_membership,store_id:randomUUID()}},'STORE')).rejects.toMatchObject({status:404});
  for(const membership of [{...staff.store_membership,permissions:[]},{...staff.store_membership,status:'LOCKED'}])await expect(service.list(order,{...staff,store_membership:membership},'STORE')).rejects.toMatchObject({status:403});
  await expect(service.list(order,{...platform,role_permissions:[]},'ADMIN')).rejects.toMatchObject({status:403});await expect(service.list(order,{},'CUSTOMER')).rejects.toMatchObject({status:401});expect((await service.list(order,buyer,'CUSTOMER')).items).toEqual([]);
 });
 test('invalid cursor or page size cannot reach an unbounded query',async()=>{
  const {order}=await fixture();for(const cursor of ['!',Buffer.from(JSON.stringify(['not-a-date','MONEY',randomUUID()])).toString('base64url')])await expect(service.list(order,buyer,'CUSTOMER',{cursor})).rejects.toMatchObject({status:422});for(const size of [0,-1,51,1.5])await expect(service.list(order,buyer,'CUSTOMER',{size})).rejects.toMatchObject({status:422});expect(readHistoryCursor()).toBeUndefined();
 });
});
