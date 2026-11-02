import {isBuyNow} from '../checkout-intent';
const key='pbl6_auth_return';
type AuthReturn={path:string;state?:{buyNow:unknown};expired:boolean};
const safePath=(path:unknown):path is string=>typeof path==='string'&&/^\/products\/[a-f0-9-]{36}$|^\/(cart|checkout)$/i.test(path);
export function rememberAuthReturn(path:string,state?:{buyNow?:unknown}) {
  if(!safePath(path))return;
  try{sessionStorage.setItem(key,JSON.stringify({path,state:state?.buyNow&&isBuyNow(state.buyNow)?{buyNow:state.buyNow}:undefined,expires:Date.now()+30*60*1000}));}catch{/* The user can still navigate back manually. */}
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
    return {path:value.path,expired,state:!expired&&isBuyNow(value.state?.buyNow)?{buyNow:value.state.buyNow}:undefined};
  }catch{clearAuthReturn();return;}
}
