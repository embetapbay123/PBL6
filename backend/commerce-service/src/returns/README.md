# Đổi trả — M2

Áp dụng migration 012_return_requests.sql sau 011_notifications.sql trước khi chạy bản ứng dụng mới. Yêu cầu áp dụng toàn bộ Order COMPLETED, thuộc Customer; mỗi Order có một yêu cầu REFUND hoặc EXCHANGE. Tạo lại cùng loại/lý do trả yêu cầu cũ, khác nội dung trả 409.

- Store có OWNER hoặc SELLER với order.store.read_status_cancel được xử lý Order của Store mình; Admin cần platform.admin.
- REQUESTED → APPROVED/REJECTED cần phản hồi; APPROVED → RECEIVED xác nhận hàng trả đã nhận.
- EXCHANGE: RECEIVED → EXCHANGE_SENT cần tham chiếu giao hàng, sau đó Customer sở hữu xác nhận COMPLETED.
- REFUND: RECEIVED → COMPLETED chỉ khi refund SUCCEEDED và payment.refunded_vnd bằng toàn bộ payable_vnd. Không suy ra tiền đã hoàn từ quyết định đổi trả.

Mọi chuyển trạng thái khóa Order trước request, kiểm tra expected_version, ghi lịch sử và audit cùng transaction. Lịch sử phát sinh thành thông báo riêng của người mua.

Worker refund cũng enqueue yêu cầu REFUND/RECEIVED của Order COMPLETED đã thu online đầy đủ và có PaymentAttempt SUCCEEDED. Operation ID giữ nguyên ID yêu cầu đổi trả, nên retry không tạo refund thứ hai. Kernel kiểm tra lại điều kiện đổi trả khi claim và khi ghi nhận chứng từ. Provider disabled vẫn giữ REQUESTED, không đổi Payment thành REFUNDED. Hoàn COD chưa có adapter; không suy diễn đã trả tiền. Nghiệm thu chuyển tiền thật sau giao hàng còn chờ tích hợp tài chính.

Kiểm thử unit về quyền, version, trạng thái, bằng chứng số tiền; HTTP/PostgreSQL về toàn bộ luồng đổi hàng; trình duyệt fixture về xác nhận, xung đột và chặn hoàn tất refund chưa xác nhận. Chi tiết trong [handoff](../../../../docs/implementation/frontend-verification-handoff.md).
