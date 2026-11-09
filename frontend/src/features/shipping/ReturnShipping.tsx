import {useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {callOperation} from '../../api/operations';
import type {ReturnRequest} from '../returns/ReturnRequestView';
import {ErrorView} from '../../bootstrap/components';
import {useAuth} from '../../api/auth-context';
import {ShippingTimeline,StoreShippingPanel} from './ShippingPanel';

export function useCustomerReturnShipping(request:ReturnRequest,enabled:boolean){
  const {session}=useAuth();
  return useQuery({
    queryKey:['return-shipping',session?.context?.user_id,request.id,request.version],
    queryFn:({signal})=>callOperation('getOwnShipping',{path:{id:request.order_id}},{signal}),
    enabled:enabled&&['GHN','PLATFORM'].includes(request.shipping_mode??''),
    refetchInterval:enabled&&['GHN','PLATFORM'].includes(request.shipping_mode??'')?30000:false,
  });
}

export function ReturnShipping({request,scope,refresh}:{request:ReturnRequest;scope:'CUSTOMER'|'STORE'|'ADMIN';refresh:()=>Promise<unknown>}){
  const {session}=useAuth();
  const order=useQuery({queryKey:['return-shipping-order',session?.context?.user_id,session?.context?.store_membership?.store_id,request.order_id,request.version],queryFn:({signal})=>callOperation('getStoreOrder',{path:{id:request.order_id}},{signal}),enabled:scope==='STORE'&&['GHN','PLATFORM'].includes(request.shipping_mode??'')});
  const own=useCustomerReturnShipping(request,scope==='CUSTOMER');
  const [carrier,setCarrier]=useState(''),[tracking,setTracking]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>();
  const operation=useRef<string|undefined>(undefined);
  const pickupOperation=useRef<{operation_id:string;expected_version:number}|undefined>(undefined);
  if(scope==='ADMIN'||!['GHN','PLATFORM'].includes(request.shipping_mode??''))return null;
  if(scope==='STORE'){
    if(order.error)return <ErrorView error={order.error} onRetry={()=>void order.refetch()}/>;
    if(!order.data)return null;
    return <StoreShippingPanel order={order.data} returnRequestId={request.id} exchangeReady={request.type==='EXCHANGE'&&request.status==='RECEIVED'&&request.exchange_status==='APPLIED'} onChanged={async()=>{await order.refetch();await refresh();}}/>;
  }
  const items=own.data?.items.filter(s=>s.return_request_id===request.id)??[];
  return <section className="shipping-panel"><h3>Gửi và nhận hàng trả / đổi</h3>
    {own.error&&<ErrorView error={own.error} onRetry={()=>void own.refetch()}/>}
    {items.map(s=><ShippingTimeline shipment={s} key={s.id}/>)}
    {own.data&&request.shipping_mode==='PLATFORM'&&request.status==='APPROVED'&&!items.some(s=>s.leg==='CUSTOMER_RETURN'&&!['CANCELLED','RETURNED'].includes(s.status))&&<div>
      {items.some(s=>s.leg==='CUSTOMER_RETURN'&&s.status==='RETURNED')&&<p role="status">Kiện đã trả lại bạn. Có thể đặt lấy lần nữa.</p>}
      <p>Đóng gói hàng. Delivery sẽ lấy tại địa chỉ nhận đơn.</p>
      <button disabled={busy} onClick={async()=>{
        if(busy)return;setBusy(true);setError(undefined);
        if(pickupOperation.current?.expected_version!==request.version)pickupOperation.current={operation_id:crypto.randomUUID(),expected_version:request.version};
        try{await callOperation('requestPlatformReturnPickup',{path:{id:request.id},body:pickupOperation.current});await own.refetch();await refresh();}
        catch(cause){setError(cause);}finally{setBusy(false);}
      }}>Đặt lịch</button>
    </div>}
    {own.data&&request.shipping_mode!=='PLATFORM'&&request.status==='APPROVED'&&!items.some(s=>s.leg==='CUSTOMER_RETURN')&&<form className="shipping-booking" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError(undefined);operation.current??=crypto.randomUUID();try{await callOperation('registerReturnShipping',{path:{id:request.id},body:{operation_id:operation.current,expected_version:request.version,carrier_name:carrier,tracking_code:tracking}});await own.refetch();await refresh();}catch(cause){setError(cause);}finally{setBusy(false);}}}>
      <p>Sau khi gửi trả, nhập hãng và mã vận đơn.</p>
      <label>Hãng giao hàng<input required maxLength={100} value={carrier} disabled={busy} onChange={e=>{setCarrier(e.target.value);operation.current=undefined;}}/></label>
      <label>Mã vận đơn gửi trả<input required maxLength={100} value={tracking} disabled={busy} onChange={e=>{setTracking(e.target.value);operation.current=undefined;}}/></label>
      <button disabled={busy}>Lưu vận đơn</button>
    </form>}
    {error!=null&&<ErrorView error={error}/>}
  </section>;
}
