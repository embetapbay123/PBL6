# INV-03 — Restock Order và đối soát reservation hết hạn

**Issue:** [#15](https://github.com/embetapbay123/PBL6/issues/15) · **Nhánh:** `feat/inv-03` · `RestockOrder` → **IMPLEMENTED**

## File đã code

| File | Việc |
| --- | --- |
| [inventory.repository.ts](../../backend/catalog-service/src/inventory/inventory.repository.ts) | `restockStock`, `hasRestockMovement`, `overdueReservations` (chỉ đọc) |
| [inventory.service.ts](../../backend/catalog-service/src/inventory/inventory.service.ts) | `restockOrder`, `overdueReservations`, hàm thuần `restockMatches` |
| [inventory.internal.controller.ts](../../backend/catalog-service/src/inventory/inventory.internal.controller.ts) | Nối `POST /internal/inventory/restock`, gỡ stub cuối cùng |
| [unit test](../../backend/tests/unit/inventory-restock.test.ts) · [integration test](../../backend/tests/integration/inventory-restock.test.ts) | 3 + 6 test |

## Đã làm được gì

- **`RestockOrder`**: hoàn kho cho Order đã `CONSUMED` (hủy đơn/hoàn hàng), ghi `stock_movement` reason `RESTOCK`.
- **Chỉ hoàn kho khi đã consume**: reservation còn `ACTIVE`/`RELEASED`/`EXPIRED` bị từ chối `409 RESTOCK_NOT_ALLOWED`, vì tồn chưa từng bị trừ — hoàn lúc đó là tạo hàng từ hư không.
- **Một lần mỗi Order**: guard dựa trên movement `RESTOCK` đã ghi, nên M2 gọi lại bằng operation ID khác vẫn trả `ALREADY_APPLIED` thay vì cộng tồn lần hai. Cùng operation ID thì `once()` trả kết quả đã lưu.
- **Số lượng do reservation quyết định**: `restockMatches` so danh sách M2 gửi với các dòng đã consume (cộng dồn theo Variant), lệch ⇒ `409 RESTOCK_MISMATCH`.
- **Không tự giải phóng hold quá hạn** (BR-23): `overdueReservations` chỉ **báo cáo** hold quá hạn còn `ACTIVE`; M1 không có đường nào tự release. Việc giải phóng vẫn là lệnh `ReleaseReservation` tường minh của M2 sau khi đã đối soát Payment Attempt.

## Kiểm chứng

```powershell
npm run build:backend && npm run test:backend
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build m1
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools npm run test:integration
```

Kết quả: build đạt · unit **182 test** · integration **91 test** · `docs:check` / `contracts:check` / `contracts:drift` đạt.

Case đã phủ: restock đúng một lần (kể cả replay và 2 request đồng thời) · chưa consume thì từ chối · release rồi cũng từ chối · lệch số lượng/Variant · Order không tồn tại · caller sai · input sai · hold quá hạn được báo cáo nhưng **không** bị release hay restock tự động.

## Bàn giao

Hoa dùng `RestockOrder` cho luồng **Cancel** ([#24](https://github.com/embetapbay123/PBL6/issues/24)): gọi sau khi Order đã consume và cần hoàn hàng. Không cần đợi Payment: command chỉ phụ thuộc DB của M1.
