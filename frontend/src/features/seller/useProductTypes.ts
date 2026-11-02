import { useQuery } from '@tanstack/react-query';
import { callOperation } from '../../api/operations';
import type { OperationOutputs } from '../../api/operations.generated';

export function useProductTypes() {
  return useQuery({queryKey:['seller-product-types'],queryFn:async({signal})=>{
    const items:OperationOutputs['listProductTypes']['items']=[];
    for(let page=1; ;page++){
      const result=await callOperation('listProductTypes',{query:{page,size:100}},{signal});
      items.push(...result.items);
      if(!result.items.length || items.length>=result.total)return items;
    }
  }});
}
