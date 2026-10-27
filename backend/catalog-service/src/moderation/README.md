# M1 / moderation

Owner: Thịnh

- `POST /admin/categories` — createCategory: **IMPLEMENTED**
- `PATCH /admin/categories/{id}` — updateCategory: **IMPLEMENTED**
- `POST /admin/product-types` — createProductType: **IMPLEMENTED**
- `PATCH /admin/product-types/{id}` — updateProductType: **IMPLEMENTED**
- `POST /admin/attribute-definitions` — createAttributeDefinition: **IMPLEMENTED**
- `PATCH /admin/attribute-definitions/{id}` — updateAttributeDefinition: **IMPLEMENTED**
- `POST /admin/products/{id}/hide` — hideProduct: **NOT_IMPLEMENTED**
- `POST /admin/products/{id}/restore` — restoreProduct: **NOT_IMPLEMENTED**

## Bàn giao TAX-01

CRUD taxonomy đã hoàn thiện ở [bàn giao TAX-01](../../../../docs/implementation/tax-01-handoff.md). Mọi mutation là ADMIN, một transaction gồm cả audit; `expected_version` lấy từ migration `004_taxonomy_versions.sql`. Ràng buộc DB được kiểm trước khi ghi nên `category_slug_unique`/`attribute_type_code_unique`/FK trả `409`/`422` thay vì lỗi driver: slug trùng → `SLUG_CONFLICT`, cha không tồn tại → `PARENT_NOT_FOUND`, chu trình cây → `CATEGORY_CYCLE`, code trùng → `ATTRIBUTE_CODE_CONFLICT`, `data_type` lạ → `INVALID_DATA_TYPE`, và đổi `data_type` của attribute mà Product đã dùng → `ATTRIBUTE_IN_USE`.

`hideProduct`/`restoreProduct` vẫn chờ MOD-01 (#17) cùng `ProductChanged` và ẩn/khôi phục Review.

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.
