import { randomUUID } from 'node:crypto';
import { CartService } from '../../commerce-service/src/cart/cart.service';
import { CartRepository } from '../../commerce-service/src/cart/cart.repository';
import { ApiError } from '../../shared/src/errors';
import { schemaErrors } from '../../shared/src/contract-validation';
import bundle from '../../shared/src/contracts.runtime.generated.json';
const mockQuery=jest.fn();
jest.mock('../../shared/src/database',()=>({database:{get manager(){return {query:mockQuery};},transaction:async(work:any)=>work({query:mockQuery})}}));
const user={user_id:randomUUID()},PRODUCT=randomUUID(),VARIANT=randomUUID(),STORE=randomUUID(),CART=randomUUID(),ITEM=randomUUID();
const row={id:ITEM,cart_id:CART,product_id:PRODUCT,variant_id:VARIANT,store_id:STORE,quantity:2,added_at:new Date()};
let call:jest.Mock,catalog:any;
function service(){return new CartService((()=>({call})) as any,catalog);}
beforeEach(()=>{
  jest.restoreAllMocks();mockQuery.mockReset();
  catalog={product:jest.fn(async()=>({id:PRODUCT,store_id:STORE,variants:[{id:VARIANT}]}))};
  call=jest.fn(async()=>({items:[{variant_id:VARIANT,store_id:STORE,available_quantity:10,quantity:2,price_vnd:100000,version:0}]}));
  jest.spyOn(CartRepository.prototype,'getOrCreateCart').mockResolvedValue({id:CART,customer_user_id:user.user_id,updated_at:new Date()});
  jest.spyOn(CartRepository.prototype,'lockCart').mockResolvedValue();
  jest.spyOn(CartRepository.prototype,'lockItemByVariant').mockResolvedValue(undefined);
  jest.spyOn(CartRepository.prototype,'addItem').mockResolvedValue(row);
  jest.spyOn(CartRepository.prototype,'updateItemQuantity').mockResolvedValue(row);
});
test('add resolves Product and sends the trusted Store to M1',async()=>{
  await service().add({product_id:PRODUCT,variant_id:VARIANT,quantity:2},user,'corr');
  expect(call).toHaveBeenCalledWith('QuoteVariants',{items:[{variant_id:VARIANT,store_id:STORE,quantity:2}]},'corr');
  expect(CartRepository.prototype.addItem).toHaveBeenCalledWith(CART,VARIANT,STORE,2,PRODUCT);
});
test.each([404,409,503])('M1 %s leaves Cart and outbox untouched',async status=>{
  call.mockRejectedValue(new ApiError(status,'DEPENDENCY_REJECTED','M1 error'));
  await expect(service().add({product_id:PRODUCT,variant_id:VARIANT,quantity:2},user,'corr')).rejects.toMatchObject({status});
  expect(CartRepository.prototype.addItem).not.toHaveBeenCalled();expect(mockQuery).not.toHaveBeenCalled();
});
test('rejects a Variant from a different Product',async()=>{
  await expect(service().add({product_id:PRODUCT,variant_id:randomUUID(),quantity:2},user,'corr')).rejects.toMatchObject({status:404});
  expect(call).not.toHaveBeenCalled();
});
test('M1 missing/mismatched quote does not mutate Cart',async()=>{
  call.mockResolvedValue({items:[]});
  await expect(service().add({product_id:PRODUCT,variant_id:VARIANT,quantity:2},user,'corr')).rejects.toMatchObject({status:503});
  expect(CartRepository.prototype.addItem).not.toHaveBeenCalled();
});
test('merged quantity is checked against available stock',async()=>{
  jest.spyOn(CartRepository.prototype,'lockItemByVariant').mockResolvedValue({...row,quantity:9});
  await expect(service().add({product_id:PRODUCT,variant_id:VARIANT,quantity:2},user,'corr')).rejects.toMatchObject({status:409});
  expect(CartRepository.prototype.updateItemQuantity).not.toHaveBeenCalled();
});
test('merge locks Cart first and updates the mapping',async()=>{
  jest.spyOn(CartRepository.prototype,'lockItemByVariant').mockResolvedValue(row);
  await service().add({product_id:PRODUCT,variant_id:VARIANT,quantity:2},user,'corr');
  expect(CartRepository.prototype.updateItemQuantity).toHaveBeenCalledWith(ITEM,4,CART,PRODUCT,STORE);
  const lock=CartRepository.prototype.lockCart as jest.Mock,item=CartRepository.prototype.lockItemByVariant as jest.Mock;
  expect(lock.mock.invocationCallOrder[0]).toBeLessThan(item.mock.invocationCallOrder[0]);
});
test('worker-wrapped event has a single envelope and validates the event contract',async()=>{
  await service().add({product_id:PRODUCT,variant_id:VARIANT,quantity:2},user,'corr');
  const outbox=mockQuery.mock.calls.find(([sql])=>sql.includes('INSERT INTO outbox'))!;
  const payload=JSON.parse(outbox[1][2]);
  expect(payload).toEqual({user_id:user.user_id,product_id:PRODUCT,event_type:'CART',quantity:2});
  const event={event_id:randomUUID(),event_type:'InteractionRecorded',schema_version:'1.0',producer:'M2',occurred_at:new Date().toISOString(),correlation_id:'corr',payload};
  expect(schemaErrors(event,bundle.events.InteractionRecorded.schema)).toEqual([]);
});
test('update propagates M1 error before writing',async()=>{
  jest.spyOn(CartRepository.prototype,'findItemWithOwnership').mockResolvedValue(row);
  call.mockRejectedValue(new ApiError(503,'DEPENDENCY_UNAVAILABLE','M1 error'));
  await expect(service().update(ITEM,{quantity:3},user,'corr')).rejects.toMatchObject({status:503});
  expect(CartRepository.prototype.updateItemQuantity).not.toHaveBeenCalled();
});
test('update preserves ownership and maps the Product in its response',async()=>{
  jest.spyOn(CartRepository.prototype,'findItemWithOwnership').mockResolvedValue(row);
  jest.spyOn(CartRepository.prototype,'lockItemWithOwnership').mockResolvedValue(row);
  expect(await service().update(ITEM,{quantity:2},user,'corr')).toMatchObject({product_id:PRODUCT,quantity:2});
});
