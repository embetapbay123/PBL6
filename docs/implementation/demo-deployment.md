# Deploy a reviewed demo revision

Owner: Công, OPS-02 [#60](https://github.com/embetapbay123/PBL6/issues/60). This runbook covers deployment and restore evidence, not full feature/provider/UI acceptance.

Use a clean checkout of the reviewed commit. The running checkout may hold uncommitted work; leave it alone. Local secrets and persistent data belong to the **runtime root**, while Docker build contexts and the gateway configuration come from the **candidate checkout**.

```powershell
# Run from the clean candidate checkout. Plan first; no service changes.
python scripts/deploy_candidate.py --runtime-root C:/PBL6
# Apply only after reviewing/checking this revision.
python scripts/deploy_candidate.py --runtime-root C:/PBL6 --apply
```

The existing project must be named `pbl6`, with healthy Postgres/Redis/RabbitMQ and existing `.env`/RSA keys. The command refuses dirty candidates. It does not copy, print or regenerate secrets. All application images have revision-specific tags and OCI revision labels; M1/M2/M3 and their workers use the same Node image, and M4/API and tracking worker use the same AI image.

The normal sequence is: validate configuration and existing dependencies; build; stop gateway and application writers; dump all four databases with before/after schema/count/row hashes; restore each dump into a **new** `restore_drill_*` database and verify it against its backup-time manifest; migrate; start matching API/Web/workers; verify exact image revisions, migrations, internal readiness, M1/M2/M3 publishers and the M4 consumer; reopen gateway and check Web/Catalog. The default preserves data. The optional reset below recreates only the four named databases after backup/restore verification. Neither path removes volumes, recreates dependencies, transfers bank money or calls model generation.

## Optional synthetic demo reset

The observed deployment target is **https://demo.congnguyen.me**, local Docker project **`pbl6`**, gateway `127.0.0.1:8080`. Confirm this exact target before applying a destructive reset. The private QA project `pbl6-fe-verify` and its gateway `127.0.0.1:18080` are separate and must remain untouched.

```powershell
# Safe plan: no changes to services or databases.
python scripts/deploy_candidate.py --runtime-root C:/PBL6 --reset-demo
# DESTRUCTIVE: only after the owner confirms the target and removal of its old data.
python scripts/deploy_candidate.py --runtime-root C:/PBL6 --reset-demo --confirm-reset pbl6:m1,m2,m3,m4 --apply
```

Reset stops ingress/writers, verifies queues, backs up and restore-verifies all four databases, then drops/recreates **m1, m2, m3, m4**, restores their role isolation/extensions, migrates and starts the new revision. It seeds before reopening ingress. RSA keys, `.env`, Redis, RabbitMQ, Tunnel and volumes are retained. New synthetic identities receive fresh UUIDs, so retained tokens for deleted users cannot resolve to the new accounts. Cached browser screens may still require sign-out/reload.

Current `.bootstrap.v1` and `.tracking.v1` queues must have no pending work. Unknown nonempty queues block reset. Known retired `pbl6.m1.bootstrap`/`pbl6.m2.bootstrap` and dead-letter queues are retained for inspection; current workers do not consume those retired names. No queue is purged or rebound to a new reader.

`scripts/seed_marketplace_demo.cjs` defaults to a read-only `--plan`. Writing additionally requires `--apply`, `DEMO_SEED_ALLOWED=1`, non-production mode, all four database configurations and an existing private `SEED_PASSWORD`. It refuses non-demo identities/products. Do **not** run the old minimal seed first. A partially created set of orders stops for inspection rather than silently creating replacements.

The dataset `marketplace-demo-v1` contains synthetic names/addresses, seven verified accounts, two active Stores with return addresses, twelve products, thirty-four variants, stock boundaries 0/1/many, local watermarked illustrations, two Store vouchers and one platform voucher. The default password is the existing local `SEED_PASSWORD`; it is never written to the report or Git.

| Account | Role / scope |
|---|---|
| `admin@pbl6.test` | ADMIN, platform administration |
| `customer.a@pbl6.test`, `customer.b@pbl6.test` | Independent Customers |
| `owner.a@pbl6.test`, `owner.b@pbl6.test` | STORE_OWNER of An Nhiên / Mây Xanh |
| `seller.a@pbl6.test` | SELLER in An Nhiên: product, inventory and order permissions |
| `seller.b@pbl6.test` | SELLER in Mây Xanh: inventory permission only |

The database membership value `OWNER` is exposed as the application role `STORE_OWNER`; `SELLER` remains an employee. Verified synthetic identities and employee memberships are fixture setup via M3 SQL, **not** proof of verification-email or invitation delivery. Product, inventory, Store approval, address, voucher, checkout, status, return and money states use public service API handlers, with real workers and final SQL reconciliation.

For the publicly accessible synthetic demo, append **`--demo-login`** to the deployment command. It enables `DEMO_LOGIN_ENABLED=1` only for M3 and builds Web with `VITE_DEMO_LOGIN_ENABLED=1`; both default off. `/login` then offers seven quick-login buttons with role/Store descriptions. `POST /auth/demo-login` accepts only an account key from the fixed seed allowlist, requires the configured Web Origin, shares the normal login rate budget, and refuses production mode, missing/non-demo/unverified/locked identities. Credentials remain server-side; normal password verification, HttpOnly refresh cookies, CSRF, current permissions, session generation and cross-tab synchronization still apply. Anyone using this demo can select its Admin, so enable it only for this intentionally shared synthetic dataset. Deploy again without the flag to remove UI access and disable the endpoint; existing sessions retain their normal expiry/revocation rules.

Seventeen sample orders cover pending, confirmed, processing, shipped, completed, cancelled, awaiting online payment, a completed full COD refund, an approved exchange and an open delivery-failure return. Online orders have **no payment attempt or bank callback**. Manual COD collection/refund attestations are clearly synthetic, not bank-verified transfers. Voucher codes are `DEMO-A-10K`, `DEMO-B-10K`, `DEMO-SAN-5K`; the example one-shirt orders total 164,000/174,000 VND including shipping and discounts.

Immediately after seed, SQL checks require 17 orders, four collection ledger entries totalling 676,000 VND, one refund/receipt for 164,000 VND, two return requests, one delivery-return case, 34 valid inventory balances and zero balance/ledger discrepancies. A seed rerun before manual test activity must not duplicate these effects. The private `dataset.json` links the generated objects and reconciliation. This fixture is suitable for manual operational testing; it is not the 300-product/100-order load dataset or real-provider acceptance.

Default Compose includes `worker-m3`, so UserLocked and StoreStatusChanged events leave the M3 outbox. The gateway still excludes internal service routes. The existing Tunnel container is not recreated or removed; it reconnects to the same gateway service. Expect a maintenance window after builds finish: callbacks may receive a retryable transport error while ingress is closed. Inspect pending payment receipts/follow-ups after resuming; never manually mark them successful.

Public key material is immutable within a process after its first configuration read. If key contents change at the same path, restart every API/worker with matching public/private material; replacing a mounted file alone does not rotate the cached verifier. User/session/permission/Store/consent checks remain live. Candidate migrations include append-only M4 `008_chat_thinking_trace.sql`; readiness and deployment migration inventory verify it before reopening ingress. `CHAT_THINKING=auto` remains the portable default; explicit DeepSeek modes require actual provider verification and local configuration.

## Evidence and failure handling

Private artifacts are under `artifacts/deployments/<UTC>/`: non-secret override, stage logs, backup pointer and report. Database dumps/manifests are under `artifacts/backups/`; restore verification is under `artifacts/verification/`. Keep them ignored and access controlled: backups contain personal data, and private logs may contain configuration diagnostics. Only a sanitized summary may enter GitHub.

On failure after maintenance starts, the command closes the gateway and leaves data and failed drill databases intact. Inspect the failed stage locally, fix the candidate, and rerun. Do not blindly restart an old API/worker against newer migrations. Prefer a compatible forward fix; rollback requires reviewing schema compatibility and reconciling provider activity. Do not restore a dump over a live database using this tool. For recovery, restore into new databases, verify business/provider reconciliation, then perform a separately reviewed cutover.

Backups compare stable before/after table contents and schema; they are not an atomic snapshot across four services or external payment systems. Restore checks include inventory bounds, Payment refund bounds, unique active default addresses and chat ownership, plus row hashes. They do not prove every cross-service business invariant.

## Remaining acceptance

For the curated catalog refresh, use `--demo-login --curated-catalog` without `--reset-demo`. See [catalog refresh evidence and scope](marketplace-ui-refresh.md). The upgrade preserves old transactions, retires only allowlisted legacy listings and adds the new synthetic catalog/orders through APIs. A read-only preflight runs before maintenance, and the ordinary backup/restore verification still precedes changes.

After deployment, verify authenticated roles/two Stores, checkout/payment/recovery, consent and real UI/device flows using their own issue criteria. A public 200 or matching image revision cannot close OPS-01, OPS-02 or DEMO-01 by itself. Refund remains disabled until an actual supported provider is configured and tested. Representative AI quality, measured load and the Android/full-demo rehearsals require separate evidence.

For an existing seeded demo with `AI_MODE=real`, run the bounded read-only authentication audit:

```powershell
Get-Content scripts/verify_demo_runtime.cjs -Raw | docker exec -i pbl6-m3-1 node
if ($LASTEXITCODE -ne 0) { throw 'Runtime audit failed' }
```

It reads local credentials inside M3, creates/revokes fresh Web sessions, verifies roles, cookie flags, CSRF/rotation/replay, guard-before-validation, AI scope, unsigned callback and internal-route protection. It never prints tokens/PII or mutates business records. An existing cross-Customer Order check reports NOT_RUN when there is no matching Order; do not seed an invented Order to turn it green. Full Seller/two-Store/permission-revocation and device tests remain separate.
