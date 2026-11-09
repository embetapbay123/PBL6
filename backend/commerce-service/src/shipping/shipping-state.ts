export const SYSTEM_ACTOR='00000000-0000-0000-0000-000000000000';
const statuses:Record<string,string>={
  ready_to_pick:'READY_FOR_PICKUP',picking:'READY_FOR_PICKUP',picked:'PICKED_UP',
  storing:'IN_TRANSIT',sorting:'IN_TRANSIT',transporting:'IN_TRANSIT',delivering:'OUT_FOR_DELIVERY',
  delivery_fail:'DELIVERY_ATTEMPT_FAILED',delivered:'DELIVERED',waiting_to_return:'RETURN_PENDING',
  return:'RETURNING',return_transporting:'RETURNING',return_sorting:'RETURNING',returning:'RETURNING',
  return_fail:'RETURN_ATTEMPT_FAILED',returned:'RETURNED',cancel:'CANCELLED',
  exception:'EXCEPTION',lost:'EXCEPTION',damage:'EXCEPTION',scrap:'EXCEPTION'
};
export const carrierStatus=(raw:string):string|undefined=>statuses[raw];
export const hasPickup=(status:string)=>['PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERY_ATTEMPT_FAILED','DELIVERED','RETURN_PENDING','RETURNING','RETURN_ATTEMPT_FAILED','RETURNED'].includes(status);
export const isReturning=(status:string)=>['RETURNING','RETURN_ATTEMPT_FAILED','RETURNED'].includes(status);
export function acceptsStatus(current:string,next:string,previousAt:Date|string|null,eventAt:Date):boolean {
  if(previousAt&&eventAt.getTime()<new Date(previousAt).getTime())return false;
  if(['DELIVERED','RETURNED','CANCELLED'].includes(current))return current===next;
  if(isReturning(current)&&!['RETURNING','RETURN_ATTEMPT_FAILED','RETURNED','EXCEPTION'].includes(next))return false;
  if(hasPickup(current)&&['READY_FOR_PICKUP','CANCELLED'].includes(next))return false;
  return true;
}
export function validTime(value:unknown):Date|undefined {
  if(typeof value!=='string'||!value.trim())return;
  const date=new Date(value);return Number.isFinite(date.getTime())?date:undefined;
}
