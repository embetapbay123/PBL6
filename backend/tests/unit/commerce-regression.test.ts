import { randomUUID } from 'node:crypto';
import { database } from '../../shared/src/database';
import { ApiError } from '../../shared/src/errors';
import { fingerprint } from '../../shared/src/idempotency';
import { OrderService } from '../../commerce-service/src/order/order.service';
import { OrderRepository } from '../../commerce-service/src/order/order.repository';
import { PaymentPort } from '../../commerce-service/src/payment/payment.port';
import { schemaErrors } from '../../shared/src/contract-validation';
import bundle from '../../shared/src/contracts.runtime.generated.json';
import { CheckoutQuoteRecord } from '../../commerce-service/src/order/quote-store';

const manager={query:jest.fn(),queryRunner:{isTransactionActive:true}};
jest.mock('../../shared/src/database',()=>({database:{get manager(){return manager;},transaction:jest.fn(async(work:any)=>work(manager))}}));
const USER=randomUUID(),STORE=randomUUID(),PRODUCT=randomUUID(),VARIANT=randomUUID(),ITEM=randomUUID(),ADDRESS=randomUUID();
const customer={user_id:USER,access_token:'current-token',roles:['CUSTOMER']};
const seller={user_id:USER,store_membership:{store_id:STORE,role:'SELLER',permissions:['order.store.read_status_cancel','cod.store.collect']}};
const input={cart_item_ids:[ITEM],address_id:ADDRESS,payment_methods:{[STORE]:'COD' as const}};
let records:Map<string,CheckoutQuoteRecord>;
let call:jest.Mock;
function service(payments?:(m:any)=>PaymentPort) {
  return new OrderService((()=>({call})) as any,{
    catalog:{product:async()=>({id:PRODUCT,store_id:STORE,title:'Product thật',variants:[{id:VARIANT,sku:'SKU-REAL',price_vnd:100000}]} as any)},
    quotes:{put:async(id,record)=>{records.set(id,record);},get:async id=>records.get(id)},payments,
  });
}
const order=(status='SHIPPED')=>({id:randomUUID(),purchase_group_id:randomUUID(),customer_user_id:USER,store_id:STORE,status,version:1,payment_method:'COD',
  address_snapshot:{},goods_vnd:'100000',store_discount_vnd:'0',platform_discount_vnd:'0',shipping_vnd:'30000',payable_vnd:'130000',payment_expires_at:null,created_at:new Date(),items:[]} as any);
beforeEach(()=>{
  jest.restoreAllMocks();manager.query.mockReset();records=new Map();
  call=jest.fn(async(operation:string,payload:any)=>{
    if(operation==='QuoteVariants') return {items:[{variant_id:VARIANT,store_id:STORE,quantity:1,price_vnd:100000,available_quantity:10,version:0}]};
    if(operation==='ResolveCheckoutContext') return {address_snapshot:{id:ADDRESS},stores:[{id:STORE,name:'Store thật',shipping_fee_vnd:30000,version:2}]};
    if(operation==='ReserveInventory') return {reservations:[{id:randomUUID(),order_id:payload?.items?.[0]?.order_id ?? randomUUID(),variant_id:VARIANT,quantity:1,expires_at:new Date(Date.now()+600000).toISOString()}]};
    if(operation==='ReleaseReservation') return {operation_id:randomUUID(),status:'APPLIED'};
    throw new Error('unexpected operation: '+operation);
  });
  jest.spyOn(OrderRepository.prototype,'findCartItemsWithOwnership').mockResolvedValue([{id:ITEM,cart_id:randomUUID(),product_id:PRODUCT,variant_id:VARIANT,store_id:STORE,quantity:1}]);
});
test('quote uses current M1 price, M3 shipping and persists Customer binding',async()=>{
  const result=await service().quoteCheckout(input,customer,'corr');
  expect(result.payable_total_vnd).toBe(130000);
  expect(result.stores[0].items[0]).toMatchObject({product_id:PRODUCT,sku:'SKU-REAL'});
  expect(records.get(result.quote_id)?.user_id).toBe(USER);
  expect(call).toHaveBeenCalledWith('ResolveCheckoutContext',{token:'current-token',address_id:ADDRESS,store_ids:[STORE]},'corr');
  expect(schemaErrors(result,bundle.operations.quoteCheckout.responses['200'])).toEqual([]);
});
test.each([404,409,503])('M1 %s is propagated without a fabricated quote',async status=>{
  call.mockRejectedValue(new ApiError(status,'M1_REJECTED','Dependency error'));
  await expect(service().quoteCheckout(input,customer,'corr')).rejects.toMatchObject({status});
  expect(records.size).toBe(0);
});
test('M3 address ownership error prevents quote persistence',async()=>{
  const old=call.getMockImplementation()!;
  call.mockImplementation(async op=>{if(op==='ResolveCheckoutContext') throw new ApiError(404,'ADDRESS_NOT_FOUND','Ownership');return old(op);});
  await expect(service().quoteCheckout(input,customer,'corr')).rejects.toMatchObject({status:404});
  expect(records.size).toBe(0);
});
test('legacy Cart without Product mapping is rejected',async()=>{
  jest.spyOn(OrderRepository.prototype,'findCartItemsWithOwnership').mockResolvedValue([{id:ITEM,cart_id:randomUUID(),variant_id:VARIANT,store_id:STORE,quantity:1}]);
  await expect(service().quoteCheckout(input,customer,'corr')).rejects.toMatchObject({response:{code:'CART_MAPPING_REQUIRED'}});
});
test('arbitrary or other Customer quote cannot confirm',async()=>{
  const s=service(),q=await s.quoteCheckout(input,customer,'corr');
  await expect(s.confirmCheckout({...input,quote_id:randomUUID(),expected_payable_total_vnd:130000},'key',customer,'corr')).rejects.toMatchObject({status:404});
  await expect(s.confirmCheckout({...input,quote_id:q.quote_id,expected_payable_total_vnd:130000},'key',{...customer,user_id:randomUUID()},'corr')).rejects.toMatchObject({status:404});
});
test('expired or changed quote is rejected',async()=>{
  const s=service(),q=await s.quoteCheckout(input,customer,'corr'),confirm={...input,quote_id:q.quote_id,expected_payable_total_vnd:130000};
  await expect(s.confirmCheckout({...confirm,address_id:randomUUID()},'key',customer,'corr')).rejects.toMatchObject({status:409,response:{code:'QUOTE_CHANGED'}});
  records.get(q.quote_id)!.expires_at=new Date(0).toISOString();
  await expect(s.confirmCheckout(confirm,'key',customer,'corr')).rejects.toMatchObject({status:409,response:{code:'QUOTE_EXPIRED'}});
});
test('BUG-QUOTE-01: Confirm revalidates quote and rejects changed price/stock/address before reserve or DB effects', async () => {
  const s = service(), q = await s.quoteCheckout(input, customer, 'corr');
  const confirm = { ...input, quote_id: q.quote_id, expected_payable_total_vnd: 130000 };

  // Upstream price change
  const originalCall = call.getMockImplementation()!;
  call.mockImplementation(async (op: string, payload: any) => {
    if (op === 'QuoteVariants') {
      return { items: [{ variant_id: VARIANT, store_id: STORE, quantity: 1, price_vnd: 120000, available_quantity: 10, version: 1 }] };
    }
    return originalCall(op, payload);
  });
  manager.query.mockClear();
  await expect(s.confirmCheckout(confirm, 'key-price', customer, 'corr')).rejects.toMatchObject({
    status: 409,
    response: { code: 'QUOTE_CHANGED' },
  });
  expect(call).not.toHaveBeenCalledWith('ReserveInventory', expect.anything(), expect.anything());
  expect(manager.query).not.toHaveBeenCalledWith(expect.stringMatching(/INSERT INTO/i), expect.anything());

  // Upstream stock exhausted (INSUFFICIENT_STOCK)
  call.mockImplementation(async (op: string, payload: any) => {
    if (op === 'QuoteVariants') {
      return { items: [{ variant_id: VARIANT, store_id: STORE, quantity: 1, price_vnd: 100000, available_quantity: 0, version: 1 }] };
    }
    return originalCall(op, payload);
  });
  manager.query.mockClear();
  await expect(s.confirmCheckout(confirm, 'key-stock', customer, 'corr')).rejects.toMatchObject({
    status: 409,
    response: { code: 'INSUFFICIENT_STOCK' },
  });
  expect(call).not.toHaveBeenCalledWith('ReserveInventory', expect.anything(), expect.anything());
  expect(manager.query).not.toHaveBeenCalledWith(expect.stringMatching(/INSERT INTO/i), expect.anything());

  // Upstream address invalid / deleted (404)
  call.mockImplementation(async (op: string, payload: any) => {
    if (op === 'ResolveCheckoutContext') throw new ApiError(404, 'ADDRESS_NOT_FOUND', 'Not found');
    return originalCall(op, payload);
  });
  manager.query.mockClear();
  await expect(s.confirmCheckout(confirm, 'key-addr', customer, 'corr')).rejects.toMatchObject({
    status: 404,
  });
  expect(call).not.toHaveBeenCalledWith('ReserveInventory', expect.anything(), expect.anything());
  expect(manager.query).not.toHaveBeenCalledWith(expect.stringMatching(/INSERT INTO/i), expect.anything());
});

test('confirmCheckout creates complete Order group, Payment, reserves and commits vouchers, and replays idempotently', async () => {
  let paymentCreated: any;
  const paymentPort: PaymentPort = {
    manager: manager as any,
    createForOrder: jest.fn(async (p: any) => {
      paymentCreated = p;
      return {
        id: randomUUID(),
        order_id: p.order_id,
        method: p.method,
        status: 'PENDING',
        payable_vnd: Number(p.payable_vnd),
        collectible_vnd: p.method === 'COD' ? Number(p.payable_vnd) : 0,
        collected_vnd: 0,
        refunded_vnd: 0,
      };
    }),
    recordCodCollection: jest.fn(),
    requestRefund: jest.fn(),
  };
  const s = service(() => paymentPort);
  const q = await s.quoteCheckout(input, customer, 'corr');
  const confirm = { ...input, quote_id: q.quote_id, expected_payable_total_vnd: 130000 };

  manager.query.mockImplementation(async (sql: string, params: any[]) => {
    if (sql.includes('SELECT pg_advisory_xact_lock')) return [];
    if (sql.includes('SELECT id, customer_user_id, key')) return [];
    if (sql.includes('SELECT * FROM "order" WHERE purchase_group_id')) return [];
    if (sql.includes('INSERT INTO "order"')) {
      return [{
        id: params[0],
        purchase_group_id: params[1],
        customer_user_id: params[2],
        store_id: params[3],
        address_snapshot: JSON.parse(params[4]),
        status: params[5],
        payment_method: params[6],
        payment_expires_at: params[7],
        goods_vnd: params[8],
        store_discount_vnd: params[9],
        platform_discount_vnd: params[10],
        shipping_vnd: params[11],
        payable_vnd: params[12],
        version: 0,
        created_at: new Date(),
      }];
    }
    if (sql.includes('INSERT INTO order_item')) {
      return [{
        id: randomUUID(),
        order_id: params[1],
        product_id: params[2],
        variant_id: params[3],
        product_snapshot: JSON.parse(params[4]),
        sku_snapshot: params[5],
        unit_price_vnd: params[6],
        quantity: params[7],
        line_total_vnd: params[8],
      }];
    }
    if (sql.includes('INSERT INTO idempotency_record')) return [];
    return [];
  });

  const res = await s.confirmCheckout(confirm, 'key-success-1', customer, 'corr');
  expect(res.payable_total_vnd).toBe(130000);
  expect(res.orders).toHaveLength(1);
  expect(res.orders[0].status).toBe('PREPARING');
  expect(res.orders[0].payment_method).toBe('COD');
  expect(paymentCreated).toBeDefined();
  expect(paymentCreated.payable_vnd).toBe(130000n);
  expect(schemaErrors(res, bundle.operations.confirmCheckout.responses['201'])).toEqual([]);

  // Replay with identical key and payload returns existing record without new writes
  manager.query.mockImplementation(async (sql: string) => {
    if (sql.includes('SELECT id, customer_user_id, key')) {
      return [{
        id: randomUUID(),
        customer_user_id: USER,
        key: 'key-success-1',
        payload_hash: fingerprint({
          cart_item_ids: [...confirm.cart_item_ids].sort(),
          address_id: confirm.address_id,
          payment_methods: confirm.payment_methods,
          platform_voucher_code: (confirm as any).platform_voucher_code,
          store_vouchers: (confirm as any).store_vouchers,
          quote_id: confirm.quote_id,
          expected_payable_total_vnd: confirm.expected_payable_total_vnd,
        }),
        purchase_group_id: res.purchase_group_id,
        response_json: res,
        expires_at: new Date(Date.now() + 86400000),
      }];
    }
    return [];
  });

  const replay = await s.confirmCheckout(confirm, 'key-success-1', customer, 'corr');
  expect(replay).toEqual(res);

  // Replay with different payload throws 409 IDEMPOTENCY_CONFLICT
  await expect(s.confirmCheckout({ ...confirm, expected_payable_total_vnd: 999999 }, 'key-success-1', customer, 'corr'))
    .rejects.toMatchObject({ status: 409, response: { code: 'IDEMPOTENCY_CONFLICT' } });
});

test('confirmCheckout compensates M1 reservation when database transaction fails', async () => {
  const s = service();
  const q = await s.quoteCheckout(input, customer, 'corr');
  const confirm = { ...input, quote_id: q.quote_id, expected_payable_total_vnd: 130000 };

  manager.query.mockImplementation(async (sql: string) => {
    if (sql.includes('SELECT pg_advisory_xact_lock')) return [];
    if (sql.includes('SELECT id, customer_user_id, key')) return [];
    if (sql.includes('INSERT INTO "order"')) {
      throw new Error('SIMULATED_DB_FAILURE');
    }
    return [];
  });

  await expect(s.confirmCheckout(confirm, 'key-fail-comp', customer, 'corr')).rejects.toThrow('SIMULATED_DB_FAILURE');
  expect(call).toHaveBeenCalledWith('ReleaseReservation', expect.objectContaining({
    reason: 'CONFIRM_FAILED',
  }), 'corr');
});

test('online payment (SANDBOX) creates order in AWAITING_PAYMENT status with payment_expires_at', async () => {
  let paymentCreated: any;
  const paymentPort: PaymentPort = {
    manager: manager as any,
    createForOrder: jest.fn(async (p: any) => {
      paymentCreated = p;
      return {
        id: randomUUID(),
        order_id: p.order_id,
        method: p.method,
        status: 'PENDING',
        payable_vnd: Number(p.payable_vnd),
        collectible_vnd: 0,
        collected_vnd: 0,
        refunded_vnd: 0,
      };
    }),
    recordCodCollection: jest.fn(),
    requestRefund: jest.fn(),
  };
  const s = service(() => paymentPort);
  const onlineInput = { ...input, payment_methods: { [STORE]: 'SANDBOX' as const } };
  const q = await s.quoteCheckout(onlineInput, customer, 'corr');
  const confirm = { ...onlineInput, quote_id: q.quote_id, expected_payable_total_vnd: 130000 };

  manager.query.mockImplementation(async (sql: string, params: any[]) => {
    if (sql.includes('SELECT pg_advisory_xact_lock')) return [];
    if (sql.includes('SELECT id, customer_user_id, key')) return [];
    if (sql.includes('INSERT INTO "order"')) {
      return [{
        id: params[0],
        purchase_group_id: params[1],
        customer_user_id: params[2],
        store_id: params[3],
        address_snapshot: JSON.parse(params[4]),
        status: params[5],
        payment_method: params[6],
        payment_expires_at: params[7],
        goods_vnd: params[8],
        store_discount_vnd: params[9],
        platform_discount_vnd: params[10],
        shipping_vnd: params[11],
        payable_vnd: params[12],
        version: 0,
        created_at: new Date(),
      }];
    }
    if (sql.includes('INSERT INTO order_item')) return [{ id: randomUUID() }];
    return [];
  });

  const res = await s.confirmCheckout(confirm, 'key-sandbox-1', customer, 'corr');
  expect(res.orders[0].status).toBe('AWAITING_PAYMENT');
  expect(res.orders[0].payment_method).toBe('SANDBOX');
  expect(res.orders[0].payment_expires_at).toBeDefined();
  expect(paymentCreated.method).toBe('SANDBOX');
});
test('revoked Seller permission blocks reading Store orders',async()=>{
  await expect(service().listStoreOrders({}, {...seller,store_membership:{...seller.store_membership,permissions:[]}},'corr')).rejects.toMatchObject({status:403});
});
test('PREPARING cannot skip inventory consumption',async()=>{
  jest.spyOn(OrderRepository.prototype,'lockStoreOrderById').mockResolvedValue(order('PREPARING'));
  await expect(service().transitionStoreOrder(randomUUID(),{expected_version:1,to_status:'CONFIRMED'},seller,'corr')).rejects.toMatchObject({status:409});
});
test('unpaid COD cannot complete',async()=>{
  jest.spyOn(OrderRepository.prototype,'lockStoreOrderById').mockResolvedValue(order());
  jest.spyOn(OrderRepository.prototype,'lockPaymentByOrderId').mockResolvedValue({status:'PENDING',collected_vnd:'0'} as any);
  await expect(service().transitionStoreOrder(randomUUID(),{expected_version:1,to_status:'COMPLETED'},seller,'corr')).rejects.toMatchObject({status:409,response:{code:'PAYMENT_NOT_COLLECTED'}});
});
test('CANCELLED Order cannot collect COD',async()=>{
  jest.spyOn(OrderRepository.prototype,'lockStoreOrderById').mockResolvedValue(order('CANCELLED'));
  await expect(service().collectCod(randomUUID(),{expected_version:1,amount_collected_vnd:130000},seller,'corr')).rejects.toMatchObject({status:409});
});
test('COD delegates to PaymentPort using the transaction manager; Payment failure blocks Order update',async()=>{
  jest.spyOn(OrderRepository.prototype,'lockStoreOrderById').mockResolvedValue(order());
  jest.spyOn(OrderRepository.prototype,'lockPaymentByOrderId').mockResolvedValue({status:'PENDING',collectible_vnd:'130000'} as any);
  const update=jest.spyOn(OrderRepository.prototype,'incrementOrderVersion');
  let seen:any;
  const s=service(m=>({manager:m,createForOrder:jest.fn(),requestRefund:jest.fn(),recordCodCollection:async()=>{seen=m;throw new ApiError(501,'FEATURE_NOT_IMPLEMENTED','Payment pending');}} as any));
  await expect(s.collectCod(randomUUID(),{expected_version:1,amount_collected_vnd:130000},seller,'corr')).rejects.toMatchObject({status:501});
  expect(seen).toBe(manager);expect(update).not.toHaveBeenCalled();
});

test.each([['PENDING','CONFIRMED'],['PROCESSING','SHIPPED']])('transition %s -> %s uses only M2 transaction and records shipment when shipping',async(from,to)=>{
  const source=order(from);
  jest.spyOn(OrderRepository.prototype,'lockStoreOrderById').mockResolvedValue(source);
  jest.spyOn(OrderRepository.prototype,'updateOrderStatusWithHistory').mockResolvedValue({...source,status:to,version:2});
  const ship=jest.spyOn(OrderRepository.prototype,'ship').mockResolvedValue();
  await expect(service().transitionStoreOrder(source.id,{expected_version:1,to_status:to as any},seller,'corr')).resolves.toMatchObject({status:to,version:2});
  expect(call).not.toHaveBeenCalled();
  expect(ship).toHaveBeenCalledTimes(to==='SHIPPED'?1:0);
});
test('wrong Payment manager is rejected',async()=>{
  jest.spyOn(OrderRepository.prototype,'lockStoreOrderById').mockResolvedValue(order());
  jest.spyOn(OrderRepository.prototype,'lockPaymentByOrderId').mockResolvedValue({status:'PENDING',collectible_vnd:'130000'} as any);
  await expect(service(()=>({manager:{}} as any)).collectCod(randomUUID(),{expected_version:1,amount_collected_vnd:130000},seller,'corr')).rejects.toThrow('TRANSACTION_MANAGER_MISMATCH');
});
test('cancellation leaves data untouched while compensation worker is not delivered',async()=>{
  jest.spyOn(OrderRepository.prototype,'lockCustomerOrderById').mockResolvedValue(order('PENDING'));
  const write=jest.spyOn(OrderRepository.prototype,'updateOrderStatusWithHistory');
  await expect(service().cancelOwnOrder(randomUUID(),{expected_version:1},customer,'corr')).rejects.toMatchObject({status:501});
  expect(write).not.toHaveBeenCalled();
});
test('quota counts ledger, including per Customer, without decrementing configured limit',async()=>{
  manager.query.mockResolvedValue([{total:0,customer:0}]);
  const voucher={id:randomUUID(),usage_limit:1,per_customer_limit:1} as any;
  expect(await new OrderRepository(manager as any).voucherAvailable(voucher,USER)).toBe(true);
  manager.query.mockResolvedValue([{total:1,customer:1}]);
  expect(await new OrderRepository(manager as any).voucherAvailable(voucher,USER)).toBe(false);
  expect(voucher.usage_limit).toBe(1);
});
