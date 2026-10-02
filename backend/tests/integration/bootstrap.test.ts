import { Client } from 'pg';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { once } from '../../shared/src/idempotency';
const base=process.env.TEST_API_URL ?? 'http://gateway/api/v1';
const db=(id:string)=>new Client({connectionString:process.env[`${id}_DATABASE_URL`]});
async function login(email='customer1@pbl6.test') {
 const res=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:process.env.SEED_PASSWORD,client_type:'MOBILE'})});
 expect(res.status).toBe(200);return await res.json() as any;
}
test('sample product list/detail, validation and explicit placeholders',async()=>{
 const res=await fetch(base+'/products');expect(res.status).toBe(200);const list=await res.json() as any;
 expect(list.items.length).toBeGreaterThan(0);expect(list.size).toBe(20);
 expect((await fetch(base+'/products?size=101')).status).toBe(422);
 expect((await fetch(base+'/products?unexpected=1')).status).toBe(422);
 expect((await fetch(base+'/products/'+list.items[0].id)).status).toBe(200);
 expect((await fetch(base+'/cart/items')).status).toBe(401);
 const session=await login();const stub=await fetch(base+'/cart/items',{headers:{Authorization:'Bearer '+session.access_token}});
 expect(stub.status).toBe(501);expect((await stub.json() as any).code).toBe('FEATURE_NOT_IMPLEMENTED');
});
test('profiles reflect token ownership; logout and refresh replay revoke session',async()=>{
 const a=await login();const b=await login('customer2@pbl6.test');
 const me=await fetch(base+'/me',{headers:{Authorization:'Bearer '+a.access_token}});expect((await me.json() as any).email).toBe('customer1@pbl6.test');
 const refresh=await fetch(base+'/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:a.refresh_token})});expect(refresh.status).toBe(200);
 const rotated=await refresh.json() as any;
 expect((await fetch(base+'/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:a.refresh_token})})).status).toBe(401);
 expect((await fetch(base+'/me',{headers:{Authorization:'Bearer '+rotated.access_token}})).status).toBe(401);
 const out=await fetch(base+'/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:b.refresh_token})});expect(out.status).toBe(200);
 expect((await fetch(base+'/me',{headers:{Authorization:'Bearer '+b.access_token}})).status).toBe(401);
});
test('web session keeps refresh out of body and blocks forged CSRF',async()=>{
 const response=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:process.env.WEB_ORIGIN!},body:JSON.stringify({email:'customer1@pbl6.test',password:process.env.SEED_PASSWORD,client_type:'WEB'})});
 expect(response.status).toBe(200);const data=await response.json() as any;expect(data.refresh_token).toBeUndefined();
 const cookies=response.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');const csrf=cookies.match(/pbl6_csrf=([^;]+)/)?.[1];
 expect((await fetch(base+'/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookies,Origin:process.env.WEB_ORIGIN!},body:'{}'})).status).toBe(403);
 expect((await fetch(base+'/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookies,Origin:process.env.WEB_ORIGIN!,'X-CSRF-Token':csrf!},body:'{}'})).status).toBe(200);
});
test('database role cannot connect to another service database',async()=>{
 const uri=new URL(process.env.M1_DATABASE_URL!);uri.pathname='/m3';const client=new Client({connectionString:uri.toString()});
 await expect(client.connect()).rejects.toThrow();await client.end();
});
test('sample product write checks role, version and commits audit/outbox atomically',async()=>{
 const products=await (await fetch(base+'/products')).json() as any;const product=products.items[0];
 const owner=await login('owner@pbl6.test'),customer=await login();
 const patch=(token:string,body:unknown,id=product.id)=>fetch(base+'/store/products/'+id,{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','X-Correlation-Id':'integration-product-write'},body:JSON.stringify(body)});
 expect((await patch(customer.access_token,{title:product.title,expected_version:product.version})).status).toBe(403);
 expect((await patch(owner.access_token,{status:'STOPPED',expected_version:product.version})).status).toBe(501);
 expect((await patch(owner.access_token,{title:product.title,expected_version:product.version},randomUUID())).status).toBe(404);
 const result=await patch(owner.access_token,{title:product.title,expected_version:product.version});expect(result.status).toBe(200);
 expect((await result.json() as any).version).toBe(product.version+1);
 expect((await patch(owner.access_token,{title:product.title,expected_version:product.version})).status).toBe(409);
 const client=db('M1');await client.connect();try{
   expect((await client.query("SELECT 1 FROM m1_audit WHERE request_id='integration-product-write' AND target_id=$1 AND after_json->>'version'=$2",[product.id,String(product.version+1)])).rowCount).toBe(1);
   expect((await client.query("SELECT 1 FROM outbox WHERE correlation_id='integration-product-write' AND payload->>'product_id'=$1 AND payload->>'version'=$2",[product.id,String(product.version+1)])).rowCount).toBe(1);
 }finally{await client.end();}
});
test('unrouted event remains pending for retry rather than marked delivered',async()=>{
 const client=db('M1');await client.connect();const id=randomUUID();
 try{
  await client.query("INSERT INTO outbox(id,event_type,payload,correlation_id) VALUES($1,'unrouted.integration.v1','{}',$2)",[id,randomUUID()]);
  for(let i=0;i<30;i++){if((await client.query('SELECT 1 FROM outbox WHERE id=$1 AND attempts>0',[id])).rowCount)break;await new Promise(r=>setTimeout(r,200));}
  const row=(await client.query('SELECT attempts,published_at FROM outbox WHERE id=$1',[id])).rows[0];expect(row.attempts).toBeGreaterThan(0);expect(row.published_at).toBeNull();
 }finally{await client.query('DELETE FROM outbox WHERE id=$1',[id]);await client.end();}
});
test('inventory invariant and one-time worker effect survive duplicate publication',async()=>{
 const client=db('M1');await client.connect();
 try {
  await expect(client.query('UPDATE inventory SET reserved_quantity=quantity+1 WHERE id=(SELECT id FROM inventory LIMIT 1)')).rejects.toThrow();
  const id=randomUUID(),correlation=randomUUID();
  await client.query('INSERT INTO outbox(id,event_type,payload,correlation_id) VALUES($1,\'bootstrap.example.v1\',\'{}\',$2)',[id,correlation]);
  for(let i=0;i<50;i++){if((await client.query('SELECT 1 FROM bootstrap_effect WHERE event_id=$1',[id])).rowCount)break;await new Promise(r=>setTimeout(r,200));}
  expect((await client.query('SELECT 1 FROM bootstrap_effect WHERE event_id=$1',[id])).rowCount).toBe(1);
  await client.query('UPDATE outbox SET published_at=NULL WHERE id=$1',[id]);await new Promise(r=>setTimeout(r,1600));
  expect((await client.query('SELECT count(*)::int AS count FROM bootstrap_effect WHERE event_id=$1',[id])).rows[0].count).toBe(1);
 }finally{await client.end();}
});
test('concurrent commands with same ID commit one effect; changed payload conflicts',async()=>{
 const source=new DataSource({type:'postgres',url:process.env.M1_DATABASE_URL});await source.initialize();const id=randomUUID();
 try{
  const command=(payload:unknown)=>source.transaction(manager=>once(manager,'integration',id,payload,async()=>{
   await manager.query('INSERT INTO bootstrap_effect(event_id) VALUES($1)',[id]);return {id};
  }));
  const results=await Promise.all([command({quantity:1}),command({quantity:1})]);expect(results[0]).toEqual(results[1]);
  await expect(command({quantity:2})).rejects.toMatchObject({response:{code:'IDEMPOTENCY_CONFLICT'}});
  expect((await source.query('SELECT count(*)::int AS count FROM bootstrap_effect WHERE event_id=$1',[id]))[0].count).toBe(1);
 }finally{await source.destroy();}
});
test('M4 recommendations identify mock mode and return current catalog product IDs',async()=>{
 const session=await login();const response=await fetch(base+'/recommendations/for-you',{headers:{Authorization:'Bearer '+session.access_token}});
 expect(response.status).toBe(200);const result=await response.json() as any;
 expect(result.mode).toBe('mock');expect(result.source).toBe('FALLBACK');expect(result.evaluation_status).toBe('NOT_RUN');
 for(const id of result.product_ids)expect((await fetch(base+'/products/'+id)).status).toBe(200);
});
test('internal inventory contract admits only M2 and is hidden from gateway',async()=>{
 const call=(id:string)=>fetch('http://m1:3101/internal/inventory/reserve',{method:'POST',headers:{'Content-Type':'application/json','X-Service-Id':id,'X-Service-Key':process.env[`${id}_INTERNAL_KEY`]!},body:'{}'});
 expect((await call('M4')).status).toBe(401);expect((await call('M2')).status).toBe(422);
 const external=await fetch(new URL('/internal/inventory/reserve',base),{method:'POST',body:'{}'});
 expect(external.status).not.toBe(501);
 expect((await fetch('http://m1:3101/health/ready')).status).toBe(200);
});
