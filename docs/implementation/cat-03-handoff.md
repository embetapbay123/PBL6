# CAT-03 — Thêm Variant và ảnh cho Product

**Issue:** [#10](https://github.com/embetapbay123/PBL6/issues/10) · **Nhánh:** `feat/cat-03` · `createVariant` + `addProductImage` → **IMPLEMENTED**

## File đã code

| File | Việc |
| --- | --- |
| [catalog.repository.ts](../../backend/catalog-service/src/catalog/catalog.repository.ts) | `productForWrite`, `touchProductRow`, `skuUsedInStore`, `signatureUsedInProduct`, `unsetDefaultVariants`, `addVariantRow`, `addInventoryRow`, `variantRowsOfProduct`, `nextImagePosition`, `addImageRow` |
| [catalog.service.ts](../../backend/catalog-service/src/catalog/catalog.service.ts) | `createVariant`, `addProductImage`, `storeForWrite`, `variantSignatureOf` |
| [catalog.controller.ts](../../backend/catalog-service/src/catalog/catalog.controller.ts) | 2 route mới |
| [catalog.skeleton.controller.ts](../../backend/catalog-service/src/catalog/catalog.skeleton.controller.ts) | Gỡ 2 stub |
| [integration test](../../backend/tests/integration/catalog-variant-image.test.ts) | 8 test |

## Đã làm được gì

- **`createVariant`** (`POST /store/products/{id}/variants`): thêm Variant + **tồn kho 0** + audit + `ProductChanged` trong một transaction; `version` của Product tăng để M4 bỏ cache giá cũ.
- **`addProductImage`** (`POST /store/products/{id}/images`): gắn ảnh vào Product hoặc một Variant, `position` bỏ trống thì nối vào cuối.

## Cách làm — 3 điểm chính

1. **Variant mới = tồn kho 0**: inventory và quote thấy ngay nhưng chưa bán được cho tới khi Seller nhập hàng.
2. **Hai ràng buộc riêng biệt**: trùng SKU **trong Store** → `409 SKU_CONFLICT`; trùng **bộ thuộc tính trong Product** → `409 VARIANT_DUPLICATE` (so bằng hash đã sắp key nên `{a,b}` và `{b,a}` trùng nhau). Variant đầu tiên tự thành mặc định; mặc định mới bỏ cờ cũ.
3. **Ảnh không tăng version và không phát `ProductChanged`**: ảnh không đổi giá/tồn kho, nên thêm ảnh không nên buộc mọi client tải lại. Chỉ ghi audit.

## Kiểm chứng

```powershell
npm run build:backend && npm run test:backend
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build m1
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools npm run test:integration
```

Kết quả: build đạt · unit **179 test** · integration **93 test** · `docs:check` / `contracts:check` / `contracts:drift` đạt.

Case đã phủ: Variant + tồn kho 0 + audit + outbox + version+1 · response đúng 6 trường `ProductVariant` · Variant đầu thành mặc định · mặc định mới thay mặc định cũ (đúng 1) · SKU trùng → 409 (không ghi gì, version không đổi) · thuộc tính trùng khác thứ tự key → 409 · Product Store khác → 404 · 401/403 · ảnh nối `position` 0→1, `position` tường minh · ảnh **không** tăng version, **không** outbox · `variant_id` của Product khác → 404 · `image_url` không phải URI → 422.

## Lỗi driver đã phát hiện

`manager.query()` **không trả row** cho `UPDATE ... RETURNING` (trả mảng lồng) → `after.version` là `undefined` và event mất trường. Code cũ `updateText` đã tránh bằng UPDATE rồi SELECT riêng; `touchProductRow` nay làm theo đúng lối đó và có ghi chú tại chỗ.

## Còn lại

Form tạo Variant/ảnh trên Seller Web thuộc Week 4 theo issue #10; task này giao BE đầy đủ + test.
