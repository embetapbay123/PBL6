# M2 / payment

Owner: Công

- `POST /orders/{id}/payment-attempts` — createPaymentAttempt: **IMPLEMENTED on main (PR #90)**
- `GET /payments/{id}` — getPayment: **IMPLEMENTED on main (PR #90)**
- `POST /payment-callbacks/sandbox` — sandboxCallback: **NOT_IMPLEMENTED**
- `GET /orders/{id}/refund` — getOrderRefund: **NOT_IMPLEMENTED**
- `POST /payment-callbacks/sepay` — sepayCallback: **NOT_IMPLEMENTED**

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.

## Payment/COD handoff — PAY-01/PAY-04

Run M2 migration `005_payment_foundation.sql`; 001–004 remain unchanged. `PaymentService` must be constructed with the caller's active `EntityManager`. It never opens a transaction or calls a provider. Order belongs to Hoa; Payment/COD money writes belong to Công. `createForOrder` matches method/payable to the locked Order, creates one Payment and COD obligation, and records audit/idempotency atomically. Pass a stable UUID operation ID; replay returns the original result, changed payload returns 409. Optional `correlation_id` preserves request correlation in audit.

`recordCodCollection` requires SHIPPED/COD, PENDING Payment and exactly the Order payable/collectible amount. Collection, PaymentEvent, Payment and audit use the same manager; a subsequent Order failure rolls all of them back. Existing Hoa `collectCod` calls this port and returns HTTP 200 per contract. A second HTTP request with a stale Order version returns 409; direct worker/port replay uses the same operation ID. Completion/Shipment/Order version are still Hoa's responsibilities. Refund remains explicitly 501 (PAY-03); do not use it to report a successful cancellation/refund.

Payment read joins only M2 Order for Customer ownership. Attempt creation requires owned SANDBOX/AWAITING_PAYMENT, current version, unexpired Order and unpaid Payment. Concurrent/retried POST reuses the persisted active attempt/reference/QR; FAILED may retry, UNKNOWN must not produce a second reference. Legacy active attempts without persisted instructions require reconciliation (409), not fake backfill. QR instructions do not change Payment to SUCCEEDED; only verified callback processing can do that (PAY-02).

Configure **only an explicit test account** in the ignored local environment: `PAYMENT_PROVIDER_MODE=sepay_test`, `SEPAY_TEST_ACCOUNT`, `SEPAY_TEST_BANK`; recreate M2. Default is disabled, returning 503 before creating an attempt. `.env.example` has empty account/bank, no automatic fixture account. The adapter builds a URL locally per [SePay QR documentation](https://developer.sepay.vn/vi/tien-ich-khac/tao-qr-code); no provider request/debit runs inside or outside this transaction. Rendering/network failure does not prove payment failure/success; an UNKNOWN attempt remains UNKNOWN and needs PAY-02/PAY-03 reconciliation. No live account/provider certification is claimed by fixture tests.

Example body: `POST /orders/{id}/payment-attempts` with `{"expected_order_version":0}` and Customer bearer token. Poll `GET /payments/{id}`. Amount/reference are server-owned; adding a client amount or unknown field is 422. Confirm checkout remains 501 pending Hoa's durable orchestration and Thịnh's inventory commands.

Verification: `npm run build:backend`, `npm run test:backend`, Compose `tools npm run test:integration`. `tests/integration/payment.foundation.test.ts` exercises real PostgreSQL, concurrency/replay, zero-payable COD, transaction/audit rollback, ownership/version/expiry/disabled provider, persisted UNKNOWN and real HTTP COD. Test QR uses dummy instructions only, never a payment success.
