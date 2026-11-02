import {callOperation} from '../../api/operations';
import {ApiError} from '../../api/client';
import type {OperationOutputs} from '../../api/operations.generated';
type Address=OperationOutputs['listAddresses']['items'][number]&{id:string};
/** Never present the first page as the entire address book. Checkout validates the selection again. */
export async function readAddressBook():Promise<Address[]>{
 const rows=new Map<string,Address>();let total=0;
 for(let page=1;page<=100;page++){
  const result=await callOperation('listAddresses',{query:{page,size:100}});total=result.total;
  for(const item of result.items){
   if(typeof item.id!=='string'||!item.id)throw new ApiError(503,'ADDRESS_BOOK_INVALID','Sổ địa chỉ thiếu mã nhận diện. Hãy tải lại trước khi chọn địa chỉ giao hàng.');
   rows.set(item.id,{...item,id:item.id});
  }
  if(rows.size>=total)return [...rows.values()];
  if(result.items.length===0)break;
 }
 throw new ApiError(503,'ADDRESS_BOOK_INCOMPLETE','Chưa đọc đủ sổ địa chỉ. Hãy tải lại trước khi chọn địa chỉ giao hàng.');
}
