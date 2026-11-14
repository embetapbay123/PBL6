import 'reflect-metadata';
import {DataSource} from 'typeorm';
import {randomUUID} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {MessagingService} from '../../identity-store-service/src/messaging/messaging.service';

const postgres=process.env.M3_DATABASE_URL?describe:describe.skip;
postgres('conversation search in an isolated M3 schema',()=>{
 let root:DataSource,db:DataSource,schema:string,service:MessagingService;
 const customer=randomUUID(),other=randomUUID(),owner=randomUUID(),stores:string[]=[],threads:string[]=[];
 let foreign:string;
 beforeAll(async()=>{
  root=await new DataSource({type:'postgres',url:process.env.M3_DATABASE_URL}).initialize();schema='conversation_search_'+randomUUID().replace(/-/g,'');await root.query('CREATE SCHEMA '+schema);
  db=await new DataSource({type:'postgres',url:process.env.M3_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public',statement_timeout:10000}}).initialize();
  const dir=resolve(__dirname,'../../identity-store-service/migrations');for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(dir,file),'utf8'));
  for(const [id,name] of [[customer,'Nguyễn Ánh'],[other,'Khách khác'],[owner,'Chủ shop']]){
   await db.query('INSERT INTO "user"(id,email,password_hash,status) VALUES($1,$2,$3,\'ACTIVE\')',[id,id+'@example.test','disabled-fixture']);
   await db.query('INSERT INTO customer_profile(user_id,display_name,updated_at) VALUES($1,$2,now())',[id,name]);
  }
  for(let n=0;n<25;n++){
   const application=randomUUID(),store=randomUUID(),thread=randomUUID();stores.push(store);threads.push(thread);
   await db.query("INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status) VALUES($1,$2,'Fixture','fixture','APPROVED')",[application,owner]);
   await db.query("INSERT INTO store(id,application_id,name,slug,contact,shipping_fee_vnd,status) VALUES($1,$2,$3,$4,'fixture',0,'ACTIVE')",[store,application,n===0?'Giày Đỏ':'Gian hàng '+n,store]);
   await db.query('INSERT INTO store_conversation(id,store_id,customer_user_id,updated_at) VALUES($1,$2,$3,$4)',[thread,store,customer,new Date(Date.now()-(n===0?2*86400000:n*1000))]);
   await db.query("INSERT INTO store_message(conversation_id,sender_user_id,sender_side,client_message_id,content) VALUES($1,$2,'CUSTOMER',$3,$4)",[thread,customer,randomUUID(),n===0?'Đổi cỡ áo 20%_mẫu':'Tin nhắn bình thường']);
  }
  foreign=randomUUID();await db.query('INSERT INTO store_conversation(id,store_id,customer_user_id) VALUES($1,$2,$3)',[foreign,stores[0],other]);
  await db.query("INSERT INTO store_message(conversation_id,sender_user_id,sender_side,client_message_id,content) VALUES($1,$2,'CUSTOMER',$3,'Chỉ tài khoản khác')",[foreign,other,randomUUID()]);
  service=new MessagingService(db);
 });
 afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(root?.isInitialized){if(/^conversation_search_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();}});
 test('Customer matches Store names or any saved message before pagination with accent folding and literal wildcards',async()=>{
  const actor={user_id:customer};const front=await service.list(actor,'CUSTOMER');expect(front.items).toHaveLength(20);expect(front.items.map(v=>v.id)).not.toContain(threads[0]);
  expect((await service.list(actor,'CUSTOMER',2,20)).items).toHaveLength(5);
  for(const q of ['GIÀY ĐỎ','giay do','đổi cỡ áo','doi co ao','%','_']){
   const result=await service.list(actor,'CUSTOMER',1,20,q);expect(result.total).toBe(1);expect(result.items[0].id).toBe(threads[0]);
  }
  expect((await service.list(actor,'CUSTOMER',1,20,'chỉ tài khoản khác')).total).toBe(0);
  expect((await service.list({user_id:other},'CUSTOMER',1,20,'chỉ tài khoản khác')).items[0].id).toBe(foreign);
  await expect(service.history(foreign,actor,'CUSTOMER')).rejects.toMatchObject({status:404});
 });
 test('Store retains membership and archive scoping while finding customer identity and saved content',async()=>{
  const actor={user_id:owner,store_membership:{store_id:stores[0],role:'OWNER',status:'ACTIVE'}};
  expect((await service.list(actor,'STORE',1,20,'nguyen anh')).items[0].id).toBe(threads[0]);
  expect((await service.list(actor,'STORE',1,20,'doi co ao')).items[0].id).toBe(threads[0]);
  expect((await service.list({...actor,store_membership:{...actor.store_membership,store_id:stores[1]}},'STORE',1,20,'doi co ao')).total).toBe(0);
  await db.query('UPDATE store_conversation SET store_archived_at=now() WHERE id=$1',[threads[0]]);
  expect((await service.list(actor,'STORE',1,20,'doi co ao')).total).toBe(0);
  expect((await service.list(actor,'STORE',1,20,'doi co ao',true)).items[0].id).toBe(threads[0]);
  expect((await service.list({user_id:customer},'CUSTOMER',1,20,'doi co ao')).items[0].id).toBe(threads[0]);
 });
});
