import {Link} from 'react-router-dom';
import {AdminStoreIdentity,AdminCustomerIdentity,type useAdminParties} from '../admin/AdminParties';
import {orderStatusLabel} from '../../components/OrderPresentation';
import {paymentStatusLabel} from '../../components/OrderListTools';
import type {ReturnRequest} from './ReturnRequestView';
export function AdminReturnContext({request,parties}:{request:ReturnRequest;parties:ReturnType<typeof useAdminParties>}){
 const context=request.admin_context,money=(amount:number)=>amount.toLocaleString('vi-VN')+' ₫';
 return <section aria-label="Ngữ cảnh đơn nguồn của yêu cầu"><h3>Đối chiếu đúng vụ việc</h3><p>Mã yêu cầu: <code>{request.id}</code> · Phiên bản {request.version}</p><p>Mã đơn: <code>{request.order_id}</code></p>
  {context?<><h4>Store của đơn</h4><AdminStoreIdentity id={context.store_id} parties={parties}/><h4>Khách đặt hàng</h4><AdminCustomerIdentity id={context.customer_user_id} parties={parties}/><p>Đơn tạo lúc <time dateTime={context.order_created_at}>{new Date(context.order_created_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</time> (giờ Việt Nam). Trạng thái: {orderStatusLabel(context.order_status)}</p><p>Thanh toán: {context.payment_status?paymentStatusLabel(context.payment_status):'Chưa có dữ liệu đối chiếu'}</p><p>Đã thu: {context.collected_vnd===undefined?'Chưa có dữ liệu đối chiếu':money(context.collected_vnd)} · Đã hoàn: {context.refunded_vnd===undefined?'Chưa có dữ liệu đối chiếu':money(context.refunded_vnd)}</p></>:<p role="status">Bản đọc này chưa có đủ ngữ cảnh Store/khách và tiền. Đọc lại hoặc mở đơn nguồn trước khi xử lý; không suy từ số tiền giống nhau.</p>}
  <Link to={'/admin?tab=orders&q='+encodeURIComponent(request.order_id)}>Xem đơn nguồn để hỗ trợ</Link><p>Món, phân loại, lượng và giá bên dưới là dữ liệu đã chốt của đơn; nhãn tài khoản và Store là dữ liệu hiện tại.</p>
 </section>;
}
