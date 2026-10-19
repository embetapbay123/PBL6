# M2 / order

Owner: Hoa

- `POST /checkout/quotes` — quoteCheckout: **IMPLEMENTED**
- `POST /orders/batches` — confirmCheckout: **NOT_IMPLEMENTED**
- `GET /orders/batches/{id}` — getPurchaseGroupOrders: **IMPLEMENTED**
- `GET /me/orders` — listOwnOrders: **IMPLEMENTED**
- `GET /me/orders/{id}` — getOwnOrder: **IMPLEMENTED**
- `POST /me/orders/{id}/cancel` — cancelOwnOrder: **NOT_IMPLEMENTED**
- `GET /store/orders` — listStoreOrders: **IMPLEMENTED**
- `GET /store/orders/{id}` — getStoreOrder: **IMPLEMENTED**
- `PATCH /store/orders/{id}/status` — transitionStoreOrder: **IMPLEMENTED**
- `POST /store/orders/{id}/cancel` — cancelStoreOrder: **NOT_IMPLEMENTED**
- `POST /store/orders/{id}/cod-collection` — collectCod: **NOT_IMPLEMENTED**
- `POST /internal/reviews/eligibility` — VerifyReviewEligibility: **IMPLEMENTED**, HTTP 200, caller M1.

Đọc [bàn giao nhánh tổng](../../../../docs/implementation/hoa-consolidated-handoff.md) để biết code, test, migration và dependency. `IMPLEMENTED` là handler có nghiệp vụ trong nhánh này; issue chỉ Done sau review/merge/nghiệm thu. `NOT_IMPLEMENTED` có thể đã có một lát cắt nhưng chưa đủ luồng.

Quote tách theo Store, gọi M1 `QuoteVariants` để lấy giá và tồn kho thời gian thực, gọi M3 `ResolveCheckoutContext` để xác thực địa chỉ sở hữu và phí vận chuyển theo từng Store, phân bổ voucher Store và platform voucher theo tỷ lệ giá trị hàng (BR). Toàn bộ snapshot và request hash được lưu vào Redis với TTL 15 phút. BUG-QUOTE-01 đã được sửa qua `revalidateQuoteSnapshot`: khi `confirmCheckout` nhận yêu cầu, hệ thống tải lại toàn bộ upstream snapshot từ M1 và M3 trước bất kỳ thao tác reserve kho hay ghi DB nào; nếu phát hiện giá, tồn kho, phí ship, địa chỉ, hoặc quyền hạn thay đổi thì từ chối ngay với mã `QUOTE_CHANGED` (409) hoặc lỗi tương ứng. Confirm/cancel hợp lệ vẫn giữ 501 trước ghi cho đến khi hoàn thành orchestration bền vững (#22). COD gọi PaymentPort cùng manager; PaymentService đã có implementation trên main qua #90, không ghi tiền trong OrderRepository. Transition PENDING → CONFIRMED → PROCESSING → SHIPPED → COMPLETED chạy trong M2. Xem [đối chiếu task Hoa](../../../../docs/implementation/hoa-task-status.md).
