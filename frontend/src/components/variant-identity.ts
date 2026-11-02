/** JSON object key order can differ across HTTP and PostgreSQL JSONB. Never use it as an axis order. */
export function variantLabel(values?:Record<string,unknown>,fallback='Phân loại tiêu chuẩn'){
 const parts=Object.entries(values??{}).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([,value])=>value)
  .filter(value=>value!==null&&value!==undefined&&(typeof value!=='string'||value.trim()!==''))
  .map(value=>typeof value==='object'?JSON.stringify(value):String(value));
 return parts.join(' / ')||fallback;
}
