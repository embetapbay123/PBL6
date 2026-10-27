import type { OperationOutputs } from '../api/operations.generated';
import { callOperation } from '../api/operations';
export type Definition=NonNullable<OperationOutputs['listProductTypes']['items'][number]['attribute_definitions']>[number];
export function definitionKey(d:Definition){
  return d.code??d.name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,200);
}
export function AttributeFields({definitions,value,change}:{definitions:Definition[];value:Record<string,unknown>;change:(value:Record<string,unknown>)=>void}){
  return <>{definitions.map(d=>{
    const key=definitionKey(d),current=value[key];
    const set=(v:unknown)=>{const next={...value};if(v==='')delete next[key];else next[key]=v;change(next)};
    return <label key={d.id??key}>{d.name}{d.required?' *':''}
      {d.data_type==='BOOLEAN'?<select required={d.required} value={current===undefined?'':String(current)} onChange={e=>set(e.target.value===''?'':e.target.value==='true')}><option value="">Chọn</option><option value="true">Có</option><option value="false">Không</option></select>
      :d.allowed_values?.length?<select required={d.required} value={String(current??'')} onChange={e=>set(d.data_type==='NUMBER'&&e.target.value!==''?Number(e.target.value):e.target.value)}><option value="">Chọn</option>{d.allowed_values.map(v=><option key={String(v)} value={String(v)}>{String(v)}</option>)}</select>
      :<input type={d.data_type==='NUMBER'?'number':'text'} step="any" required={d.required} value={String(current??'')} onChange={e=>set(d.data_type==='NUMBER'&&e.target.value!==''?Number(e.target.value):e.target.value)}/>}
    </label>
  })}</>;
}
export async function allProductTypes(){
  const items:OperationOutputs['listProductTypes']['items']=[];
  for(let page=1;page<=200;page++){
    const data=await callOperation('listProductTypes',{query:{page,size:100}});items.push(...data.items);
    if(items.length>=data.total)return items;
    if(!data.items.length)throw new Error('Không tải đủ loại sản phẩm.');
  }
  throw new Error('Danh sách loại sản phẩm vượt giới hạn tải.');
}
