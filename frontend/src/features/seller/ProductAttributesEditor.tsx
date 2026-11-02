import { FormEvent, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { callOperation } from '../../api/operations';
import {useUnsavedChanges} from '../../components/useUnsavedChanges';
import { ApiError,isUncertainMutation } from '../../api/client';
import type { OperationOutputs } from '../../api/operations.generated';
import { ErrorView, Loading } from '../../bootstrap/components';
import { AttributeFields,unknownAttributeKeys } from './AttributeFields';
import { useProductTypes } from './useProductTypes';

export function ProductAttributesEditor({product}:{product:OperationOutputs['getOwnStoreProduct']}) {
  const cache=useQueryClient(),types=useProductTypes();
  const [values,setValues]=useState(product.attributes),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(),[blocked,setBlocked]=useState(false);
  const [baseVersion,setBaseVersion]=useState(product.version),[dirty,setDirty]=useState(false),[notice,setNotice]=useState('');
  useUnsavedChanges(dirty);
  useEffect(()=>{
    if(product.version===baseVersion)return;
    if(dirty)setBlocked(true);else{setValues(product.attributes);setBaseVersion(product.version);}
  },[product.version,product.attributes,baseVersion,dirty]);
  const type=types.data?.find(item=>item.id===product.product_type_id);
  const unknown=type?unknownAttributeKeys(type.attribute_definitions,values).length>0:false;
  async function save(event:FormEvent){
    event.preventDefault();if(!product.id || busy || blocked || !type || unknown || !!types.error || types.isFetching || baseVersion===undefined)return;
    setBusy(true);setError(undefined);setNotice('');
    try{
      const updated=await callOperation('updateProduct',{path:{id:product.id},body:{attributes:values,expected_version:baseVersion}});
      setValues(updated.attributes);setBaseVersion(updated.version);setDirty(false);
      cache.setQueryData(['own-store-product',product.id],updated);
      await Promise.all([cache.invalidateQueries({queryKey:['products']}),cache.invalidateQueries({queryKey:['own-store-products']})]);
      setNotice('Đã lưu thuộc tính sản phẩm.');
    }catch(e){setError(e);if(e instanceof ApiError&&['INVALID_ATTRIBUTES','INVALID_PRODUCT_TYPE'].includes(e.code))await types.refetch();if(isUncertainMutation(e)||(e instanceof ApiError&&e.code==='VERSION_CONFLICT'))setBlocked(true);}finally{setBusy(false);}
  }
  return <section className="boot-card" aria-label="Thuộc tính sản phẩm"><h2>Thuộc tính sản phẩm</h2>
    {types.isLoading&&<Loading/>}{types.error&&<ErrorView error={types.error} onRetry={()=>void types.refetch()}/>}
    {types.data&&!type&&<p>Loại sản phẩm hiện không còn khả dụng. Hãy liên hệ quản trị viên để kiểm tra danh mục.</p>}
    {type&&<form onSubmit={save}><p>{type.name}</p><AttributeFields definitions={type.attribute_definitions} values={values} onChange={next=>{setDirty(true);setValues(next);}} disabled={busy||blocked}/>{!type.attribute_definitions.length&&<p>Loại sản phẩm này chưa có thuộc tính.</p>}<button disabled={busy||blocked||unknown||!!types.error||types.isFetching||baseVersion===undefined}>{busy?'Đang lưu…':'Lưu thuộc tính'}</button></form>}
    {error!==undefined&&<ErrorView error={error}/>} {blocked&&<p role="alert">Cần tải lại trang để kiểm tra dữ liệu trước khi chỉnh sửa tiếp.</p>}
    {notice&&<p role="status">{notice}</p>}
  </section>;
}
