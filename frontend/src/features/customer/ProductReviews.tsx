import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../api/auth-context';
import { callOperation } from '../../api/operations';
import type { OperationOutputs } from '../../api/operations.generated';
import { ApiError } from '../../api/client';
import { ErrorView, Loading, Pagination } from '../../bootstrap/components';
type Review=OperationOutputs['createReview'];
type Orders=OperationOutputs['listOwnOrders'];
export function ProductReviews({productId}:{productId:string}) {
  const {session}=useAuth();
  const userId=session?.context?.roles.includes('CUSTOMER')?session.context.user_id:undefined;
  return <ReviewsInner key={productId+':'+(userId??'guest')} productId={productId} userId={userId}/>;
}
function ReviewsInner({productId,userId}:{productId:string;userId?:string}) {
  const [page,setPage]=useState(1),[orderPage,setOrderPage]=useState(1),[reload,setReload]=useState(0),[ordersReload,setOrdersReload]=useState(0);
  const [reviews,setReviews]=useState<OperationOutputs['listProductReviews']>(),[orders,setOrders]=useState<Orders>();
  const [loading,setLoading]=useState(true),[error,setError]=useState<unknown>(),[orderError,setOrderError]=useState<unknown>();
  const [itemId,setItemId]=useState(''),[rating,setRating]=useState(5),[body,setBody]=useState('');
  const [editing,setEditing]=useState<Review>(),[saved,setSaved]=useState<Review>();
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');const flight=useRef(false);
  useEffect(()=>{let active=true;setLoading(true);setError(undefined);
    callOperation('listProductReviews',{path:{id:productId},query:{page,size:20}}).then(value=>{if(active)setReviews(value)}).catch(e=>{if(active)setError(e)}).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[productId,page,reload]);
  useEffect(()=>{if(!userId)return;let active=true;setOrderError(undefined);setOrders(undefined);setItemId('');setEditing(undefined);
    callOperation('listOwnOrders',{query:{page:orderPage,size:20}}).then(value=>{if(active)setOrders(value)}).catch(e=>{if(active)setOrderError(e)});
    return()=>{active=false};
  },[userId,orderPage,ordersReload]);
  const eligible=(orders?.items??[]).filter(order=>order.status==='COMPLETED').flatMap(order=>(order.items??[])
    .filter(item=>item.product_id===productId && typeof item.id==='string').map(item=>({id:String(item.id),order:order.id})));
  const owned=new Set(eligible.map(item=>item.id));
  const edit=(review:Review)=>{if(!owned.has(review.order_item_id))return;setEditing(review);setItemId(review.order_item_id);setRating(review.rating);setBody(review.body??'');setNotice('')};
  const submit=async(event:FormEvent)=>{
    event.preventDefault();if(flight.current || !owned.has(itemId))return;
    if(editing && editing.version===undefined){setError(new ApiError(503,'REVIEW_VERSION_MISSING','Chưa có phiên bản đánh giá để sửa. Hãy tải lại.'));return;}
    flight.current=true;setBusy(true);setError(undefined);setNotice('');
    try{
      const value=editing?.id
        ?await callOperation('updateReview',{path:{id:editing.id},body:{rating,body,expected_version:editing.version!}})
        :await callOperation('createReview',{body:{order_item_id:itemId,rating,body}});
      setSaved(value);setEditing(value.id?value:undefined);setNotice('Đã lưu đánh giá qua API.');setReload(n=>n+1);
    }catch(e){setError(e)}finally{flight.current=false;setBusy(false)}
  };
  return <section className="boot-card"><h3>Đánh giá sản phẩm</h3>
    {error!==undefined && <ErrorView error={error} onRetry={()=>setReload(n=>n+1)}/>}
    {loading?<Loading/>:reviews && <>
      {!reviews.items.length && <p>Chưa có đánh giá nào cho sản phẩm này.</p>}
      {reviews.items.map(review=><article className="boot-card" key={review.id??review.order_item_id}>
        <strong>{review.rating} / 5 sao</strong><p>{review.body}</p>
        {review.id && owned.has(review.order_item_id) && <button disabled={busy} onClick={()=>edit(review)}>Sửa đánh giá</button>}
      </article>)}
      <Pagination page={page} size={reviews.size} total={reviews.total} onPage={setPage}/>
    </>}
    {!userId?<Link to="/login">Đăng nhập để viết đánh giá sau mua hàng</Link>:<>
      <h4>Đánh giá từ đơn hàng đã hoàn tất</h4>
      {orderError!==undefined && <ErrorView error={orderError} onRetry={()=>setOrdersReload(n=>n+1)}/>}
      {!orders && !orderError && <Loading/>}
      {orders && <>
        {!eligible.length && <p>Trang đơn hàng này chưa có mục đã hoàn tất cho sản phẩm. Có thể xem trang đơn hàng khác.</p>}
        <div aria-label="Trang đơn hàng để đánh giá"><Pagination page={orderPage} size={orders.size} total={orders.total} onPage={setOrderPage}/></div>
        <form onSubmit={submit}>
          <label>Mục đơn hàng<select value={itemId} disabled={busy||!!editing} onChange={e=>{setItemId(e.target.value);setNotice('')}} required>
            <option value="">Chọn mục đã mua</option>{eligible.map(item=><option key={item.id} value={item.id}>Đơn {item.order} · mục {item.id}</option>)}
          </select></label>
          <label>Số sao<select value={rating} disabled={busy} onChange={e=>setRating(Number(e.target.value))}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} sao</option>)}</select></label>
          <label>Nội dung đánh giá<textarea value={body} maxLength={10000} required disabled={busy} onChange={e=>setBody(e.target.value)}/></label>
          <button disabled={busy||!owned.has(itemId)}>{busy?'Đang lưu…':editing?'Lưu đánh giá':'Gửi đánh giá'}</button>
          {editing && <button type="button" disabled={busy} onClick={()=>{setEditing(undefined);setSaved(undefined);setBody('');setNotice('')}}>Hủy sửa</button>}
        </form>
        {saved?.id && !editing && owned.has(saved.order_item_id) && <button onClick={()=>edit(saved)}>Sửa đánh giá vừa lưu</button>}
      </>}
    </>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
export default ProductReviews;
