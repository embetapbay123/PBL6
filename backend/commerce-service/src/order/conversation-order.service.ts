import type {DataSource} from 'typeorm';
import {database} from '../../../shared/src/database';
import {config} from '../../../shared/src/config';
import {InternalClients} from '../../../shared/src/internal-clients';
import {ApiError} from '../../../shared/src/errors';
import type {OperationInputs,OperationOutputs} from '../../../shared/src/operations.generated';
import {OrderRepository} from './order.repository';
import {requireStorePermission} from '../scope';

export class ConversationOrderService{
 constructor(private readonly source:DataSource=database,private readonly clientsFactory?:()=>InternalClients){}
 async resolve(input:OperationInputs['ResolveConversationOrder']['body'],correlation:string):Promise<OperationOutputs['ResolveConversationOrder']>{
  const clients=this.clientsFactory?.()??(()=>{const c=config('M2');return new InternalClients('M2',c.internalKeys.M2,{M1:c.catalogUrl,M2:'',M3:c.identityUrl});})();
  const auth=await clients.call('ResolveContext',{token:input.token},correlation);
  const repo=new OrderRepository(this.source.manager);
  let order;
  if(input.side==='CUSTOMER'){
   if(!auth.roles.includes('CUSTOMER'))throw new ApiError(403,'FORBIDDEN','Cần tài khoản Customer để hỏi về đơn mua.');
   order=await repo.findCustomerOrderById(input.order_id,auth.user_id);
  }else{
   if(!auth.roles.some(role=>role==='STORE_OWNER'||role==='SELLER')||auth.store_membership?.status!=='ACTIVE')throw new ApiError(403,'FORBIDDEN','Cần membership Store hiện hành.');
   const store=requireStorePermission(auth,'order.store.read_status_cancel');order=await repo.findStoreOrderById(input.order_id,store);
  }
  if(!order)throw new ApiError(404,'NOT_FOUND','Không tìm thấy đơn hàng trong phạm vi của bạn.');
  return {order_id:order.id,store_id:order.store_id,customer_user_id:order.customer_user_id,status:order.status as OperationOutputs['ResolveConversationOrder']['status'],items:order.items.map(row=>({...(typeof row.product_snapshot?.title==='string'?{title:row.product_snapshot.title}:{}),...(row.product_snapshot?.variant_values&&typeof row.product_snapshot.variant_values==='object'&&!Array.isArray(row.product_snapshot.variant_values)?{variant_values:row.product_snapshot.variant_values as Record<string,unknown>}:{}),quantity:row.quantity}))};
 }
}
