import type { OperationOutputs } from '../../../shared/src/operations.generated';
import { moneyNumber } from '../../../shared/src/money';
export function productResponse(row:any,variants:any[]):OperationOutputs['getProduct'] {
  return {id:row.id,store_id:row.store_id,product_type_id:row.product_type_id,title:row.title,
    description:row.description,attributes:row.attributes,status:row.status,moderation_status:row.moderation_status,version:row.version,
    variants:variants.filter(v=>v.product_id===row.id).map(v=>({id:v.id,sku:v.sku,price_vnd:moneyNumber(v.price_vnd),variant_values:v.variant_values,is_default:v.is_default,status:v.status}))};
}
