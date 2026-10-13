import type { OperationOutputs } from '../../../shared/src/operations.generated';
import { moneyNumber } from '../../../shared/src/money';

/**
 * Public Product projection shared by list and detail. `price_vnd` stays a BIGINT string in the
 * ORM and is converted at this boundary. Optional contract fields are omitted rather than sent as
 * `null`, because the response schemas close the object and type them as strings.
 */
export function productResponse(row:any,variants:any[],images:any[]=[]):OperationOutputs['getProduct'] {
  return {id:row.id,store_id:row.store_id,product_type_id:row.product_type_id,title:row.title,
    description:row.description,attributes:row.attributes,status:row.status,moderation_status:row.moderation_status,version:row.version,
    variants:variants.filter(v=>v.product_id===row.id).map(v=>({id:v.id,sku:v.sku,price_vnd:moneyNumber(v.price_vnd),variant_values:v.variant_values,is_default:v.is_default,status:v.status})),
    images:images.filter(i=>i.product_id===row.id).map(i=>({id:i.id,product_id:i.product_id,image_url:i.image_url,position:i.position}))};
}

/** `parent_id` is nullable in the database but typed as a string in the contract. */
export function categoryResponse(row:any):OperationOutputs['listCategories']['items'][number] {
  return {id:row.id,name:row.name,status:row.status,...(row.parent_id===null?{}:{parent_id:row.parent_id})};
}

/** Product type with its attribute definitions; `variant_factor` is exposed as `variant_axis`. */
export function productTypeResponse(row:any,definitions:any[]):OperationOutputs['listProductTypes']['items'][number] {
  return {id:row.id,name:row.name,status:row.status,...(row.category_id===null?{}:{category_id:row.category_id}),
    attribute_definitions:definitions.filter(d=>d.product_type_id===row.id).map(d=>({id:d.id,product_type_id:d.product_type_id,
      name:d.name,data_type:d.data_type,...(d.unit===null?{}:{unit:d.unit}),required:d.required,variant_axis:d.variant_factor,
      ...(Array.isArray(d.allowed_values)?{allowed_values:d.allowed_values}:{})}))};
}
