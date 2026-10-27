import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { callOperation } from '../api/operations';
import { ApiError } from '../api/client';
import { ErrorView, FormPanel, Loading } from './components';
import { SellerSubNav } from '../live/SellerWorkspace';
import { useDurableOperation } from '../live/useDurableOperation';
import { AttributeFields,allProductTypes } from './ProductAttributes';
type SaleStatus='DRAFT'|'ACTIVE'|'STOPPED';
/**
 * Seller Product edit form.
 *
 * `updateProduct` accepts the full payload, so the form sends `status` alongside title/description
 * and still relies on `expected_version` for optimistic concurrency: a stale tab gets a 409 instead
 * of silently overwriting a newer edit.
 *
 * The read is deliberately two-step. `getProduct` is the public route and only returns ACTIVE +
 * VISIBLE rows, so a DRAFT/STOPPED/HIDDEN Product is read back from `listOwnStoreProducts`, which is
 * scoped to the caller's Store. The contract has no single-Product management route yet; when the
 * Product is not in the scanned page the form says so instead of pretending the Product is gone.
 *
 * Variants and images are written through their own operations and the Product is refetched, so the
 * lists below always show what the server stored after a reload.
 */
export function ProductEdit(){
  const {id}=useParams();const cache=useQueryClient();
  const query=useQuery({queryKey:['managed-product',id],enabled:!!id,queryFn:()=>callOperation('getOwnStoreProduct',{path:{id:id!}})});
  const variantCommand=useDurableOperation('createVariant',id),imageCommand=useDurableOperation('addProductImage',id);
  const types=useQuery({queryKey:['product-types-all'],queryFn:allProductTypes});
  const definitions=types.data?.find(t=>t.id===query.data?.product_type_id)?.attribute_definitions??[];
  const [variantValues,setVariantValues]=useState<Record<string,unknown>>({});
  const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[status,setStatus]=useState<SaleStatus>('DRAFT'),[error,setError]=useState<unknown>(),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false);
  const [sku,setSku]=useState(''),[price,setPrice]=useState(''),[isDefault,setIsDefault]=useState(false),[variantError,setVariantError]=useState<unknown>(),[variantBusy,setVariantBusy]=useState(false),[variantSaved,setVariantSaved]=useState(false);
  const [imageUrl,setImageUrl]=useState(''),[imageError,setImageError]=useState<unknown>(),[imageBusy,setImageBusy]=useState(false),[imageSaved,setImageSaved]=useState(false);
  useEffect(()=>{if(query.data){setTitle(query.data.title);setDescription(query.data.description??'');setStatus((query.data.status ?? 'DRAFT') as SaleStatus);}},[query.data]);
  async function submit(event:FormEvent){
    event.preventDefault();if(!query.data || !id)return;setBusy(true);setError(undefined);setSaved(false);
    try{
      const product=await callOperation('updateProduct',{path:{id},body:{title,description,status,expected_version:query.data.version!}});
      cache.setQueryData(['managed-product',id],product);await cache.invalidateQueries({queryKey:['products']});await cache.invalidateQueries({queryKey:['own-store-products']});await query.refetch();setSaved(true);
    }catch(e){setError(e);}finally{setBusy(false);}
  }
  async function addVariant(event:FormEvent){
    event.preventDefault();if(!id)return;setVariantBusy(true);setVariantError(undefined);setVariantSaved(false);
    try{
      await variantCommand.run({path:{id},body:{sku:sku.trim(),price_vnd:Number(price),
        variant_values:variantValues,...(isDefault?{is_default:true}:{})}});
      setSku('');setPrice('');setIsDefault(false);setVariantSaved(true);await query.refetch();
    }catch(e){setVariantError(e);}finally{setVariantBusy(false);}
  }
  async function addImage(event:FormEvent){
    event.preventDefault();if(!id)return;setImageBusy(true);setImageError(undefined);setImageSaved(false);
    try{
      await imageCommand.run({path:{id},body:{image_url:imageUrl.trim()}});
      setImageUrl('');setImageSaved(true);await query.refetch();
    }catch(e){setImageError(e);}finally{setImageBusy(false);}
  }
  if(query.isLoading)return <><SellerSubNav /><Loading/></>;
  if(query.error)return <><SellerSubNav /><Link to="/seller/products">← Quay lại danh sách sản phẩm</Link><ErrorView error={query.error}/></>;
  return <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1rem' }}>
    <SellerSubNav />
    <Link to="/seller/products">← Quay lại danh sách sản phẩm</Link>
    <FormPanel title={`Sửa sản phẩm #${id}`} busy={busy} error={error} onSubmit={submit}>
      <p><small>Trạng thái hiện tại: {query.data?.status ?? '—'} · kiểm duyệt {query.data?.moderation_status ?? '—'} · version {query.data?.version ?? 0}</small></p>
      <label>Tên sản phẩm<input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={200}/></label>
      <label>Mô tả<textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={10000}/></label>
      <label>Trạng thái bán<select value={status} onChange={e=>setStatus(e.target.value as SaleStatus)}>
        <option value="DRAFT">Nháp</option><option value="ACTIVE">Đang bán</option><option value="STOPPED">Dừng bán</option>
      </select></label>
    </FormPanel>
    {saved && <p role="status">Đã lưu sản phẩm.</p>}

    <form className="boot-card" onSubmit={addVariant}>
      <h2>Biến thể</h2>
      {variantCommand.pending&&<p role="status">Lần thêm trước chưa rõ kết quả; nhấn thêm để kiểm tra lại cùng yêu cầu.</p>}
      <ul>{query.data?.variants?.map(variant=><li key={variant.id}>{variant.sku} · {variant.price_vnd.toLocaleString('vi-VN')} ₫ · {variant.status ?? 'ACTIVE'}{variant.is_default?' · mặc định':''}</li>)}</ul>
      {!query.data?.variants?.length && <p>Chưa có biến thể nào.</p>}
      <fieldset disabled={variantCommand.locked}>
      <AttributeFields definitions={definitions.filter(d=>d.variant_axis)} value={variantValues} change={setVariantValues}/>
      <label>SKU<input value={sku} onChange={e=>setSku(e.target.value)} required maxLength={200}/></label>
      <label>Giá (VND)<input value={price} onChange={e=>setPrice(e.target.value)} inputMode="numeric" pattern="[0-9]*" required/></label>
      <label><input type="checkbox" checked={isDefault} onChange={e=>setIsDefault(e.target.checked)}/> Đặt làm biến thể mặc định</label>
      </fieldset>
      <button disabled={variantBusy}>{variantBusy?'Đang thêm…':'Thêm biến thể'}</button>
      {variantError!=null && <ErrorView error={variantError}/>}
      {variantSaved && <p role="status">Đã thêm biến thể.</p>}
    </form>

    <form className="boot-card" onSubmit={addImage}>
      <h2>Ảnh</h2>
      {imageCommand.pending&&<p role="status">Lần thêm ảnh trước chưa rõ kết quả; nhấn thêm để kiểm tra lại cùng yêu cầu.</p>}
      <ul>{query.data?.images?.map(image=><li key={image.id}>{image.image_url} · vị trí {image.position ?? 0}</li>)}</ul>
      {!query.data?.images?.length && <p>Chưa có ảnh nào.</p>}
      <fieldset disabled={imageCommand.locked}><label>URL ảnh<input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} required maxLength={2048} type="url"/></label></fieldset>
      <small>Contract chỉ nhận `image_url`; chưa có upload tệp nên chưa kiểm định dạng/kích thước tệp.</small>
      <button disabled={imageBusy}>{imageBusy?'Đang thêm…':'Thêm ảnh'}</button>
      {imageError!=null && <ErrorView error={imageError}/>}
      {imageSaved && <p role="status">Đã thêm ảnh.</p>}
    </form>
  </div>;
}
