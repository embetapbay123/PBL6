export interface ParcelAddress {
  name:string;
  phone:string;
  address:string;
}
export interface CreateParcel {
  client_reference:string;
  pickup:ParcelAddress;
  destination:ParcelAddress;
  cod_amount:number;
  contents:string;
  weight:number;
  handling_note?:string;
}
export interface DeliverySnapshot extends CreateParcel {
  tracking_code:string;
  status:string;
  version:number;
  courier_name:string|null;
  note:string|null;
  collected_vnd:number;
  remitted_at:string|null;
  updated_at:string;
}
export type DeliveryAction='ASSIGN'|'PICK_UP'|'TRANSIT'|'OUT_FOR_DELIVERY'|'DELIVER'|'FAIL'|'REDELIVER'|'RETURN'|'RECEIVE_RETURN'|'CANCEL'|'REMIT_COD';
export const deliveryTransitions:Partial<Record<DeliveryAction,{from:string[];to:string}>>={
  PICK_UP:{from:['READY_FOR_PICKUP'],to:'PICKED_UP'},
  TRANSIT:{from:['PICKED_UP'],to:'IN_TRANSIT'},
  OUT_FOR_DELIVERY:{from:['PICKED_UP','IN_TRANSIT'],to:'OUT_FOR_DELIVERY'},
  DELIVER:{from:['OUT_FOR_DELIVERY'],to:'DELIVERED'},
  FAIL:{from:['OUT_FOR_DELIVERY'],to:'DELIVERY_ATTEMPT_FAILED'},
  REDELIVER:{from:['DELIVERY_ATTEMPT_FAILED'],to:'IN_TRANSIT'},
  RETURN:{from:['DELIVERY_ATTEMPT_FAILED'],to:'RETURNING'},
  RECEIVE_RETURN:{from:['RETURNING'],to:'RETURNED'},
  CANCEL:{from:['READY_FOR_PICKUP'],to:'CANCELLED'},
};
