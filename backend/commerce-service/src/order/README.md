# M2 / order

Owner: Hoa

- `POST /checkout/quotes` — quoteCheckout: **NOT_IMPLEMENTED**
- `POST /orders/batches` — confirmCheckout: **IMPLEMENTED**
- `GET /orders/batches/{id}` — getPurchaseGroupOrders: **IMPLEMENTED**
- `GET /me/orders` — listOwnOrders: **IMPLEMENTED**
- `GET /me/orders/{id}` — getOwnOrder: **IMPLEMENTED**
- `POST /me/orders/{id}/cancel` — cancelOwnOrder: **IMPLEMENTED**
- `GET /store/orders` — listStoreOrders: **IMPLEMENTED**
- `GET /store/orders/{id}` — getStoreOrder: **IMPLEMENTED**
- `PATCH /store/orders/{id}/status` — transitionStoreOrder: **IMPLEMENTED**
- `POST /store/orders/{id}/cancel` — cancelStoreOrder: **IMPLEMENTED**
- `POST /store/orders/{id}/cod-collection` — collectCod: **NOT_IMPLEMENTED**
- `POST /internal/reviews/eligibility` — VerifyReviewEligibility: **IMPLEMENTED**, HTTP 200, caller M1.

Đọc [bàn giao nhánh tổng](../../../../docs/implementation/hoa-consolidated-handoff.md) để biết code, test, migration và dependency. `IMPLEMENTED` là handler có nghiệp vụ trong nhánh này; issue chỉ Done sau review/merge/nghiệm thu. `NOT_IMPLEMENTED` có thể đã có một lát cắt nhưng chưa đủ luồng.

Quote gọi ResolveCheckoutContext thật; confirm đã implement đầy đủ orchestration: revalidate quote trước ghi DB/reserve (BUG-QUOTE-01), idempotency nhóm theo Idempotency-Key, M1 ReserveInventory, voucher reservation theo thứ tự voucher_id, tạo Order/OrderItem riêng từng Store, commit voucher allocations, tạo Payment qua PaymentPort trong cùng transaction EntityManager, và compensation ReleaseReservation khi DB fail. Cancel (cancelOwnOrder & cancelStoreOrder) đã hoàn thành: kiểm tra expected_version, quyền sở hữu/cửa hàng, trạng thái hủy hợp lệ (AWAITING_PAYMENT/PENDING/CONFIRMED), cập nhật trạng thái CANCELLED kèm history, hủy payment hoặc gọi requestRefund nếu đã thanh toán online, gọi M1 RestockOrder (cho đơn đã consume) hoặc ReleaseReservation (cho hold AWAITING_PAYMENT), ghi audit và outbox OrderCancelled. COD gọi PaymentPort cùng manager; PaymentService đã có implementation trên main qua #90, không ghi tiền trong OrderRepository. ORDER-03/ORDER-05 ở Review, còn nghiệm thu scope/demo; metadata endpoint chưa tự nâng chỉ vì chuyển thẻ. Transition PENDING → CONFIRMED → PROCESSING → SHIPPED → COMPLETED chạy trong M2. PENDING chỉ được tạo sau khi checkout/payment đã consume kho. SHIPPED tạo Shipment mô phỏng; COMPLETED yêu cầu thu đủ tiền và chuyển Shipment sang DELIVERED. Order/history/Shipment/audit/outbox dùng cùng transaction; Shipment thiếu trả 409 và rollback. Xem [đối chiếu task Hoa](../../../../docs/implementation/hoa-task-status.md).
