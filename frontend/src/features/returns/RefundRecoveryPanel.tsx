import {useEffect,useState,useId} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useAuth} from '../../api/auth-context';
import {ApiError} from '../../api/client';
import {callOperation} from '../../api/operations';
import type {OperationInputs} from '../../api/operations.generated';
import {ErrorView,Loading} from '../../bootstrap/components';
import {CaseFeedback,useCaseCommand} from './DeliveryReturnsPage';
type Scope='STORE'|'ADMIN';
type Command=OperationInputs['requestStoreRefundRecovery']['body'];
export function RefundRecoveryPanel({orderId,scope,awaitingRequest=false}:{orderId:string;scope:Scope;awaitingRequest?:boolean}){
 const noteId=useId();
 const {session}=useAuth(),member=session?.context?.store_membership;
 const allowed=scope==='ADMIN'?session?.context?.roles.includes('ADMIN')&&session.context.role_permissions?.includes('platform.admin'):session?.context?.roles.includes('STORE_OWNER')&&member?.role==='OWNER'&&member.status==='ACTIVE';
 const cache=useQueryClient(),command=useCaseCommand<Command>(`pbl6_refund_recovery_${session?.context?.user_id}_${member?.store_id??'none'}_${scope}_${orderId}`),[note,setNote]=useState(command.saved?.note??''),[polling,setPolling]=useState(true);
 useEffect(()=>{if(!polling)return;const timer=setTimeout(()=>setPolling(false),60000);return()=>clearTimeout(timer);},[polling]);
 const data=useQuery({queryKey:['refund-recovery',session?.context?.user_id,member?.store_id,scope,orderId],enabled:!!allowed,retry:false,refetchOnWindowFocus:false,
  queryFn:({signal})=>callOperation(scope==='ADMIN'?'getAdminRefundRecovery':'getStoreRefundRecovery',{path:{id:orderId}},{signal}),
  refetchInterval:q=>polling&&(q.state.data&&['REQUESTED','PROCESSING','UNKNOWN'].includes(q.state.data.status)||awaitingRequest&&q.state.error instanceof ApiError&&q.state.error.status===404)?3000:false});
 const status=data.data?.status;
 useEffect(()=>{if(status==='SUCCEEDED')void Promise.all([cache.invalidateQueries({queryKey:['return-requests']}),cache.invalidateQueries({queryKey:['delivery-returns']}),cache.invalidateQueries({queryKey:['after-sale-history']})]);},[status,cache]);
 const refresh=async()=>{await data.refetch({throwOnError:true});await Promise.all([cache.invalidateQueries({queryKey:['return-requests']}),cache.invalidateQueries({queryKey:['delivery-returns']}),cache.invalidateQueries({queryKey:['after-sale-history']})]);};
 if(!allowed)return <p>Chủ cửa hàng hoặc Admin xử lý phục hồi khoản hoàn online đã thất bại. Nhân viên có thể theo dõi kết quả, không gửi lại lệnh hoàn.</p>;
 if(data.error instanceof ApiError&&[401,403].includes(data.error.status))return <ErrorView error={data.error} onRetry={()=>void data.refetch()}/>;
 const current=data.data,locked=command.busy||command.stale||command.uncertain;
 const waiting=awaitingRequest&&data.error instanceof ApiError&&data.error.status===404;
 return <section aria-label="Phục hồi hoàn tiền online"><h3>Đối soát hoàn tiền online</h3>
  {data.isPending&&<Loading/>}{waiting?<p role="status">Chưa đọc được yêu cầu hoàn online. Chưa có xác nhận đã hoàn tiền. Hệ thống đọc lại tối đa 60 giây; có thể làm mới thủ công để tiếp tục đối soát.</p>:data.error&&<ErrorView error={data.error} onRetry={()=>void data.refetch()}/>}
  {current&&<><p>Khoản hoàn đủ: <strong>{current.amount_vnd.toLocaleString('vi-VN')} ₫</strong>, gồm phí giao ban đầu.</p>
   <p role="status">{current.status==='SUCCEEDED'?'Đã có xác nhận hoàn đủ tiền.':current.blocked_reason==='RECOVERY_DISABLED'?'Đang tạm dừng nhận yêu cầu phục hồi mới. Lệnh đã nhận vẫn tiếp tục được đối soát.':current.recovery?.status==='BLOCKED'?'Dữ liệu đã thay đổi; cần Admin đối chiếu trước khi tiếp tục.':current.recovery?.status==='PENDING'?'Đã nhận yêu cầu phục hồi. Đang tra soát lệnh cũ; chưa xác nhận đã hoàn.':current.status==='UNKNOWN'?'Chưa rõ kết quả. Hệ thống chỉ tra soát lệnh cũ; không tạo khoản hoàn mới.':current.status==='FAILED'?'Đơn vị thanh toán chưa hoàn thành khoản hoàn. Owner hoặc Admin có thể yêu cầu đối soát trước khi thử lại.':'Đang chờ hệ thống và đơn vị thanh toán đối soát, xác nhận; chưa phải đã hoàn tiền.'}</p>
   {(current.can_retry_known_failure||command.uncertain)&&<form onSubmit={event=>{event.preventDefault();void command.run(()=>({operation_id:crypto.randomUUID(),expected_order_version:current.order_version,expected_refund_version:current.refund_version,note:note.trim()}),body=>callOperation(scope==='ADMIN'?'requestAdminRefundRecovery':'requestStoreRefundRecovery',{path:{id:orderId},body}),refresh);}}>
    <p>Thao tác này yêu cầu tra soát kết quả cũ. Chỉ thử lượt mới khi đơn vị thanh toán xác nhận lượt cũ chưa thực hiện; giữ một khoản hoàn của đơn, không xác nhận tiền bằng tay.</p>
    <label htmlFor={noteId}>Căn cứ phục hồi khoản hoàn</label><textarea id={noteId} required maxLength={2000} disabled={locked} value={note} onChange={e=>setNote(e.target.value)}/>
    <button disabled={command.busy||command.stale||(!command.uncertain&&!note.trim())}>{command.uncertain?'Đối chiếu lại yêu cầu phục hồi cũ':'Yêu cầu đối soát và thử lại hoàn online'}</button>
   </form>}
   {!current.can_retry_known_failure&&current.blocked_reason==='RECONCILIATION_REQUIRED'&&<p>Cần Admin kiểm tra trạng thái tiền và hàng của đúng đơn; chưa được gửi thêm khoản hoàn.</p>}
  </>}
  <CaseFeedback state={command} reload={()=>void refresh().then(command.reset).catch(command.setError)}/>
  <button type="button" disabled={data.isFetching||command.busy} onClick={()=>{setPolling(true);void data.refetch();}}>Làm mới đối soát hoàn online</button>{!polling&&<p>Đã dừng tự làm mới sau 60 giây. Làm mới thủ công để tiếp tục xem kết quả; không tự phát lại giao dịch.</p>}
 </section>;
}
