import {expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {afterSaleMarket} from './after-sale-market';
export async function exchangeMarket(){
 const f=await afterSaleMarket();
 await f.api('/admin/attribute-definitions',f.admin,'POST',{product_type_id:f.product.product_type_id,code:'size',name:'Cỡ',data_type:'STRING',required:false,variant_axis:true,allowed_values:['M','L','XL','XXL']});
 let product=await f.api('/store/products/'+f.product.id,f.owner.access);await f.api('/store/products/'+product.id,f.owner.access,'PATCH',{expected_version:product.version,variants:product.variants.map((v:any)=>({...v,variant_values:{size:'M'}}))});
 const large=await f.api('/store/products/'+product.id+'/variants',f.owner.access,'POST',{sku:f.tag+'-OPAQUE-L-00999',price_vnd:100000,variant_values:{size:'L'}}),expensive=await f.api('/store/products/'+product.id+'/variants',f.owner.access,'POST',{sku:f.tag+'-OPAQUE-XL-00999',price_vnd:120000,variant_values:{size:'XL'}});
 for(const [variant,quantity] of [[large,3],[expensive,2]] as const)await f.api('/store/inventory/adjustments',f.owner.access,'POST',{variant_id:variant.id,delta_quantity:quantity,expected_version:0,reason:f.tag+' exchange stock',operation_id:randomUUID()});
 async function paidOrder(){const order=await f.purchase('COD');await f.ship(order.id);await f.collect(order.id);await f.transition(order.id,'COMPLETED');return order;}
 async function quantity(id:string){const items=await f.api('/store/inventory?variant_id='+id,f.owner.access);return items.items[0];}
 return {...f,large,expensive,paidOrder,quantity};
}
