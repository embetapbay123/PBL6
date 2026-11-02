import { DataSource } from 'typeorm';

const base=process.env.TEST_API_URL ?? 'http://gateway/api/v1';
const product='10000000-0000-4000-8000-000000000080';
let db:DataSource, first='',second='';
async function login(email:string){
  const response=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:process.env.SEED_PASSWORD,client_type:'MOBILE'})});
  expect(response.status).toBe(200);return (await response.json() as any).access_token as string;
}
async function call(path:string,token?:string,method='GET'){
  return fetch(base+path,{method,headers:token?{Authorization:'Bearer '+token}:{}});
}
beforeAll(async()=>{db=new DataSource({type:'postgres',url:process.env.M1_DATABASE_URL});await db.initialize();first=await login('customer1@pbl6.test');second=await login('customer2@pbl6.test');});
afterAll(async()=>{await db.query('DELETE FROM customer_favorite WHERE product_id=$1 AND user_id IN ($2,$3)',[product,'10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002']);await db.destroy();});

test('favorites are private, idempotent and removable only by the owner',async()=>{
  expect((await call('/me/favorites')).status).toBe(401);
  expect((await call('/me/favorites/'+product,first,'PUT')).status).toBe(200);
  expect((await call('/me/favorites/'+product,first,'PUT')).status).toBe(200);
  const own=await (await call('/me/favorites',first)).json() as any;
  const other=await (await call('/me/favorites',second)).json() as any;
  expect(own.items.filter((id:string)=>id===product)).toHaveLength(1);
  expect(other.items).not.toContain(product);
  expect((await call('/me/favorites/'+product,second,'DELETE')).status).toBe(200);
  expect((await (await call('/me/favorites',first)).json() as any).items).toContain(product);
  expect((await call('/me/favorites/'+product,first,'DELETE')).status).toBe(200);
  expect((await (await call('/me/favorites',first)).json() as any).items).not.toContain(product);
});
