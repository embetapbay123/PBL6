# Live demo web — Customer, Store and Admin

The default web entry uses `frontend/src/live/LiveApp.tsx`. It brings the existing emerald/slate demo design to the real API routes, without mounting the mock `AppProvider`. A real login determines the visible roles and Store scope. API failures remain errors; the UI never switches to local mock records when a request fails.

## Entry points

| Entry | Data and purpose |
| --- | --- |
| `/` | Live catalog, category filters, search, price sorting, pagination, Product detail and recommendations |
| `/login` | Real Auth forms and the current account; logout clears the scoped UI |
| `/cart`, `/checkout` | Owned cart and addresses; per-Store COD/SePay choice; Store/platform voucher inputs; authoritative quote breakdown |
| `/customer/orders` | Owned history, detail, permitted cancellation and a link to online payment |
| `/customer/settings` | Consent, Store application and invitation flows |
| `/seller` | Store overview; menu follows the resolved membership permissions |
| `/seller/products` | Management list including nonpublic Products and the existing active-Product editor |
| `/seller/inventory` | Actual quantity/reserved/available balances and versioned adjustments with a required reason |
| `/seller/orders` | Store order detail, legal status changes, cancellation and explicit cash-receipt confirmation for COD |
| `/seller/vouchers` | Owner-only list, create, stop and usage, including a percentage discount cap |
| `/seller/settings`, `/seller/reports` | Owner-only name/shipping updates and server financial reports by date |
| `/seller/staff` | Existing Owner staff and invitation management |
| `/admin?tab=dashboard` | Existing live dashboard, Users, Stores, roles, taxonomy/moderation, platform orders/vouchers and AI metrics; URL and browser history select the tab |
| `/admin/store-applications` | Existing Store approval flow |
| `/?mode=mock` | Original independent local-data demo, including its simulated account switching/mailbox/payment buttons |
| `/?mode=api-tools` | Original API scaffold for development troubleshooting |

`SANDBOX` is the current online-payment contract value. The live checkout labels it as a SePay transfer and links to the existing PaymentAttempt/QR page. Creating an Order does not confirm payment. No callback simulator, paid/refunded toggle, sample address or fabricated delivery date is added to the live UI.

## Mutation and identity controls

- Query caches and mounted private screens are separated by user and resolved role/Store context. An invitation/context change resets the scoped screens; reopen the invitation list to see the accepted state.
- A quote is bound to its exact cart/address/payment/voucher input. Changing inputs disables confirmation until the replacement quote arrives. Draft voucher text only applies after **Áp dụng ưu đãi**.
- An uncertain checkout preserves its original body and idempotency key, including payment methods and vouchers, in user-namespaced session storage. A manual retry or reload reuses them. A definitive quote conflict requires reviewing a new quote.
- Inventory adjustments preserve their operation ID, original version and payload across uncertain responses/reload. They never automatically retry. Session storage is namespaced by user, Store and Variant; if storage is unavailable the pending request remains in memory only.
- Store order commands send the displayed `expected_version`. An error blocks further commands until a fresh read. COD requires confirming the exact cash amount first; only an API-confirmed successful collection permits completion.
- Store and platform voucher commands use distinct typed operations. Store IDs come from server membership, not editable form input. Voucher updates use the fetched version and refresh after a conflict.
- Optional Product metadata enriches cart rows without deciding checkout prices. If metadata fails, the row retains its identifier and a visible loading-failure note. Only the server quote supplies final totals.

## Verification and remaining scope

Build with `npm --prefix frontend run build`. `frontend/tests/live-market.spec.ts` intercepts every API request and covers the new portals, phone layout, permission denial, version conflicts, immutable stock retries, percentage voucher creation and mixed-payment checkout recovery. Existing Auth, Order, Payment, settings, Review and AI browser suites remain enabled. The full CI runs against disposable integration services; do not run write-oriented CI tests against the shared demo data.

Existing module owners and acceptance criteria remain unchanged. This integration does not complete the remaining Seller Product/Variant/image forms (#9/#10), the management-detail contract for nonpublic Product editing, backend Review (#16/#69), real email delivery, provider Refund or Android device acceptance. Backend 501/503 responses stay visible. Public deployment and actual browser checks must be recorded separately from source/fixture verification.
