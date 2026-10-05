# M2 / order

Owner: Hoa

- `POST /checkout/quotes` — quoteCheckout: **NOT_IMPLEMENTED**
- `POST /orders/batches` — confirmCheckout: **NOT_IMPLEMENTED**
- `GET /orders/batches/{id}` — getPurchaseGroupOrders: **IMPLEMENTED**
- `GET /me/orders` — listOwnOrders: **IMPLEMENTED**
- `GET /me/orders/{id}` — getOwnOrder: **IMPLEMENTED**
- `POST /me/orders/{id}/cancel` — cancelOwnOrder: **NOT_IMPLEMENTED**
- `GET /store/orders` — listStoreOrders: **IMPLEMENTED**
- `GET /store/orders/{id}` — getStoreOrder: **IMPLEMENTED**
- `PATCH /store/orders/{id}/status` — transitionStoreOrder: **NOT_IMPLEMENTED**
- `POST /store/orders/{id}/cancel` — cancelStoreOrder: **NOT_IMPLEMENTED**
- `POST /store/orders/{id}/cod-collection` — collectCod: **NOT_IMPLEMENTED**
- `POST /internal/reviews/eligibility` — VerifyReviewEligibility: **IMPLEMENTED**, HTTP 200, caller M1.

Đọc [bàn giao nhánh tổng](../../../../docs/implementation/hoa-consolidated-handoff.md) để biết code, test, migration và dependency. `IMPLEMENTED` là handler có nghiệp vụ trong nhánh này; issue chỉ Done sau review/merge/nghiệm thu. `NOT_IMPLEMENTED` có thể đã có một lát cắt nhưng chưa đủ luồng.

Quote cần ResolveCheckoutContext thật; confirm/cancel hợp lệ vẫn 501 trước ghi. COD gọi PaymentPort cùng manager, PaymentService hiện 501; không ghi tiền trong OrderRepository. Transition chưa thay thế orchestration kho/refund/shipment còn thiếu.
