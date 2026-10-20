# VOUCHER-03 — transaction and quota handoff

Owner remains **Hoa (mimidangeiu)**. [PR #105](https://github.com/embetapbay123/PBL6/pull/105)
delivers the reservation/redemption/release helpers for [issue #29](https://github.com/embetapbay123/PBL6/issues/29).

## Fixed review findings

- **BUG-VCH-03-01:** a redemption now requires a matching live reservation and the complete persisted
  Order group. Customer, Store, immutable Order discount snapshots, total reservation amount, voucher
  validity and total/per-Customer quota are checked before any ledger write. Empty/partial payloads
  cannot skip held vouchers or discounted Orders.
- **BUG-VCH-03-02:** reserve no longer uses an upsert that overwrites amount/expiry while retaining a
  different Customer. Identical replay returns the existing ID; conflicting payload returns 409.
  Released/expired active reservations cannot become active again.

All mutations require the caller's active `EntityManager`. Group/voucher locks serialize competing
quota operations. The whole group is committed atomically; identical committed replay is read-only.
A platform voucher counts once per purchase group despite multiple Order allocation rows. Cancelling
one sibling never returns the redeemed quota or recalculates another Order's discount.

Read the helper signatures, lock order, lifecycle rules and error boundaries in the
[module README](../../backend/commerce-service/src/voucher/README.md). The executable caller-owned
transaction/rollback and multi-Store examples are in
[voucher-lifecycle.test.ts](../../backend/tests/integration/voucher-lifecycle.test.ts).

## Verification

Local verification of this fix:

- Backend build and all **202 unit tests** passed.
- **24 real PostgreSQL lifecycle cases** passed: immutable replay; global/per-Customer quota races;
  missing, expired, released and stopped reservations; wrong Customer/Store/Order/discount/allocation;
  concurrent commit/release and commit replay; full platform allocation; group atomicity; reduced quota;
  caller rollback; terminal quota after cancellation.
- Docs, OpenAPI and runtime DTO/fixture drift checks passed (99 public + 11 internal operations).

The new PostgreSQL suite uses temporary UUID vouchers/Orders and cleans them up. It does not modify
seed stock, call an online Payment/Refund provider or treat a fixture as a completed financial flow.
CI on the PR is the source for full Web, Python, Flutter and cross-service suite results.

## Remaining owner integration

Hoa still connects these helpers to [ORDER-02 #22](https://github.com/embetapbay123/PBL6/issues/22)
and [ORDER-04 #24](https://github.com/embetapbay123/PBL6/issues/24):

1. Reserve the chosen vouchers with one immutable group payload and a future expiry; use sorted
   voucher IDs when reserving several within one transaction.
2. Create all Order snapshots, commit all voucher allocations, and persist Payment/audit/outbox with
   the same transaction manager. Any exception must roll back the complete group.
3. On failure before group commit, decide and explicitly release uncommitted holds. After successful
   commit, Cancel/expiry must leave redemption and sibling snapshots unchanged.
4. Attach real Confirm/Cancel/expiry API and worker recovery evidence before closing full #29.

This PR does not implement checkout Confirm, Cancel or a scheduled financial reconciliation worker.
No migration 001–003 was modified and no new public/internal API or DTO was introduced by the fix.
