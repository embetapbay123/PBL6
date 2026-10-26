# M2 / voucher

Owner: Hoa

- `POST /vouchers/validate` — validateVouchers: **IMPLEMENTED**
- `GET /store/vouchers` — listStoreVouchers: **IMPLEMENTED**
- `POST /store/vouchers` — createStoreVoucher: **IMPLEMENTED**
- `PATCH /store/vouchers/{id}` — updateStoreVoucher: **IMPLEMENTED**
- `GET /admin/vouchers` — listPlatformVouchers: **IMPLEMENTED**
- `POST /admin/vouchers` — createPlatformVoucher: **IMPLEMENTED**
- `PATCH /admin/vouchers/{id}` — updatePlatformVoucher: **IMPLEMENTED**
- `GET /store/vouchers/{id}/usage` — getStoreVoucherUsage: **IMPLEMENTED**
- `GET /admin/vouchers/{id}/usage` — getPlatformVoucherUsage: **IMPLEMENTED**

Đọc [bàn giao nhánh tổng](../../../../docs/implementation/hoa-consolidated-handoff.md) để biết code, test, migration và dependency. `IMPLEMENTED` là handler có nghiệp vụ trong nhánh này; issue chỉ Done sau review/merge/nghiệm thu. `NOT_IMPLEMENTED` có thể đã có một lát cắt nhưng chưa đủ luồng.

CRUD dùng lock/version/audit cùng transaction. Usage dựa trên quota ledger theo purchase group. Validate dùng quote thật và truyền lỗi dependency. Các helper giữ/chốt/release đã có; việc nối Confirm/Cancel/expiry vào chúng vẫn thuộc ORDER-02/04 và chưa được nghiệm thu bởi PR này.

## Transaction handoff — PR #105

All three helpers accept the caller's active `EntityManager`; a global manager is rejected with
`VOUCHER_REQUIRES_CALLER_TRANSACTION`. They never open an independent transaction or call a provider.
Use the normal PostgreSQL `READ COMMITTED` transaction, as the existing Order/Payment code does.

- `reserveVoucher(manager, input)`: reserve a group/Customer/Store/amount/expiry payload once. An
  identical active or committed replay returns the original ID. Different payloads return 409;
  released or expired active reservations cannot be reactivated. Store vouchers require their exact
  Store; platform vouchers require `store_id: null`. A group has one Customer, at most one voucher
  per Store and one platform voucher. Quota counts distinct purchase groups, including current holds.
- `commitVoucherRedemptions(manager, groupId, rows)`: persist the complete Order group first, then
  pass allocations for **all** held vouchers together. Rows must match Order group/Customer/Store
  and the `store_discount_vnd` / `platform_discount_vnd` snapshots. Include all nonzero platform
  shares; zero shares are optional. The total must equal the reserved discount. Missing, expired,
  released, stopped, mismatched or over-quota reservations fail before ledger writes. Identical
  committed replay is read-only, including after a later cancellation or voucher stop/expiry.
- `releaseVoucherReservations(manager, groupId)`: releases only uncommitted holds, including expired
  ones, after M2 has decided release is appropriate. Repeating it is harmless. It never restores a
  redeemed quota or recalculates a sibling Order. `findActiveReservationsByPurchaseGroup` excludes
  expired/released/committed records.

Lock order is **Orders (sorted) → group advisory lock → Vouchers (sorted) → reservations** during
commit. Reserve/release take only the group/voucher locks; do not acquire Order locks after those.
When reserving multiple vouchers in one transaction, call `reserveVoucher` in sorted `voucher_id`
order so different purchase groups use the same lock order.
Keep Order persistence, voucher commit, Payment, audit and outbox in the caller transaction so an
exception rolls everything back. Audit/events remain the Order orchestration's responsibility.
Do not use the older raw `OrderRepository.recordVoucherRedemption` to bypass reservation checks.

Executable examples and PostgreSQL acceptance cases:
[`voucher-lifecycle.test.ts`](../../../tests/integration/voucher-lifecycle.test.ts).
The test creates temporary vouchers/Orders and cleans them up; it does not modify seed stock,
call payment providers or claim that checkout orchestration is implemented.

Current acceptance and remaining integration: [VOUCHER-03 handoff](../../../../docs/implementation/voucher-03-handoff.md).
