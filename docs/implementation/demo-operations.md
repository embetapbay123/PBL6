# Demo operations: vouchers, stock and order returns

Scope confirmed on 27 October 2026. Preserve the four service boundaries and existing member ownership. Implement both failed-delivery returns and Customer returns after receipt; the initial return is for the complete Store Order, not partial lines or exchanges.

| Area | Required behavior |
| --- | --- |
| Voucher | Customer can browse eligible Store/platform codes, see constraints and estimated savings, select/remove them; final quote revalidates live stock, prices, scope and quotas. No invented codes or automatic 501 fallback. |
| Stock | Record date received, supplier/reference and reason. Only an authenticated Owner applies a stock change after explicit confirmation; a Seller can submit an adjustment proposal for Owner review. Approval, movement and audit share one M1 transaction and preserve the operation ID. |
| Inventory statistics/log | Show received, adjusted, returned and issued-to-order units separately, with date filters and booking timestamps. Issued stock is not automatically reported as completed sales. Completed sale units/revenue come from M2 reports. |
| Order detail | Show shipping snapshot, creation time, status history with times/actor/reason, processing chain, cancellation restrictions, Payment/Refund states and current Store stock where authorized. |
| Cancellation | Keep existing version checks and durable inventory compensation. A requested Refund is not a completed repayment. |
| Failed delivery | Owner records the failure while SHIPPED; goods remain out of stock until physical receipt is confirmed. |
| Customer return | Customer requests a full-order return after COMPLETED; Owner approves/rejects and records receipt/condition. Approval alone does not increase stock or refund money. |
| Return receipt | Resellable goods enqueue the existing idempotent RestockOrder command; damaged goods remain excluded from sale. Online refunds use the real Refund job; paid COD requires explicit Owner confirmation of the actual cash repayment. |

All writes use current versions and scoped authorization. Return receipt, durable inventory command and refund intent commit together in M2; provider/network calls remain outside transactions. Retries reuse operation IDs and original payloads. A repeated delivery or request cannot add stock or refund cash twice. Input errors, uncertain outcomes, provider failures and 501 endpoints stay visible.

Implementation/acceptance evidence and discovered defects will be recorded here and in the PR. Provider Refund availability and actual cash repayment require their own runtime evidence; tests never fabricate them.


## Implementation and verification

- OpenAPI 2.3.0 has 109 public and 11 internal operations, including nine added public operations; all DTO/type/fixture registries are regenerated. Migrations 001–003 remain unchanged. Apply M1 `005_stock_operations.sql` and M2 `011_order_returns.sql` together with the matching API/worker images.
- New backend entry points: `StockOperationsController/Service`, `OrderReturnController/Service`, `OrderService.suggestVouchers`. Order/Payment writes share the caller's EntityManager; provider calls stay in workers.
- Frontend: `VoucherPicker`, `StockOperationsPanel`, `OrderFacts`, `ReturnControls`, the existing Checkout/Store workspace/owned Order detail. Receipts and corrections are distinct; unknown legacy increases are not relabeled as receipts.
- Automated controls use disposable PostgreSQL schemas/container and fully intercepted browser fixtures. They cover proposals/approval, concurrent/repeated operations, scope/version failures, audit rollback, lost Restock ACK, damaged stock, online Refund intent, exact COD repayment and voucher scope/spend/quota. Existing suites remain enabled.
- Store reports count completed sale units for Orders created in the selected period, consistent with the existing revenue cohort. Stock movement filters use the receipt date when supplied and retain the server booking date.

Source/CI/public rollout results will be recorded in the PR. Until matching migrations, API, workers and web are deployed, this document is not a claim that the domain exposes the new flows. User testing can change demo counts; verification must compare against current API results, not reset or overwrite the dataset to match old expectations.
