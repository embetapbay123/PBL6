import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { callOperation } from '../api/operations';
import { ErrorView, FormPanel, Loading } from './components';
import { SellerSubNav } from '../live/SellerWorkspace';
import { useDurableOperation } from '../live/useDurableOperation';
import { AttributeFields,allProductTypes,definitionKey } from './ProductAttributes';

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
  const types=useQuery({queryKey:['product-types-all'],queryFn:allProductTypes});
  const command=useDurableOperation('createProduct');
  const [typeId,setTypeId]=useState(''),[title,setTitle]=useState(''),[description,setDescription]=useState(''),
    [status,setStatus]=useState<SaleStatus>('DRAFT'),[sku,setSku]=useState(''),[price,setPrice]=useState(''),
    [attributes,setAttributes]=useState<Record<string,unknown>>({}),
    [error,setError]=useState<unknown>(),[busy,setBusy]=useState(false);
  const selected=types.data?.find(item=>item.id===typeId);
  const definitions=selected?.attribute_definitions ?? [];

  async function submit(event:FormEvent){
    event.preventDefault();setBusy(true);setError(undefined);
    try{
      if(!command.pending && (!!sku.trim()!==!!price.trim()))throw new Error('Nhập cả SKU và giá cho biến thể đầu tiên.');
      const values=Object.fromEntries(definitions.filter(d=>d.variant_axis&&attributes[definitionKey(d)]!==undefined).map(d=>[definitionKey(d),attributes[definitionKey(d)]]));
      const variant=sku.trim()&&price.trim()
        ?[{sku:sku.trim(),price_vnd:Number(price),variant_values:values,is_default:true}] : undefined;
      const created=await command.run({body:{
        product_type_id:typeId,
        title:title.trim(),
        ...(description.trim()?{description:description.trim()}:{}),
        attributes,
        status:'DRAFT',
        ...(variant?{variants:variant}:{}),
      }});
      if(!created)return;
      cache.setQueryData(['managed-product',created.id],created);
      await cache.invalidateQueries({queryKey:['own-store-products']});
      navigate('/seller/products/'+created.id+'/edit');
    }catch(e){setError(e);}finally{setBusy(false);}
  }

  if(types.isLoading)return <Loading/>;
  if(types.error)return <ErrorView error={types.error}/>;
  return <><SellerSubNav/><FormPanel title="Tạo sản phẩm" busy={busy} error={error} onSubmit={submit}>
    {command.pending&&<p role="status">Lần gửi trước chưa rõ kết quả. Nhấn lưu để kiểm tra lại đúng yêu cầu; chưa tạo yêu cầu mới.</p>}
    <fieldset disabled={command.locked}>
    <label>Loại sản phẩm<select value={typeId} onChange={e=>{setTypeId(e.target.value);setAttributes({});}} required>
      <option value="">— Chọn loại —</option>
      {types.data?.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
    <label>Tên sản phẩm<input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={200}/></label>
    <label>Mô tả<textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={10000}/></label>
    <p>Sản phẩm được lưu nháp. Hoàn thiện phân loại và ảnh trước khi mở bán.</p>
    <AttributeFields definitions={definitions} value={attributes} change={setAttributes}/>
    <fieldset><legend>Biến thể đầu tiên (không bắt buộc)</legend>
      <label>SKU<input value={sku} onChange={e=>setSku(e.target.value)} maxLength={200}/></label>
      <label>Giá (VND)<input value={price} onChange={e=>setPrice(e.target.value)} inputMode="numeric" pattern="[0-9]*"/></label>
    </fieldset>
    </fieldset>
  </FormPanel></>;
}
