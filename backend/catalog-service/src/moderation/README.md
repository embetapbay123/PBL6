# M1 / moderation

Owner: Thịnh

- `POST /admin/categories` — createCategory: **IMPLEMENTED**
- `PATCH /admin/categories/{id}` — updateCategory: **IMPLEMENTED**
- `POST /admin/product-types` — createProductType: **IMPLEMENTED**
- `PATCH /admin/product-types/{id}` — updateProductType: **IMPLEMENTED**
- `POST /admin/attribute-definitions` — createAttributeDefinition: **IMPLEMENTED**
- `PATCH /admin/attribute-definitions/{id}` — updateAttributeDefinition: **IMPLEMENTED**
- `POST /admin/products/{id}/hide` — hideProduct: **IMPLEMENTED**
- `POST /admin/products/{id}/restore` — restoreProduct: **IMPLEMENTED**
- `POST /admin/reviews/{id}/hide` — hideReview: **IMPLEMENTED**
- `POST /admin/reviews/{id}/restore` — restoreReview: **IMPLEMENTED**

## Bàn giao TAX-01

CRUD taxonomy ở [bàn giao TAX-01](../../../../docs/implementation/tax-01-handoff.md). Mọi mutation là ADMIN, một transaction gồm cả audit; `expected_version` lấy từ migration `004_taxonomy_versions.sql`. Ràng buộc DB được kiểm trước khi ghi nên `category_slug_unique`/`attribute_type_code_unique`/FK trả `409`/`422` thay vì lỗi driver.

## Bàn giao MOD-01

Ẩn/khôi phục ở [bàn giao MOD-01](../../../../docs/implementation/mod-01-handoff.md). `hideProduct`/`restoreProduct` chỉ đổi `moderation_status`, **không** đụng `status` bán, nên khôi phục một Product `DRAFT`/`STOPPED` vẫn không đưa nó lên kệ; thao tác trả **đầy đủ projection `Product`** và phát `ProductChanged` để cache/AI bỏ Product đã ẩn. Khôi phục bị từ chối `409 STORE_UNAVAILABLE` khi Store không còn được bán. `hideReview`/`restoreReview` đổi `status`, ghi `hidden_reason` khi ẩn và xoá khi khôi phục, kèm audit `REVIEW_HIDDEN`/`REVIEW_RESTORED`.

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.
