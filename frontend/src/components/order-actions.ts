import type {OperationOutputs} from '../api/operations.generated';
type Order=OperationOutputs['getOwnOrder'];
export function codToCollect(order: Order) {
  return order.payment_method === "COD" &&
    order.payment_status === "PENDING" &&
    !["CANCELLED", "EXPIRED"].includes(order.status)
    ? order.amounts.payable_vnd
    : 0;
}
/** Older DTOs may omit payment status; the server still validates every attempt. */
export function canStartOrderPayment(order:Order){
 return order.status==='AWAITING_PAYMENT'&&order.payment_method==='SANDBOX'&&order.amounts.payable_vnd>0&&(!order.payment_status||['PENDING','FAILED'].includes(order.payment_status));
}
export function orderNextStep(order:Order,store=false){
 if(['GHN','PLATFORM'].includes(order.shipping_mode??'')&&order.status==='PROCESSING')return store?'Đóng gói và đặt lịch lấy hàng.':'Chờ cửa hàng bàn giao cho hãng vận chuyển.';
 if(['GHN','PLATFORM'].includes(order.shipping_mode??'')&&order.status==='SHIPPED')return order.shipping_delivered_at?'Đã giao hàng, đang xác nhận thanh toán.':'Theo dõi hành trình giao hàng bên dưới.';
 if(order.status==='PREPARING')return 'Đang xác nhận đơn. Vui lòng chờ, không đặt lại.';
 if(order.status==='RECOVERING')return 'Đang kiểm tra kết quả đặt hàng. Không đặt hoặc thanh toán lại.';
 if(['CANCELLED','EXPIRED'].includes(order.status))return 'Đơn đã đóng. '+(order.refund_status==='SUCCEEDED'?'Đã hoàn tiền.':order.refund_status?'Khoản hoàn vẫn đang xử lý.':'Nếu đã trả tiền, liên hệ cửa hàng để kiểm tra.');
 if(order.payment_status==='UNKNOWN')return 'Chưa rõ kết quả thanh toán. Liên hệ hỗ trợ, không trả thêm tiền.';
 if(order.status==='AWAITING_PAYMENT')return canStartOrderPayment(order)?(store?'Chờ khách thanh toán trước khi giao hàng.':'Thanh toán để tiếp tục. Nếu đã trả tiền, kiểm tra kết quả trước.'):'Đang kiểm tra thanh toán. Không trả thêm tiền.';
 if(order.status==='PENDING')return store?'Kiểm tra hàng và xác nhận đơn.':'Chờ cửa hàng xác nhận đơn.';
 if(order.status==='CONFIRMED')return store?'Chuẩn bị đúng phân loại và số lượng đã đặt.':'Cửa hàng đang chuẩn bị hàng.';
 if(order.status==='PROCESSING')return store?'Kiểm đủ hàng và địa chỉ trước khi bàn giao.':'Cửa hàng đang đóng gói đơn.';
 if(order.status==='SHIPPED')return store?'Chỉ hoàn tất sau khi giao thành công và thu đủ tiền.':order.amounts.payable_vnd===0?'Đơn 0đ, không cần trả tiền.':order.payment_status==='SUCCEEDED'?'Đã thanh toán đủ, không trả thêm.':order.payment_method==='COD'?'Trả đúng tổng tiền khi nhận hàng.':'Chờ xác nhận thanh toán, không trả thêm.';
 if(order.status==='COMPLETED')return store?undefined:'Đã hoàn tất. Bạn có thể đánh giá hoặc yêu cầu đổi trả.';
 return 'Làm mới đơn hoặc liên hệ hỗ trợ.';
}
