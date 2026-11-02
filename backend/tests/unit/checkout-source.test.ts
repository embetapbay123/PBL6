import {describe,test,expect,jest} from '@jest/globals';
import {OrderService} from '../../commerce-service/src/order/order.service';
import {validateOperation} from '../../shared/src/request-contract';
import {schemaErrors} from '../../shared/src/contract-validation';
import type {OperationInputs} from '../../shared/src/operations.generated';

const product='66000000-0000-4000-8000-000000000001',variant='66000000-0000-4000-8000-000000000002',store='66000000-0000-4000-8000-000000000003',address='66000000-0000-4000-8000-000000000004',user='66000000-0000-4000-8000-000000000005';
const direct={source:'BUY_NOW' as const,buy_now:{product_id:product,variant_id:variant,quantity:2},address_id:address,payment_methods:{[store]:'COD' as const}};
describe('checkout source boundary',()=>{
 test('legacy CART and BUY_NOW validate, mixed/empty/forged selection does not',()=>{
  const cart={cart_item_ids:[product],address_id:address,payment_methods:{[store]:'COD'}};
  expect(()=>validateOperation('quoteCheckout',{body:cart as any})).not.toThrow();
  expect(()=>validateOperation('quoteCheckout',{body:direct})).not.toThrow();
  for(const body of [{...direct,cart_item_ids:[product]},{...cart,buy_now:direct.buy_now},{...direct,buy_now:{...direct.buy_now,quantity:0}},{...cart,cart_item_ids:[]},{...direct,source:'CART'},{...direct,buy_now:{...direct.buy_now,store_id:store}}])
   expect(()=>validateOperation('quoteCheckout',{body:body as any})).toThrow();
 });
 test('oneOf rejects an ambiguous value rather than accepting the first branch',()=>{
  expect(schemaErrors({}, {oneOf:[{type:'object',additionalProperties:false},{type:'object',additionalProperties:false}]})).toHaveLength(1);
 });
 function harness(){
  const reads=jest.fn<(...args:any[])=>Promise<any[]>>().mockResolvedValue([]),records=new Map();
  const catalog=jest.fn<(...args:any[])=>Promise<any>>().mockResolvedValue({id:product,store_id:store,title:'Áo công sở',status:'ACTIVE',moderation_status:'VISIBLE',variants:[{id:variant,sku:'009264',price_vnd:100000,status:'ACTIVE',variant_values:{color:'Đỏ',size:'M'}}]});
  const call=jest.fn<(...args:any[])=>Promise<any>>().mockImplementation(async(op,body)=>op==='QuoteVariants'?{items:body.items.map((i:any)=>({...i,price_vnd:100000,available_quantity:5,version:0}))}:{address_snapshot:{recipient_name:'Người nhận',line1:'Địa chỉ kiểm thử'},stores:[{id:store,name:'Store kiểm thử',shipping_fee_vnd:20000,version:0,return_address:{recipient_name:'Kho nhận trả kiểm thử',phone:'0900000000',line1:'12 Đường Kiểm Thử',ward:'Phường A',district:'Quận B',city:'Huế'}}]});
  const service=new OrderService((()=>({call})) as any,{source:{manager:{query:reads}} as any,catalog:{product:catalog},quotes:{put:async(id,r)=>{records.set(id,r);},get:async id=>records.get(id)}});
  return {service,reads,catalog,call,records};
 }
 test('direct quote takes only the requested quantity without reading or changing a cart',async()=>{
  const h=harness(),quote=await h.service.quoteCheckout(direct,{user_id:user,access_token:'fixture-unit-token'},'test');
  expect(h.reads).not.toHaveBeenCalled();expect(quote.payable_total_vnd).toBe(220000);
  expect(quote.stores[0].items[0]).toMatchObject({product_id:product,variant_id:variant,quantity:2,variant_title:'Đỏ / M',variant_values:{color:'Đỏ',size:'M'},sku:'009264',line_total_vnd:200000});
  expect(h.records.get(quote.quote_id)).toMatchObject({user_id:user,snapshot_version:2});
 });
 test('a stopped or foreign variant cannot be bought through the direct path',async()=>{
  for(const selection of [{...direct,buy_now:{...direct.buy_now,variant_id:product}},direct]){
   const h=harness();if(selection===direct)h.catalog.mockResolvedValue({id:product,store_id:store,status:'STOPPED',moderation_status:'VISIBLE',variants:[{id:variant,status:'ACTIVE'}]});
   await expect(h.service.quoteCheckout(selection as OperationInputs['quoteCheckout']['body'],{user_id:user,access_token:'fixture-unit-token'},'test')).rejects.toMatchObject({status:409});expect(h.reads).not.toHaveBeenCalled();
  }
 });
});
