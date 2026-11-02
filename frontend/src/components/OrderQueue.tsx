import type {OperationOutputs} from '../api/operations.generated';
import {OrderListIdentity,refundStatusLabel,paymentMethodLabel,paymentStatusLabel} from './OrderListTools';
import {orderNextStep} from './order-actions';
import {orderStatusLabel} from './OrderPresentation';
type Order=OperationOutputs['getOwnOrder'];
const money=(amount:number)=>amount.toLocaleString('vi-VN')+' ₫';
function Payment({order}:{order:Order}){return <>{paymentMethodLabel(order.payment_method)} · {paymentStatusLabel(order.payment_status,order.amounts.payable_vnd)}{order.refund_status&&<span className="order-refund-label">Lệnh hoàn tiền: {refundStatusLabel(order.refund_status)}</span>}</>;}
/** A phone keeps identification and action in one event-sized block; desktop retains comparison. */
export function OrderQueue({orders,admin=false,onOpen}:{orders:Order[];admin?:boolean;onOpen:(id:string)=>void}){
 return !orders.length?<p>Không có đơn hàng phù hợp.</p>:<>
  <div className="market-table-scroll order-queue-table" role="region" aria-label="Danh sách đơn hàng, cuộn ngang để xem đủ cột" tabIndex={0}><table><thead><tr><th>Mã đơn / món / người nhận</th><th>Trạng thái</th><th>Thanh toán</th><th>Phải trả</th><th>Thao tác</th></tr></thead><tbody>{orders.map(order=><tr key={order.id}><td><strong style={{overflowWrap:'anywhere'}}>{order.id}</strong>{admin&&<p>Store: {order.store_id}</p>}<OrderListIdentity order={order} recipient/></td><td>{orderStatusLabel(order.status)}{!admin&&<p>{orderNextStep(order,true)}</p>}</td><td><Payment order={order}/></td><td>{money(order.amounts.payable_vnd)}</td><td><button aria-label={admin?'Chi tiết đơn '+order.id:undefined} onClick={()=>onOpen(order.id)}>{admin?'Chi tiết':'Xem đơn'}</button></td></tr>)}</tbody></table></div>
  <div className="order-queue-cards" role="list" aria-label="Các đơn hàng phù hợp">{orders.map(order=><article className="store-audit-card" role="listitem" key={order.id}><h3>Đơn #{order.id.slice(-8).toUpperCase()}</h3><small style={{overflowWrap:'anywhere'}}>{order.id}</small>{admin&&<p style={{overflowWrap:'anywhere'}}>Store: {order.store_id}</p>}<p>{orderStatusLabel(order.status)}</p>{!admin&&<p>{orderNextStep(order,true)}</p>}<OrderListIdentity order={order} recipient/><p><Payment order={order}/></p><p>Phải trả: {money(order.amounts.payable_vnd)}</p><button aria-label={admin?'Chi tiết đơn '+order.id:undefined} onClick={()=>onOpen(order.id)}>{admin?'Chi tiết':'Xem đơn'}</button></article>)}</div>
 </>;
}
