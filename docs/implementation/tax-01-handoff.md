# TAX-01 — CRUD taxonomy và attribute definition của Admin

**Issue:** [#12](https://github.com/embetapbay123/PBL6/issues/12) · **Nhánh:** `feat/tax-01` · 6 operation taxonomy → **IMPLEMENTED**

## File đã code

| File | Việc |
| --- | --- |
| [taxonomy.validation.ts](../../backend/catalog-service/src/moderation/taxonomy.validation.ts) *(mới)* | `taxonomySlug`, `attributeCode`, `assertDataType`, `createsCategoryCycle` |
| [moderation.repository.ts](../../backend/catalog-service/src/moderation/moderation.repository.ts) | Kiểm FK/unique/chu trình/attribute-in-use trước khi ghi; một transaction kèm audit |
| [moderation.controller.ts](../../backend/catalog-service/src/moderation/moderation.controller.ts) *(đổi tên từ `*.skeleton.controller.ts`)* | 8 route ADMIN; cả 6 route taxonomy đã chạy thật |
| [main.ts](../../backend/catalog-service/src/main.ts) | Đăng ký controller mới thay skeleton |
| [unit test](../../backend/tests/unit/taxonomy-rules.test.ts) · [integration test](../../backend/tests/integration/taxonomy.service.test.ts) | 11 + 8 test |

## Đã làm được gì

- **6 operation taxonomy** (`createCategory`, `updateCategory`, `createProductType`, `updateProductType`, `createAttributeDefinition`, `updateAttributeDefinition`) chạy thật, `expected_version` + audit trong cùng transaction.
- **Ràng buộc DB được kiểm trước khi ghi**, nên lỗi driver không còn lộ ra thành 500.
- **Chặn dữ liệu đang dùng**: attribute mà Product đã lưu thì không đổi được `data_type`.

## Cách làm — 4 điểm chính

1. **Mã lỗi rõ ràng thay cho 500**: slug trùng → `409 SLUG_CONFLICT`; cha không tồn tại → `422 PARENT_NOT_FOUND` / `CATEGORY_NOT_FOUND` / `PRODUCT_TYPE_NOT_FOUND`; code trùng → `409 ATTRIBUTE_CODE_CONFLICT`; `data_type` lạ → `422 INVALID_DATA_TYPE`.
2. **Cây Category luôn là cây**: `createsCategoryCycle` đi ngược từ cha đề xuất, chặn cả tự làm cha và kéo chu trình đã hỏng.
3. **Không đổi kiểu dữ liệu đang dùng**: nếu `product.attributes_json` của Product type đó còn key này → `409 ATTRIBUTE_IN_USE`; đổi tên vẫn được.
4. **Bỏ `*.skeleton.controller.ts`** vì cả 8 route đã có handler thật (hide/restore Product thuộc MOD-01).

## Kiểm chứng

```powershell
npm run build:backend && npm run test:backend
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build m1
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools npm run test:integration
```

Kết quả: build đạt · unit **264 test** · integration: `taxonomy.service` **8/8**; toàn bộ suite **170 pass, 19 skip**, riêng `bootstrap` (M4 recommendations 503) và `handoff` (429 do ngân sách login dùng chung) là lỗi môi trường local — chạy riêng `handoff` thì pass, và CI của `main` đang xanh với cùng bộ test.

Case đã phủ: tạo category + audit + version 0 · trùng tên → 409 · cha không tồn tại → 422 · tự làm cha / cha là con → 422 và row không đổi · version cũ → 409 · product type thiếu/sai category → 422 · attribute sai data_type → 422 · code trùng → 409 · đổi `data_type` khi Product đã dùng → 409, đổi tên thì được · edit bị từ chối không để lại audit.

## Còn lại

`hideProduct` / `restoreProduct` (kèm `ProductChanged` và ẩn/khôi phục Review) thuộc MOD-01 #17.
