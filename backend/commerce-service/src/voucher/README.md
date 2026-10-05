# M2 / voucher

Owner: Hoa

- `POST /vouchers/validate` — validateVouchers: **NOT_IMPLEMENTED**
- `GET /store/vouchers` — listStoreVouchers: **IMPLEMENTED**
- `POST /store/vouchers` — createStoreVoucher: **IMPLEMENTED**
- `PATCH /store/vouchers/{id}` — updateStoreVoucher: **IMPLEMENTED**
- `GET /admin/vouchers` — listPlatformVouchers: **IMPLEMENTED**
- `POST /admin/vouchers` — createPlatformVoucher: **IMPLEMENTED**
- `PATCH /admin/vouchers/{id}` — updatePlatformVoucher: **IMPLEMENTED**
- `GET /store/vouchers/{id}/usage` — getStoreVoucherUsage: **IMPLEMENTED**
- `GET /admin/vouchers/{id}/usage` — getPlatformVoucherUsage: **IMPLEMENTED**

Đọc [bàn giao nhánh tổng](../../../../docs/implementation/hoa-consolidated-handoff.md) để biết code, test, migration và dependency. `IMPLEMENTED` là handler có nghiệp vụ trong nhánh này; issue chỉ Done sau review/merge/nghiệm thu. `NOT_IMPLEMENTED` có thể đã có một lát cắt nhưng chưa đủ luồng.

CRUD dùng lock/version/audit cùng transaction. Usage dựa trên quota ledger theo purchase group. Validate dùng quote thật và truyền lỗi dependency; lifecycle giữ/dùng/hoàn voucher còn là phần ORDER-02/04.
