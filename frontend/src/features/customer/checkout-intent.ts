import type {OperationInputs} from '../../api/operations.generated';
export type BuyNowSelection=Extract<OperationInputs['quoteCheckout']['body'],{source:'BUY_NOW'}>['buy_now'];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isBuyNow(value:unknown):value is BuyNowSelection {
  const line=value as BuyNowSelection|null;
  return !!line&&uuid.test(line.product_id)&&uuid.test(line.variant_id)&&Number.isSafeInteger(line.quantity)&&line.quantity>=1&&line.quantity<=2147483647;
}
const intentLifetime=30*60*1000;
export function checkoutState(user:string,selection:{buyNow:BuyNowSelection}|{cartItemIds:string[]}){return {...selection,checkoutUserId:user,checkoutExpiresAt:Date.now()+intentLifetime};}
export function ownsCheckoutState(user:string|undefined,state:unknown):boolean {
  const value=state as {checkoutUserId?:unknown;checkoutExpiresAt?:unknown}|null;
  return !!user&&value?.checkoutUserId===user&&typeof value.checkoutExpiresAt==='number'&&Number.isFinite(value.checkoutExpiresAt)&&value.checkoutExpiresAt>Date.now();
}
export function checkoutAddressState(user:string,addressId:string){return {checkoutUserId:user,checkoutExpiresAt:Date.now()+intentLifetime,checkoutAddressId:addressId};}
export function readCheckoutAddress(user:string|undefined,state:unknown):string|undefined{
 const value=state as {checkoutAddressId?:unknown}|null;
 return ownsCheckoutState(user,state)&&typeof value?.checkoutAddressId==='string'&&uuid.test(value.checkoutAddressId)?value.checkoutAddressId:undefined;
}
export function saveBuyNow(user:string,line:BuyNowSelection){const state=checkoutState(user,{buyNow:line});try{sessionStorage.setItem('pbl6_buy_now_'+user,JSON.stringify(state));}catch{/* Router state still carries this intent. */}return state;}
export function readBuyNow(user?:string,state?:unknown):BuyNowSelection|undefined {
  const route=state as {buyNow?:unknown;cartItemIds?:unknown;checkoutUserId?:unknown}|undefined;
  // History state survives an auth/cache reset. Never adopt another user's intent.
  if(route?.checkoutUserId!==undefined&&!ownsCheckoutState(user,route))return;
  if(Array.isArray(route?.cartItemIds))return;
  if(ownsCheckoutState(user,route)&&isBuyNow(route?.buyNow))return route.buyNow;
  if(!user)return;
  try{const value=JSON.parse(sessionStorage.getItem('pbl6_buy_now_'+user)??'null');return ownsCheckoutState(user,value)&&isBuyNow(value?.buyNow)?value.buyNow:undefined;}catch{return;}
}
export function clearBuyNow(user?:string){try{if(user)sessionStorage.removeItem('pbl6_buy_now_'+user);}catch{/* Optional storage. */}}
export {variantLabel} from '../../components/variant-identity';
