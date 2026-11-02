import {useRef,useState,type FormEvent} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useAuth} from '../../api/auth-context';
import {ApiError} from '../../api/client';
import {callOperation} from '../../api/operations';
import type {OperationInputs} from '../../api/operations.generated';
import {ErrorView,Loading} from '../../bootstrap/components';
import {useCommand} from '../../live/useLiveData';
import type {ReturnRequest} from './ReturnRequestView';
type Confirmation=OperationInputs['confirmCodRefund']['body'];
export function CodRefundForm({request,deliveryCase=false}:{request:Pick<ReturnRequest,'order_id'|'version'>;deliveryCase?:boolean}) {
  const {session}=useAuth(),member=session?.context?.store_membership,cache=useQueryClient(),command=useCommand();
  const owner=member?.role==='OWNER' && member.status==='ACTIVE';
  const key=`pbl6_cod_refund_${session?.context?.user_id}_${member?.store_id}_${request.order_id}`;
  const [saved]=useState<Confirmation|undefined>(()=>{try{const value=JSON.parse(sessionStorage.getItem(key)??'null');return value&&typeof value.operation_id==='string'&&typeof value.refunded_at==='string'&&typeof value.receipt_reference==='string'&&typeof value.recipient_name==='string'&&value.full_amount_confirmed===true&&Number.isInteger(value.expected_order_version)?value:undefined;}catch{return undefined;}});
  const pending=useRef<Confirmation|undefined>(saved),[uncertain,setUncertain]=useState(!!saved),[stale,setStale]=useState(false),[reference,setReference]=useState(saved?.receipt_reference??''),[recipient,setRecipient]=useState(saved?.recipient_name??''),[attested,setAttested]=useState(!!saved),[time,setTime]=useState('');
  const order=useQuery({queryKey:['cod-refund-order',request.order_id],enabled:owner,queryFn:()=>callOperation('getStoreOrder',{path:{id:request.order_id}})});
  const clear=()=>{try{sessionStorage.removeItem(key);}catch{/* keep memory */}};
  async function submit(event:FormEvent) {
    event.preventDefault();if(!owner||(!pending.current&&(!order.data||!attested||!time||!reference.trim()||!recipient.trim())))return;
    await command.run(async()=>{
      if(!pending.current)pending.current={operation_id:crypto.randomUUID(),expected_order_version:order.data!.version,...(deliveryCase?{expected_case_version:request.version}:{expected_return_version:request.version}),receipt_reference:reference.trim(),recipient_name:recipient.trim(),refunded_at:new Date(time).toISOString(),full_amount_confirmed:true};
      try{sessionStorage.setItem(key,JSON.stringify(pending.current));}catch{/* immutable in memory */}
      try{await callOperation('confirmCodRefund',{path:{id:request.order_id},body:pending.current});clear();setUncertain(false);pending.current=undefined;command.setNotice('Owner đã xác nhận thủ công hoàn đủ COD. Đây không phải xác minh từ ngân hàng.');await Promise.all([cache.invalidateQueries({queryKey:['delivery-returns']}),cache.invalidateQueries({queryKey:['return-requests']}),cache.invalidateQueries({queryKey:['store-orders']}),cache.invalidateQueries({queryKey:['cod-refund-order',request.order_id]})]);}
      catch(error){if(!(error instanceof ApiError)||error.status===0||error.status===408||error.status>=500)setUncertain(true);else{setStale(true);clear();}throw error;}
    });
  }
  async function reloadConfirmedState(){
    const result=await order.refetch();
    if(result.error){command.setError(result.error);return;}
    await Promise.all([cache.invalidateQueries({queryKey:['delivery-returns']}),cache.invalidateQueries({queryKey:['return-requests']})]);
    clear();pending.current=undefined;setUncertain(false);setStale(false);command.setError(undefined);
  }
  if(!owner)return <p>Chủ cửa hàng cần xác nhận thủ công khoản hoàn COD, kèm biên nhận và người nhận đủ tiền.</p>;
  if(order.data?.payment_status==='REFUNDED')return <p role="status">Đơn đã ghi nhận hoàn tiền. Đọc lại hồ sơ để theo dõi kết thúc; đây không phải xác minh ngân hàng.</p>;
  return <form onSubmit={submit} className="boot-card"><h3>Xác nhận hoàn COD thủ công</h3>
    <p>Chỉ xác nhận sau khi đã hoàn đủ khoản đã thu, gồm phí giao ban đầu. Không trừ phí gửi trả. Hệ thống ghi lời xác nhận của Owner, không xác minh ngân hàng.</p>
    {order.isPending?<Loading/>:order.error?<ErrorView error={order.error} onRetry={()=>void order.refetch()}/>:<p>Đơn {request.order_id} · Khoản cần đối chiếu: {order.data?.amounts.payable_vnd.toLocaleString('vi-VN')} ₫ · Thanh toán: {order.data?.payment_status}</p>}
    <fieldset disabled={command.busy||uncertain||stale}><label>Mã biên nhận<input required maxLength={200} value={reference} onChange={e=>setReference(e.target.value)}/></label><label>Người nhận tiền hoàn<input required maxLength={200} value={recipient} onChange={e=>setRecipient(e.target.value)}/></label><label>Thời điểm hoàn (giờ trên thiết bị)<input required type="datetime-local" step={1} value={time} onChange={e=>setTime(e.target.value)}/></label><label><input type="checkbox" required checked={attested} onChange={e=>setAttested(e.target.checked)}/>Tôi xác nhận người nhận đã nhận đủ khoản hoàn của chính đơn này.</label></fieldset>
    {saved&&uncertain&&<p>Biên nhận đang đối chiếu: {saved.receipt_reference}; thời điểm {new Date(saved.refunded_at).toLocaleString('vi-VN')}.</p>}
    {uncertain&&<p role="status">Chưa rõ kết quả. Thử lại giữ nguyên biên nhận và operation ID; không hoàn tiền lần nữa.</p>}
    {command.error!=null&&<ErrorView error={command.error}/>} {command.notice&&<p role="status">{command.notice}</p>}
    {stale?<><p>Cần đọc lại yêu cầu và payment trước khi xác nhận tiếp.</p><button type="button" disabled={command.busy} onClick={()=>void reloadConfirmedState()}>Đọc lại yêu cầu</button></>:<button disabled={command.busy||(!uncertain&&(!attested||!order.data||!time||!reference.trim()||!recipient.trim()))}>{uncertain?'Đối chiếu lại xác nhận cũ':'Xác nhận đã hoàn đủ COD'}</button>}
  </form>;
}
