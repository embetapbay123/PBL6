import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { schemaErrors } from '../../shared/src/contract-validation';
import bundle from '../../shared/src/contracts.runtime.generated.json';
import { ReportRepository } from '../../commerce-service/src/report/report.repository';
const base=process.env.TEST_API_URL ?? 'http://gateway/api/v1';
async function login(email:string) {
  const response=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:process.env.SEED_PASSWORD,client_type:'MOBILE'})});
  expect(response.status).toBe(200);
  return (await response.json() as any).access_token as string;
}
function headers(token:string) {return {'Content-Type':'application/json',Authorization:'Bearer '+token,'X-Correlation-Id':'commerce-regression'};}
test('Cart resolves the real Product/Store, serializes concurrent adds and emits one envelope',async()=>{
  const source=new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL});await source.initialize();
  const token=await login('customer2@pbl6.test');
  const context=await (await fetch(base+'/me/context',{headers:headers(token)})).json() as any;
  const products=await (await fetch(base+'/products')).json() as any;
  const product=products.items[0],variant=product.variants[0];
  const [cart]=await source.query('SELECT id FROM cart WHERE customer_user_id=$1',[context.user_id]);
  const before=cart ? await source.query('SELECT * FROM cart_item WHERE cart_id=$1 AND variant_id=$2',[cart.id,variant.id]):[];
  try {
    if(before.length) await source.query('DELETE FROM cart_item WHERE id=$1',[before[0].id]);
    const body={product_id:product.id,variant_id:variant.id,quantity:1};
    const responses=await Promise.all([1,2].map(()=>fetch(base+'/cart/items',{method:'POST',headers:headers(token),body:JSON.stringify(body)})));
    for(const response of responses) expect(response.status).toBe(201);
    const data=await responses[0].json() as any;
    expect(data.store_id).toBe(product.store_id);expect(data.product_id).toBe(product.id);
    const rows=await source.query('SELECT ci.* FROM cart_item ci JOIN cart c ON c.id=ci.cart_id WHERE c.customer_user_id=$1 AND ci.variant_id=$2',[context.user_id,variant.id]);
    expect(rows).toHaveLength(1);expect(rows[0].quantity).toBe(2);
    const events=await source.query("SELECT * FROM outbox WHERE event_type='InteractionRecorded' AND correlation_id='commerce-regression' AND payload->>'user_id'=$1 ORDER BY created_at DESC LIMIT 2",[context.user_id]);
    expect(events).toHaveLength(2);
    for(const row of events) expect(schemaErrors({event_id:row.id,event_type:row.event_type,schema_version:'1.0',producer:'M2',occurred_at:row.created_at.toISOString(),correlation_id:row.correlation_id,payload:row.payload},bundle.events.InteractionRecorded.schema)).toEqual([]);
    const wrong=await fetch(base+'/cart/items',{method:'POST',headers:headers(token),body:JSON.stringify({...body,variant_id:randomUUID()})});
    expect(wrong.status).toBe(404);
  } finally {
    await source.query('DELETE FROM cart_item WHERE cart_id IN (SELECT id FROM cart WHERE customer_user_id=$1) AND variant_id=$2',[context.user_id,variant.id]);
    if(before.length) {
      const r=before[0];await source.query('INSERT INTO cart_item(id,cart_id,variant_id,product_id,store_id,quantity,added_at) VALUES($1,$2,$3,$4,$5,$6,$7)',[r.id,r.cart_id,r.variant_id,r.product_id,r.store_id,r.quantity,r.added_at]);
    }
    await source.query("DELETE FROM outbox WHERE correlation_id='commerce-regression' AND payload->>'user_id'=$1",[context.user_id]);
    await source.destroy();
  }
});
test('HTTP Order transitions and COD do not complete unpaid/cancelled orders',async()=>{
  const source=new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL});await source.initialize();
  const token=await login('owner@pbl6.test'),context=await (await fetch(base+'/me/context',{headers:headers(token)})).json() as any;
  const store=context.store_membership.store_id,id=randomUUID();
  try {
    await source.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd) VALUES($1,$1,$2,$3,'SHIPPED','COD',100000,0,0,0,100000)`,[id,context.user_id,store]);
    await source.query("INSERT INTO payment(order_id,method,status,payable_vnd,collectible_vnd) VALUES($1,'COD','PENDING',100000,100000)",[id]);
    const complete=await fetch(base+`/store/orders/${id}/status`,{method:'PATCH',headers:headers(token),body:JSON.stringify({to_status:'COMPLETED',expected_version:0})});
    expect(complete.status).toBe(409);expect((await complete.json() as any).code).toBe('PAYMENT_NOT_COLLECTED');
    await source.query("UPDATE payment SET status='SUCCEEDED',collected_vnd=100000 WHERE order_id=$1",[id]);
    const paid=await fetch(base+`/store/orders/${id}/status`,{method:'PATCH',headers:headers(token),body:JSON.stringify({to_status:'COMPLETED',expected_version:0})});
    expect(paid.status).toBe(200);const completed=await paid.json() as any;
    expect(completed).toMatchObject({id,status:'COMPLETED',version:1});
    expect(schemaErrors(completed,bundle.operations.transitionStoreOrder.responses['200'])).toEqual([]);
    expect(await source.query('SELECT id FROM order_status_history WHERE order_id=$1',[id])).toHaveLength(1);
    await source.query('UPDATE "order" SET status=\'CANCELLED\' WHERE id=$1',[id]);
    const cod=await fetch(base+`/store/orders/${id}/cod-collection`,{method:'POST',headers:headers(token),body:JSON.stringify({expected_version:1,amount_collected_vnd:100000})});
    expect(cod.status).toBe(409);expect((await cod.json() as any).code).toBe('INVALID_STATE_TRANSITION');
    expect((await source.query('SELECT status,collected_vnd FROM payment WHERE order_id=$1',[id]))[0]).toMatchObject({status:'SUCCEEDED',collected_vnd:'100000'});
    expect(await source.query('SELECT id FROM c_o_d_collection WHERE order_id=$1',[id])).toHaveLength(0);
  } finally {await source.query('DELETE FROM outbox WHERE correlation_id=\'commerce-regression\' AND payload->>\'order_id\'=$1',[id]);await source.query('DELETE FROM order_status_history WHERE order_id=$1',[id]);await source.query('DELETE FROM payment WHERE order_id=$1',[id]);await source.query('DELETE FROM "order" WHERE id=$1',[id]);await source.destroy();}
});
test('completed revenue SQL subtracts Store and platform discounts',async()=>{
  const source=new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL});await source.initialize();
  const id=randomUUID();
  try {
    const before=await new ReportRepository(source.manager).getPlatformDashboardData();
    await source.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd) VALUES($1,$1,$1,$1,'COMPLETED','COD',100000,10000,5000,0,85000)`,[id]);
    const after=await new ReportRepository(source.manager).getPlatformDashboardData();
    expect(BigInt(after.completed_goods_revenue_vnd)-BigInt(before.completed_goods_revenue_vnd)).toBe(85000n);
  } finally {await source.query('DELETE FROM "order" WHERE id=$1',[id]);await source.destroy();}
});

test('Review eligibility uses HTTP 200, the M1 allowlist and actual OrderItem ownership',async()=>{
  const source=new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL});await source.initialize();
  const id=randomUUID(),item=randomUUID(),user=randomUUID(),product=randomUUID();
  const route='http://m2:3102/internal/reviews/eligibility';
  const call=(customer=user,caller='M1',key=process.env.M1_INTERNAL_KEY)=>fetch(route,{method:'POST',headers:{'Content-Type':'application/json','X-Service-Id':caller,'X-Service-Key':key ?? ''},body:JSON.stringify({order_item_id:item,customer_user_id:customer,product_id:product})});
  try {
    await source.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd) VALUES($1,$1,$2,$1,'COMPLETED','COD',100,0,0,0,100)`,[id,user]);
    await source.query('INSERT INTO order_item(id,order_id,product_id,variant_id,sku_snapshot,unit_price_vnd,quantity,line_total_vnd) VALUES($1,$2,$3,$3,\'TEST\',100,1,100)',[item,id,product]);
    const response=await call();expect(response.status).toBe(200);
    const body=await response.json();expect(body).toEqual({eligible:true});
    expect(schemaErrors(body,bundle.operations.VerifyReviewEligibility.responses['200'])).toEqual([]);
    expect((await (await call(randomUUID())).json() as any).eligible).toBe(false);
    expect((await call(user,'M3',process.env.M3_INTERNAL_KEY)).status).toBe(401);
  } finally {await source.query('DELETE FROM order_item WHERE id=$1',[item]);await source.query('DELETE FROM "order" WHERE id=$1',[id]);await source.destroy();}
});

test('Store and platform Voucher updates return contract-shaped rows and reject stale versions',async()=>{
  const source=new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL});await source.initialize();
  const created:string[]=[];
  try {
    for(const scope of ['STORE','PLATFORM'] as const) {
      const token=await login(scope==='STORE'?'owner@pbl6.test':'admin@pbl6.test');
      const path=scope==='STORE'?'/store/vouchers':'/admin/vouchers';
      const response=await fetch(base+path,{method:'POST',headers:headers(token),body:JSON.stringify({code:'TEST-'+randomUUID(),scope,discount_type:'FIXED',discount_value:10000,starts_at:'2026-01-01T00:00:00Z',ends_at:'2027-01-01T00:00:00Z',usage_limit:10,per_customer_limit:1})});
      expect(response.status).toBe(201);const voucher=await response.json() as any;created.push(voucher.id);
      const updated=await fetch(base+path+'/'+voucher.id,{method:'PATCH',headers:headers(token),body:JSON.stringify({expected_version:0,discount_value:12000})});
      expect(updated.status).toBe(200);const body=await updated.json() as any;
      expect(body).toMatchObject({id:voucher.id,version:1,discount_value:12000});
      expect(schemaErrors(body,bundle.operations[scope==='STORE'?'updateStoreVoucher':'updatePlatformVoucher'].responses['200'])).toEqual([]);
      const stale=await fetch(base+path+'/'+voucher.id,{method:'PATCH',headers:headers(token),body:JSON.stringify({expected_version:0,discount_value:13000})});
      expect(stale.status).toBe(409);
    }
  } finally {
    for(const id of created) {await source.query('DELETE FROM m2_audit WHERE target_id=$1',[id]);await source.query('DELETE FROM voucher WHERE id=$1',[id]);}
    await source.destroy();
  }
});
