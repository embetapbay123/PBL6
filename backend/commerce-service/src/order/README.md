# M2 / order

Owner: Hoa

Order filters and manual Shipment evidence: see [fulfillment contract and UI](../../../../docs/implementation/order-fulfillment.md). Shipping requires carrier/reference; completing requires collected payment plus explicit delivery confirmation. Both use the existing transition endpoint and one caller-owned transaction. Apply additive migration 012 before deploying this API/UI pair.

- `POST /checkout/quotes` — quoteCheckout: **IMPLEMENTED**
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

Quote validates the current M1 price/stock/version and M3 address/shipping snapshot before any Inventory write. Confirm now persists its attempt and exact Reserve payload before network effects, then creates Orders, Payment, Voucher redemptions, Cart removal and its saved response atomically. COD returns PREPARING until the durable Consume ACK; online Orders wait for proven Payment success. Timeout/restart recovery uses actual reservation IDs and immutable command payloads. See [Order recovery](../../../../docs/implementation/order-recovery.md) for migration 010, worker deployment, retry behavior and test limits.

Cancellation now locks scoped Order/Payment/inventory rows, validates version/state and payment certainty, closes pending Payment bookkeeping, and queues immutable Release/Restock work in the same transaction. Unknown Consume outcomes are replayed before Restock; real reservation IDs are required. Successful online payments request Refund through the Payment port without claiming provider completion. Committed Voucher quota and sibling Orders are preserved. See the recovery runbook and PostgreSQL tests for the operational limits. Existing transition, Shipment, COD and review eligibility behavior stays in place. Broad task acceptance and Android/provider demos remain separate from passing coordinator tests.
