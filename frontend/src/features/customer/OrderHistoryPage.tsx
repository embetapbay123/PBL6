import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../../api/auth-context';
import {callOperation} from '../../api/operations';
import type {OperationOutputs} from '../../api/operations.generated';
import {ErrorView,Loading,Pagination} from '../../bootstrap/components';
import {CustomerSubNav} from './CustomerSubNav';
import {OrderFilters,OrderQuery,orderCode} from '../../live/OrderFilters';
import {orderLabel} from '../../live/OrderFacts';

export function OrderHistoryPage(){const {session}=useAuth();return <History key={session?.context?.user_id??'guest'}/>}

function History(){
  const [filters,setFilters]=useState<OrderQuery>({});
  const [page,setPage]=useState(1),[retry,setRetry]=useState(0),[data,setData]=useState<OperationOutputs['listOwnOrders']>(),[error,setError]=useState<unknown>();
  useEffect(()=>{
    let active=true;setData(undefined);setError(undefined);
    callOperation('listOwnOrders',{query:{...filters,page,size:20}}).then(v=>{if(active)setData(v)}).catch(e=>{if(active)setError(e)});
    return()=>{active=false};
  },[page,retry,filters]);

  return <section className="boot-card">
    <CustomerSubNav />
    <h1>Lịch sử đơn hàng</h1>
    <nav aria-label="Xem đơn theo trạng thái" style={{display:'flex',gap:8,overflowX:'auto',padding:'8px 0'}}>
      {['','PREPARING','AWAITING_PAYMENT','PENDING','CONFIRMED','PROCESSING','SHIPPED','COMPLETED','CANCELLED','EXPIRED','RECOVERING','RETURNED'].map(status=><button key={status||'all'} type="button" aria-pressed={(filters.status??'')===status} onClick={()=>{setFilters(old=>({...old,status:status?status as OrderQuery['status']:undefined}));setPage(1)}}>{status?orderLabel[status]:'Tất cả'}</button>)}
    </nav>
    <OrderFilters selectedStatus={filters.status} apply={query=>{setFilters(query);setPage(1)}}/>
    {error!=null?<ErrorView error={error} onRetry={()=>setRetry(n=>n+1)}/>:!data?<Loading/>:<>{!data.items.length&&<p>Không có đơn khớp bộ lọc ở trang này.</p>}{data.items.map(order=><article className="boot-card" key={order.id} style={{ marginBottom: '1rem' }}><h2><Link title={order.id} to={'/customer/orders/'+order.id}>Đơn {orderCode(order.id)}</Link></h2><p>{orderLabel[order.status]??order.status} · {order.payment_method}</p><p>{order.amounts.payable_vnd.toLocaleString('vi-VN')} ₫</p><div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}><Link to={'/customer/orders/'+order.id}>Xem chi tiết</Link>{order.status==='AWAITING_PAYMENT'&&order.payment_method==='SANDBOX'&&<Link to={'/orders/'+order.id+'/pay'} style={{ color: '#059669', fontWeight: 600 }}>Thanh toán ngay →</Link>}</div></article>)}<Pagination page={page} size={data.size} total={data.total} onPage={setPage}/></>}
  </section>;
}

export default OrderHistoryPage;
