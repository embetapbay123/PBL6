import {FormField} from '../components/FormField';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams,useLocation } from 'react-router-dom';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { callOperation } from '../api/operations';
import {useUnsavedChanges} from '../components/useUnsavedChanges';
import { ApiError,isUncertainMutation } from '../api/client';
import { ErrorView, FormPanel, Loading } from './components';
import { SellerSubNav } from '../live/SellerWorkspace';
import { VariantEditor } from '../features/seller/VariantEditor';
import { ProductAttributesEditor } from '../features/seller/ProductAttributesEditor';
import { AttributeFields } from '../features/seller/AttributeFields';
import { useProductTypes } from '../features/seller/useProductTypes';
import {ProductReadiness} from '../features/seller/ProductReadiness';
import {ProductModerationNotice} from '../features/seller/ProductModerationNotice';
type SaleStatus='DRAFT'|'ACTIVE'|'STOPPED';
/**
 * Seller Product edit form.
 *
 * `updateProduct` now accepts the full payload, so the form sends `status` alongside
 * title/description and still relies on `expected_version` for optimistic concurrency: a stale tab
 * gets a 409 instead of silently overwriting a newer edit.
 */
export function ProductEdit(){
  const {id}=useParams();const cache=useQueryClient(),location=useLocation();const candidate=location.state?.returnTo;const returnTo=typeof candidate==='string'&&/^\/seller\/products(?:\?|$)/.test(candidate)?candidate:'/seller/products';
  const query=useQuery({queryKey:['own-store-product',id],queryFn:()=>callOperation('getOwnStoreProduct',{path:{id:id!}}),enabled:!!id,refetchOnWindowFocus:false});
  const types=useProductTypes();
  const productType=types.data?.find(type=>type.id===query.data?.product_type_id),axes=productType?.attribute_definitions.filter(definition=>definition.variant_axis) ?? [];
  const canAddVariant=!!productType&&(axes.length>0||query.data?.variants?.length===0)&&!types.error&&!types.isFetching;
  const [variantValues,setVariantValues]=useState<Record<string,unknown>>({});
  const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[status,setStatus]=useState<SaleStatus>('DRAFT'),[error,setError]=useState<unknown>(),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false);
  const [sku,setSku]=useState(''),[price,setPrice]=useState(''),[imageUrl,setImageUrl]=useState('');
  const [extraError,setExtraError]=useState<unknown>(),[extraBusy,setExtraBusy]=useState(false),[extraNotice,setExtraNotice]=useState('');
  const [uncertain,setUncertain]=useState(false);
  const [dirty,setDirty]=useState(false);useUnsavedChanges(dirty||!!sku||!!price||!!imageUrl||Object.keys(variantValues).length>0);
  const [needsReload,setNeedsReload]=useState(false);
  useEffect(()=>{if(query.data){if(dirty){setNeedsReload(true);return;}setTitle(query.data.title);setDescription(query.data.description??'');setStatus((query.data.status ?? 'DRAFT') as SaleStatus);}},[query.data?.id,query.data?.title,query.data?.description,query.data?.status]);
  async function submit(event:FormEvent){
    event.preventDefault();if(!query.data || !id || needsReload || extraBusy)return;setBusy(true);setError(undefined);setSaved(false);
    try{
      const product=await callOperation('updateProduct',{path:{id},body:{title,description,status,expected_version:query.data.version!}});
      setDirty(false);cache.setQueryData(['own-store-product',id],product);await Promise.all([cache.invalidateQueries({queryKey:['products']}),cache.invalidateQueries({queryKey:['own-store-products']})]);setSaved(true);
    }catch(e){if(e instanceof ApiError&&['INVALID_VARIANT_ATTRIBUTES','INVALID_ATTRIBUTES','INVALID_PRODUCT_TYPE'].includes(e.code))await types.refetch();if(isUncertainMutation(e)||(e instanceof ApiError&&e.code==='VERSION_CONFLICT'))setNeedsReload(true);setError(e);}finally{setBusy(false);}
  }
  async function addVariant(event:FormEvent){
    event.preventDefault();if(!id || extraBusy || uncertain || busy || !canAddVariant)return;setExtraBusy(true);setExtraError(undefined);setExtraNotice('');
    try{await callOperation('createVariant',{path:{id},body:{sku:sku.trim(),price_vnd:Number(price),variant_values:variantValues}});setSku('');setPrice('');setVariantValues({});void Promise.allSettled([cache.invalidateQueries({queryKey:['store-inventory']}),cache.invalidateQueries({queryKey:['own-store-products']})]);await query.refetch();setExtraNotice('Đã thêm biến thể. Nhập tồn kho trước khi bán.');}
    catch(e){if(e instanceof ApiError&&['INVALID_VARIANT_ATTRIBUTES','INVALID_PRODUCT_TYPE'].includes(e.code))await types.refetch();if(isUncertainMutation(e))setUncertain(true);setExtraError(e);}finally{setExtraBusy(false);}
  }
  async function addImage(event:FormEvent){
    event.preventDefault();if(!id || extraBusy || uncertain || busy)return;setExtraBusy(true);setExtraError(undefined);setExtraNotice('');
    try{await callOperation('addProductImage',{path:{id},body:{image_url:imageUrl.trim()}});setImageUrl('');await query.refetch();setExtraNotice('Đã thêm ảnh sản phẩm.');}
    catch(e){if(isUncertainMutation(e))setUncertain(true);setExtraError(e);}finally{setExtraBusy(false);}
  }
  async function removeImage(imageId:string){
    if(!id || extraBusy || uncertain)return;setExtraBusy(true);setExtraError(undefined);setExtraNotice('');
    try{await callOperation('removeProductImage',{path:{id,image_id:imageId}});const result=await query.refetch();if(result.error)throw result.error;await cache.invalidateQueries({queryKey:['products']});setExtraNotice('Đã bỏ ảnh sản phẩm.');}
    catch(e){setExtraError(e);}finally{setExtraBusy(false);}
  }
  async function moveImage(index:number,direction:-1|1){
    const images=query.data?.images ?? [],target=index+direction;
    if(!id || extraBusy || uncertain || target<0 || target>=images.length)return;
    const expected_image_ids=images.map(image=>image.id),image_ids=[...expected_image_ids];
    [image_ids[index],image_ids[target]]=[image_ids[target],image_ids[index]];
    setExtraBusy(true);setExtraError(undefined);setExtraNotice('');
    try{
      await callOperation('reorderProductImages',{path:{id},body:{expected_image_ids,image_ids}});
      const result=await query.refetch();if(result.error)throw result.error;
      await cache.invalidateQueries({queryKey:['products']});setExtraNotice('Đã cập nhật thứ tự ảnh.');
    }catch(e){
      if(isUncertainMutation(e))setUncertain(true);
      if(e instanceof ApiError && e.code==='IMAGE_ORDER_CONFLICT')await query.refetch();
      setExtraError(e);
    }finally{setExtraBusy(false);}
  }
  if(query.isLoading)return <><SellerSubNav /><Loading/></>;
  if(query.error)return <><SellerSubNav /><div style={{ marginBottom: '1rem' }}><Link to={returnTo}>← Quay lại danh sách sản phẩm</Link></div><ErrorView error={query.error}/></>;
  return <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1rem' }}>
    <SellerSubNav />
    {query.data&&<ProductModerationNotice product={query.data}/>}
    <div style={{ marginBottom: '1rem' }}>
      <Link to={returnTo} style={{ color: '#2563eb', textDecoration: 'underline' }}>
        ← Quay lại danh sách sản phẩm
      </Link>
    </div>
    <nav className="editor-sections" aria-label="Các phần sản phẩm"><a href="#product-general">Thông tin chung</a><a href="#product-attributes">Thuộc tính</a><a href="#product-variants">Biến thể & giá</a><a href="#product-images">Hình ảnh</a></nav>
    {query.data&&<ProductReadiness product={query.data}/>}
    <div id="product-general"><FormPanel title="Sửa sản phẩm" busy={busy} disabled={needsReload || extraBusy} error={error} onSubmit={submit}>
      <FormField label="Tên sản phẩm" name="title" error={error}><input value={title} onChange={e=>{setDirty(true);setTitle(e.target.value);}} required maxLength={200}/></FormField>
      <FormField label="Mô tả" name="description" error={error}><textarea value={description} onChange={e=>{setDirty(true);setDescription(e.target.value);}} maxLength={10000}/></FormField>
      <label>Trạng thái bán<select value={status} onChange={e=>{setDirty(true);setStatus(e.target.value as SaleStatus);}}>
        <option value="DRAFT">Nháp</option><option value="ACTIVE">Đang bán</option><option value="STOPPED">Dừng bán</option>
      </select></label>
    </FormPanel></div>
    {needsReload && <p role="alert">Chưa thể lưu tiếp từ dữ liệu cũ hoặc kết quả chưa rõ. Bản nháp vẫn giữ; tải lại sẽ thay bằng dữ liệu server, hãy kiểm tra trước khi chọn. <button type="button" onClick={()=>{void query.refetch().then(result=>{if(!result.error&&result.data){setDirty(false);setTitle(result.data.title);setDescription(result.data.description??'');setStatus(result.data.status as SaleStatus);setNeedsReload(false);setError(undefined);}});}}>Tải lại sản phẩm</button></p>}
    {saved && <p role="status">Đã lưu sản phẩm.</p>}
    <div id="product-attributes">{query.data && <ProductAttributesEditor key={`attributes:${query.data.id}`} product={query.data}/>}</div>
    <div id="product-variants">{query.data && <VariantEditor key={query.data.id} product={query.data} reload={async()=>{const result=await query.refetch();if(result.error)throw result.error;if(!result.data)throw new Error('Không thể tải sản phẩm.');return result.data;}}/>}</div>
    <section className="boot-card"><h2>Biến thể</h2>
      {query.data?.variants?.length ? <ul>{query.data.variants.map(variant=><li key={variant.id}>{variant.sku} · {variant.price_vnd.toLocaleString('vi-VN')} ₫ · {variant.status}</li>)}</ul> : <p>Chưa có biến thể.</p>}
      <p>Biến thể mới bắt đầu với tồn kho bằng 0. Các biến thể phải có tổ hợp thuộc tính khác nhau.</p>
      {types.error&&<ErrorView error={types.error} onRetry={()=>void types.refetch()}/>}
      <form onSubmit={addVariant}><label>SKU mới<input required value={sku} onChange={e=>setSku(e.target.value)} /></label><label>Giá bán (VNĐ)<input type="number" min="0" step="1" required value={price} onChange={e=>setPrice(e.target.value)} /></label>{axes.length?<AttributeFields definitions={axes} values={variantValues} onChange={setVariantValues} disabled={extraBusy||uncertain}/>:<p>Loại này không có trục phân loại. Sản phẩm dùng một phân loại tiêu chuẩn; sửa dòng hiện có thay vì tạo dòng trùng.</p>}<button disabled={extraBusy || uncertain || !canAddVariant}>Thêm biến thể</button></form>
    </section>
    <section id="product-images" className="boot-card"><h2>Ảnh sản phẩm</h2><div className="market-product-grid">{query.data?.images?.map((image,index)=><div key={image.id}><img src={image.image_url} alt={`Ảnh sản phẩm ${index+1}`} loading="lazy" style={{width:'100%',aspectRatio:'1',objectFit:'cover'}}/><button type="button" aria-label={`Đưa ảnh ${index+1} lên trước`} disabled={extraBusy || uncertain || index===0} onClick={()=>void moveImage(index,-1)}>←</button><button type="button" aria-label={`Đưa ảnh ${index+1} ra sau`} disabled={extraBusy || uncertain || index===query.data!.images!.length-1} onClick={()=>void moveImage(index,1)}>→</button><button type="button" aria-label={`Bỏ ảnh sản phẩm ${index+1}`} disabled={extraBusy || uncertain} onClick={()=>void removeImage(image.id)}>Bỏ ảnh</button></div>)}</div><form onSubmit={addImage}><label>Đường dẫn ảnh<input type="url" required value={imageUrl} onChange={e=>setImageUrl(e.target.value)}/></label><button disabled={extraBusy || uncertain}>Thêm ảnh</button></form></section>
    {uncertain && <p role="alert">Chưa xác định được kết quả thao tác. Hãy tải lại trang và kiểm tra dữ liệu trước khi thử lại.</p>}
    {extraError !== undefined && <ErrorView error={extraError}/>}{extraNotice && <p role="status">{extraNotice}</p>}
  </div>;
}
