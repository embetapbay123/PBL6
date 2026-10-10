# Bàn giao CAT-04 — Catalog công khai, taxonomy và detail

**Issue:** [#11](https://github.com/embetapbay123/PBL6/issues/11) · **Nhánh:** `feat/cat-04` · **Ưu tiên:** P0

## File đã code

| File | Việc đã làm |
| --- | --- |
| [catalog.repository.ts](../../backend/catalog-service/src/catalog/catalog.repository.ts) | `page` (filter/sort), `publicProduct`, `pageCategories`, `pageProductTypes`, `withRelations` (variant + ảnh theo lô) |
| [catalog.service.ts](../../backend/catalog-service/src/catalog/catalog.service.ts) | `listCategories`, `listProductTypes`, cập nhật `list`/`detail`; gọi telemetry |
| [catalog.mapper.ts](../../backend/catalog-service/src/catalog/catalog.mapper.ts) | `productResponse` (thêm `images`), `categoryResponse`, `productTypeResponse` |
| [catalog.telemetry.ts](../../backend/catalog-service/src/catalog/catalog.telemetry.ts) *(mới)* | `optionalUserId`, `recordInteraction` |
| [catalog.controller.ts](../../backend/catalog-service/src/catalog/catalog.controller.ts) | 2 route taxonomy; truyền `Authorization` cho telemetry |
| [catalog.skeleton.controller.ts](../../backend/catalog-service/src/catalog/catalog.skeleton.controller.ts) | Gỡ 2 stub `listCategories`/`listProductTypes` |
| [unit test](../../backend/tests/unit/catalog.test.ts) · [integration test](../../backend/tests/integration/catalog.test.ts) | 3 + 6 test |
| [openapi.json](../../docs/contracts/openapi.json) | 4 operation → `IMPLEMENTED`; thêm `Product.images` và filter/sort cho `listProducts` |

## Chức năng đã hoàn thành

- `listCategories`, `listProductTypes`: trang taxonomy công khai, chỉ trả bản ghi `ACTIVE`; product type kèm `attribute_definitions`.
- `listProducts`: `q` tìm trên **title và description**; filter `category_id`, `product_type_id`; `sort` = `title` | `price_asc` | `price_desc`.
- `getProduct`: detail kèm **ảnh**, variant và trạng thái.
- Tracking: `SearchRecorded` khi tìm kiếm, `InteractionRecorded` VIEW khi xem chi tiết — **chỉ với người dùng đã xác thực**.

## Cách làm — 5 điểm chính

1. **Không N+1**: một trang dùng 1 query đếm + 1 query trang + **2** query theo lô cho variant và ảnh, không phụ thuộc `size`.
2. **Count khớp trang**: count và query trang dùng **chung một** predicate dựng động, nên `total` không thể lệch với dữ liệu trả về. Filter được nối bằng placeholder riêng nên không có SQL injection.
3. **Sort theo giá**: dùng subquery vô hướng `min(price_vnd)` để vẫn giữ sắp xếp và phân trang trong một câu lệnh.
4. **Telemetry tách transaction và không bao giờ ném lỗi**: M1 chỉ ghi `outbox` của chính mình, không đọc/ghi DB M4. Token sai hoặc hết hạn → coi như khách (đọc vẫn 200), nên catalog công khai không bị chặn vì xác thực.
5. **Khách không phát hành vi cá nhân**: chỉ phát event khi có `user_id`; `q` rỗng là duyệt chứ không phải tìm kiếm nên không ghi gì.

## Thay đổi contract (additive)

| Thay đổi | Ghi chú |
| --- | --- |
| `Product.images[]` (`id`, `product_id`, `image_url`, `position?`) | Tái dùng schema `ProductImage` đã có sẵn nhưng chưa được tham chiếu; field optional nên client cũ không bị ảnh hưởng |
| `listProducts` query thêm `category_id`, `product_type_id`, `sort` | Tất cả optional, `sort` có default `title` |

## Kiểm chứng

```powershell
npm run build:backend
npm run test:backend
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build m1
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools npm run test:integration
```

Kết quả: build đạt · unit **171 test** đạt · tích hợp **69 test** đạt (10 suite) · `docs:check` / `contracts:check` / `contracts:drift` đạt.

## Chưa làm

- Chưa có API tạo/sửa ảnh (`addProductImage` #10) nên catalog chỉ hiển thị ảnh đã có trong DB.
- Chưa có filter theo khoảng giá hay thuộc tính; `sort` chưa hỗ trợ `newest` vì bảng `product` không có `created_at`.
- Lượt xem của **khách** không được ghi (theo chính sách privacy), nên thống kê view chỉ phủ người dùng đã đăng nhập.
