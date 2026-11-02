import {DataSource} from 'typeorm';
import {randomUUID} from 'node:crypto';
const base=process.env.TEST_API_URL ?? 'http://gateway/api/v1',order=randomUUID(),group=randomUUID(),traces:string[]=[];
const buyerId='10000000-0000-4000-8000-000000000001',store='10000000-0000-4000-8000-000000000061';
let db:DataSource,buyer='',other='',owner='',requestId='';
async function login(email:string){const r=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:process.env.SEED_PASSWORD,client_type:'MOBILE'})});expect(r.status).toBe(200);return (await r.json() as any).access_token as string;}
async function call(path:string,token:string,method='GET',body?:unknown){const trace=randomUUID();traces.push(trace);return fetch(base+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','X-Correlation-Id':trace},...(body?{body:JSON.stringify(body)}:{})});}
beforeAll(async()=>{
  db=new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL});await db.initialize();buyer=await login('customer1@pbl6.test');other=await login('customer2@pbl6.test');owner=await login('owner@pbl6.test');
  await db.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd) VALUES($1,$2,$3,$4,'COMPLETED','COD',100000,0,0,0,100000)`,[order,group,buyerId,store]);
});
afterAll(async()=>{
  if(!db?.isInitialized)return;
  await db.query('DELETE FROM customer_notification_read WHERE event_id IN (SELECT id FROM return_status_history WHERE request_id IN (SELECT id FROM order_return_request WHERE order_id=$1))',[order]);
  await db.query('DELETE FROM return_status_history WHERE request_id IN (SELECT id FROM order_return_request WHERE order_id=$1)',[order]);
  await db.query('DELETE FROM order_return_request WHERE order_id=$1',[order]);await db.query('DELETE FROM m2_audit WHERE request_id=ANY($1::text[])',[traces]);await db.query('DELETE FROM "order" WHERE id=$1',[order]);await db.destroy();
});
test('an owned exchange persists through Seller decisions and Customer receipt with version and scope protection',async()=>{
  const body={type:'EXCHANGE',reason:'Sai kích thước',expected_order_version:0};
  expect((await call('/me/orders/'+order+'/returns',other,'POST',body)).status).toBe(404);
  const created=await call('/me/orders/'+order+'/returns',buyer,'POST',body);expect(created.status).toBe(201);const row=await created.json() as any;requestId=row.id;
  expect((await (await call('/me/orders/'+order+'/returns',buyer,'POST',body)).json() as any).id).toBe(requestId);
  expect((await call('/me/orders/'+order+'/returns',buyer,'POST',{...body,reason:'Khác'})).status).toBe(409);
  expect((await (await call('/me/returns?order_id='+order,other)).json() as any).items).toEqual([]);
  const path='/store/returns/'+requestId;
  expect((await call(path,owner,'PATCH',{status:'APPROVED',expected_version:1,decision_note:'Đồng ý'})).status).toBe(409);
  for(const [version,status,extra] of [[0,'APPROVED',{decision_note:'Đồng ý đổi hàng'}],[1,'RECEIVED',{}],[2,'EXCHANGE_SENT',{replacement_reference:'TEST-SHIP-001'}]] as const){
    const response=await call(path,owner,'PATCH',{status,expected_version:version,...extra});expect(response.status).toBe(200);expect(await response.json()).toMatchObject({version:version+1,status});
  }
  expect((await call(path,owner,'PATCH',{status:'COMPLETED',expected_version:3})).status).toBe(409);
  expect((await call('/me/returns/'+requestId+'/confirm',other,'POST',{expected_version:3})).status).toBe(404);
  const confirmed=await call('/me/returns/'+requestId+'/confirm',buyer,'POST',{expected_version:3});expect(confirmed.status).toBe(201);expect(await confirmed.json()).toMatchObject({status:'COMPLETED',version:4});
  const notifications=await (await call('/me/notifications?size=100',buyer)).json() as any;expect(notifications.items.filter((item:any)=>item.order_id===order&&item.kind==='RETURN_STATUS')).toHaveLength(5);
});
