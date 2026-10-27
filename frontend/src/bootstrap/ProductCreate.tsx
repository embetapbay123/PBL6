import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { callOperation } from '../api/operations';
import { ErrorView, FormPanel, Loading } from './components';

/**
 * Seller create form.
 *
 * The Product type decides which attributes exist, so the fields are built from the selected type
 * rather than hardcoded. `createProduct` refuses an attribute map that does not match the taxonomy,
 * and this form therefore sends exactly the definitions it renders.
 *
 * The attribute key is derived from the definition name the same way the server derives
 * `attribute_definition.code` (`snake_case`), because the public `AttributeDefinition` projection
 * does not expose `code`. Exposing it is a contract change worth making; until then this keeps the
 * form usable instead of pretending attributes cannot be edited.
 */
type SaleStatus='DRAFT'|'ACTIVE'|'STOPPED';
const attributeKey=(name:string)=>name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d')
  .toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,200)||'attribute';

export function ProductCreate(){
  const navigate=useNavigate();const cache=useQueryClient();
  const types=useQuery({queryKey:['product-types'],queryFn:()=>callOperation('listProductTypes',{query:{page:1,size:50}})});
  const [typeId,setTypeId]=useState(''),[title,setTitle]=useState(''),[description,setDescription]=useState(''),
    [status,setStatus]=useState<SaleStatus>('DRAFT'),[sku,setSku]=useState(''),[price,setPrice]=useState(''),
    [attributes,setAttributes]=useState<Record<string,string>>({}),
    [error,setError]=useState<unknown>(),[busy,setBusy]=useState(false);
  const selected=types.data?.items.find(item=>item.id===typeId);
  const definitions=selected?.attribute_definitions ?? [];

  async function submit(event:FormEvent){
    event.preventDefault();setBusy(true);setError(undefined);
    try{
      const variant=sku.trim()&&price.trim()
        ?[{sku:sku.trim(),price_vnd:Number(price),variant_values:{},is_default:true}] : undefined;
      const created=await callOperation('createProduct',{body:{
        product_type_id:typeId,
        title:title.trim(),
        ...(description.trim()?{description:description.trim()}:{}),
        attributes,
        status,
        ...(variant?{variants:variant}:{}),
      }});
      await cache.invalidateQueries({queryKey:['own-store-products']});
      navigate('/seller/products/'+created.id+'/edit');
    }catch(e){setError(e);}finally{setBusy(false);}
  }

  if(types.isLoading)return <Loading/>;
  if(types.error)return <ErrorView error={types.error}/>;
  return <><FormPanel title="Tạo sản phẩm" busy={busy} error={error} onSubmit={submit}>
    <label>Loại sản phẩm<select value={typeId} onChange={e=>{setTypeId(e.target.value);setAttributes({});}} required>
      <option value="">— Chọn loại —</option>
      {types.data?.items.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
    <label>Tên sản phẩm<input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={200}/></label>
    <label>Mô tả<textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={10000}/></label>
    <label>Trạng thái bán<select value={status} onChange={e=>setStatus(e.target.value as SaleStatus)}>
      <option value="DRAFT">Nháp</option><option value="ACTIVE">Đang bán</option><option value="STOPPED">Dừng bán</option>
    </select></label>
    {definitions.map(definition=><label key={definition.id}>{definition.name}{definition.required?' *':''}
      <input value={attributes[attributeKey(definition.name)] ?? ''} required={definition.required}
        onChange={e=>setAttributes({...attributes,[attributeKey(definition.name)]:e.target.value})}/>
    </label>)}
    <fieldset><legend>Biến thể đầu tiên (không bắt buộc)</legend>
      <label>SKU<input value={sku} onChange={e=>setSku(e.target.value)} maxLength={200}/></label>
      <label>Giá (VND)<input value={price} onChange={e=>setPrice(e.target.value)} inputMode="numeric" pattern="[0-9]*"/></label>
    </fieldset>
  </FormPanel></>;
}
