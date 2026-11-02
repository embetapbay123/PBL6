import type {OperationOutputs} from '../api/operations.generated';
import {variantCanOrder} from './variant-availability';
import {variantLabel} from './variant-identity';
type Variant=NonNullable<OperationOutputs['getProduct']['variants']>[number];
export function VariantPicker({variants,axes,value,disabled,onChange}:{variants:Variant[];axes?:{code:string;name:string}[];value:string;disabled:boolean;onChange:(id:string)=>void}){
 const current=variants.find(v=>v.id===value),groups=(axes??[]).filter(axis=>variants.some(v=>v.variant_values[axis.code]!==undefined));
 if(!groups.length)return variants.length>1?<div className="purchase-variants" aria-label="Chọn phân loại">{variants.map(v=><button type="button" key={v.id} disabled={disabled||!variantCanOrder(v)} aria-pressed={value===v.id} onClick={()=>onChange(v.id!)}>{variantLabel(v.variant_values)}{!variantCanOrder(v)?' · Hết hàng':''}</button>)}</div>:null;
 return <div className="variant-picker">{groups.map((axis,index)=>{
  const standardSizes=['XXS','XS','S','M','L','XL','XXL','XXXL'],defaultValue=String(variants.find(v=>v.is_default)?.variant_values[axis.code]??'');
  const options=[...new Set(variants.map(v=>v.variant_values[axis.code]).filter(v=>v!==undefined&&v!==null).map(String))].sort((a,b)=>standardSizes.includes(a)&&standardSizes.includes(b)?standardSizes.indexOf(a)-standardSizes.indexOf(b):a===defaultValue?-1:b===defaultValue?1:a.localeCompare(b,'vi'));
  return <fieldset key={axis.code} data-variant-axis={axis.code} disabled={disabled}><legend>{axis.name}<strong>{String(current?.variant_values[axis.code]??'Chưa chọn')}</strong></legend><div className="variant-options">{options.map(option=>{
   const candidates=variants.filter(v=>String(v.variant_values[axis.code])===option&&groups.slice(0,index).every(a=>v.variant_values[a.code]===current?.variant_values[a.code]));
   const available=candidates.filter(variantCanOrder);
   const score=(v:Variant)=>groups.reduce((n,a)=>n+Number(v.variant_values[a.code]===current?.variant_values[a.code]),0);
   const next=[...available].sort((a,b)=>score(b)-score(a))[0];
   return <button type="button" key={option} aria-pressed={String(current?.variant_values[axis.code])===option} aria-label={axis.name+' '+option+(!next?' · Hết hàng':'')} disabled={disabled||!next} title={!next?'Phân loại này hiện hết hàng':undefined} onClick={()=>next?.id&&onChange(next.id)}>{option}{!next&&<small>Hết hàng</small>}</button>;
  })}</div></fieldset>;
 })}</div>;
}
