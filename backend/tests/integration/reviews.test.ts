import {DataSource} from 'typeorm';
import {randomUUID} from 'node:crypto';
const base=process.env.TEST_API_URL ?? 'http://gateway/api/v1',product=randomUUID(),order=randomUUID(),item=randomUUID(),traces:string[]=[];
const buyerId='10000000-0000-4000-8000-000000000001',store='10000000-0000-4000-8000-000000000061',type='10000000-0000-4000-8000-000000000071';
let m1:DataSource,m2:DataSource,buyer='',other='',admin='',review='';
async function call(path:string,token?:string,method='GET',body?:unknown){const trace=randomUUID();traces.push(trace);return fetch(base+path,{method,headers:{'Content-Type':'application/json','X-Correlation-Id':trace,...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
async function login(email:string){const r=await call('/auth/login',undefined,'POST',{email,password:process.env.SEED_PASSWORD,client_type:'MOBILE'});expect(r.status).toBe(200);return (await r.json() as any).access_token as string;}
beforeAll(async()=>{
  m1=new DataSource({type:'postgres',url:process.env.M1_DATABASE_URL});m2=new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL});await m1.initialize();await m2.initialize();buyer=await login('customer1@pbl6.test');other=await login('customer2@pbl6.test');admin=await login('admin@pbl6.test');
  await m1.query("INSERT INTO product(id,store_id,product_type_id,title,attributes_json,status,moderation_status) VALUES($1,$2,$3,'Review integration','{}','ACTIVE','VISIBLE')",[product,store,type]);
  await m2.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd) VALUES($1,$2,$3,$4,'PENDING','COD',100000,0,0,0,100000)`,[order,randomUUID(),buyerId,store]);
  await m2.query("INSERT INTO order_item(id,order_id,product_id,variant_id,sku_snapshot,unit_price_vnd,quantity,line_total_vnd) VALUES($1,$2,$3,$4,'REVIEW-TEST',100000,1,100000)",[item,order,product,randomUUID()]);
});
afterAll(async()=>{
  if(m1?.isInitialized){await m1.query('DELETE FROM review_audit WHERE review_id IN (SELECT id FROM review WHERE product_id=$1)',[product]);await m1.query('DELETE FROM review WHERE product_id=$1',[product]);await m1.query('DELETE FROM m1_audit WHERE request_id=ANY($1::text[])',[traces]);await m1.query('DELETE FROM product WHERE id=$1',[product]);await m1.destroy();}
  if(m2?.isInitialized){await m2.query('DELETE FROM order_item WHERE order_id=$1',[order]);await m2.query('DELETE FROM "order" WHERE id=$1',[order]);await m2.destroy();}
});
test('purchased reviews verify M2 ownership/completion, retry safely, and preserve moderation on edit',async()=>{
  const body={order_item_id:item,rating:5,body:'Sản phẩm đúng mô tả'};
  expect((await call('/me/reviews',buyer,'POST',body)).status).toBe(409);
  await m2.query("UPDATE \"order\" SET status='COMPLETED' WHERE id=$1",[order]);
  expect((await call('/me/reviews',other,'POST',body)).status).toBe(409);
  const created=await call('/me/reviews',buyer,'POST',body);expect(created.status).toBe(201);const row=await created.json() as any;review=row.id;expect(row).toMatchObject({product_id:product,version:0,status:'VISIBLE'});
  expect((await (await call('/me/reviews',buyer,'POST',body)).json() as any).id).toBe(review);
  expect((await call('/me/reviews',buyer,'POST',{...body,rating:1})).status).toBe(409);
  const page=await (await call('/products/'+product+'/reviews')).json() as any;expect(page.items).toHaveLength(1);
  expect((await call('/me/reviews/'+review,other,'PATCH',{rating:4,expected_version:0})).status).toBe(404);
  expect((await call('/admin/reviews/'+review+'/hide',buyer,'POST',{reason:'Không phù hợp',expected_version:0})).status).toBe(403);
  expect((await call('/admin/reviews/'+review+'/hide',admin,'POST',{reason:'Không phù hợp',expected_version:0})).status).toBe(200);
  expect((await (await call('/products/'+product+'/reviews')).json() as any).total).toBe(0);
  expect((await call('/me/reviews/'+review,buyer,'PATCH',{rating:4,expected_version:0})).status).toBe(409);
  const updated=await call('/me/reviews/'+review,buyer,'PATCH',{rating:4,body:'Đã bổ sung thông tin',expected_version:1});expect(updated.status).toBe(200);expect(await updated.json()).toMatchObject({status:'HIDDEN',version:2,rating:4});
  const hidden=await (await call('/admin/reviews?status=HIDDEN&product_id='+product,admin)).json() as any;expect(hidden.items).toHaveLength(1);expect(hidden.items[0].id).toBe(review);
  expect((await call('/admin/reviews/'+review+'/restore',admin,'POST',{reason:'Đã xử lý',expected_version:2})).status).toBe(200);
  expect((await (await call('/products/'+product+'/reviews')).json() as any).items[0]).toMatchObject({version:3,status:'VISIBLE'});
  expect((await call('/admin/products')).status).toBe(401);
  expect((await call('/admin/products',buyer)).status).toBe(403);
  await m1.query("UPDATE product SET status='DRAFT',moderation_status='HIDDEN' WHERE id=$1",[product]);
  const products=await call('/admin/products?q=Review%20integration&moderation_status=HIDDEN&status=DRAFT',admin);expect(products.status).toBe(200);expect((await products.json() as any).items).toEqual([expect.objectContaining({id:product,status:'DRAFT',moderation_status:'HIDDEN',version:0})]);
  const restore=await call('/admin/products/'+product+'/restore',admin,'POST',{reason:'Nội dung hợp lệ',expected_version:0});expect(restore.status).toBe(200);expect(await restore.json()).toMatchObject({id:product,store_id:store,product_type_id:type,title:'Review integration',status:'DRAFT',moderation_status:'VISIBLE',version:1,variants:[],images:[]});
  expect((await call('/products/'+product+'/reviews')).status).toBe(404);
});
