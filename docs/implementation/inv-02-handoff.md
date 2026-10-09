# Bàn giao INV-02 — Reserve / Consume / Release

**Issue:** [#14](https://github.com/embetapbay123/PBL6/issues/14) · **Nhánh:** `feat/inv-02-reservation` · **Ưu tiên:** P0

## File đã code

| File | Việc đã làm |
| --- | --- |
| [inventory.repository.ts](../../backend/catalog-service/src/inventory/inventory.repository.ts) | Thêm lock `inventory` theo thứ tự `variant_id`; đọc/ghi `inventory_reservation`, `reservation_item`, `stock_movement` |
| [inventory.service.ts](../../backend/catalog-service/src/inventory/inventory.service.ts) | `reserve`, `consume`, `release` — transaction + idempotency |
| [inventory.mapper.ts](../../backend/catalog-service/src/inventory/inventory.mapper.ts) | `reservationView`, chuẩn hoá `expires_at` sang ISO |
| [inventory.internal.controller.ts](../../backend/catalog-service/src/inventory/inventory.internal.controller.ts) | Nối 3 route, gỡ stub, `@HttpCode(200)` |
| [unit test](../../backend/tests/unit/inventory-reservation.test.ts) | 3 test mapper (live vs replay) |
| [integration test](../../backend/tests/integration/inventory-reservation.test.ts) | 8 test trên PostgreSQL + HTTP thật |
| [internal-api.json](../../docs/contracts/internal-api.json) | 3 operation → `IMPLEMENTED` |

## Chức năng đã hoàn thành

- `ReserveInventory`: giữ hàng nhiều SKU/nhiều Order trong **một** transaction.
- `ConsumeReservation`: trừ tồn thật và giải phóng hold.
- `ReleaseReservation`: chỉ giải phóng hold, không đổi tồn thật.
- Cả ba idempotent theo `operation_id`; cùng ID khác payload → 409.

## Cách làm — 4 điểm chính

1. **Không oversell**: `SELECT … FOR UPDATE` trên `inventory`, luôn `ORDER BY variant_id` nên mọi command đa SKU khoá cùng thứ tự → không deadlock, không đọc dữ liệu cũ. DB có `CHECK(quantity >= reserved_quantity)` làm chốt cuối.
2. **Nguyên tử**: kiểm **toàn bộ** dòng trước khi ghi; cộng dồn nhu cầu theo Variant nên hai dòng cùng Variant không cùng vượt qua một lần kiểm cũ. Thiếu một SKU ⇒ rollback cả transaction.
3. **Idempotent**: dùng `once(manager, key, operation_id, payload, effect)` của shared; hiệu ứng và `operation_result` cùng transaction.
4. **Không lặp hiệu ứng**: consume/release chỉ tác động `reservation_item` còn `ACTIVE`; gọi lại trả `ALREADY_APPLIED`; đi ngược trạng thái (release sau consume) trả 409.

## Mã lỗi

| HTTP | Mã | Trường hợp |
| --- | --- | --- |
| 401 | `INVALID_SERVICE_IDENTITY` | Caller không phải M2 |
| 404 | `INVENTORY_NOT_FOUND` | Variant không có tồn kho trong Store |
| 404 | `RESERVATION_NOT_FOUND` | Reservation không tồn tại hoặc thuộc Order khác |
| 409 | `INSUFFICIENT_STOCK` | Không đủ tồn khả dụng (không giữ phần nào) |
| 409 | `IDEMPOTENCY_CONFLICT` | Cùng operation ID, payload khác |
| 409 | `RESERVATION_EXISTS` | Order đã có reservation |
| 409 | `RESERVATION_STATE_CONFLICT` | Release sau consume hoặc ngược lại |
| 409 | `RESERVATION_EXPIRED` | Consume reservation đã hết hạn (release vẫn cho phép) |
| 422 | `VALIDATION_FAILED` / `INVALID_EXPIRY` / `DUPLICATE_RESERVATION_LINE` | Input sai, `expires_at` quá khứ, trùng Variant trong một Order |

## Kiểm chứng

```powershell
npm run build:backend
npm run test:backend
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build m1
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools npm run test:integration
```

Kết quả: build đạt · unit **171 test** đạt · tích hợp **71 test** đạt (10 suite).

## Chưa làm

- `RestockOrder` (INV-03 #15) và worker đối soát reservation hết hạn.
- Reserve **không** gọi M3: đây là command ghi, M2 đã kiểm Store khi quote.
- Chưa benchmark tải nhiều reservation đồng thời trên nhiều SKU.
