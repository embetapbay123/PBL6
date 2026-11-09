import {useState,type ReactNode} from 'react';
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
const internalActions = new Set([
 'RECEIVED_STOCK_CONFIRMED', 'EXCHANGE_DISPATCH_REQUESTED', 'EXCHANGE_NOT_DISPATCHED',
 'EXCHANGE_STOCK_CONFIRMED', 'INSPECTED_STOCK_ACK', 'SETTLEMENT_STARTED',
 'REFUND_RETRY', 'REFUND_RETRY_REQUESTED',
]);
const customerNotes = new Set(['RETURN_DECISION', 'PROPOSE_REFUND', 'ACCEPT_REFUND', 'DECLINE_REFUND', 'DISPUTE', 'RESOLVE']);

interface CustomerHistoryItem {
  event: Event;
  previousSaves?: Event[];
}

function processCustomerHistory(events: Event[]): CustomerHistoryItem[] {
  const result: CustomerHistoryItem[] = [];
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (internalActions.has(event.action)) continue;
    if (
      event.source === 'RETURN_STATUS' &&
      event.from_status &&
      event.from_status === event.to_status &&
      !event.fault_party &&
      !event.note &&
      event.amount_vnd === undefined
    ) {
      continue;
    }
    const prev = result[result.length - 1];
    const isInspection = event.action === 'RECEIPT_INSPECTED' || event.action === 'INSPECTION_RECORDED';
    const prevIsInspection = prev && (prev.event.action === 'RECEIPT_INSPECTED' || prev.event.action === 'INSPECTION_RECORDED');

    if (
      prev &&
      isInspection &&
      prevIsInspection &&
      prev.event.action === event.action &&
      prev.event.source === event.source &&
      prev.event.fault_party === event.fault_party &&
      prev.event.fee_payer === event.fee_payer &&
      prev.event.amount_vnd === event.amount_vnd
    ) {
      if (!prev.previousSaves) prev.previousSaves = [];
      prev.previousSaves.push(event);
      continue;
    }
    result.push({ event });
  }
  return result;
}

function eventLabel(event:Event){
 if(event.source==='RETURN_STATUS')return event.from_status===event.to_status?'Đã ghi nhận cập nhật hồ sơ':states[event.to_status??'']??'Đã cập nhật trạng thái';
 if(event.action==='REFUND_RESULT')return event.to_status==='SUCCEEDED'?'Đối soát hoàn tiền thành công':event.to_status==='UNKNOWN'?'Chưa rõ kết quả hoàn tiền — cần đối soát':event.to_status==='FAILED'?'Hoàn tiền chưa thành công':event.to_status==='REQUESTED'?'Đang chờ xử lý khoản hoàn':'Đã cập nhật kết quả hoàn tiền';
 return actions[event.action]??'Đã ghi nhận cập nhật hồ sơ';
}

export function AfterSaleHistory({orderId,scope='CUSTOMER',items=[],revision='',label='Lịch sử đổi trả',context}:{orderId:string;scope?:Scope;items?:Item[];revision?:string;label?:string;context?:ReactNode}){
 const [open,setOpen]=useState(false);
 return <details onToggle={event=>setOpen(event.currentTarget.open)}><summary>{label}</summary>{open&&<>{context}<HistoryBody orderId={orderId} scope={scope} items={items} revision={revision}/></>}</details>;
}

function HistoryBody({orderId,scope,items,revision}:{orderId:string;scope:Scope;items:Item[];revision:string}){
 const {session}=useAuth(),cache=useQueryClient(),key=['after-sale-history',session?.context?.user_id,session?.context?.store_membership?.store_id,scope,orderId,revision];
 const data=useInfiniteQuery({queryKey:key,initialPageParam:undefined as string|undefined,retry:false,refetchOnWindowFocus:false,
  queryFn:({pageParam,signal})=>callOperation(scope==='CUSTOMER'?'listOwnAfterSaleHistory':scope==='STORE'?'listStoreAfterSaleHistory':'listAdminAfterSaleHistory',{path:{id:orderId},query:{size:20,...(pageParam?{cursor:pageParam}:{})}},{signal}),
  getNextPageParam:page=>page.next_cursor});
 const reveal=scope==='ADMIN'||scope==='STORE'&&session?.context?.store_membership?.role==='OWNER';
 const customer=scope==='CUSTOMER';

 const rawEvents = data.data?.pages.flatMap(page => page.items) ?? [];
 const seen = new Set<string>();
 const uniqueEvents: Event[] = [];
 for (const item of rawEvents) {
   const k = item.source + ':' + item.id;
   if (!seen.has(k)) {
     seen.add(k);
     uniqueEvents.push(item);
   }
 }

 const customerItems = customer ? processCustomerHistory(uniqueEvents) : undefined;
 const hasItems = customer ? (customerItems && customerItems.length > 0) : uniqueEvents.length > 0;

 if(data.error instanceof ApiError&&[401,403,404].includes(data.error.status))return <ErrorView error={data.error} onRetry={()=>void data.refetch()}/>;
 return <section aria-label="Diễn biến sau bán"><p>Mới nhất trước · Giờ Việt Nam{!customer&&" (UTC+7). Thời điểm ghi nhận và thời điểm phát sinh tiền có thể khác nhau."}</p>
  {data.isPending&&<p role="status">Đang đọc lịch sử…</p>}
  {data.error&&<ErrorView error={data.error} onRetry={()=>void (data.isFetchNextPageError?data.fetchNextPage():data.refetch())}/>}
  {data.data && <><ol>
    {customer && customerItems ? (
      <CustomerHistoryList items={customerItems} />
    ) : (
      <HistoryEvents events={uniqueEvents} scope={scope} reveal={reveal} items={items}/>
    )}
  </ol>
   {!hasItems&&<p>{customer?'Chưa có cập nhật trong phần lịch sử đã tải.':'Chưa có diễn biến sau bán trong dữ liệu đã lưu. Không suy lịch sử từ trạng thái hiện tại.'}</p>}
   {data.hasNextPage&&<button type="button" disabled={data.isFetching} onClick={()=>void data.fetchNextPage()}>Xem thêm</button>}
  </>}
  <button type="button" disabled={data.isFetching} onClick={()=>void cache.resetQueries({queryKey:key,exact:true})}>Làm mới lịch sử</button>
 </section>;
}

function CustomerHistoryList({items}:{items:CustomerHistoryItem[]}){
  return <>{items.map(({event,previousSaves}) => (
    <li key={event.source+':'+event.id} style={{overflowWrap:'anywhere',marginBottom:'1rem'}}>
      <p><strong>{eventLabel(event)}</strong></p>
      <p><time dateTime={event.occurred_at}>{time(event.occurred_at)}</time></p>
      {event.note && customerNotes.has(event.action) && <p>{event.note}</p>}
      {event.fault_party && <p>{event.fault_party==='DISPUTED'?'Đang chờ Admin kết luận':event.fault_party==='STORE'?'Kết luận lỗi Store':'Kết luận khách đổi ý / chọn sai'}{event.fee_payer?event.fee_payer==='STORE'?' · Store chịu phí':' · Khách chịu phí':''}</p>}
      {event.amount_vnd!==undefined&&<p>Khoản hoàn: {event.amount_vnd.toLocaleString('vi-VN')} ₫.</p>}
      {previousSaves && previousSaves.length > 0 && (
        <details style={{ marginTop: '0.35rem', fontSize: '0.875rem', color: '#6b7280' }}>
          <summary style={{ cursor: 'pointer' }}>Xem các lần lưu trước ({previousSaves.length})</summary>
          <ul style={{ paddingLeft: '1.25rem', margin: '0.25rem 0' }}>
            {previousSaves.map(ps => (
              <li key={ps.source + ':' + ps.id}>
                Đã ghi nhận cập nhật lúc <time dateTime={ps.occurred_at}>{time(ps.occurred_at)}</time>
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  ))}</>;
}

function HistoryEvents({events,scope,reveal,items}:{events:Event[];scope:Scope;reveal:boolean;items:Item[]}){
 const actors=useAuditActorLabels(scope==='ADMIN'?'ADMIN':'STORE',reveal?events.map(e=>e.actor_user_id):[]);
 const customer=scope==='CUSTOMER';
 return <>{events.map(event=><li key={event.source+':'+event.id} style={{overflowWrap:'anywhere',marginBottom:'1rem'}}>
  <p><strong>{eventLabel(event)}</strong></p>
  <p><time dateTime={event.occurred_at}>{time(event.occurred_at)}</time>{!customer&&<> · {event.actor_kind==='SYSTEM'?'Hệ thống':event.actor_kind==='CUSTOMER'?'Khách hàng':event.actor_kind==='UNKNOWN'?'Chưa có thông tin người thực hiện':'Người xử lý'}</>}</p>
  {reveal&&event.actor_user_id&&<AuditActor id={event.actor_user_id} labels={actors.labels} loading={actors.isPending} error={actors.error} admin={scope==='ADMIN'} accounts={actors.accounts}/>}
  {!customer&&event.recorded_at!==event.occurred_at&&<p><small>Hệ thống ghi nhận: <time dateTime={event.recorded_at}>{time(event.recorded_at)}</time></small></p>}
  {event.note&&(!customer||customerNotes.has(event.action))&&<p>{event.note}</p>}
  {event.fault_party&&<p>{event.fault_party==='DISPUTED'?'Đang chờ Admin kết luận':event.fault_party==='STORE'?'Kết luận lỗi Store':'Kết luận khách đổi ý / chọn sai'}{event.fee_payer?event.fee_payer==='STORE'?' · Store chịu phí':' · Khách chịu phí':''}</p>}
  {!customer&&event.reference&&<p>Tham chiếu bàn giao hàng đổi: {event.reference}</p>}
  {!customer&&<InspectionSummary lines={event.inspection??[]} items={items} heading="Kiểm hàng tại bước này" headingLevel={4}/>}
  {event.amount_vnd!==undefined&&<p>Khoản hoàn: {event.amount_vnd.toLocaleString('vi-VN')} ₫. {!customer&&(event.time_source==='OWNER_ATTESTED'?'Xác nhận thủ công của Owner; chưa phải ngân hàng kiểm chứng.':event.time_source==='SYSTEM_RECEIVED'?'Thời điểm hệ thống tiếp nhận xác nhận, không suy ngày giao dịch ngân hàng.':'Thời điểm xác nhận được hệ thống ghi nhận.')}</p>}
 </li>)}</>;
}
