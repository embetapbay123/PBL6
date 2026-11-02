import type {OperationOutputs} from '../api/operations.generated';
type Order=OperationOutputs['getOwnOrder'];
/** Older DTOs may omit payment status; the server still validates every attempt. */
export function canStartOrderPayment(order:Order){
 return order.status==='AWAITING_PAYMENT'&&order.payment_method==='SANDBOX'&&order.amounts.payable_vnd>0&&(!order.payment_status||['PENDING','FAILED'].includes(order.payment_status));
}
export function orderNextStep(order:Order,store=false){
 if(order.status==='PREPARING')return 'Hệ thống đang xác nhận đặt hàng và tồn kho. Đọc lại đơn; không đặt lại khi chưa rõ kết quả.';
 if(order.status==='RECOVERING')return 'Hệ thống đang khôi phục kết quả đặt hàng. Đọc lại đơn hoặc liên hệ hỗ trợ; không tạo giao dịch thay thế khi chưa rõ kết quả.';
 if(['CANCELLED','EXPIRED'].includes(order.status))return 'Đơn đã đóng; không giao hàng hoặc thu thêm tiền. '+(order.refund_status==='SUCCEEDED'?'Đã xác nhận hoàn tiền.':order.refund_status?'Khoản hoàn đang được xử lý hoặc đối soát; xem kết quả riêng, chưa coi là đã hoàn.':'Kiểm tra tình trạng tiền và liên hệ cửa hàng nếu đã chuyển tiền nhưng chưa được ghi nhận.');
 if(order.payment_status==='UNKNOWN')return 'Chưa rõ kết quả thanh toán. Đọc lại đơn hoặc liên hệ hỗ trợ để đối soát; không chuyển tiền hoặc thu lại khi chưa xác định.';
 if(order.status==='AWAITING_PAYMENT')return canStartOrderPayment(order)?(store?'Chờ khách thanh toán. Chưa bàn giao hàng; đọc lại đơn để nhận kết quả.':'Chờ bạn thanh toán. Nếu đã chuyển tiền, kiểm tra kết quả trước khi trả thêm; không dùng mã đã hết hạn.'):'Đang kiểm tra kết quả thanh toán. Đọc lại đơn; không thanh toán hoặc bàn giao thêm khi trạng thái chưa nhất quán.';
 if(order.status==='PENDING')return store?'Cửa hàng cần kiểm tra hàng và xác nhận đơn.':'Chờ cửa hàng kiểm tra hàng và xác nhận đơn. Chưa cần thanh toán thêm.';
 if(order.status==='CONFIRMED')return store?'Nhân viên lấy hàng theo danh sách, kiểm màu/size và số lượng.':'Cửa hàng đã nhận đơn và sẽ chuẩn bị hàng. Muốn sửa món hoặc số lượng, hủy và đặt lại khi còn được phép.';
 if(order.status==='PROCESSING')return store?'Kiểm đủ món và thông tin người nhận trước khi bàn giao thủ công.':'Cửa hàng đang lấy và kiểm hàng. Không sửa món hoặc hủy trực tiếp ở giai đoạn này; liên hệ cửa hàng nếu có vấn đề.';
 if(order.status==='SHIPPED')return store?'Theo dõi kết quả giao. Chỉ hoàn tất khi giao thành công và đã xác nhận đủ tiền. Giao thất bại phải ghi hồ sơ hoàn về.':'Chờ kết quả giao. '+(order.amounts.payable_vnd===0?'Đơn 0đ không cần trả tiền.':order.payment_status==='SUCCEEDED'?'Đã ghi nhận đủ tiền; không trả thêm.':order.payment_method==='COD'?'COD chưa ghi nhận thu tiền; chỉ trả đúng tổng tiền khi nhận hàng.':'Tiền online cần được đối soát trước khi trả thêm.')+' Liên hệ cửa hàng về đơn này nếu giao thất bại.';
 if(order.status==='COMPLETED')return 'Đã hoàn tất. Có thể đánh giá hoặc gửi yêu cầu đổi/trả theo chính sách đã chốt; trạng thái hoàn tiền được theo dõi riêng.';
 return 'Đọc lại trạng thái đơn và liên hệ hỗ trợ trước khi thực hiện thao tác tiếp theo.';
}
