# Order confirmation and recovery

Owner: Hoa. M1 owns Inventory commands; Công owns the M2 Payment/Refund provider adapters. This integration uses those ports and does not declare a transfer/refund successful without provider evidence.

## Installation

Apply the append-only M2 migration `010_checkout_recovery.sql` through the existing migration command before starting M2 and its worker. Migrations 001–003 are unchanged. Deploy API and worker from the same revision. The existing `worker-m2` Compose service runs `OrderService.recoverOrders()` after each outbox batch.

Use the [candidate deployment and restore runbook](demo-deployment.md) to update an existing demo safely from a clean worktree while retaining local configuration and persistent data. It also starts the M3 outbox publisher.

Existing Orders without `order_inventory_state` are not retroactively assigned invented reservation IDs. Reconcile those Orders against M1 before enabling cancellation; missing context returns 409. An incomplete legacy idempotency record returns 503 and needs reconciliation; a saved legacy success response remains replayable.

## Confirm flow

1. Validate Customer, quote ownership/expiry, canonical request/snapshot, current M1 price/stock/version, M3 address/shipping and Voucher eligibility. Require exactly one payment method per selected Store.
2. Persist a unique `(customer_user_id, key)` attempt before sending any Inventory command. Its plan contains stable group/Order IDs, correlation, original expiry and complete Reserve payload. The lease is claimed in a short transaction; HTTP is outside transactions.
3. Reserve inventory with that exact command. A lost ACK remains RESERVING. A valid ACK and its actual reservation IDs are persisted as READY.
4. In one caller transaction, lock/check Cart rows, reserve Vouchers in stable order, create Orders/items/history and Payments, store inventory context, commit Voucher allocations, remove selected Cart items and save the full Confirm response. A business rejection rolls back all those effects and creates durable COMPENSATING work. Unknown database outcomes are reread before deciding whether to compensate.
5. COD initially returns PREPARING and enqueues a persisted Consume command. Only an acknowledged Consume makes the actual Order PENDING. SANDBOX starts AWAITING_PAYMENT; the worker requires Payment success and a successful attempt before Consume. Read the current Order/group API to observe progress. Same-key replay returns the original saved response, not a newly constructed snapshot.

Never generate a new key to resolve a timeout. Retry the same key and payload; a changed payload returns 409. An active/uncertain attempt returns `503 ORDER_RECOVERY_PENDING`. The worker resumes without Redis or the original HTTP request. No HTTP command is retried inside one request.

## Durable records

| Record | Phases / meaning |
| --- | --- |
| `checkout_attempt` | RESERVING → READY → COMMITTED; or COMPENSATING → FAILED after every Release ACK. Immutable plan and exact command replay, saved failure/response, per-attempt lease/fencing and retry schedule. |
| `order_inventory_state` | Last acknowledged RESERVED / CONSUMED / RELEASED / RESTOCKED, actual M1 reservation IDs and immutable line snapshots. One immutable pending CONSUME / RELEASE / RESTOCK command; a conflicting command cannot replace an uncertain result. |

Leases last 30 seconds; dependency calls retain the existing 1-second timeout. Workers back off up to 60 seconds and preserve command IDs, full payloads and correlation across restarts. Failed reconciliation of one Order is recorded and deferred without blocking unrelated rows. Unpaid Orders are rescheduled and batches are ordered by next-attempt time so they cannot starve later paid Orders. Database outages retain leases until expiry. Do not manually clear a command just because a network call failed.

An unpaid expired online Order is closed and released. UNKNOWN payment or inconsistent success proof remains RECOVERING for reconciliation, without releasing the hold. A late proven transfer on a terminal Order queues a real Refund job; it does not mark the Refund or Payment follow-up complete. Refund provider acceptance remains a separate requirement.

Only agreed event schemas are emitted by the existing lifecycle. Undeclared `OrderCreated`/`OrderCancelled` events are not used as command queues.

## Cancellation

Customer/Store cancellation locks the owned Order, checks expected version and allowed state, then locks Payment and inventory context in the same caller transaction. UNKNOWN payments, collected COD, missing actual reservation context or missing successful online-payment proof reject before any committed change.

Cancellation records history/audit and closes pending Payment/attempt/COD bookkeeping through the Payment port. A paid online Order requests a real Refund and job in this transaction. The response reports REQUESTED, never successful Refund. Stock recovery is queued atomically: Release for known RESERVED, Restock for known CONSUMED. An uncertain Consume is kept unchanged and replayed before deciding to Restock. No provider/Inventory network call runs in the cancellation transaction. Repeated stale-version cancellation returns 409; the persisted worker command performs the single effect.

Voucher committed redemption quota remains consumed after cancellation; it is not restored and sibling Orders are not canceled. Existing active uncommitted group reservations use the Voucher port. Expiry uses the same durable stock and Payment closure machinery. Legacy Orders missing inventory context return 409 for reconciliation.

## Verification

Run `npm run build:backend`, `npm run test:backend`, then `docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools npm run test:integration`. The `order-recovery.test.ts` suite creates/migrates/drops a unique M2 PostgreSQL schema, and uses an explicit M1 command-ledger stand-in. It does not truncate shared tables, reset seed data or contact a payment provider. Without `M2_DATABASE_URL` the suite is explicitly skipped.

The tests cover same-key concurrency/conflicts, competing keys for one Cart, lost Reserve/Consume/Release ACKs, restart without Redis, READY recovery, stale leases, atomic Payment/Voucher/Cart rollback, mixed-Store allocations, online success proof/follow-up and expiry/late-refund handling. Stand-ins establish coordinator behavior; real M1/M3/SePay, Android and full-flow acceptance still belong to the open task issues.

The additional [real-service acceptance runner](cross-service-acceptance.md) starts actual M1/M2/M3 HTTP services and the durable worker in a fresh private stack. It verifies online callback/Consume recovery, one stock effect after a lost real M1 ACK, real Payment INSERT rollback, worker restart and late callback after expiry. It uses locally signed callbacks and never claims bank delivery or executed Refund. Run it with `python scripts/run_cross_service_acceptance.py`; reports and cleanup stay separate from the demo stack.
