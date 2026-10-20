# CAT-01 — Danh sách sản phẩm Store (Seller) và danh sách công khai theo Store

**Issue:** [#2](https://github.com/embetapbay123/PBL6/issues/2) · **Nhánh:** `feat/cat-01` · cả 2 operation → **IMPLEMENTED**

## File đã code

| File | Việc |
| --- | --- |
| [catalog.repository.ts](../../backend/catalog-service/src/catalog/catalog.repository.ts) | `pageOwnStore` (mọi status) và `withAllRelations` (variant/ảnh mọi trạng thái) |
| [catalog.service.ts](../../backend/catalog-service/src/catalog/catalog.service.ts) | `listOwnStoreProducts`, `listStoreProducts`, `requireProductScope`, hàm thuần `hasProductPermission` |
| [catalog.controller.ts](../../backend/catalog-service/src/catalog/catalog.controller.ts) | 2 route mới |
| [catalog.skeleton.controller.ts](../../backend/catalog-service/src/catalog/catalog.skeleton.controller.ts) | Gỡ 2 stub tương ứng |
| [unit test](../../backend/tests/unit/catalog-store-products.test.ts) · [integration test](../../backend/tests/integration/catalog-store-products.test.ts) | 2 + 4 test |
| [frontend/src/features/seller/ProductList.tsx](../../frontend/src/features/seller/ProductList.tsx) *(mới)* · [seller/routes.tsx](../../frontend/src/features/seller/routes.tsx) · [BootstrapApp.tsx](../../frontend/src/bootstrap/BootstrapApp.tsx) | Trang Seller list + route `/seller/products` + nav "Sản phẩm Store" |

## Đã làm được gì

- **`listOwnStoreProducts`** (`GET /store/products`) — **danh sách quản lý**: trả cả `DRAFT`/`STOPPED`/`HIDDEN` và variant/ảnh ở mọi trạng thái để Seller còn thấy và sửa được sản phẩm của mình.
- **`listStoreProducts`** (`GET /stores/{id}/products`) — **danh sách công khai** của một Store: dùng đúng predicate của catalog (ACTIVE + VISIBLE + Store đang bán), nên Product nháp/ẩn và Variant đã dừng không lọt ra.
- **Seller page** với loading / empty / error / retry / pagination, có nhãn `status · moderation_status` và số biến thể/ảnh, link sang trang sửa.

## Cách làm — 3 điểm chính

1. **Hai view tách hẳn nhau**: `store/products` dùng `withAllRelations` (không lọc status); `stores/{id}/products` tái dùng đúng `page()` của catalog công khai nên không thể lệch hành vi.
2. **Store scope lấy từ membership**, không từ URL/request ⇒ hai Store không đọc được dữ liệu quản lý của nhau dù đoán id. Quyền kiểm trên context sống: thu hồi `product.store.*` là request kế tiếp bị 403 dù JWT cũ còn hạn.
3. **Store bị khóa trả 404** ở route công khai (đối chiếu M3 `ActiveStores`) thay vì một trang rỗng — người mua không bị hiểu nhầm Store vẫn đang bán.

## Kiểm chứng

```powershell
npm run build:backend && npm run test:backend && npm run build
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build m1 web
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools npm run test:integration
npm --prefix frontend run test:e2e
```

Kết quả: build BE/FE đạt · unit **181 test** · integration **89 test** · Playwright e2e **14 test** · `docs:check` / `contracts:check` / `contracts:drift` đạt.

Case đã phủ: lọc DRAFT/HIDDEN khỏi public · Variant STOPPED biến mất khỏi public nhưng vẫn hiện ở view quản lý · Store khóa → 404 · chưa đăng nhập → 401 · **hai Store không thấy dữ liệu của nhau** · thu hồi quyền → 403 rồi phục hồi → 200 · pagination.

## Còn lại

`createProduct` (#9) vẫn là stub — nằm trong CAT-02, không thuộc task này.
