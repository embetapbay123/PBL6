import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { callOperation } from '../api/operations';
import { ErrorView, FormPanel, Loading } from './components';
type SaleStatus='DRAFT'|'ACTIVE'|'STOPPED';
/**
 * Seller Product edit form.
 *
 * `updateProduct` now accepts the full payload, so the form sends `status` alongside
 * title/description and still relies on `expected_version` for optimistic concurrency: a stale tab
 * gets a 409 instead of silently overwriting a newer edit.
 */
export function ProductEdit(){
  const {id}=useParams();const cache=useQueryClient();
  const query=useQuery({queryKey:['product',id],queryFn:()=>callOperation('getProduct',{path:{id:id!}}),enabled:!!id});
  const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[status,setStatus]=useState<SaleStatus>('DRAFT'),[error,setError]=useState<unknown>(),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false);
  useEffect(()=>{if(query.data){setTitle(query.data.title);setDescription(query.data.description??'');setStatus((query.data.status ?? 'DRAFT') as SaleStatus);}},[query.data]);
  async function submit(event:FormEvent){
    event.preventDefault();if(!query.data || !id)return;setBusy(true);setError(undefined);setSaved(false);
    try{
      const product=await callOperation('updateProduct',{path:{id},body:{title,description,status,expected_version:query.data.version!}});
      cache.setQueryData(['product',id],product);await cache.invalidateQueries({queryKey:['products']});setSaved(true);
    }catch(e){setError(e);}finally{setBusy(false);}
  }
  if(query.isLoading)return <Loading/>;if(query.error)return <ErrorView error={query.error}/>;
  return <><FormPanel title="Sửa sản phẩm" busy={busy} error={error} onSubmit={submit}>
    <label>Tên sản phẩm<input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={200}/></label>
    <label>Mô tả<textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={10000}/></label>
    <label>Trạng thái bán<select value={status} onChange={e=>setStatus(e.target.value as SaleStatus)}>
      <option value="DRAFT">Nháp</option><option value="ACTIVE">Đang bán</option><option value="STOPPED">Dừng bán</option>
    </select></label>
  </FormPanel>{saved && <p role="status">Đã lưu sản phẩm.</p>}</>;
}
