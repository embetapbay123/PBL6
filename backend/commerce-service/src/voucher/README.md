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

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.
