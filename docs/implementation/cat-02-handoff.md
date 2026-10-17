# CAT-02 — Tạo/sửa Product đầy đủ và form Seller

**Issue:** [#9](https://github.com/embetapbay123/PBL6/issues/9) · **Nhánh:** `feat/cat-02` · `createProduct` + `updateProduct` → **IMPLEMENTED**

## File đã code

| File | Việc |
| --- | --- |
| [catalog.validation.ts](../../backend/catalog-service/src/catalog/catalog.validation.ts) *(mới)* | `attributeErrors`, `variantSignature`, `defaultVariantCount` |
| [catalog.repository.ts](../../backend/catalog-service/src/catalog/catalog.repository.ts) | `insertProduct`, `updateProductFields`, `insertVariant`, `updateVariantFields`, `stopVariant`, `clearDefaultVariants`, `insertInventoryForVariant`, `skuTakenInStore`, `attributeDefinitions`, `withAllVariants` |
| [catalog.service.ts](../../backend/catalog-service/src/catalog/catalog.service.ts) | `createProduct`, `updateProduct` đầy đủ, `writableStore`, `validateTaxonomy`, `writeVariants` |
| [catalog.controller.ts](../../backend/catalog-service/src/catalog/catalog.controller.ts) | Route `POST /store/products` |
| [catalog.skeleton.controller.ts](../../backend/catalog-service/src/catalog/catalog.skeleton.controller.ts) | Gỡ stub `createProduct` |
| [unit test](../../backend/tests/unit/catalog-write.test.ts) · [integration test](../../backend/tests/integration/catalog-write.test.ts) | 6 + 8 test |
| [ProductEdit.tsx](../../frontend/src/bootstrap/ProductEdit.tsx) | Form sửa gửi thêm `status` (Nháp / Đang bán / Dừng bán) |

## Đã làm được gì

- **`createProduct`**: tạo Product + Variant + **tồn kho 0** + audit + outbox `ProductChanged` trong **một** transaction; mặc định `DRAFT`.
- **`updateProduct`** đầy đủ: `title`, `description`, `attributes`, `product_type_id`, `status`, `variants` — không còn 501 cho trường ngoài mẫu.
- **`variants` trên update là tập thay thế**: có `id` thì cập nhật, không có `id` thì thêm theo SKU, biến mất khỏi payload thì **`STOPPED`** chứ không xoá (xoá sẽ phá `reservation_item`/`stock_movement`).
- **Validate taxonomy**: Product type phải tồn tại và `ACTIVE`; mọi key của `attributes` phải có `attribute_definition` tương ứng và đủ attribute bắt buộc.

## Cách làm — 4 điểm chính

1. **Một transaction cho tất cả**: Product, Variant, inventory, audit, outbox cùng commit hoặc cùng rollback — không có Product "mồ côi" hay event báo thay đổi cho thứ chưa lưu.
2. **`expected_version`** chống ghi đè; Store scope lấy từ membership + kiểm Store còn bán trước khi ghi.
3. **SKU kiểm theo Store** (`sku_store_unique`), không chỉ trong Product — trùng SKU trả `409 SKU_CONFLICT` và rollback.
4. **`variant_signature`** = hash của `variant_values` đã sắp key, khớp unique `(product_id, variant_signature)`.

## Kiểm chứng

```powershell
npm run build:backend && npm run test:backend && npm run build
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build m1 web
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools npm run test:integration
npm --prefix frontend run test:e2e
```

Kết quả: build BE/FE đạt · unit **185 test** · integration **94 test** · `docs:check` / `contracts:check` / `contracts:drift` đạt.

Case đã phủ: tạo kèm 2 Variant + tồn kho 0 + audit + outbox · mặc định DRAFT · Product type sai · attribute lạ · thiếu attribute bắt buộc · **rollback khi trùng SKU** (không Product/audit/outbox) · sửa đủ trường + `version+1` + `ProductChanged` · version cũ 409 · Product của Store khác 404 · thay thế Variant (KEEP cập nhật, NEW thêm, DROP → STOPPED) · `id` Variant không thuộc Product → 404 · khách 403 / không token 401.

## Còn lại

- **Form tạo Product mới** và chỉnh sửa Variant/ảnh thuộc **Week 4 (gate 26/10)** theo chính issue #9; Week 3 chỉ yêu cầu BE write handoff + ví dụ.
- `createVariant` / `addProductImage` là CAT-03 (#10), dùng lại các primitive đã có ở đây.
