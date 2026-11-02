# Thông báo trong ứng dụng — M2

GET /me/notifications phân trang sự kiện thật từ order_status_history, payment_event và return_status_history của các Order thuộc Customer đăng nhập. Tổng chưa đọc tính trên toàn bộ tập, không chỉ trang hiện tại. POST /me/notifications/{id}/read xác minh lại ownership rồi lưu read marker idempotent.

Không chuyển callback thanh toán thành tuyên bố đã thu tiền; giao diện yêu cầu mở Order để đọc trạng thái hiện tại. Polling chỉ chạy khi trang hiển thị, cách 15 giây. Không có push/email notification trong module này.

Triển khai migrations 011 và 012 trước ứng dụng mới; 012 mở rộng notification kind cho RETURN_STATUS. Xem [handoff](../../../../docs/implementation/frontend-verification-handoff.md) về kiểm thử unit, HTTP thật và fixture browser.
