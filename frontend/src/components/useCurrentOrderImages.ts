import {useProductBatch} from '../features/customer/useProductBatch';
/** Current public catalog photos aid picking; snapshots remain the order identity. */
export function useCurrentOrderImages(items: {product_id?:unknown;variant_id?:unknown}[]) {
 const ids=items.map(item=>item.product_id).filter((id):id is string=>typeof id==='string');
 const result=useProductBatch(ids),images=new Map<string,string>();
 if(!result.error)for(const item of items){
  if(typeof item.product_id!=='string')continue;
  const product=result.data?.find(value=>value.id===item.product_id);
  const image=product?.images?.find(value=>value.variant_id===item.variant_id)??product?.images?.[0];
  if(image?.image_url)images.set(String(item.variant_id??item.product_id),image.image_url);
 }
 return images;
}
