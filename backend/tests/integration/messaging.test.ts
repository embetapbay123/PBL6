import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
const base=process.env.TEST_API_URL ?? 'http://gateway/api/v1';
const store='10000000-0000-4000-8000-000000000061',buyerId='10000000-0000-4000-8000-000000000001',memberId='10000000-0000-4000-8000-000000000062';
const otherStore=randomUUID(),application=randomUUID();
let db:DataSource,buyer='',other='',owner='';const threads:string[]=[],messages:string[]=[];const existingThreads=new Set<string>();
async function call(path:string,token?:string,method='GET',body?:unknown){return fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});}
async function login(email:string){const r=await call('/auth/login',undefined,'POST',{email,password:process.env.SEED_PASSWORD,client_type:'MOBILE'});expect(r.status).toBe(200);return (await r.json() as any).access_token as string;}
async function start(token:string,storeId=store){const r=await call('/me/conversations',token,'POST',{store_id:storeId});expect(r.status).toBe(201);const result=await r.json() as any;threads.push(result.id);return result.id as string;}
beforeAll(async()=>{
  db=new DataSource({type:'postgres',url:process.env.M3_DATABASE_URL});await db.initialize();
  buyer=await login('customer1@pbl6.test');other=await login('customer2@pbl6.test');owner=await login('owner@pbl6.test');
  for(const row of await db.query('SELECT id FROM store_conversation WHERE customer_user_id=$1 AND store_id=$2',[buyerId,store]))existingThreads.add(row.id);
  await db.query("INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status,submitted_at,version) VALUES($1,$2,'Messaging test','test','APPROVED',now(),0)",[application,buyerId]);
  await db.query("INSERT INTO store(id,application_id,name,slug,description,contact,shipping_fee_vnd,status,version) VALUES($1,$2,'Other Store',$3,'test','test',0,'ACTIVE',0)",[otherStore,application,'message-'+otherStore]);
});
afterAll(async()=>{
  await db.query("UPDATE store_membership SET role='OWNER' WHERE id=$1",[memberId]);
  await db.query('DELETE FROM store_message WHERE id=ANY($1::uuid[])',[messages]);
  await db.query('DELETE FROM store_conversation WHERE id=ANY($1::uuid[])',[threads.filter(id=>!existingThreads.has(id))]);
  await db.query('DELETE FROM store WHERE id=$1',[otherStore]);await db.query('DELETE FROM store_application WHERE id=$1',[application]);await db.destroy();
});
test('buyer-to-Store chat persists messages and enforces both participant scopes',async()=>{
  expect((await call('/me/conversations')).status).toBe(401);
  const thread=await start(buyer);expect(await start(buyer)).toBe(thread);
  const [{total:baseline}]=await db.query('SELECT count(*)::int AS total FROM store_message WHERE conversation_id=$1',[thread]);
  const key=randomUUID(),body={content:'Xin tư vấn sản phẩm',client_message_id:key};
  const sent=await call(`/me/conversations/${thread}/messages`,buyer,'POST',body);expect(sent.status).toBe(201);const message=await sent.json() as any;messages.push(message.id);
  const retry=await call(`/me/conversations/${thread}/messages`,buyer,'POST',body);expect((await retry.json() as any).id).toBe(message.id);
  expect((await call(`/me/conversations/${thread}/messages`,buyer,'POST',{...body,content:'Nội dung khác'})).status).toBe(409);
  expect((await call(`/me/conversations/${thread}/messages`,other)).status).toBe(404);
  const answer=await call(`/store/conversations/${thread}/messages`,owner,'POST',{content:'Gian hàng hỗ trợ bạn',client_message_id:randomUUID()});expect(answer.status).toBe(201);const reply=await answer.json() as any;messages.push(reply.id);
  const history=await (await call(`/me/conversations/${thread}/messages`,buyer)).json() as any;
  expect(history.total).toBe(baseline+2);expect(history.items.find((m:any)=>m.id===message.id).sender_side).toBe('CUSTOMER');expect(history.items.find((m:any)=>m.id===reply.id).sender_side).toBe('STORE');
  expect((await (await call('/store/conversations',owner)).json() as any).items.some((row:any)=>row.id===thread)).toBe(true);
  const foreign=await start(buyer,otherStore);expect((await call(`/store/conversations/${foreign}/messages`,owner)).status).toBe(404);
  await db.query("UPDATE store_membership SET role='SELLER' WHERE id=$1",[memberId]);
  expect((await call(`/store/conversations/${thread}/messages`,owner)).status).toBe(403);
  await db.query("UPDATE store_membership SET role='OWNER' WHERE id=$1",[memberId]);
  expect(await db.query('SELECT count(*)::int AS total FROM store_message WHERE conversation_id=$1',[thread])).toEqual([{total:baseline+2}]);
});
