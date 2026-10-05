# M1 / inventory

Owner: Thịnh

- `GET /store/inventory` — listStoreInventory: **NOT_IMPLEMENTED**
- `POST /store/inventory/adjustments` — adjustInventory: **NOT_IMPLEMENTED**
- `GET /store/inventory/movements` — listStockMovements: **NOT_IMPLEMENTED**

## Internal operation (không qua gateway)

- `POST /internal/variants/quote` — QuoteVariants: **IMPLEMENTED** — M2 gọi để lấy snapshot giá/tồn hiện hành; chỉ đọc, không reserve và không trừ tồn. Caller allowlist `M2` do `ServiceGuard` chặn; lỗi M3 fail closed với 503. Chi tiết ở [inventory.service.ts](inventory.service.ts).

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.
