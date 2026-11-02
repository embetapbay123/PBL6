import type {OperationOutputs} from '../../../shared/src/operations.generated';
type Policy=NonNullable<OperationOutputs['getOwnOrder']['return_policy_snapshot']>;
// Unknown/partial historical JSON is not evidence that the new policy was accepted.
export function readReturnPolicy(value:unknown):Policy|undefined {
 if(!value||typeof value!=='object'||Array.isArray(value))return;
 const row=value as Record<string,any>,address=row.return_address;
 if(row.version!=='PLATFORM_2026_10_30'||row.window_hours!==168||row.full_refund_includes_original_shipping!==true||row.fault_fee_rule!=='STORE_IF_STORE_FAULT_CUSTOMER_IF_CHANGE_OF_MIND_ADMIN_IF_DISPUTED'||!address||typeof address!=='object'||Array.isArray(address))return;
 if(['recipient_name','phone','line1','ward','district','city'].some(key=>typeof address[key]!=='string'||!address[key].trim()))return;
 return {version:'PLATFORM_2026_10_30',window_hours:168,full_refund_includes_original_shipping:true,fault_fee_rule:'STORE_IF_STORE_FAULT_CUSTOMER_IF_CHANGE_OF_MIND_ADMIN_IF_DISPUTED',return_address:{recipient_name:address.recipient_name,phone:address.phone,line1:address.line1,ward:address.ward,district:address.district,city:address.city}};
}
