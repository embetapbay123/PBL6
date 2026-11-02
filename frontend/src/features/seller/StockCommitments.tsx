import {useEffect} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {callOperation} from '../../api/operations';
import {ErrorView,Loading,Pagination} from '../../bootstrap/components';
import {orderStatusLabel} from '../../components/OrderPresentation';
import {variantLabel} from '../../components/variant-identity';
import {useStoreAccess} from '../../live/useLiveData';

export function StockCommitments({filters}:{filters:{q?:string;variant_id?:string;product_id?:string}}){
 const access=useStoreAccess(),[params,setParams]=useSearchParams(),raw=Number(params.get('commitments_page')),page=Number.isSafeInteger(raw)&&raw>=1&&raw<=1000000?raw:1;
 const setPage=(value:number,options?:{replace?:boolean})=>setParams(current=>{const next=new URLSearchParams(current);next.set('commitments_page',String(value));return next;},options);
 const query=useQuery({queryKey:['stock-commitments',page,filters],staleTime:0,refetchOnWindowFocus:false,queryFn:({signal})=>callOperation('listStockCommitments',{query:{page,size:10,...filters}},{signal})});
 useEffect(()=>{if(query.data&&!query.isFetching&&!query.error&&page>Math.max(1,Math.ceil(query.data.total/query.data.size)))setPage(Math.max(1,Math.ceil(query.data.total/query.data.size)),{replace:true});},[query.data,query.isFetching,query.error,page]);
 return <section className="boot-card mt-8" aria-label="Hàng đã trừ chưa bàn giao"><h2>Hàng đã trừ nhưng chưa bàn giao</h2><p>Đơn COD có thể trừ tồn trước khi lấy/giao hàng. Xem riêng phần này trước khi kiểm kê; không tự cộng vào hoặc trừ khỏi số đếm vật lý. Đơn đã bàn giao không nằm trong danh sách này.</p>{filters.q&&<p>Từ khóa đối chiếu tên / SKU được lưu lúc đặt đơn; có thể khác tên / SKU hiện tại trong catalog.</p>}
 {query.isFetching&&query.data&&<Loading/>}{query.error?<ErrorView error={query.error} onRetry={()=>void query.refetch()}/>:query.isPending?<Loading/>:query.data&&<><p>Đã xác nhận trừ, chưa bàn giao: <strong>{query.data.consumed_quantity}</strong>. Cần đối soát lệnh kho / đóng đơn: <strong>{query.data.uncertain_quantity}</strong>. Tổng theo toàn bộ bộ lọc, không chỉ trang đang xem.</p><p>Đọc trạng thái đơn lúc {new Date(query.data.as_of).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} (giờ Việt Nam). Kho và đơn là hai ảnh đọc riêng; làm mới để đối chiếu sau thao tác.</p>
 {!query.data.items.length?(!query.isFetching&&<p>Không có hàng chưa bàn giao hoặc lệnh kho cần đối soát trong bộ lọc.</p>):<div className="market-table-scroll" role="region" aria-label="Chi tiết hàng chưa bàn giao" tabIndex={0}><table><thead><tr><th>Món / phân loại / SKU</th><th>Đơn hàng</th><th>Lượng</th><th>Việc cần đối chiếu</th></tr></thead><tbody>{query.data.items.map(row=><tr key={row.order_id+':'+row.variant_id}><td>{row.product_title}<br/>{variantLabel(row.variant_values,'Chưa có thông tin phân loại')}{row.sku&&<><br/>SKU: {row.sku}</>}</td><td>{access.can('order.store.read_status_cancel')?<Link to={'/seller/orders?q='+encodeURIComponent(row.order_id)}>{row.order_id}</Link>:<span style={{overflowWrap:'anywhere'}}>{row.order_id}</span>}<br/>{orderStatusLabel(row.order_status)}</td><td>{row.quantity}</td><td>{row.reconciliation==='CONSUMED_NOT_HANDED_OVER'?'Đã trừ tồn thương mại; cửa hàng chưa xác nhận bàn giao':'Chưa xác định xong kết quả kho; không coi là tồn đã được nhả/hoàn'}{row.command_kind&&<p>{row.command_kind==='CONSUME'?'Chờ xác nhận trừ tồn':row.command_kind==='RELEASE'?'Chờ xác nhận nhả giữ':'Chờ xác nhận hoàn kho'}</p>}</td></tr>)}</tbody></table></div>}
 <Pagination page={page} size={query.data.size} total={query.data.total} onPage={setPage}/></>}
 <button type="button" disabled={query.isFetching} onClick={()=>void query.refetch()}>Làm mới hàng chưa bàn giao</button></section>;
}
