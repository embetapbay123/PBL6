import type { OperationOutputs } from '../../../shared/src/operations.generated';
export function shipmentView(row:any):OperationOutputs['getOwnOrder']['shipment'] {
  if(!row)return undefined;
  const result:any={status:row.status,source:row.source??'LEGACY'};
  for(const key of ['carrier_name','tracking_code','dispatch_note','delivery_note','dispatched_by','delivered_by'])if(row[key]!=null)result[key]=row[key];
  for(const key of ['shipped_at','delivered_at'])if(row[key]!=null)result[key]=new Date(row[key]).toISOString();
  return result;
}
