# Real-service recovery and privacy acceptance

Owner: Công. Supports [PAY-02 #52](https://github.com/embetapbay123/PBL6/issues/52), [AI-01 #55](https://github.com/embetapbay123/PBL6/issues/55), [AI-03 #57](https://github.com/embetapbay123/PBL6/issues/57), [OPS-02 #60](https://github.com/embetapbay123/PBL6/issues/60), and limited ownership/scope checks for [OPS-01 #59](https://github.com/embetapbay123/PBL6/issues/59). Order remains Hoa's module, Inventory remains Thịnh's module and M3 remains Trí's module.

## Run

Prerequisites: Docker Desktop/Engine with Compose v2, Node.js 22 and Python 3.12. Run from the repository root:

```powershell
python scripts/test_cross_service_acceptance.py
python scripts/run_cross_service_acceptance.py
```

No local `.env`, application account or provider token is needed. The runner builds the checked-out Node and AI backends, generates fresh credentials and RSA keys, applies every migration, seeds fresh databases, and starts actual M1/M2/M3/M4 APIs plus their event/recovery workers. All four services retain separate database credentials. M4 explicitly uses `AI_MODE=real` and `CHAT_PROVIDER=none`: actual Catalog, ownership, database and fallback behavior without calling a model or reading operator keys.

The private Compose project has a generated `pbl6-acceptance-<12 hex>` name, its own image/volumes/network and **no published ports**. It does not join the demo network or use its volumes, images or credentials. The proxy forwards successful Inventory operations to real M1; it has no database connection or fake success response. Only this isolated stack routes M2 through that proxy. It can reject a command or discard a successful M1 acknowledgement, while preserving the original payload and service authentication.

## Scenarios

| Phase | Evidence |
| --- | --- |
| `payment` | Actual Customer login → Address → Cart → Quote → Confirm → PaymentAttempt; invalid signature/amount rejected without receipt; three concurrent same-event callbacks produce one receipt/event; real Consume failure leaves Order RECOVERING and Payment persisted; M1 applies Consume but loses ACK; retry preserves operation ID/payload hash/correlation, consumes once and completes the follow-up. Saved Confirm replays; changed payload returns 409. A second Customer cannot read the Order/Payment. |
| `rollback-prepare` | With the recovery worker stopped, a test-only PostgreSQL trigger fails the real Payment INSERT with SQLSTATE 40001. Order/items/history/Payment/COD/audit roll back, Cart survives and actual M1 reservation remains. The durable checkout attempt stays READY. No application Payment port is replaced. |
| `rollback-recover` | A newly started real worker resumes that READY attempt, creates exactly one Order/Payment, consumes once and removes the committed Cart item. The temporary trigger is removed. |
| `expiry` | Only the fixture Order deadline is advanced. The real worker expires it and releases actual M1 stock. A locally signed late callback creates one Refund REQUESTED/job; replay does not consume stock or change an unrelated Order. Follow-up remains PENDING because no Refund provider has executed it. |
| `multistore` | Actual Store/platform Voucher APIs and Customer Cart/Quote/Confirm create mixed COD/online Orders in two Stores. Verify exact discount allocation, four quota redemptions, independent Consume, actual HMAC callback, paid-Order cancellation with lost Restock ACK, one Refund REQUESTED job, immutable Confirm replay/current group read, sibling isolation and Store cancellation. Both cancellation POSTs must return contract HTTP 200. |
| `authorization` | Real Guest/Customer/Owner/Seller/Admin identities across two Stores: all-resource Customer ownership, Store Product/Order/COD/Voucher scope, old-token permission revocation/membership lock, actual Store/User lock APIs, session revocation after unlock, mass-assignment and guard-before-validation/internal caller allowlists. Fixture grant changes test live enforcement, not the unfinished M3 permission-management API. |
| `tracking` | Actual M1 search/view, M2 Cart and paid-online/COD Order completion publish their outboxes through RabbitMQ into M4. Verify consent/default/validation/version/ownership, VIEW=1/CART=3/PURCHASE=5, dataset revision, inbox/Order dedup, exact rejected-event DLQ, database fault/requeue with atomic inbox rollback, retention and withdrawal/regrant. Real M3 UserLocked purges behavior and revokes the session; ACTIVE must not emit a false lock. Actual StoreStatusChanged suspension/reactivation updates M4 and filters current recommendations. |
| `chat` | Build the index from real Catalog, then update/stop a Product through Owner API. ProductChanged invalidates the index; chat/for-you read current data and exclude stopped Products. Verify Customer/Guest ownership, hashed Guest key, text-only paginated history, explicit provider-none fallback, persistent budget 429 and expired-session denial. Actual Admin/Owner metrics match DB trace scopes, preserve unknown token/cost as null and evaluation as NOT_RUN. |

Successful HTTP responses are checked against the generated contract. The Quote check also guards its required HTTP 200 response, instead of NestJS's default POST 201. Phase checks fail the command and CI on an unexpected result; no skipped scenario counts as a pass.

The callback is **locally signed test traffic**, not delivery from SePay's dashboard or a real bank transfer. The dummy account is used only inside the private stack; no QR is opened or paid. Mixed-Store/Voucher allocation and sibling effects are now covered by the separate `multistore` phase; this does not establish provider-backed Refund or every supported payment combination.

Broker replay controls reuse actual producer payloads. One fresh envelope exercises Order-level dedup; a wrong-producer envelope exercises DLQ. The retry/retention/budget/session-age fixtures are explicitly controlled test data in disposable databases. None of these events constitutes observed marketplace data, recommendation quality evidence, real cash collection or generated-model acceptance. Targeted PostgreSQL consent/chat regression suites also run inside the isolated M4 container, including contract checks for `MODEL_GENERATED` and `CATALOG_CHANGED` responses using labeled selector test doubles.

## Reports and teardown

The command prints the path to `artifacts/acceptance/<run>/evidence/report.json`. It includes the checked-out revision, dirty flag, backend source hash, phase outcomes, per-phase JSON hashes and cleanup result. A dirty run is development evidence; use an immutable committed revision and passing CI for handoff. Editing backend source during a run invalidates the result.

Only `report.json` is intended for publishing. Do not commit/upload `compose.private.json`, keys, `docker.private.log` or `recovery.private.json`. They stay in ignored `artifacts/`. Reports contain named checks and sanitized failure codes, not tokens, passwords, HMAC values or address/QR payloads. CI's [dedicated workflow](../../.github/workflows/cross-service-acceptance.yml) uploads only the sanitized aggregate report.

The runner validates its unique project before starting and immediately before `down --volumes`; it removes only those containers/volumes and its uniquely named Node/AI images. A killed host process cannot guarantee teardown. If interrupted, inspect the generated project name first, then use its private config to remove **that project only**; never run cleanup against `pbl6` or the live Compose file.

## Remaining acceptance

This suite does not close #52/#60 by itself. Still required: actual SePay Test delivery on a new Order created by Checkout, further crash/lease/uncertain-payment scenarios and provider-backed Refund/reconciliation. Candidate deployment/backup evidence is tracked in the [runtime handoff](cong-week4-handoff.md). Full Store/membership event lifecycle, real recommendation/chat quality/cost evaluation, sustained 100-user load, Web and APK/device acceptance remain separate Week 4 work. Review-ready consent/tracking evidence is separate from closing all AI task dependencies. See [Week 4](week4.md), [Order recovery](order-recovery.md), [Refund handoff](refund-runtime-handoff.md) and [capacity runner](capacity-acceptance.md).
