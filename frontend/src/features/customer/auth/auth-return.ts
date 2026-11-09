import {isBuyNow} from '../checkout-intent';
const key='pbl6_auth_return';
type AuthReturn={path:string;state?:{buyNow?:unknown;variant_id?:string};expired:boolean};
const safePath=(path:unknown):path is string=>typeof path==='string'&&/^\/products\/[a-f0-9-]{36}(\?[^#]*)?$|^\/(cart|checkout)(\?[^#]*)?$/i.test(path);
export function rememberAuthReturn(path:string,state?:{buyNow?:unknown;variant_id?:string}) {
  if(!safePath(path))return;
  try{
    sessionStorage.setItem(key,JSON.stringify({
      path,
      state:state ? {
        ...(state.buyNow&&isBuyNow(state.buyNow)?{buyNow:state.buyNow}:{}),
        ...(typeof state.variant_id==='string'?{variant_id:state.variant_id}:{})
      } : undefined,
      expires:Date.now()+30*60*1000
    }));
  }catch{/* The user can still navigate back manually. */}
}
export function takeAuthReturn():{path:string;state?:unknown}|undefined {
  const value=peekAuthReturn();clearAuthReturn();
  return value&&!value.expired?{path:value.path,state:value.state}:undefined;
}
export function clearAuthReturn(){try{sessionStorage.removeItem(key);}catch{/* Optional storage. */}}
export function peekAuthReturn():AuthReturn|undefined{
  try{
    const raw=sessionStorage.getItem(key);if(!raw)return;
    const value=JSON.parse(raw);
    if(!safePath(value.path)||!Number.isFinite(value.expires)){clearAuthReturn();return;}
    const expired=value.expires<=Date.now();
    return {
      path:value.path,
      expired,
      state:!expired&&value.state?{
        ...(value.state.buyNow&&isBuyNow(value.state.buyNow)?{buyNow:value.state.buyNow}:{}),
        ...(typeof value.state.variant_id==='string'?{variant_id:value.state.variant_id}:{})
      }:undefined
    };
  }catch{clearAuthReturn();return;}
}
