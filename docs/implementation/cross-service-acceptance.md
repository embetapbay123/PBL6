# Real-service recovery acceptance

Owner: Công. Supports [PAY-02 #52](https://github.com/embetapbay123/PBL6/issues/52), [OPS-02 #60](https://github.com/embetapbay123/PBL6/issues/60), and two Customer ownership checks for [OPS-01 #59](https://github.com/embetapbay123/PBL6/issues/59). Order remains Hoa's module and Inventory remains Thịnh's module.

## Run

Prerequisites: Docker Desktop/Engine with Compose v2, Node.js 22 and Python 3.12. Run from the repository root:

```powershell
python scripts/test_cross_service_acceptance.py
python scripts/run_cross_service_acceptance.py
```

No local `.env`, application account or provider token is needed. The runner builds the checked-out backend, generates fresh credentials and RSA keys, applies every migration, seeds fresh M1/M2/M3 databases, and starts the actual APIs and M2 recovery worker. M1/M2/M3 retain separate database credentials. PostgreSQL also creates the M4 database for the migration runner; M4 is not started or evaluated here.

The private Compose project has a generated `pbl6-acceptance-<12 hex>` name, its own image/volumes/network and **no published ports**. It does not join the demo network or use its volumes, images or credentials. The proxy forwards successful Inventory operations to real M1; it has no database connection or fake success response. Only this isolated stack routes M2 through that proxy. It can reject a command or discard a successful M1 acknowledgement, while preserving the original payload and service authentication.

## Scenarios

| Phase | Evidence |
| --- | --- |
| `payment` | Actual Customer login → Address → Cart → Quote → Confirm → PaymentAttempt; invalid signature/amount rejected without receipt; three concurrent same-event callbacks produce one receipt/event; real Consume failure leaves Order RECOVERING and Payment persisted; M1 applies Consume but loses ACK; retry preserves operation ID/payload hash/correlation, consumes once and completes the follow-up. Saved Confirm replays; changed payload returns 409. A second Customer cannot read the Order/Payment. |
| `rollback-prepare` | With the recovery worker stopped, a test-only PostgreSQL trigger fails the real Payment INSERT with SQLSTATE 40001. Order/items/history/Payment/COD/audit roll back, Cart survives and actual M1 reservation remains. The durable checkout attempt stays READY. No application Payment port is replaced. |
| `rollback-recover` | A newly started real worker resumes that READY attempt, creates exactly one Order/Payment, consumes once and removes the committed Cart item. The temporary trigger is removed. |
| `expiry` | Only the fixture Order deadline is advanced. The real worker expires it and releases actual M1 stock. A locally signed late callback creates one Refund REQUESTED/job; replay does not consume stock or change an unrelated Order. Follow-up remains PENDING because no Refund provider has executed it. |

Successful HTTP responses are checked against the generated contract. The Quote check also guards its required HTTP 200 response, instead of NestJS's default POST 201. Phase checks fail the command and CI on an unexpected result; no skipped scenario counts as a pass.

The callback is **locally signed test traffic**, not delivery from SePay's dashboard or a real bank transfer. The dummy account is used only inside the private stack; no QR is opened or paid. The unrelated Order check does not prove mixed-Store sibling allocation; that broader acceptance remains open.

## Reports and teardown

The command prints the path to `artifacts/acceptance/<run>/evidence/report.json`. It includes the checked-out revision, dirty flag, backend source hash, phase outcomes, per-phase JSON hashes and cleanup result. A dirty run is development evidence; use an immutable committed revision and passing CI for handoff. Editing backend source during a run invalidates the result.

Only `report.json` is intended for publishing. Do not commit/upload `compose.private.json`, keys, `docker.private.log` or `recovery.private.json`. They stay in ignored `artifacts/`. Reports contain named checks and sanitized failure codes, not tokens, passwords, HMAC values or address/QR payloads. CI's [dedicated workflow](../../.github/workflows/cross-service-acceptance.yml) uploads only the sanitized aggregate report.

The runner validates its unique project before starting and immediately before `down --volumes`; it removes only those containers/volumes and its uniquely named backend image. A killed host process cannot guarantee teardown. If interrupted, inspect the generated project name first, then use its private config to remove **that project only**; never run cleanup against `pbl6` or the live Compose file.

## Remaining acceptance

This suite does not close #52/#60 by itself. Still required: the approved candidate deployed through the public gateway, actual SePay Test delivery on an Order created by Checkout, mixed-Store/Voucher boundaries, further crash/lease/uncertain-payment scenarios, provider-backed Refund/reconciliation, and backup/restore evidence. M4 consent/event processing, real recommendation/chat evaluation, sustained 100-user load, Web and APK/device acceptance are separate Week 4 work. See [Week 4](week4.md), [Order recovery](order-recovery.md), [Refund handoff](refund-runtime-handoff.md) and [capacity plan](performance-and-capacity.md).
