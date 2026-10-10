# Bàn giao INV-01 — Tồn kho Store: đọc, điều chỉnh, lịch sử, low-stock

**Issue:** [#13](https://github.com/embetapbay123/PBL6/issues/13) · **Nhánh:** `feat/inv-01-inventory-ops` · **Ưu tiên:** P0

## File đã code

| File | Việc đã làm |
| --- | --- |
| [inventory.repository.ts](../../backend/catalog-service/src/inventory/inventory.repository.ts) | `pageInventory`, `lockStoreInventory`, `setQuantity`, `pageMovements`, `pageLowStock`, `insertStockMovement` |
| [inventory.service.ts](../../backend/catalog-service/src/inventory/inventory.service.ts) | `listStoreInventory`, `adjustInventory`, `listStockMovements`, `listLowStockVariants`; `hasInventoryPermission` |
| [inventory.mapper.ts](../../backend/catalog-service/src/inventory/inventory.mapper.ts) | `inventoryBalance`, `stockMovementView` |
| [inventory.controller.ts](../../backend/catalog-service/src/inventory/inventory.controller.ts) *(mới)* | 3 endpoint công khai, thay skeleton |
| [inventory.internal.controller.ts](../../backend/catalog-service/src/inventory/inventory.internal.controller.ts) | Nối `low-stock`, gỡ stub |
| `backend/catalog-service/src/inventory/inventory.skeleton.controller.ts` | **Đã xoá** — cả 3 method đều được implement thật, tránh đăng ký trùng route |
| [main.ts](../../backend/catalog-service/src/main.ts) | Đăng ký `InventoryController` thay skeleton |
| [unit test](../../backend/tests/unit/inventory-ops.test.ts) · [integration test](../../backend/tests/integration/inventory-ops.test.ts) | 5 + 5 test |
| [openapi.json](../../docs/contracts/openapi.json) · [internal-api.json](../../docs/contracts/internal-api.json) | 3 endpoint công khai + 1 internal → `IMPLEMENTED` |

## Chức năng đã hoàn thành

- `listStoreInventory`: trang tồn kho của Store, có `quantity` / `reserved_quantity` / `available_quantity` / `version`.
- `adjustInventory`: nhập/xuất/điều chỉnh tồn, ghi `stock_movement` **và** audit trong cùng transaction.
- `listStockMovements`: lịch sử biến động kho của Store.
- `ListLowStockVariants` (internal): Variant có tồn khả dụng ≤ ngưỡng.

## Cách làm — 5 điểm chính

1. **Store scope lấy từ membership**, không từ request: `context.store_membership.store_id`. Đoán ID Store khác cũng không chạm được dữ liệu; query luôn có `store_id` trong mệnh đề `WHERE`.
2. **Quyền kiểm trên context sống**: `hasInventoryPermission` cho `OWNER` luôn đúng, `SELLER` cần nhóm `inventory.store.*`. Thu hồi quyền có hiệu lực ngay ở request kế tiếp, kể cả khi JWT cũ còn hạn.
3. **Điều chỉnh nguyên tử + idempotent**: `SELECT … FOR UPDATE` theo `(store_id, variant_id)`, kiểm `expected_version`, rồi `once(manager, 'M1.Inventory.adjust', operation_id, …)`; cửa hàng nằm trong fingerprint nên cùng operation ID không dùng lại được cho Store khác.
4. **Bất biến tồn kho**: không cho tồn xuống âm và **không cho xuống dưới `reserved_quantity`** — nếu không sẽ phá reservation đã cam kết. DB cũng có `CHECK (quantity >= reserved_quantity)` làm chốt cuối.
5. **Low-stock không bao giờ trả rỗng khi lỗi**: M1 tự resolve token với M3; token sai/không thuộc Store → 403, M3 lỗi/timeout → 503. Chỉ khi thật sự không có Variant nào dưới ngưỡng mới trả `total: 0`.

## Mã lỗi

| HTTP | Mã | Trường hợp |
| --- | --- | --- |
| 401 | `UNAUTHENTICATED` / `INVALID_SERVICE_IDENTITY` | Thiếu token, hoặc caller nội bộ không phải M2 |
| 403 | `FORBIDDEN` | Không có membership/quyền kho, hoặc xem kho Store khác |
| 404 | `INVENTORY_NOT_FOUND` | Variant không có tồn kho trong Store |
| 409 | `VERSION_CONFLICT` | `expected_version` cũ |
| 409 | `INSUFFICIENT_STOCK` | Số lượng sau điều chỉnh âm |
| 409 | `RESERVED_STOCK_CONFLICT` | Giảm xuống dưới lượng đang giữ cho Order |
| 409 | `IDEMPOTENCY_CONFLICT` | Cùng operation ID, payload khác |
| 422 | `VALIDATION_FAILED` | Body/query sai contract |

## Kiểm chứng

```powershell
npm run build:backend
npm run test:backend
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build m1
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools npm run test:integration
```

Kết quả sau tích hợp INV-02 và review: build đạt · unit **176 test** đạt · tích hợp **79 test** đạt (11 suite). Adjustment kiểm quyền wildcard hoặc `inventory.store.read_adjust`, từ chối reason trắng và quantity vượt PostgreSQL INTEGER; không ghi StockMovement/audit khi bị từ chối.

## Chưa làm

- `RestockOrder` và worker đối soát reservation hết hạn thuộc INV-03 #15.
- `adjustInventory` chưa nối Seller UI; đây vẫn là tiêu chí chưa đạt của INV-01 #13, phối hợp Seller Web/SELL-02 #19 và giữ owner Thịnh.
- Chưa benchmark tải khi nhiều Seller điều chỉnh cùng lúc.
