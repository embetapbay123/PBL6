import {useState} from 'react';
import {useInfiniteQuery,useQueryClient} from '@tanstack/react-query';
import {useAuth} from '../../api/auth-context';
import {callOperation} from '../../api/operations';
import {ApiError} from '../../api/client';
import type {OperationOutputs} from '../../api/operations.generated';
import {ErrorView} from '../../bootstrap/components';
import {AuditActor,useAuditActorLabels} from '../admin/AuditActors';
import {InspectionSummary} from '../../components/InspectionSummary';

type Scope='CUSTOMER'|'STORE'|'ADMIN';
type Event=OperationOutputs['listOwnAfterSaleHistory']['items'][number];
type Item={order_item_id:string;product_snapshot:Record<string,unknown>;sku_snapshot?:string;quantity?:number;unit_price_vnd?:number};
const actions:Record<string,string>={RETURN_DECISION:'Quyết định trách nhiệm và phí',RECEIPT_INSPECTED:'Đã ghi biên bản kiểm hàng',
 RECEIVED_STOCK_CONFIRMED:'Kho đã xác nhận hàng bán lại được',EXCHANGE_DISPATCH_REQUESTED:'Đề nghị bàn giao hàng đổi — chưa xác nhận đã gửi',
 EXCHANGE_NOT_DISPATCHED:'Chưa bàn giao được hàng đổi',EXCHANGE_STOCK_CONFIRMED:'Kho đã xác nhận xuất hàng đổi',
 PROPOSE_REFUND:'Store đề nghị chuyển sang hoàn đủ tiền',ACCEPT_REFUND:'Khách đồng ý chuyển sang hoàn tiền',DECLINE_REFUND:'Khách từ chối đề nghị hoàn tiền',
 DISPUTE:'Khách yêu cầu Admin xem xét',RESOLVE:'Admin đã kết luận tranh chấp',DELIVERY_FAILED:'Đã ghi nhận giao thất bại',
 INSPECTION_RECORDED:'Đã ghi biên bản hàng hoàn về',SETTLEMENT_STARTED:'Bắt đầu đối chiếu tồn và tiền',INSPECTED_STOCK_ACK:'Kho đã xác nhận hàng hoàn về',
 CLOSED:'Đã đóng hồ sơ hoàn về',REFUND_REQUESTED:'Đã tạo yêu cầu hoàn tiền — chưa phải đã hoàn',REFUND_PROCESSING:'Đang xử lý yêu cầu hoàn tiền',REFUND_RECONCILING:'Đang tra soát kết quả hoàn tiền',
 REFUND_RESULT_UNKNOWN:'Chưa rõ kết quả hoàn tiền — cần đối soát',REFUND_FAILED:'Chưa hoàn tiền — cần xử lý',REFUND_RETRY:'Đã xếp lịch thử lại sau khi đối soát chưa hoàn',REFUND_RETRY_REQUESTED:'Người xử lý yêu cầu đối soát trước khi thử lại',
 REFUND_CONFIRMED:'Đã xác nhận hoàn tiền'};
const states:Record<string,string>={REQUESTED:'Chờ xét duyệt',APPROVED:'Đã chấp thuận',REJECTED:'Đã từ chối',RECEIVED:'Đã nhận hàng trả',EXCHANGE_SENT:'Đã gửi hàng đổi',COMPLETED:'Đã hoàn tất',OPEN:'Chờ hàng hoàn về',SETTLING:'Đang đối chiếu',CLOSED:'Đã đóng'};
const time=(value:string)=>new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'medium',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value));
function eventLabel(event:Event){
 if(event.source==='RETURN_STATUS')return event.from_status===event.to_status?'Đã ghi nhận cập nhật hồ sơ':states[event.to_status??'']??'Đã cập nhật trạng thái';
 if(event.action==='REFUND_RESULT')return event.to_status==='SUCCEEDED'?'Đối soát hoàn tiền thành công':event.to_status==='UNKNOWN'?'Chưa rõ kết quả hoàn tiền — cần đối soát':event.to_status==='FAILED'?'Hoàn tiền chưa thành công':event.to_status==='REQUESTED'?'Đang chờ xử lý khoản hoàn':'Đã cập nhật kết quả hoàn tiền';
 return actions[event.action]??'Đã ghi nhận cập nhật hồ sơ';
}
export function AfterSaleHistory({orderId,scope='CUSTOMER',items=[],revision=''}:{orderId:string;scope?:Scope;items?:Item[];revision?:string}){
 const [open,setOpen]=useState(false);
 return <details onToggle={event=>setOpen(event.currentTarget.open)}><summary>Lịch sử đổi trả và hoàn về</summary>{open&&<HistoryBody orderId={orderId} scope={scope} items={items} revision={revision}/>}</details>;
}
function HistoryBody({orderId,scope,items,revision}:{orderId:string;scope:Scope;items:Item[];revision:string}){
 const {session}=useAuth(),cache=useQueryClient(),key=['after-sale-history',session?.context?.user_id,session?.context?.store_membership?.store_id,scope,orderId,revision];
 const data=useInfiniteQuery({queryKey:key,initialPageParam:undefined as string|undefined,retry:false,refetchOnWindowFocus:false,
  queryFn:({pageParam,signal})=>callOperation(scope==='CUSTOMER'?'listOwnAfterSaleHistory':scope==='STORE'?'listStoreAfterSaleHistory':'listAdminAfterSaleHistory',{path:{id:orderId},query:{size:20,...(pageParam?{cursor:pageParam}:{})}},{signal}),
  getNextPageParam:page=>page.next_cursor});
 const reveal=scope==='ADMIN'||scope==='STORE'&&session?.context?.store_membership?.role==='OWNER';
 if(data.error instanceof ApiError&&[401,403,404].includes(data.error.status))return <ErrorView error={data.error} onRetry={()=>void data.refetch()}/>;
 return <section aria-label="Diễn biến sau bán"><p>Mới nhất trước · Giờ Việt Nam (UTC+7). Thời điểm ghi nhận và thời điểm phát sinh tiền có thể khác nhau.</p>
  {data.isPending&&<p role="status">Đang đọc lịch sử…</p>}
  {data.error&&<ErrorView error={data.error} onRetry={()=>void (data.isFetchNextPageError?data.fetchNextPage():data.refetch())}/>}
  {data.data&&<><ol>{data.data.pages.map((page,index)=><HistoryEvents key={index} events={page.items} scope={scope} reveal={reveal} items={items}/>)}</ol>
   {!data.data.pages.some(page=>page.items.length)&&<p>Chưa có diễn biến sau bán trong dữ liệu đã lưu. Không suy lịch sử từ trạng thái hiện tại.</p>}
   {data.hasNextPage&&<button type="button" disabled={data.isFetching} onClick={()=>void data.fetchNextPage()}>Xem diễn biến cũ hơn</button>}
  </>}
  <button type="button" disabled={data.isFetching} onClick={()=>void cache.resetQueries({queryKey:key,exact:true})}>Làm mới lịch sử</button>
 </section>;
}
function HistoryEvents({events,scope,reveal,items}:{events:Event[];scope:Scope;reveal:boolean;items:Item[]}){
 const actors=useAuditActorLabels(scope==='ADMIN'?'ADMIN':'STORE',reveal?events.map(e=>e.actor_user_id):[]);
 return <>{events.map(event=><li key={event.source+':'+event.id} style={{overflowWrap:'anywhere',marginBottom:'1rem'}}>
  <p><strong>{eventLabel(event)}</strong></p>
  <p><time dateTime={event.occurred_at}>{time(event.occurred_at)}</time> · {event.actor_kind==='SYSTEM'?'Hệ thống':event.actor_kind==='CUSTOMER'?'Khách hàng':event.actor_kind==='UNKNOWN'?'Chưa có thông tin người thực hiện':'Người xử lý'}</p>
  {reveal&&event.actor_user_id&&<AuditActor id={event.actor_user_id} labels={actors.labels} loading={actors.isPending} error={actors.error} admin={scope==='ADMIN'} accounts={actors.accounts}/>}
  {event.recorded_at!==event.occurred_at&&<p><small>Hệ thống ghi nhận: <time dateTime={event.recorded_at}>{time(event.recorded_at)}</time></small></p>}
  {event.note&&<p>{event.note}</p>}
  {event.fault_party&&<p>{event.fault_party==='DISPUTED'?'Đang chờ Admin kết luận':event.fault_party==='STORE'?'Kết luận lỗi Store':'Kết luận khách đổi ý / chọn sai'}{event.fee_payer?event.fee_payer==='STORE'?' · Store chịu phí':' · Khách chịu phí':''}</p>}
  {event.reference&&<p>Tham chiếu bàn giao hàng đổi: {event.reference}</p>}
  <InspectionSummary lines={event.inspection??[]} items={items} heading="Kiểm hàng tại bước này" headingLevel={4}/>
  {event.amount_vnd!==undefined&&<p>Khoản hoàn: {event.amount_vnd.toLocaleString('vi-VN')} ₫. {event.time_source==='OWNER_ATTESTED'?'Xác nhận thủ công của Owner; chưa phải ngân hàng kiểm chứng.':event.time_source==='SYSTEM_RECEIVED'?'Thời điểm hệ thống tiếp nhận xác nhận, không suy ngày giao dịch ngân hàng.':'Thời điểm xác nhận được hệ thống ghi nhận.'}</p>}
 </li>)}</>;
}
