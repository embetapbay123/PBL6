import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { callOperation } from '../api/operations';
import { ErrorView, FormPanel, Loading } from './components';
type SaleStatus='DRAFT'|'ACTIVE'|'STOPPED';
/**
 * Seller Product edit form.
 *
 * `updateProduct` accepts the full payload, so the form sends `status` alongside title/description
 * and still relies on `expected_version` for optimistic concurrency: a stale tab gets a 409 instead
 * of silently overwriting a newer edit.
 *
 * Variants and images are added through their own operations. Both invalidate the Product query so
 * the lists below always come from the server rather than from a locally patched copy.
 */
export function ProductEdit(){
  const {id}=useParams();const cache=useQueryClient();
  const query=useQuery({queryKey:['product',id],queryFn:()=>callOperation('getProduct',{path:{id:id!}}),enabled:!!id});
  const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[status,setStatus]=useState<SaleStatus>('DRAFT'),[error,setError]=useState<unknown>(),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false);
  const [sku,setSku]=useState(''),[price,setPrice]=useState(''),[variantError,setVariantError]=useState<unknown>(),[variantBusy,setVariantBusy]=useState(false),[variantSaved,setVariantSaved]=useState(false);
  const [imageUrl,setImageUrl]=useState(''),[imageError,setImageError]=useState<unknown>(),[imageBusy,setImageBusy]=useState(false),[imageSaved,setImageSaved]=useState(false);
  useEffect(()=>{if(query.data){setTitle(query.data.title);setDescription(query.data.description??'');setStatus((query.data.status ?? 'DRAFT') as SaleStatus);}},[query.data]);
  async function submit(event:FormEvent){
    event.preventDefault();if(!query.data || !id)return;setBusy(true);setError(undefined);setSaved(false);
    try{
      const product=await callOperation('updateProduct',{path:{id},body:{title,description,status,expected_version:query.data.version!}});
      cache.setQueryData(['product',id],product);await cache.invalidateQueries({queryKey:['products']});setSaved(true);
    }catch(e){setError(e);}finally{setBusy(false);}
  }
  async function addVariant(event:FormEvent){
    event.preventDefault();if(!id)return;setVariantBusy(true);setVariantError(undefined);setVariantSaved(false);
    try{
      await callOperation('createVariant',{path:{id},body:{sku:sku.trim(),price_vnd:Number(price),variant_values:{}}});
      setSku('');setPrice('');setVariantSaved(true);await query.refetch();
    }catch(e){setVariantError(e);}finally{setVariantBusy(false);}
  }
  async function addImage(event:FormEvent){
    event.preventDefault();if(!id)return;setImageBusy(true);setImageError(undefined);setImageSaved(false);
    try{
      await callOperation('addProductImage',{path:{id},body:{image_url:imageUrl.trim()}});
      setImageUrl('');setImageSaved(true);await query.refetch();
    }catch(e){setImageError(e);}finally{setImageBusy(false);}
  }
  if(query.isLoading)return <Loading/>;if(query.error)return <ErrorView error={query.error}/>;
  return <>
    <FormPanel title="Sửa sản phẩm" busy={busy} error={error} onSubmit={submit}>
      <label>Tên sản phẩm<input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={200}/></label>
      <label>Mô tả<textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={10000}/></label>
      <label>Trạng thái bán<select value={status} onChange={e=>setStatus(e.target.value as SaleStatus)}>
        <option value="DRAFT">Nháp</option><option value="ACTIVE">Đang bán</option><option value="STOPPED">Dừng bán</option>
      </select></label>
    </FormPanel>
    {saved && <p role="status">Đã lưu sản phẩm.</p>}

    <form className="boot-card" onSubmit={addVariant}>
      <h2>Biến thể</h2>
      <ul>{query.data?.variants?.map(variant=><li key={variant.id}>{variant.sku} · {variant.price_vnd.toLocaleString('vi-VN')} ₫ · {variant.status ?? 'ACTIVE'}</li>)}</ul>
      {!query.data?.variants?.length && <p>Chưa có biến thể nào.</p>}
      <label>SKU<input value={sku} onChange={e=>setSku(e.target.value)} required maxLength={200}/></label>
      <label>Giá (VND)<input value={price} onChange={e=>setPrice(e.target.value)} inputMode="numeric" pattern="[0-9]*" required/></label>
      <button disabled={variantBusy}>{variantBusy?'Đang thêm…':'Thêm biến thể'}</button>
      {variantError!=null && <ErrorView error={variantError}/>}
      {variantSaved && <p role="status">Đã thêm biến thể.</p>}
    </form>

    <form className="boot-card" onSubmit={addImage}>
      <h2>Ảnh</h2>
      <ul>{query.data?.images?.map(image=><li key={image.id}>{image.image_url} · vị trí {image.position ?? 0}</li>)}</ul>
      {!query.data?.images?.length && <p>Chưa có ảnh nào.</p>}
      <label>URL ảnh<input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} required maxLength={2048} type="url"/></label>
      <button disabled={imageBusy}>{imageBusy?'Đang thêm…':'Thêm ảnh'}</button>
      {imageError!=null && <ErrorView error={imageError}/>}
      {imageSaved && <p role="status">Đã thêm ảnh.</p>}
    </form>
  </>;
}
