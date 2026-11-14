import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {OrderRepository} from '../../commerce-service/src/order/order.repository';
import {OrderService} from '../../commerce-service/src/order/order.service';
import {VoucherService} from '../../commerce-service/src/voucher/voucher.service';

const postgres=process.env.M2_DATABASE_URL?describe:describe.skip;
postgres('voucher suggestions against isolated PostgreSQL schema',()=>{
 let root:DataSource,db:DataSource,schema:string,repo:OrderRepository;
 const customer=randomUUID(),other=randomUUID(),store=randomUUID(),product=randomUUID(),variant=randomUUID();
 beforeAll(async()=>{
  root=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL}).initialize();
  schema='voucher_suggest_'+randomUUID().replace(/-/g,'');await root.query('CREATE SCHEMA '+schema);
  db=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public',statement_timeout:10000}}).initialize();
  const dir=resolve(__dirname,'../../commerce-service/migrations');
  for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(dir,file),'utf8'));
  repo=new OrderRepository(db.manager);
 });
 afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(root?.isInitialized){if(/^voucher_suggest_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();}});
 async function voucher(code:string,value:number,scope='STORE',minimum=0,limit=10,customerLimit=10){
  const id=randomUUID();await db.query(`INSERT INTO voucher(id,code,scope,store_id,owner_user_id,discount_type,discount_value,min_goods_vnd,starts_at,ends_at,usage_limit,per_customer_limit,status)
   VALUES($1,$2,$3,$4,$5,'FIXED',$6,$7,now()-interval '1 hour',now()+interval '1 day',$8,$9,'ACTIVE')`,
   [id,code,scope,scope==='STORE'?store:null,other,value,minimum,limit,customerLimit]);return id;
 }
 test('candidate query excludes live holds and per-customer usage, keeps other customers and ignores released/expired holds',async()=>{
  const quota=await voucher('CANDIDATE-QUOTA',1,'STORE',0,1),personal=await voucher('CANDIDATE-PERSONAL',1,'STORE',0,10,1),released=await voucher('CANDIDATE-RELEASED',1),expired=await voucher('CANDIDATE-EXPIRED',1);
  for(const [voucherId,user,status,ends] of [[quota,other,'ACTIVE',60000],[personal,customer,'RESERVED',60000],[released,customer,'RELEASED',60000],[expired,customer,'ACTIVE',-60000]] as const)
   await db.query(`INSERT INTO voucher_reservation(id,voucher_id,purchase_group_id,customer_user_id,store_id,discount_vnd,expires_at,status) VALUES($1,$2,$3,$4,$5,1,$6,$7)`,[randomUUID(),voucherId,randomUUID(),user,store,new Date(Date.now()+ends),status]);
  const own=await repo.suggestionCandidates([store],customer);expect(own.map(v=>v.id)).not.toContain(quota);expect(own.map(v=>v.id)).not.toContain(personal);expect(own.map(v=>v.id)).toEqual(expect.arrayContaining([released,expired]));
  const foreign=await repo.suggestionCandidates([store],other);expect(foreign.map(v=>v.id)).toContain(personal);
  for(const row of await db.query('SELECT * FROM voucher WHERE id=ANY($1::uuid[])',[[quota,personal,released,expired]]))
   expect(own.some(v=>v.id===row.id)).toBe(await repo.voucherAvailable(row,customer));
 });
 test('server optimization with real quota SQL matches the ordinary quote and never creates a reservation',async()=>{
  await voucher('OPT-BIG',60000);await voucher('OPT-SMALL',20000);await voucher('OPT-PLATFORM',50000,'PLATFORM',180000);
  const call=async(op:string,body:any)=>op==='QuoteVariants'?{items:body.items.map((item:any)=>({...item,price_vnd:100000,available_quantity:5,version:0}))}:{address_snapshot:{},stores:[]};
  const service=new OrderService((()=>({call})) as any,{source:db,catalog:{product:async()=>({id:product,store_id:store,title:'Áo',status:'ACTIVE',moderation_status:'VISIBLE',variants:[{id:variant,status:'ACTIVE',price_vnd:100000,sku:'SKU',variant_values:{}}]}) as any},quotes:{put:async()=>{},get:async()=>undefined}});
  const request={mode:'AUTO' as const,source:'BUY_NOW' as const,buy_now:{product_id:product,variant_id:variant,quantity:2}},before=(await db.query('SELECT count(*)::int AS n FROM voucher_reservation'))[0].n;
  const result=await service.suggestCheckoutVouchers(request,{user_id:customer},'integration');
  expect(result.selected).toEqual({store_vouchers:{[store]:'OPT-SMALL'},platform_voucher_code:'OPT-PLATFORM'});expect(result.net_goods_total_vnd).toBe(130000);
  expect((await db.query('SELECT count(*)::int AS n FROM voucher_reservation'))[0].n).toBe(before);
  const manual=await service.suggestCheckoutVouchers({...request,mode:'MANUAL',code:'opt-small'},{user_id:customer},'integration');expect(manual.selected).toEqual({store_vouchers:{[store]:'OPT-SMALL'}});
 });
 test('two suggestions do not hold the last use; concurrent reservations still allow exactly one winner',async()=>{
  const id=await voucher('LAST-USE',1,'STORE',0,1,1),service=new VoucherService(db);
  const both=await Promise.all([repo.suggestionCandidates([store],customer),repo.suggestionCandidates([store],other)]);
  expect(both.every(rows=>rows.some(v=>v.id===id))).toBe(true);
  const results=await Promise.allSettled([customer,other].map(user=>db.transaction(manager=>service.reserveVoucher(manager,{voucher_id:id,purchase_group_id:randomUUID(),customer_user_id:user,store_id:store,discount_vnd:1,expires_at:new Date(Date.now()+60000)}))));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.find(r=>r.status==='rejected')).toMatchObject({reason:{status:422,response:{code:'VOUCHER_OUT_OF_QUOTA'}}});
  expect((await repo.suggestionCandidates([store],customer)).some(v=>v.id===id)).toBe(false);
 });
});
