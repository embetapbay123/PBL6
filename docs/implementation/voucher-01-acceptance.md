# VOUCHER-01 — acceptance status

Updated: 2026-10-13. Owner: Hoa (`mimidangeiu`). [Issue #27](https://github.com/embetapbay123/PBL6/issues/27). Status: **Review; not Done**.

## Completed implementation

`listStoreVouchers`, `createStoreVoucher`, and `updateStoreVoucher` are implemented on main through [PR #88](https://github.com/embetapbay123/PBL6/pull/88). PR #73/#74 were closed as superseded, not rejected. Do not reimplement CRUD.

The implementation includes Owner/Store authorization, input validation, row locking, optimistic version checks, and audit in the same transaction. Tests cover a cross-Store update with mocks, HTTP CRUD/response shape/stale versions, and concurrent duplicate-code creation returning 409.

Evidence: `backend/tests/unit/voucher.test.ts` and `backend/tests/integration/commerce-regression.test.ts`. Existing CI evidence is recorded in issue #27; this status update does not claim a new integration run.

## Remaining acceptance for Hoa

- [ ] Add HTTP/PostgreSQL evidence with two Store Owners: list results remain scoped; Store B cannot update Store A's Voucher; failed writes leave Voucher and audit unchanged.
- [ ] Seed an already committed Voucher redemption and Order snapshot. Stop the Voucher and update permitted configuration through the API; assert committed redemption, discount amounts, and Order snapshot remain unchanged (BR-27).
- [ ] Record validity, discount bounds, usage/per-customer limits, and stale-version cases with request/response or named test evidence. Distinguish configuration validation from redemption quota consumption.
- [ ] Reviewer verifies the above evidence on main after the acceptance PR merges, then closes #27 as completed and moves the Kanban card to Done.

Use seeded committed records for this acceptance; full Checkout completion is not required. Reserve/commit/release quota and `validateVouchers` belong to [VOUCHER-03 #29](https://github.com/embetapbay123/PBL6/issues/29). Seller UI belongs to [SELL-03 #20](https://github.com/embetapbay123/PBL6/issues/20). Keep existing owners and scopes.

Suggested checks from `backend`: `npm test -- --runTestsByPath tests/unit/voucher.test.ts`, then `npm run test:integration -- --runTestsByPath tests/integration/commerce-regression.test.ts` with the integration environment configured. Add the remaining acceptance tests before treating a passing existing suite as full completion.
