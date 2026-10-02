import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { callOperation } from '../api/operations';
import { ErrorView, FormPanel, Loading } from './components';
export function ProductEdit(){
  const {id}=useParams();const cache=useQueryClient();
  const query=useQuery({queryKey:['product',id],queryFn:()=>callOperation('getProduct',{path:{id:id!}}),enabled:!!id});
  const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[error,setError]=useState<unknown>(),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false);
  useEffect(()=>{if(query.data){setTitle(query.data.title);setDescription(query.data.description??'');}},[query.data]);
  async function submit(event:FormEvent){
    event.preventDefault();if(!query.data || !id)return;setBusy(true);setError(undefined);setSaved(false);
    try{
      const product=await callOperation('updateProduct',{path:{id},body:{title,description,expected_version:query.data.version!}});
      cache.setQueryData(['product',id],product);await cache.invalidateQueries({queryKey:['products']});setSaved(true);
    }catch(e){setError(e);}finally{setBusy(false);}
  }
  if(query.isLoading)return <Loading/>;if(query.error)return <ErrorView error={query.error}/>;
  return <><FormPanel title="Sửa sản phẩm" busy={busy} error={error} onSubmit={submit}>
    <label>Tên sản phẩm<input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={200}/></label>
    <label>Mô tả<textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={10000}/></label>
  </FormPanel>{saved && <p role="status">Đã lưu sản phẩm.</p>}</>;
}
