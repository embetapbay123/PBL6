# M1 / catalog

Owner: Thịnh

- `GET /categories` — listCategories: **IMPLEMENTED**
- `GET /product-types` — listProductTypes: **IMPLEMENTED**
- `GET /products` — listProducts: **IMPLEMENTED**
- `GET /products/{id}` — getProduct: **IMPLEMENTED**
- `GET /stores/{id}/products` — listStoreProducts: **NOT_IMPLEMENTED**
- `GET /store/products` — listOwnStoreProducts: **NOT_IMPLEMENTED**
- `POST /store/products` — createProduct: **IMPLEMENTED**
- `PATCH /store/products/{id}` — updateProduct: **IMPLEMENTED**
- `POST /store/products/{id}/variants` — createVariant: **NOT_IMPLEMENTED**
- `POST /store/products/{id}/images` — addProductImage: **NOT_IMPLEMENTED**

## Bàn giao CAT-02

Ghi Product đầy đủ ở [bàn giao CAT-02](../../../../docs/implementation/cat-02-handoff.md). `createProduct` tạo Product + Variant + tồn kho 0 + audit + `ProductChanged` trong **một** transaction (mặc định `DRAFT`). `updateProduct` nhận toàn bộ payload (title, description, attributes, product_type_id, status, variants) với `expected_version`; `variants` là **tập thay thế** — Variant biến mất khỏi payload bị `STOPPED` chứ không xoá để giữ lịch sử kho. Thuộc tính phải khớp `attribute_definition` của Product type.

## Bàn giao CAT-04

Catalog công khai và taxonomy đã hoàn thiện ở [bàn giao CAT-04](../../../../docs/implementation/cat-04-handoff.md). `listProducts` nhận thêm filter `category_id`, `product_type_id` và `sort` (`title`, `price_asc`, `price_desc`); `Product` trả thêm `images`. Search/view phát `SearchRecorded` và `InteractionRecorded` VIEW chỉ khi có người dùng đã xác thực; khách không phát hành vi cá nhân và lỗi telemetry không làm hỏng lượt đọc.

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.
