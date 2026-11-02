import type {OperationOutputs} from '../../../shared/src/operations.generated';
import type {InventoryBalanceRow,StockMovementRow} from './inventory.repository';
import {inventoryIdentity} from './inventory.mapper';

type Result=OperationOutputs['getInventoryReconciliation'];
const balance=(quantity:number,reserved_quantity:number)=>({quantity,reserved_quantity,available_quantity:quantity-reserved_quantity});
const time=(value:Date|string)=>new Date(value).getTime();

/** A verified suffix can anchor a recent period without inventing older balances. */
export function reconcileInventory(current:InventoryBalanceRow,rows:StockMovementRow[],from:string,to:string,asOf:string):Result{
 const start=time(from),end=Math.min(time(to),time(asOf)),issues:Result['issues']=[];
 const trusted=rows.filter(row=>row.recorded_at!=null).sort((a,b)=>(a.inventory_version??-1)-(b.inventory_version??-1));
 const undated=rows.filter(row=>row.recorded_at==null),first=trusted[0];
 const totals={quantity_in:0,quantity_out:0,reserved_in:0,reserved_out:0,movement_count:0,undated_count:undated.length};
 let previous:StockMovementRow|undefined;
 for(const row of trusted){
  if([row.inventory_version,row.quantity_before,row.quantity_after,row.reserved_before,row.reserved_after,row.delta_reserved].some(v=>v==null))issues.push('CHECKPOINT_MISMATCH');
  else if(row.quantity_after! - row.quantity_before! !== row.delta_quantity
    || row.reserved_after! - row.reserved_before! !== row.delta_reserved
    || row.quantity_before! < row.reserved_before! || row.quantity_after! < row.reserved_after!)issues.push('CHECKPOINT_MISMATCH');
  if(previous){
   if(row.inventory_version!==previous.inventory_version!+1)issues.push('VERSION_GAP');
   if(row.quantity_before!==previous.quantity_after||row.reserved_before!==previous.reserved_after)issues.push('CHECKPOINT_MISMATCH');
   if(time(row.recorded_at!)<time(previous.recorded_at!))issues.push('TIME_ORDER_UNCERTAIN');
  }
  if(!Number.isFinite(time(row.recorded_at!))||time(row.recorded_at!)>time(asOf))issues.push('TIME_ORDER_UNCERTAIN');
  if(time(row.recorded_at!)>=start&&time(row.recorded_at!)<end){
   totals.quantity_in+=Math.max(row.delta_quantity,0);totals.quantity_out+=Math.max(-row.delta_quantity,0);
   totals.reserved_in+=Math.max(row.delta_reserved??0,0);totals.reserved_out+=Math.max(-(row.delta_reserved??0),0);totals.movement_count++;
  }
  previous=row;
 }
 const initialZero=first?.inventory_version===1&&first.quantity_before===0&&first.reserved_before===0&&undated.length===0;
 if(!first){
  if(current.version!==0||current.quantity!==0||current.reserved_quantity!==0)issues.push('NO_TRUSTED_HISTORY');
 }else{
  if(!initialZero&&start<time(first.recorded_at!))issues.push('LEGACY_PERIOD');
  if(previous!.inventory_version!==current.version)issues.push('VERSION_GAP');
  if(previous!.quantity_after!==current.quantity||previous!.reserved_after!==current.reserved_quantity)issues.push('CHECKPOINT_MISMATCH');
  // An undated row following the anchor cannot be silently moved outside the period.
  if(undated.some(row=>row.inventory_version!=null&&row.inventory_version>=first.inventory_version!))issues.push('VERSION_GAP');
 }
 const result:Result={...inventoryIdentity(current),variant_id:current.variant_id,from:new Date(from).toISOString(),to:new Date(to).toISOString(),as_of:asOf,effective_to:new Date(end).toISOString(),period_open:time(to)>time(asOf),timezone:'Asia/Ho_Chi_Minh',coverage:issues.length?'INCOMPLETE':'COMPLETE',issues:[...new Set(issues)],current:{...balance(current.quantity,current.reserved_quantity),version:current.version},totals,...(first?{coverage_from:new Date(first.recorded_at!).toISOString()}:{})};
 if(!issues.length){
  let q=first?.quantity_before??0,r=first?.reserved_before??0;
  for(const row of trusted)if(time(row.recorded_at!)<start){q+=row.delta_quantity;r+=row.delta_reserved!;}
  result.opening=balance(q,r);result.closing=balance(q+totals.quantity_in-totals.quantity_out,r+totals.reserved_in-totals.reserved_out);
 }
 return result;
}
