import {OrderService} from '../../commerce-service/src/order/order.service';
import {OrderRepository, type VoucherCheckoutRow} from '../../commerce-service/src/order/order.repository';
import {validateOperation, operationContracts} from '../../shared/src/request-contract';
import {schemaErrors} from '../../shared/src/contract-validation';
import {fingerprint} from '../../shared/src/idempotency';

const id=(n:number)=>'b1020000-0000-4000-8000-'+String(n).padStart(12,'0');
const product=id(1),variant=id(2),store=id(3),user=id(4),address=id(5),line=id(6);
const direct={mode:'AUTO' as const,source:'BUY_NOW' as const,buy_now:{product_id:product,variant_id:variant,quantity:2}};
function voucher(code:string,discount:number,scope='STORE',min=0):VoucherCheckoutRow {
 return {id:id(20+discount),code,scope,store_id:scope==='STORE'?store:null,owner_user_id:user,
  status:'ACTIVE',discount_type:'FIXED',discount_value:String(discount),min_goods_vnd:String(min),
  max_discount_vnd:null,starts_at:new Date(Date.now()-60000),ends_at:new Date(Date.now()+60000),usage_limit:10,per_customer_limit:1,version:0};
}
function harness(candidates=[voucher('LARGE',60000),voucher('SMALL',20000),voucher('PLATFORM',50000,'PLATFORM',180000)]){
 const reads=jest.fn().mockResolvedValue([]),records=new Map();
 const catalog=jest.fn().mockResolvedValue({id:product,store_id:store,title:'Áo',status:'ACTIVE',moderation_status:'VISIBLE',variants:[{id:variant,sku:'SKU',price_vnd:100000,status:'ACTIVE',variant_values:{size:'M'}}]});
 const call=jest.fn().mockImplementation(async(op,body)=>op==='QuoteVariants'?{items:body.items.map((i:any)=>({...i,price_vnd:100000,available_quantity:5,version:0}))}:
  {address_snapshot:{recipient_name:'Người nhận',line1:'Địa chỉ'},stores:[{id:store,shipping_fee_vnd:20000,version:0,return_address:{recipient_name:'Kho',phone:'0900000000',line1:'12 Đường Mẫu',ward:'Phường A',district:'Quận B',city:'Huế'}}]});
 jest.spyOn(OrderRepository.prototype,'suggestionCandidates').mockResolvedValue(candidates);
 jest.spyOn(OrderRepository.prototype,'findStoreVoucherByCode').mockImplementation(async code=>candidates.find(v=>v.scope==='STORE'&&v.code.toLowerCase()===code.toLowerCase()));
 jest.spyOn(OrderRepository.prototype,'findPlatformVoucherByCode').mockImplementation(async code=>candidates.find(v=>v.scope==='PLATFORM'&&v.code.toLowerCase()===code.toLowerCase()));
 jest.spyOn(OrderRepository.prototype,'findVoucherByCode').mockImplementation(async code=>candidates.find(v=>v.code.toLowerCase()===code.trim().toLowerCase()));
 jest.spyOn(OrderRepository.prototype,'voucherAvailable').mockResolvedValue(true);
 const service=new OrderService((()=>({call})) as any,{source:{manager:{query:reads}} as any,catalog:{product:catalog},quotes:{put:async(key,value)=>{records.set(key,value)},get:async key=>records.get(key)}});
 return {service,call,catalog,reads,records};
}
afterEach(()=>jest.restoreAllMocks());
test('AUTO finds the threshold-preserving combination, resolves current items once and never consumes quota',async()=>{
 const h=harness(),result=await h.service.suggestCheckoutVouchers(direct,{user_id:user},'test');
 expect(result).toEqual({selected:{store_vouchers:{[store]:'SMALL'},platform_voucher_code:'PLATFORM'},goods_total_vnd:200000,discount_total_vnd:70000,net_goods_total_vnd:130000,optimality:'OPTIMAL'});
 expect(h.catalog).toHaveBeenCalledTimes(1);expect(h.call).toHaveBeenCalledTimes(1);expect(h.reads).not.toHaveBeenCalled();expect(h.records.size).toBe(0);
 expect(OrderRepository.prototype.suggestionCandidates).toHaveBeenCalledWith([store],user);
 expect(schemaErrors(result,operationContracts.suggestCheckoutVouchers.responses['200'])).toEqual([]);
});
test('address-inclusive response has a canonical quote with identical selection, shipping and request hash',async()=>{
 const h=harness(),request={...direct,address_id:address,payment_methods:{[store]:'COD' as const}},auth={user_id:user,access_token:'fixture-token'};
 const result=await h.service.suggestCheckoutVouchers(request,auth,'test');
 expect(result.quote?.payable_total_vnd).toBe(150000);
 expect(result.quote?.stores[0].amounts).toEqual({goods_vnd:200000,store_discount_vnd:20000,platform_discount_vnd:50000,shipping_vnd:20000,payable_vnd:150000});
 expect(h.catalog).toHaveBeenCalledTimes(1);expect(h.call).toHaveBeenCalledTimes(2);
 expect(h.records.get(result.quote!.quote_id).request_hash).toBe(fingerprint({source:'BUY_NOW',buy_now:direct.buy_now,address_id:address,payment_methods:request.payment_methods,...result.selected}));
 const regular=await h.service.quoteCheckout({...request,...result.selected},auth,'test');
 expect(regular.stores).toEqual(result.quote!.stores);expect(regular.payable_total_vnd).toBe(result.quote!.payable_total_vnd);
});
test('MANUAL resolves a Store code outside the displayed page and validates combined platform threshold',async()=>{
 const h=harness();
 const result=await h.service.suggestCheckoutVouchers({...direct,mode:'MANUAL',code:' small '},{user_id:user},'test');
 expect(result.selected).toEqual({store_vouchers:{[store]:'SMALL'}});expect(result.optimality).toBe('MANUAL');
 expect(OrderRepository.prototype.suggestionCandidates).not.toHaveBeenCalled();
 await expect(h.service.suggestCheckoutVouchers({...direct,mode:'MANUAL',code:'LARGE',platform_voucher_code:'PLATFORM'},{user_id:user},'test')).rejects.toMatchObject({status:422,response:{code:'VOUCHER_MIN_SPEND_NOT_MET'}});
 await expect(h.service.suggestCheckoutVouchers({...direct,mode:'MANUAL',code:'MISSING'},{user_id:user},'test')).rejects.toMatchObject({status:422,response:{code:'VOUCHER_INVALID'}});
});
test('explicitly clearing all vouchers keeps the no-code baseline',async()=>{
 const h=harness(),result=await h.service.suggestCheckoutVouchers({...direct,mode:'MANUAL'},{user_id:user},'test');
 expect(result.selected).toEqual({});expect(result.discount_total_vnd).toBe(0);expect(result.net_goods_total_vnd).toBe(200000);
});
test('foreign Store codes, changed quotas and expired codes never produce an applied response',async()=>{
 const foreign=voucher('FOREIGN',1000);foreign.store_id=id(999);
 const expired=voucher('EXPIRED',100);expired.ends_at=new Date(Date.now()-1);
 const h=harness([foreign,expired,voucher('LIVE',10000)]);
 await expect(h.service.suggestCheckoutVouchers({...direct,mode:'MANUAL',code:'FOREIGN'},{user_id:user},'test')).rejects.toMatchObject({response:{code:'VOUCHER_STORE_NOT_SELECTED'}});
 await expect(h.service.suggestCheckoutVouchers({...direct,mode:'MANUAL',code:'EXPIRED'},{user_id:user},'test')).rejects.toMatchObject({response:{code:'VOUCHER_EXPIRED'}});
 jest.mocked(OrderRepository.prototype.voucherAvailable).mockResolvedValue(false);
 await expect(h.service.suggestCheckoutVouchers({...direct,mode:'MANUAL',code:'LIVE'},{user_id:user},'test')).rejects.toMatchObject({response:{code:'VOUCHER_OUT_OF_QUOTA'}});
 expect(h.records.size).toBe(0);
});
test('ownership and stock errors are preserved; unauthenticated and partial quote contexts stop early',async()=>{
 const h=harness();
 await expect(h.service.suggestCheckoutVouchers(direct,{},'test')).rejects.toMatchObject({status:401});
 await expect(h.service.suggestCheckoutVouchers({...direct,address_id:address},{user_id:user},'test')).rejects.toMatchObject({status:422});
 expect(h.catalog).not.toHaveBeenCalled();
 await expect(h.service.suggestCheckoutVouchers({mode:'AUTO',cart_item_ids:[line]},{user_id:user},'test')).rejects.toMatchObject({status:404});
 h.call.mockResolvedValue({items:[{variant_id:variant,store_id:store,price_vnd:100000,available_quantity:1,version:1}]});
 await expect(h.service.suggestCheckoutVouchers(direct,{user_id:user},'test')).rejects.toMatchObject({response:{code:'INSUFFICIENT_STOCK'}});
});
test('truncated candidate reads return LIMITED rather than an optimality claim',async()=>{
 const h=harness(Array.from({length:501},(_,n)=>voucher('CODE'+n,n,'PLATFORM')));
 const result=await h.service.suggestCheckoutVouchers(direct,{user_id:user},'test');expect(result.optimality).toBe('LIMITED');
});
test('request contracts accept optional checkout context and reject mixed sources or extra data',()=>{
 expect(()=>validateOperation('suggestCheckoutVouchers',{body:direct})).not.toThrow();
 expect(()=>validateOperation('suggestCheckoutVouchers',{body:{mode:'MANUAL',cart_item_ids:[line],code:'STORE'}})).not.toThrow();
 for(const body of [{...direct,cart_item_ids:[line]},{...direct,mode:'OTHER'},{...direct,code:''},{...direct,customer_user_id:user}])
  expect(()=>validateOperation('suggestCheckoutVouchers',{body:body as any})).toThrow();
});
