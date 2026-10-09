# M1 / inventory

Owner: Thịnh

- `GET /store/inventory` — listStoreInventory: **NOT_IMPLEMENTED**
- `POST /store/inventory/adjustments` — adjustInventory: **NOT_IMPLEMENTED**
- `GET /store/inventory/movements` — listStockMovements: **NOT_IMPLEMENTED**

## Internal operation (không qua gateway)

- `POST /internal/variants/quote` — QuoteVariants: **IMPLEMENTED** — M2 gọi để lấy snapshot giá/tồn hiện hành; chỉ đọc, không reserve và không trừ tồn. Caller allowlist `M2` do `ServiceGuard` chặn; lỗi M3 fail closed với 503. Chi tiết ở [inventory.service.ts](inventory.service.ts).
- `POST /internal/inventory/reserve` — ReserveInventory: **IMPLEMENTED** — giữ hàng nhiều SKU/mọi Store nguyên tử theo `operation_id`; một reservation mỗi Order; không oversell.
- `POST /internal/inventory/consume` — ConsumeReservation: **IMPLEMENTED** — trừ tồn thật và giải phóng hold; gọi lặp trả `ALREADY_APPLIED`.
- `POST /internal/inventory/release` — ReleaseReservation: **IMPLEMENTED** — chỉ giải phóng hold, không đổi tồn thật.
- `POST /internal/inventory/restock` — RestockOrder: **NOT_IMPLEMENTED** (INV-03 #15).
- `POST /internal/inventory/low-stock` — ListLowStockVariants: **NOT_IMPLEMENTED** (INV-01 #13).

Chi tiết thiết kế và bằng chứng của ba command kho ở [bàn giao INV-02](../../../../docs/implementation/inv-02-handoff.md).

## Bàn giao CAT-QUOTE-01

[Issue #7](https://github.com/embetapbay123/PBL6/issues/7) đã bàn giao qua [PR #86](https://github.com/embetapbay123/PBL6/pull/86), merge ngày 05/10/2026 tại commit `f4e49dba155b63ebe251d2c8a45d75e07a93d6ba`. [CI trên main](https://github.com/embetapbay123/PBL6/actions/runs/37282746278) đạt. Thịnh tiếp tục [CAT-04 #11](https://github.com/embetapbay123/PBL6/issues/11); Hoa nghiệm thu điểm nối thật ở CART-01/CART-02/ORDER-01.

M2 gọi qua `InternalClients.call('QuoteVariants', { items }, correlationId)` với service credentials từ cấu hình. URL nội bộ trong Compose là `http://m1:3101/internal/variants/quote`; public gateway không chuyển tiếp endpoint này. Request mẫu dùng Store/Variant có trong seed:

```json
{
  "items": [{
    "variant_id": "10000000-0000-4000-8000-000000000090",
    "store_id": "10000000-0000-4000-8000-000000000061",
    "quantity": 2
  }]
}
```

Response HTTP 200 với seed chưa bị thay đổi:

```json
{
  "items": [{
    "variant_id": "10000000-0000-4000-8000-000000000090",
    "store_id": "10000000-0000-4000-8000-000000000061",
    "quantity": 2,
    "price_vnd": 100000,
    "available_quantity": 10,
    "version": 0
  }]
}
```

`available_quantity = max(quantity - reserved_quantity, 0)`; `version` là version inventory hiện hành. Variant `...091` cùng Store có giá seed 150000 VND, tồn khả dụng 10. Giá BIGINT qua mapper phải là số nguyên an toàn.

Response không có `product_id`, title hoặc SKU. M2 phải lấy Store/Product mapping đáng tin cậy từ Catalog; không gửi Store giả hoặc gán Variant ID thành Product ID. Giá/tồn có thể đổi sau quote: confirm cần quote/kiểm tra mới và ReserveInventory thật, không dựa vào snapshot quote để coi đã giữ hàng.

| HTTP | Trường hợp |
| --- | --- |
| 401 | Caller khác M2 hoặc service key sai |
| 422 | Input sai contract, quantity không hợp lệ, quá 100 item |
| 404 | Variant không tồn tại hoặc không thuộc Store yêu cầu |
| 409 | Store/Product/Variant không được bán hoặc quantity vượt tồn khả dụng |
| 503 | ActiveStores M3 lỗi/timeout hoặc typed client không kết nối được |

M2 giữ correlation và các lỗi nghiệp vụ, timeout mặc định 1 giây, không retry trong HTTP request và không trả giá/Store mặc định khi dependency lỗi. ActiveStores M3 vẫn là sample; ReserveInventory/ConsumeReservation/ReleaseReservation/RestockOrder còn là task INV-02/INV-03, không nằm trong PR #86.

## Kiểm chứng

Chạy từ root sau setup/install theo [README](../../../../README.md):

```powershell
npm --prefix backend test -- tests/unit/quote-variants.test.ts
```

Sau khi Compose đã build, migrate, seed và các service chạy theo [foundation handoff](../../../../docs/implementation/foundation-handoff.md):

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools npm run test:integration -- tests/integration/quote-variants.test.ts
```

[Unit test](../../../tests/unit/quote-variants.test.ts) kiểm lỗi lookup M3, service authentication và tiền an toàn. [Integration test](../../../tests/integration/quote-variants.test.ts) gọi HTTP/DB thật, kiểm caller/input/404/409/correlation, Product/Store bị khóa và quote không thay đổi tồn/reservation. Đây là test M1; demo với Cart/checkout thật vẫn thuộc các issue M2.

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.
