import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { callOperation } from '../../api/operations';
import { Empty, ErrorView, Loading, Pagination } from '../../bootstrap/components';
const statuses:Record<string,string>={AWAITING_PAYMENT:'Đang chờ thanh toán',PENDING:'Đang chờ xác nhận',CONFIRMED:'Đã xác nhận',PROCESSING:'Đang chuẩn bị',SHIPPED:'Đang giao hàng',COMPLETED:'Đã hoàn tất',CANCELLED:'Đã hủy',EXPIRED:'Đã hết hạn',RECOVERING:'Đang xử lý'};
const returnStatuses:Record<string,string>={REQUESTED:'Đã gửi yêu cầu',APPROVED:'Đã chấp thuận yêu cầu',REJECTED:'Yêu cầu bị từ chối',RECEIVED:'Gian hàng đã nhận hàng trả',EXCHANGE_SENT:'Gian hàng đã gửi hàng đổi',COMPLETED:'Đã hoàn tất yêu cầu'};

export function NotificationsPage(){
  const cache=useQueryClient(),[page,setPage]=useState(1),[busy,setBusy]=useState(''),[error,setError]=useState<unknown>();
  const query=useQuery({queryKey:['notifications',page],refetchInterval:15000,queryFn:()=>callOperation('listNotifications',{query:{page,size:20}})});
  async function read(id:string){
    if(busy)return;setBusy(id);setError(undefined);
    try{await callOperation('markNotificationRead',{path:{id}});await cache.invalidateQueries({queryKey:['notifications']});}
    catch(e){setError(e);}finally{setBusy('');}
  }
  return <section><h1>Thông báo đơn hàng</h1>
    {query.isLoading&&<Loading/>}{query.error&&<ErrorView error={query.error} onRetry={()=>void query.refetch()}/>}{error!==undefined&&<ErrorView error={error}/>}
    {query.data&&<><p>{query.data.unread} thông báo chưa đọc</p>{!query.data.items.length&&<Empty>Chưa có cập nhật về đơn hàng hoặc thanh toán.</Empty>}
      <div className="market-notifications">{query.data.items.map(notification=><article key={notification.id} className={'boot-card '+(!notification.read?'notification-unread':'')}>
        <div><span className="market-badge">{notification.read?'Đã đọc':'Chưa đọc'}</span><small> {new Date(notification.created_at).toLocaleString('vi-VN')}</small></div>
        <h2>{notification.kind==='ORDER_STATUS'?'Đơn hàng được cập nhật':notification.kind==='RETURN_STATUS'?'Yêu cầu đổi trả được cập nhật':'Có cập nhật thanh toán'}</h2>
        {notification.kind==='ORDER_STATUS'?<p>{statuses[notification.event_status] ?? notification.event_status}</p>:notification.kind==='RETURN_STATUS'?<p>{returnStatuses[notification.event_status] ?? notification.event_status}</p>:<p>Mở đơn hàng để xem trạng thái thanh toán hiện tại.</p>}
        <Link to={'/customer/orders/'+notification.order_id}>Xem đơn hàng</Link>{!notification.read&&<button disabled={!!busy} onClick={()=>void read(notification.id)}>{busy===notification.id?'Đang cập nhật…':'Đánh dấu đã đọc'}</button>}
      </article>)}</div><Pagination page={page} size={query.data.size} total={query.data.total} onPage={setPage}/></>}
  </section>;
}
