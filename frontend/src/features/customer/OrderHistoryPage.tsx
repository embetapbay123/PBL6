import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../../api/auth-context';
import {callOperation} from '../../api/operations';
import type {OperationOutputs} from '../../api/operations.generated';
import {ErrorView,Loading,Pagination} from '../../bootstrap/components';
import {CustomerSubNav} from './CustomerSubNav';

export function OrderHistoryPage(){const {session}=useAuth();return <History key={session?.context?.user_id??'guest'}/>}

function History(){
  const [page,setPage]=useState(1),[retry,setRetry]=useState(0),[data,setData]=useState<OperationOutputs['listOwnOrders']>(),[error,setError]=useState<unknown>();
  useEffect(()=>{
    let active=true;setData(undefined);setError(undefined);
    callOperation('listOwnOrders',{query:{page,size:20}}).then(v=>{if(active)setData(v)}).catch(e=>{if(active)setError(e)});
    return()=>{active=false};
  },[page,retry]);

  return <section className="boot-card">
    <CustomerSubNav />
    <h1>Lịch sử đơn hàng</h1>
    {error!=null?<ErrorView error={error} onRetry={()=>setRetry(n=>n+1)}/>:!data?<Loading/>:<>{!data.items.length&&<p>Bạn chưa có đơn hàng ở trang này.</p>}{data.items.map(order=><article className="boot-card" key={order.id} style={{ marginBottom: '1rem' }}><h2><Link to={'/customer/orders/'+order.id}>Đơn {order.id}</Link></h2><p>{order.status} · {order.payment_method}</p><p>{order.amounts.payable_vnd.toLocaleString('vi-VN')} ₫</p><div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}><Link to={'/customer/orders/'+order.id}>Xem chi tiết</Link>{order.status==='AWAITING_PAYMENT'&&order.payment_method==='SANDBOX'&&<Link to={'/orders/'+order.id+'/pay'} style={{ color: '#059669', fontWeight: 600 }}>Thanh toán ngay →</Link>}</div></article>)}<Pagination page={page} size={data.size} total={data.total} onPage={setPage}/></>}
  </section>;
}

export default OrderHistoryPage;
