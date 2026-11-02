type Variant={status?:string;available_quantity?:number};
export function availableUnits(variant?:Variant):number|undefined{
 const value=variant?.available_quantity;
 return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:undefined;
}
export function variantCanOrder(variant:Variant){return variant.status==='ACTIVE'&&availableUnits(variant)!==0;}
export function variantAxisDescription(values:Record<string,unknown>|undefined,axes:readonly {code:string;name:string}[]|undefined){
 return [...(axes??[])].sort((a,b)=>a.code<b.code?-1:a.code>b.code?1:0).filter(axis=>values?.[axis.code]!==undefined&&values[axis.code]!==null).map(axis=>axis.name+': '+String(values![axis.code])).join(' · ');
}
