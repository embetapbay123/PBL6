import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {ConversationOrderService} from '../../commerce-service/src/order/conversation-order.service';
import {MessagingService} from '../../identity-store-service/src/messaging/messaging.service';
import {ApiError} from '../../shared/src/errors';
import {schemaErrors} from '../../shared/src/contract-validation';
import contracts from '../../shared/src/contracts.runtime.generated.json';
const suite=process.env.M2_DATABASE_URL&&process.env.M3_DATABASE_URL?describe:describe.skip;
suite('Order-bound chat: real isolated M2/M3 PostgreSQL, controlled identity transport',()=>{
 const resources:{root:DataSource;db:DataSource;schema:string}[]=[];
 let m2:DataSource,m3:DataSource,orders:ConversationOrderService,chat:MessagingService,thread:string;
 const buyer=randomUUID(),otherBuyer=randomUUID(),owner=randomUUID(),otherOwner=randomUUID(),employee=randomUUID(),store=randomUUID(),otherStore=randomUUID();
 const order=randomUUID(),secondOrder=randomUUID(),foreignCustomerOrder=randomUUID(),foreignStoreOrder=randomUUID();
 const customer={user_id:buyer,roles:['CUSTOMER'],access_token:'buyer-fixture-context'};
 const ownerAuth={user_id:owner,roles:['CUSTOMER','STORE_OWNER'],access_token:'owner-fixture-context',store_membership:{store_id:store,role:'OWNER',status:'ACTIVE',permissions:[]}};
 const seller={user_id:employee,roles:['CUSTOMER','SELLER'],access_token:'employee-fixture-context',store_membership:{store_id:store,role:'SELLER',status:'ACTIVE',permissions:['order.store.read_status_cancel']}};
 const other={user_id:otherOwner,roles:['STORE_OWNER'],access_token:'other-fixture-context',store_membership:{store_id:otherStore,role:'OWNER',status:'ACTIVE',permissions:[]}};
 const contexts=new Map<string,any>([[customer.access_token,customer],[ownerAuth.access_token,ownerAuth],[seller.access_token,seller],[other.access_token,other]]);
 beforeAll(async()=>{
  for(const [source,folder] of [['M2','commerce-service'],['M3','identity-store-service']]){
   const root=await new DataSource({type:'postgres',url:process.env[source+'_DATABASE_URL']}).initialize(),schema='conversation_fix_'+randomUUID().replace(/-/g,'');await root.query('CREATE SCHEMA '+schema);const db=await new DataSource({type:'postgres',url:process.env[source+'_DATABASE_URL'],extra:{options:'-csearch_path='+schema+',public'}}).initialize();resources.push({root,db,schema});const dir=resolve(__dirname,'../../'+folder+'/migrations');for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(dir,file),'utf8'));
  }
  [m2,m3]=resources.map(row=>row.db);
  for(const user of [buyer,otherBuyer,owner,otherOwner,employee])await m3.query(`INSERT INTO "user"(id,email,password_hash,status) VALUES($1,$2,'fixture-only','ACTIVE')`,[user,user+'@example.test']);
  for(const [sid,uid] of [[store,owner],[otherStore,otherOwner]]){const app=randomUUID();await m3.query("INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status) VALUES($1,$2,'Store chat','fixture contact','APPROVED')",[app,uid]);await m3.query("INSERT INTO store(id,application_id,name,slug,contact,shipping_fee_vnd,status) VALUES($1,$2,'Store chat',$3,'fixture contact',20000,'ACTIVE')",[sid,app,sid]);}
  for(const [oid,uid,sid] of [[order,buyer,store],[secondOrder,buyer,store],[foreignCustomerOrder,otherBuyer,store],[foreignStoreOrder,buyer,otherStore]]){
   await m2.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,address_snapshot,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd) VALUES($1,$1,$2,$3,'COMPLETED','COD',$4,100000,0,0,20000,120000)`,[oid,uid,sid,{recipient_name:'Private recipient',phone:'0912345678',line1:'Private address'}]);await m2.query("INSERT INTO order_item(order_id,product_id,variant_id,product_snapshot,sku_snapshot,unit_price_vnd,quantity,line_total_vnd) VALUES($1,$2,$3,$4,'OPAQUE-009264',100000,1,100000)",[oid,randomUUID(),randomUUID(),{title:'Áo snapshot đã mua',variant_values:{color:'Đỏ',size:'M'}}]);
  }
  const identity={call:async(operation:string,input:{token:string})=>{expect(operation).toBe('ResolveContext');const auth=contexts.get(input.token);if(!auth)throw new ApiError(401,'SESSION_REVOKED','Phiên bị thu hồi.');return auth;}};
  orders=new ConversationOrderService(m2,()=>identity as any);
  chat=new MessagingService(m3,(id,context,side,correlation)=>orders.resolve({order_id:id,side,token:context.access_token!},correlation));
 });
 afterAll(async()=>{for(const {root,db,schema} of resources.reverse()){if(db.isInitialized)await db.destroy();if(/^conversation_fix_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();}});
 test('starting from a purchased order verifies current ownership and Store, provides snapshot identity and does not send any message',async()=>{
  const result=await chat.start(store,customer,order,'start-order');thread=result.id;expect(result.order_context).toMatchObject({order_id:order,store_id:store,items:[{title:'Áo snapshot đã mua',quantity:1}]});expect(result.store_name).toBe('Store chat');expect(schemaErrors(result,contracts.operations.startStoreConversation.responses['201'])).toEqual([]);expect(JSON.stringify(result)).not.toMatch(/Private|0912345678/);expect(await m3.query('SELECT id FROM store_message')).toEqual([]);
 });
 test('Customer cannot attach another Customer order or a valid owned order to the wrong Store',async()=>{
  await expect(chat.start(store,customer,foreignCustomerOrder,'foreign-buyer')).rejects.toMatchObject({status:404});await expect(chat.start(store,customer,foreignStoreOrder,'foreign-store')).rejects.toMatchObject({status:404});await expect(chat.start(otherStore,customer,order,'wrong-store')).rejects.toMatchObject({status:404});expect((await m3.query('SELECT id FROM store_conversation'))).toHaveLength(1);
 });
 test('simultaneous sends and lost-ACK retries preserve the same message and immutable order association',async()=>{
  const input={content:'Xin hỏi về size của món đã mua',client_message_id:randomUUID(),order_id:order};const [a,b]=await Promise.all([chat.send(thread,input,customer,'CUSTOMER','send'),chat.send(thread,input,customer,'CUSTOMER','retry')]);expect(a).toEqual(b);expect(a.order_id).toBe(order);expect((await m3.query('SELECT order_id FROM store_message WHERE id=$1',[a.id]))).toEqual([{order_id:order}]);expect(schemaErrors(a,contracts.operations.sendOwnConversationMessage.responses['201'])).toEqual([]);
  await expect(chat.send(thread,{...input,order_id:secondOrder},customer,'CUSTOMER','changed-reference')).rejects.toMatchObject({status:409});expect((await chat.history(thread,ownerAuth,'STORE')).items[0].order_id).toBe(order);
 });
 test('Store reply can reference this Customer order, but not another Customer in the same Store',async()=>{
  const before=(await m3.query('SELECT count(*)::int AS n FROM store_message'))[0].n;await expect(chat.send(thread,{content:'Sai khách',client_message_id:randomUUID(),order_id:foreignCustomerOrder},ownerAuth,'STORE','wrong-customer')).rejects.toMatchObject({status:404});expect((await m3.query('SELECT count(*)::int AS n FROM store_message'))[0].n).toBe(before);
  const reply=await chat.send(thread,{content:'Store đã kiểm tra đúng đơn này',client_message_id:randomUUID(),order_id:order},ownerAuth,'STORE','reply');expect(reply.order_id).toBe(order);expect((await chat.history(thread,customer,'CUSTOMER')).items.some(row=>row.id===reply.id&&row.order_id===order)).toBe(true);
 });
 test('wrong Store cannot read or write the thread; permission revoked in the live M2 lookup blocks a stale Seller context',async()=>{
  await expect(chat.history(thread,other,'STORE')).rejects.toMatchObject({status:404});await expect(chat.send(thread,{content:'Sai Store',client_message_id:randomUUID(),order_id:order},other,'STORE','forbidden')).rejects.toMatchObject({status:404});
  contexts.set(seller.access_token,{...seller,store_membership:{...seller.store_membership,permissions:[]}});await expect(chat.send(thread,{content:'Quyền cũ',client_message_id:randomUUID(),order_id:order},seller,'STORE','revoked')).rejects.toMatchObject({status:403});contexts.set(seller.access_token,seller);
 });
 test('failed order lookup or mismatched dependency response cannot silently create an unlinked message',async()=>{
  const before=(await m3.query('SELECT count(*)::int AS n FROM store_message'))[0].n;
  const unavailable=new MessagingService(m3,async()=>{throw new ApiError(503,'DEPENDENCY_UNAVAILABLE','Lookup unavailable');});await expect(unavailable.send(thread,{content:'Chưa rõ',client_message_id:randomUUID(),order_id:order},customer,'CUSTOMER','lookup-error')).rejects.toMatchObject({status:503});
  const mismatch=new MessagingService(m3,async()=>({order_id:secondOrder,store_id:store,customer_user_id:buyer,status:'COMPLETED',items:[]}));await expect(mismatch.start(store,customer,order,'wrong-result')).rejects.toMatchObject({status:503});expect((await m3.query('SELECT count(*)::int AS n FROM store_message'))[0].n).toBe(before);
 });
 test('legacy messages remain unlinked and do not require an order lookup',async()=>{
  const lookup=jest.fn(),legacy=new MessagingService(m3,lookup);const result=await legacy.send(thread,{content:'Trao đổi chung không gắn đơn',client_message_id:randomUUID()},customer,'CUSTOMER','legacy');expect(result).not.toHaveProperty('order_id');expect(lookup).not.toHaveBeenCalled();expect((await m3.query('SELECT order_id FROM store_message WHERE id=$1',[result.id]))[0].order_id).toBeNull();
 });
 test('M2 only resolves current Customer or active Store permission, and removes address/payment information from the response',async()=>{
  const result=await orders.resolve({token:ownerAuth.access_token,order_id:order,side:'STORE'},'m2-read');expect(result).toMatchObject({order_id:order,customer_user_id:buyer,store_id:store});expect(result).not.toHaveProperty('address_snapshot');expect(result).not.toHaveProperty('amounts');expect(schemaErrors(result,contracts.operations.ResolveConversationOrder.responses['200'])).toEqual([]);
  await expect(orders.resolve({token:customer.access_token,order_id:order,side:'STORE'},'bad-side')).rejects.toMatchObject({status:403});await expect(orders.resolve({token:other.access_token,order_id:order,side:'STORE'},'bad-store')).rejects.toMatchObject({status:404});
 });
 test('recovery56: history identifies its exact participant and Store without depending on the current list page',async()=>{
  const id=(await chat.start(store,customer)).id;
  await m3.query('UPDATE store SET name=$2 WHERE id=$1',[store,'Store chat hiện tại']);
  await m3.query('INSERT INTO customer_profile(user_id,display_name,updated_at)VALUES($1,$2,now()) ON CONFLICT(user_id)DO UPDATE SET display_name=excluded.display_name',[buyer,'Khách nhận hỗ trợ']);
  const history=await chat.history(id,customer,'CUSTOMER',2,20),merchant=await chat.history(id,ownerAuth,'STORE');
  expect((history as any).conversation).toMatchObject({id,store_id:store,store_name:'Store chat hiện tại',customer_name:'Khách nhận hỗ trợ'});
  expect((merchant as any).conversation).toEqual((history as any).conversation);
  expect(schemaErrors(history,contracts.operations.listOwnConversationMessages.responses['200'])).toEqual([]);
  expect(JSON.stringify(history)).not.toMatch(/password_hash|sender_user_id|email|Private recipient|0912345678/);
  await expect(chat.history(id,{user_id:otherBuyer},'CUSTOMER')).rejects.toMatchObject({status:404});
  await expect(chat.history(id,other,'STORE')).rejects.toMatchObject({status:404});
 });
 test('recovery56: an accepted message replays after Store closure without opening a new write or bypassing participant permission',async()=>{
  const id=(await chat.start(store,customer)).id,input={content:'Tin đã ghi trước lúc Store khóa',client_message_id:randomUUID()};
  const accepted=await chat.send(id,input,customer,'CUSTOMER');
  const before=(await m3.query('SELECT updated_at FROM store_conversation WHERE id=$1',[id]))[0];
  const count=(await m3.query('SELECT count(*)::int n FROM store_message WHERE conversation_id=$1',[id]))[0].n;
  await m3.query("UPDATE store SET status='LOCKED' WHERE id=$1",[store]);
  try{
   expect(await chat.send(id,input,customer,'CUSTOMER')).toEqual(accepted);
   await expect(chat.send(id,{...input,client_message_id:randomUUID()},customer,'CUSTOMER')).rejects.toMatchObject({status:409,response:{code:'STORE_UNAVAILABLE'}});
   await expect(chat.send(id,{...input,content:'Nội dung khác'},customer,'CUSTOMER')).rejects.toMatchObject({status:409,response:{code:'MESSAGE_KEY_CONFLICT'}});
   await expect(chat.send(id,input,{user_id:otherBuyer},'CUSTOMER')).rejects.toMatchObject({status:404});
   await expect(chat.send(id,input,other,'STORE')).rejects.toMatchObject({status:404});
   await expect(chat.send(id,input,{user_id:employee,store_membership:{store_id:store,role:'SELLER',status:'ACTIVE',permissions:[]}},'STORE')).rejects.toMatchObject({status:403});
   expect((await m3.query('SELECT updated_at FROM store_conversation WHERE id=$1',[id]))[0]).toEqual(before);
   expect((await m3.query('SELECT count(*)::int n FROM store_message WHERE conversation_id=$1',[id]))[0].n).toBe(count);
  }finally{await m3.query("UPDATE store SET status='ACTIVE' WHERE id=$1",[store]);}
 });
});
