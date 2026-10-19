# Hoa — task verification

Verified on 2026-10-13 against main, merged PRs, implementation and test sources. Owner remains Hoa (`mimidangeiu`). **Review means implementation is ready for review but acceptance is incomplete; it does not mean Done.** Partial scopes retain their existing planned status.

| Task | Status | Completed implementation and remaining work |
| --- | --- | --- |
| [CART-01 #3](https://github.com/embetapbay123/PBL6/issues/3) | Done | Read/update/remove, ownership/version/quantity and M1 quote checks accepted through #88. |
| [CART-02 #8](https://github.com/embetapbay123/PBL6/issues/8) | Done | Add/merge, trusted Product/Store mapping, concurrency and outbox accepted through #88. |
| [REVIEW-ELIG-01 #26](https://github.com/embetapbay123/PBL6/issues/26) | Done | M1 caller allowlist and Customer/Product/OrderItem eligibility accepted through #88. |
| [VOUCHER-02 #28](https://github.com/embetapbay123/PBL6/issues/28) | Done | Admin CRUD accepted through #88; lifecycle and Admin UI are separate tasks. |
| [VOUCHER-01 #27](https://github.com/embetapbay123/PBL6/issues/27) | Review | Store CRUD complete; remaining [two-Store/committed-redemption acceptance](voucher-01-acceptance.md). |
| [ORDER-03 #23](https://github.com/embetapbay123/PBL6/issues/23) | Review | Five Customer/Store/group read handlers exist; repository joins Payment/latest Refund. Verify real two-Customer/two-Store scope, group ownership, filters/pagination, PII and money-state responses. Seed Orders; do not wait for Confirm. |
| [ORDER-05 #25](https://github.com/embetapbay123/PBL6/issues/25) | Review | COD calls real PaymentService with the caller manager after scope/state/version/amount checks. #90 includes HTTP concurrent collection/rollback tests. Verify wrong Store/membership/state/version and repeat-request behavior; finish demo. Do not rewrite Payment logic. |
| [REPORT-01 #30](https://github.com/embetapbay123/PBL6/issues/30) | Review | Three handlers, SQL aggregates, typed M1 low-stock and M3 count adapters exist. Await real M3 Admin User/Store lists (#44), then verify source totals, date ranges, permissions, pagination and dependency errors. M1 low-stock is already available. |
| [MOB-01 #31](https://github.com/embetapbay123/PBL6/issues/31) | Review | Auth/Profile/Address screens/client, secure storage, refresh mutex and session restore exist. Await Trí's Auth #37/#38 and Android/API demo of refresh concurrency, logout/replay, lost permissions and app restore. |
| [MOB-03 #33](https://github.com/embetapbay123/PBL6/issues/33) | Review | Cart/quote/confirm UI, address/payment/Voucher inputs, stable retry key, expiry/race and explicit 501 handling exist. Await Confirm #22/Voucher #29 and real Android multi-Store/stock/price/timeout demo. Widget success is not a real purchase. |
| [ORDER-01 #21](https://github.com/embetapbay123/PBL6/issues/21) | Review | Quote orchestration completed (multi-Store separation, M1 QuoteVariants, M3 ResolveCheckoutContext shipping/address snapshot, voucher allocation, Redis 15-minute TTL). BUG-QUOTE-01 fixed via revalidateQuoteSnapshot wired into confirmCheckout: detects and rejects upstream price/stock/shipping/address/store/permission changes before any DB writes or reservations. Unit and regression tests passed. |
| [ORDER-02 #22](https://github.com/embetapbay123/PBL6/issues/22) | Todo — partial code | Valid Confirm still returns 501 before writes. Implement durable orchestration, group idempotency, atomic Order/Payment/Voucher and compensation. M1 reserve #14 and Payment create #51 are available. |
| [VOUCHER-03 #29](https://github.com/embetapbay123/PBL6/issues/29) | Todo — partial code | Usage and validation via Quote exist; reservation/redemption/release and concurrent Confirm lifecycle remain incomplete. |
| [ORDER-04 #24](https://github.com/embetapbay123/PBL6/issues/24) | Todo — Week 3, partial code | Transition/Shipment exists; both cancel handlers still return 501. Implement durable release/restock/refund and expiry compensation after Confirm. |
| [MOB-02 #32](https://github.com/embetapbay123/PBL6/issues/32) | Backlog — partial code | Search/category/pagination/detail/Variant/cart/recommendation clients exist. Detail images are still placeholders; finish image rendering and auxiliary-section error handling before real navigation/filter/consent acceptance. Catalog #11 is available. |
| [MOB-04 #34](https://github.com/embetapbay123/PBL6/issues/34) | Backlog | Full Order history/detail/cancel, Payment/Refund polling and Review screens are missing from the current feature tree. |
| [MOB-05 #35](https://github.com/embetapbay123/PBL6/issues/35) | Backlog | Consent dialog exists; Chat/session/history and Store application/invitation screens are missing. M4 adapters/fallback are available; provider disabled is not answer-quality evidence. |
| [MOB-06 #36](https://github.com/embetapbay123/PBL6/issues/36) | Todo — Week 3 start, Week 5 acceptance | Verify SDK/device and build/install an early APK this week; no verified release APK/device acceptance for the complete flow yet. Full acceptance remains due before the 03/11 demo. |

## Evidence and limits

- Member code consolidated in [#88](https://github.com/embetapbay123/PBL6/pull/88); real COD/Order–Payment integration in [#90](https://github.com/embetapbay123/PBL6/pull/90). Superseded PR closure does not mean task completion.
- Fresh local run from `backend`: `npm test -- tests/unit/order.test.ts tests/unit/voucher.test.ts tests/unit/report.test.ts tests/unit/cart.test.ts tests/unit/commerce-regression.test.ts` — **5 suites, 128 tests passed**.
- Integration sources reviewed: `commerce-regression.test.ts`, `payment.foundation.test.ts`, `handoff.test.ts`. No new database/API integration run is claimed.
- Mobile sources reviewed: feature screens/client, `api_contract_test.dart`, `checkout_regression_test.dart`, `widget_test.dart`. No new Flutter run/device demo is claimed.
- Review does not automatically change endpoint contract metadata. After remaining evidence passes review and merges, close the issue as completed and move its card to Done. Keep dependency implementation with its existing owner.
