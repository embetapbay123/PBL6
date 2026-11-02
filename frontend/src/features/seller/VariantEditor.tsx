import { FormEvent, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {useUnsavedChanges} from '../../components/useUnsavedChanges';
import { ApiError,isUncertainMutation } from '../../api/client';
import { callOperation } from '../../api/operations';
import type { OperationOutputs } from '../../api/operations.generated';
import { ErrorView,Loading } from '../../bootstrap/components';
import { AttributeFields,unknownAttributeKeys } from './AttributeFields';
import { useProductTypes } from './useProductTypes';

type Product = OperationOutputs['getOwnStoreProduct'];
type Variant = NonNullable<Product['variants']>[number];

/** The API treats the variants array as a complete replacement: always send every loaded row. */
export function VariantEditor({product, reload}: {product:Product; reload:()=>Promise<Product>}) {
  const cache = useQueryClient();
  const types=useProductTypes();
  const type=types.data?.find(item=>item.id===product.product_type_id),axes=type?.attribute_definitions.filter(definition=>definition.variant_axis) ?? [];
  const [variants, setVariants] = useState<Variant[]>(() => product.variants ?? []);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState('');
  const [baseVersion,setBaseVersion]=useState(product.version),[dirty,setDirty]=useState(false);
  useUnsavedChanges(dirty);
  const historical=(variant:Variant)=>variant.status==='STOPPED'&&JSON.stringify(variant.variant_values)===JSON.stringify(product.variants?.find(v=>v.id===variant.id)?.variant_values);
  const invalidLegacy=variants.some(v=>!historical(v)&&unknownAttributeKeys(axes,v.variant_values).length>0);
  useEffect(()=>{
    if(product.version===baseVersion)return;
    if(dirty)setConflict(true);
    else{setVariants(product.variants ?? []);setBaseVersion(product.version);}
  },[product.version,product.variants,baseVersion,dirty]);
  function change(index:number, patch:Partial<Variant>) {
    setDirty(true);
    setVariants(current => current.map((variant, i) => i === index ? {...variant, ...patch} : variant));
  }
  async function save(event:FormEvent) {
    event.preventDefault();
    if (!product.id || baseVersion === undefined || busy || conflict || !type || !!types.error || types.isFetching || invalidLegacy) return;
    setBusy(true); setError(undefined); setNotice('');
    try {
      const updated = await callOperation('updateProduct', {path:{id:product.id}, body:{expected_version:baseVersion, variants}});
      setBaseVersion(updated.version);setDirty(false);setVariants(updated.variants ?? []);
      cache.setQueryData(['own-store-product', product.id], updated);
      await Promise.all([cache.invalidateQueries({queryKey:['products']}),cache.invalidateQueries({queryKey:['own-store-products']})]);
      setNotice('Đã lưu biến thể.');
    } catch (value) {
      setError(value);
      if(value instanceof ApiError&&['INVALID_VARIANT_ATTRIBUTES','INVALID_PRODUCT_TYPE'].includes(value.code))await types.refetch();
      if (isUncertainMutation(value)||(value instanceof ApiError && value.code === 'VERSION_CONFLICT')) setConflict(true);
    } finally {setBusy(false);}
  }
  return <section className="boot-card" aria-labelledby="variant-editor-title"><h2 id="variant-editor-title">Chỉnh sửa biến thể</h2>
    {types.isPending&&<Loading/>}{!types.isPending&&!types.error&&!type&&<p role="alert">Không đọc được loại sản phẩm hiện hành. Nhờ Admin kiểm tra cấu hình; vẫn có thể dừng bán ở Thông tin chung.</p>}
    {!variants.length ? <p>Chưa có biến thể để chỉnh sửa.</p> : <form onSubmit={save}>
      <p>Thay đổi áp dụng cho toàn bộ danh sách. Biến thể dừng bán vẫn được giữ để bảo toàn lịch sử đơn hàng.</p>
      {variants.map((variant,index)=><fieldset disabled={busy||conflict||!type||!!types.error||types.isFetching} key={variant.id ?? index} className="seller-variant-fields"><legend>Biến thể {index+1}</legend>
        <label>SKU<input required maxLength={200} value={variant.sku} onChange={event=>change(index,{sku:event.target.value})}/></label>
        <label>Giá bán (VNĐ)<input required type="number" min="0" step="1" value={variant.price_vnd} onChange={event=>change(index,{price_vnd:Number(event.target.value)})}/></label>
        <label>Trạng thái<select value={variant.status ?? 'ACTIVE'} onChange={event=>change(index,{status:event.target.value})}><option value="ACTIVE">Đang bán</option><option value="STOPPED">Dừng bán</option></select></label>
        <label><input type="radio" name="default-variant" checked={!!variant.is_default} onChange={()=>{setDirty(true);setVariants(current=>current.map((item,i)=>({...item,is_default:i===index})));}}/> Biến thể mặc định</label>
        <AttributeFields definitions={axes} values={variant.variant_values} onChange={values=>change(index,{variant_values:values})} disabled={busy||conflict} preserveHistorical={historical(variant)}/>
        {!axes.length&&!Object.keys(variant.variant_values).length&&<p>Biến thể chưa có thuộc tính.</p>}
      </fieldset>)}
      <button disabled={busy || conflict || product.version === undefined || !type || !!types.error || types.isFetching || invalidLegacy}>{busy ? 'Đang lưu…' : 'Lưu biến thể'}</button>
    </form>}
    {error !== undefined && <ErrorView error={error}/>} {conflict && <div><p>Dữ liệu đã thay đổi. Tải lại trước khi chỉnh sửa tiếp; các thay đổi chưa lưu sẽ bị bỏ.</p><button type="button" disabled={busy} onClick={()=>{setBusy(true);void reload().then(fresh=>{setVariants(fresh.variants ?? []);setBaseVersion(fresh.version);setDirty(false);setError(undefined);setConflict(false);}).catch(setError).finally(()=>setBusy(false));}}>Tải lại dữ liệu</button></div>}
    {types.error&&<ErrorView error={types.error} onRetry={()=>void types.refetch()}/>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
