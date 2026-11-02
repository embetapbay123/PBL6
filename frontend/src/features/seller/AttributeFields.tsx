import type { OperationOutputs } from '../../api/operations.generated';
import {Fragment,useId} from 'react';

export type AttributeDefinition = OperationOutputs['listProductTypes']['items'][number]['attribute_definitions'][number];
export type AttributeValues = Record<string, unknown>;

export function unknownAttributeKeys(definitions:AttributeDefinition[],values:AttributeValues){return Object.keys(values).filter(code=>!definitions.some(d=>d.code===code));}

export function attributeProblemCodes(definitions:AttributeDefinition[],values:AttributeValues):string[]{
  return [...unknownAttributeKeys(definitions,values),...definitions.filter(d=>{
    const value=values[d.code];return d.required&&(value===undefined||value===null||typeof value==='string'&&!value.trim())||!!existingValueProblem(d,value);
  }).map(d=>d.code)];
}

function existingValueProblem(definition:AttributeDefinition,value:unknown):string|undefined{
  if(value===undefined||value==='')return;
  if(value===null)return 'Giá trị cũ không có kiểu dữ liệu phù hợp. Nhập lại hoặc bỏ thuộc tính tùy chọn.';
  const kind=definition.data_type.toUpperCase();
  if(typeof value==='string'&&!value.trim())return 'Giá trị không được chỉ có khoảng trắng.';
  if(kind==='NUMBER'&&(typeof value!=='number'||!Number.isFinite(value))||kind==='BOOLEAN'&&typeof value!=='boolean'||['STRING','TEXT'].includes(kind)&&typeof value!=='string')return 'Giá trị cũ có kiểu dữ liệu khác cấu hình. Nhập lại giá trị phù hợp.';
  if(definition.allowed_values?.length&&!definition.allowed_values.includes(String(value)))return 'Giá trị cũ không còn trong lựa chọn được phép. Chọn lại trước khi lưu.';
}

export function AttributeFields({definitions,values,onChange,disabled=false,preserveHistorical=false}:{definitions:AttributeDefinition[];values:AttributeValues;onChange:(values:AttributeValues)=>void;disabled?:boolean;preserveHistorical?:boolean}) {
  const baseId=useId(),unknown=unknownAttributeKeys(definitions,values);
  function set(code:string,value:unknown) {
    const next={...values};
    if(value===undefined)delete next[code];else next[code]=value;
    onChange(next);
  }
  return <>{definitions.map(definition=>{
    const value=values[definition.code],kind=definition.data_type.toUpperCase();
    const text=value===undefined || value===null ? '' : String(value);
    const options=definition.allowed_values ?? [];
    const label=definition.name+(definition.unit ? ` (${definition.unit})` : '')+(definition.required ? ' *' : ''),problem=existingValueProblem(definition,value),errorId=baseId+'-'+definition.code+'-error';
    const control={disabled,required:!preserveHistorical&&definition.required,'aria-invalid':problem?true:undefined,'aria-describedby':problem?errorId:undefined,ref:(node:HTMLInputElement|HTMLSelectElement|null)=>{node?.setCustomValidity(preserveHistorical?'':problem??'');}};
    return <Fragment key={definition.code}><label>{label}
      {options.length ? <select {...control} value={text} onChange={event=>set(definition.code,event.target.value===''?undefined:kind==='NUMBER'?Number(event.target.value):kind==='BOOLEAN'?event.target.value==='true':event.target.value)}><option value="">Chọn giá trị</option>{text&&!options.includes(text)&&<option disabled value={text}>{text} (giá trị cũ chưa hợp lệ)</option>}{options.map(option=><option key={option} value={option}>{option}</option>)}</select>
      : kind==='BOOLEAN' ? <select {...control} value={text} onChange={event=>set(definition.code,event.target.value===''?undefined:event.target.value==='true')}><option value="">Chọn giá trị</option><option value="true">Có</option><option value="false">Không</option></select>
      : typeof value==='object' && value!==null ? <textarea disabled={disabled} aria-invalid={problem?true:undefined} aria-describedby={problem?errorId:undefined} readOnly value={JSON.stringify(value,null,2)}/>
      : <input {...control} type={kind==='NUMBER'?'number':'text'} step={kind==='NUMBER'?'any':undefined} maxLength={kind==='NUMBER'?undefined:200} value={text} onChange={event=>set(definition.code,event.target.value===''?undefined:kind==='NUMBER'?Number(event.target.value):event.target.value)}/>}
    </label>{problem&&<p role="alert" id={errorId}>{problem}{!preserveHistorical&&<button type="button" disabled={disabled} onClick={()=>set(definition.code,undefined)}>Nhập lại {definition.name}</button>}</p>}</Fragment>;
  })}{unknown.length>0&&<section aria-label="Thuộc tính ngoài cấu hình"><p role="alert">Các thuộc tính dưới đây không còn trong cấu hình. Kiểm tra rồi xóa có chủ đích trước khi lưu dữ liệu mới. Dòng dừng bán chưa đổi thuộc tính có thể giữ dữ liệu cũ.</p>{unknown.map(code=><div key={code}><code>{code}</code><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(values[code],null,2)}</pre><button type="button" disabled={disabled} onClick={()=>set(code,undefined)}>Xóa thuộc tính {code}</button></div>)}</section>}</>;
}
