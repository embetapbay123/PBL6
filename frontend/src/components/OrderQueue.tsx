import {SortHeader} from './SortHeader';
import type {OperationOutputs} from '../api/operations.generated';
import {OrderListIdentity,refundStatusLabel,paymentMethodLabel,paymentStatusLabel} from './OrderListTools';
import {orderNextStep} from './order-actions';
import {orderStatusLabel} from './OrderPresentation';
import {useProductBatch} from '../features/customer/useProductBatch';
type Order=OperationOutputs['getOwnOrder'];
const money=(amount:number)=>amount.toLocaleString('vi-VN')+' ₫';
function Payment({order}:{order:Order}){return <>{paymentMethodLabel(order.payment_method)} · {paymentStatusLabel(order.payment_status,order.amounts.payable_vnd)}{order.refund_status&&<span className="order-refund-label">Lệnh hoàn tiền: {refundStatusLabel(order.refund_status)}</span>}</>;}
/** A phone keeps identification and action in one event-sized block; desktop retains comparison. */
export function OrderQueue({orders,admin=false,onOpen,sort,onSort}:{orders:Order[];admin?:boolean;onOpen:(id:string)=>void;sort?:string;onSort?:(value:string)=>void}){
 const ids=orders.flatMap(order=>(order.items??[]).map(item=>item.product_id).filter((id):id is string=>typeof id==='string'));
 const products=useProductBatch(ids),images=new Map<string,string>();
 if(!products.error)for(const product of products.data??[])if(product.id&&product.images?.[0]?.image_url)images.set(product.id,product.images[0].image_url);
 return !orders.length?<p>Không có đơn hàng phù hợp.</p>:<>
  <div className="market-table-scroll order-queue-table" role="region" aria-label="Danh sách đơn hàng, cuộn ngang để xem đủ cột" tabIndex={0}><table><thead><tr>{onSort?<SortHeader label="Mã đơn / món / người nhận" value={sort??'CREATED_DESC'} ascending="CREATED_ASC" descending="CREATED_DESC" onChange={onSort}/>:<th>Mã đơn / món / người nhận</th>}<th>Trạng thái</th><th>Thanh toán</th>{onSort?<SortHeader label="Phải trả" value={sort} ascending="TOTAL_ASC" descending="TOTAL_DESC" onChange={onSort}/>:<th>Phải trả</th>}<th>Thao tác</th></tr></thead><tbody>{orders.map(order=><tr key={order.id}><td><strong title={order.id}>Đơn #{order.id.slice(-8).toUpperCase()}</strong>{admin&&<p>Store: {order.store_id}</p>}<OrderListIdentity order={order} recipient currentImages={images}/></td><td>{orderStatusLabel(order.status)}{!admin&&<p>{orderNextStep(order,true)}</p>}</td><td><Payment order={order}/></td><td>{money(order.amounts.payable_vnd)}</td><td><button aria-label={admin?'Chi tiết đơn '+order.id:undefined} onClick={()=>onOpen(order.id)}>{admin?'Chi tiết':'Xem đơn'}</button></td></tr>)}</tbody></table></div>
  <div className="order-queue-cards" role="list" aria-label="Các đơn hàng phù hợp">{orders.map(order=><article className="store-audit-card" role="listitem" key={order.id}><h3>Đơn #{order.id.slice(-8).toUpperCase()}</h3><small style={{overflowWrap:'anywhere'}}>{order.id}</small>{admin&&<p style={{overflowWrap:'anywhere'}}>Store: {order.store_id}</p>}<p>{orderStatusLabel(order.status)}</p>{!admin&&<p>{orderNextStep(order,true)}</p>}<OrderListIdentity order={order} recipient/><p><Payment order={order}/></p><p>Phải trả: {money(order.amounts.payable_vnd)}</p><button aria-label={admin?'Chi tiết đơn '+order.id:undefined} onClick={()=>onOpen(order.id)}>{admin?'Chi tiết':'Xem đơn'}</button></article>)}</div>
 </>;
}
