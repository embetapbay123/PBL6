# M1 / catalog

Owner: Thịnh

- `GET /categories` — listCategories: **IMPLEMENTED**
- `GET /product-types` — listProductTypes: **IMPLEMENTED**
- `GET /products` — listProducts: **IMPLEMENTED**
- `GET /products/{id}` — getProduct: **IMPLEMENTED**
- `GET /stores/{id}/products` — listStoreProducts: **NOT_IMPLEMENTED**
- `GET /store/products` — listOwnStoreProducts: **NOT_IMPLEMENTED**
- `POST /store/products` — createProduct: **NOT_IMPLEMENTED**
- `PATCH /store/products/{id}` — updateProduct: **IMPLEMENTED_SAMPLE**
- `POST /store/products/{id}/variants` — createVariant: **IMPLEMENTED**
- `POST /store/products/{id}/images` — addProductImage: **IMPLEMENTED**

## Bàn giao CAT-03

Variant và ảnh của Product ở [bàn giao CAT-03](../../../../docs/implementation/cat-03-handoff.md). `createVariant` thêm Variant với **tồn kho 0**, tự đặt mặc định cho Variant đầu tiên, từ chối SKU trùng trong Store (`409 SKU_CONFLICT`) và bộ thuộc tính trùng (`409 VARIANT_DUPLICATE`); mỗi thay đổi Variant làm `version` của Product tăng và phát `ProductChanged`. `addProductImage` gắn ảnh vào Product hoặc một Variant, tự nối `position` khi bỏ trống, và **không** tăng version vì ảnh không đổi giá hay tồn kho.

## Bàn giao CAT-04

Catalog công khai và taxonomy đã hoàn thiện ở [bàn giao CAT-04](../../../../docs/implementation/cat-04-handoff.md). `listProducts` nhận thêm filter `category_id`, `product_type_id` và `sort` (`title`, `price_asc`, `price_desc`); `Product` trả thêm `images`. Search/view phát `SearchRecorded` và `InteractionRecorded` VIEW chỉ khi có người dùng đã xác thực; khách không phát hành vi cá nhân và lỗi telemetry không làm hỏng lượt đọc.

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.
