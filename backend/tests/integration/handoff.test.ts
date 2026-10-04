import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { orderPaymentUnitOfWork, PaymentPort } from '../../commerce-service/src/payment/payment.port';
import { CatalogRepository } from '../../catalog-service/src/catalog/catalog.repository';
import { audit } from '../../shared/src/audit';
import { emitEvent } from '../../shared/src/events';
import { assertSchema } from '../../shared/src/contract-validation';
import bundle from '../../shared/src/contracts.runtime.generated.json';
import fixtures from '../../shared/src/fixtures.generated.json';
const base=process.env.TEST_API_URL ?? 'http://gateway/api/v1';
test('new internal routes authenticate, validate, remain stubs and are hidden from public gateway',async()=>{
  for(const [op,host,caller] of [['ResolveCheckoutContext','http://m3:3103','M2'],['ResolveAiMetricsScope','http://m3:3103','M4'],['ListLowStockVariants','http://m1:3101','M2']] as const){
    const r=bundle.operations[op],body=fixtures[op].request.body;
    const call=(data:unknown,valid=true)=>fetch(host+r.route,{method:r.method,headers:{'Content-Type':'application/json','X-Service-Id':caller,'X-Service-Key':valid?process.env[`${caller}_INTERNAL_KEY`]!:'invalid'},body:JSON.stringify(data)});
    expect((await call(body,false)).status).toBe(401);
    expect((await call({})).status).toBe(422);
    expect((await call(body)).status).toBe(501);
    const publicResponse=await fetch(base.replace('/api/v1','')+r.route,{method:'POST',body:'{}'});
    expect(publicResponse.status).toBeGreaterThanOrEqual(400);
    expect(publicResponse.headers.get('content-type') ?? '').not.toContain('application/json');
  }
});
test('public stubs run guard before strict request DTO validation',async()=>{
  const headers={'Content-Type':'application/json'};
  expect((await fetch(base+'/cart/items',{method:'POST',headers,body:'{}'})).status).toBe(401);
  const login=await fetch(base+'/auth/login',{method:'POST',headers,body:JSON.stringify({email:'customer1@pbl6.test',password:process.env.SEED_PASSWORD,client_type:'MOBILE'})});
  const session=await login.json() as any;
  const call=(body:unknown)=>fetch(base+'/cart/items',{method:'POST',headers:{...headers,Authorization:'Bearer '+session.access_token},body:JSON.stringify(body)});
  expect((await call({})).status).toBe(422);
  expect([200, 201, 501]).toContain((await call(fixtures.addCartItem.request.body)).status);
  const response=await fetch(base+'/products');assertSchema(await response.json(),bundle.operations.listProducts.responses['200']);
  const malformed=await fetch(base+'/auth/login',{method:'POST',headers,body:'{"private-value'});
  expect(malformed.status).toBe(400);const error=await malformed.json() as any;
  expect(error.correlation_id).toBeTruthy();expect(error.message).not.toContain('private-value');expect(malformed.headers.get('X-Correlation-Id')).toBe(error.correlation_id);
});
test('two M2 repositories use the same manager and Payment failure rolls back the Order',async()=>{
  const source=new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL});await source.initialize();
  const id=randomUUID();let sameManager=false;
  try{
    const result=orderPaymentUnitOfWork(source,manager=>({
      manager,
      async createForOrder(input){
        sameManager=manager.queryRunner?.isTransactionActive===true;
        await manager.query("INSERT INTO payment(order_id,method,status,payable_vnd,collectible_vnd) VALUES($1,'COD','PENDING',100,100)",[input.order_id]);
        throw new Error('simulated payment failure');
      },async recordCodCollection(){throw new Error('not used');},async requestRefund(){throw new Error('not used');}
    } as PaymentPort),async(manager,payments)=>{
      await manager.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd) VALUES($1,$1,$1,$1,'PREPARING','COD',100,0,0,0,100)`,[id]);
      return payments.createForOrder({order_id:id,method:'COD',payable_vnd:100n,operation_id:id});
    });
    await expect(result).rejects.toThrow('simulated payment failure');expect(sameManager).toBe(true);
    expect(await source.query('SELECT id FROM "order" WHERE id=$1',[id])).toHaveLength(0);
    expect(await source.query('SELECT id FROM payment WHERE order_id=$1',[id])).toHaveLength(0);
  }finally{await source.destroy();}
});
test('Catalog write/audit/outbox are all rolled back on downstream transaction failure',async()=>{
  const source=new DataSource({type:'postgres',url:process.env.M1_DATABASE_URL});await source.initialize();const correlation=randomUUID();
  try{
    const [before]=await source.query('SELECT id,store_id,title,version FROM product LIMIT 1');
    await expect(source.transaction(async manager=>{
      const repo=new CatalogRepository(manager);await repo.lockProduct(before.id,before.store_id);await repo.updateText(before.id,'rollback fixture');
      await audit(manager,'M1',randomUUID(),'Product',before.id,'TEST',correlation,before,{});
      await emitEvent(manager,'bootstrap.example.v1',{product_id:before.id},correlation);
      throw new Error('simulated failure');
    })).rejects.toThrow('simulated failure');
    expect((await source.query('SELECT title,version FROM product WHERE id=$1',[before.id]))[0]).toEqual({title:before.title,version:before.version});
    expect(await source.query('SELECT id FROM m1_audit WHERE request_id=$1',[correlation])).toHaveLength(0);
    expect(await source.query('SELECT id FROM outbox WHERE correlation_id=$1',[correlation])).toHaveLength(0);
  }finally{await source.destroy();}
});
