"""Separate read models from create/PATCH bodies and require optimistic versions."""
from copy import deepcopy
from pathlib import Path
import json

path = Path(__file__).resolve().parents[1] / "docs/contracts/openapi.json"
api = json.loads(path.read_text(encoding="utf-8"))
schemas = api["components"]["schemas"]


def shape(source, fields, required=(), *, description=None, min_properties=None):
    value = {
        "type": "object",
        "properties": {key: deepcopy(schemas[source]["properties"][key]) for key in fields},
    }
    if required:
        value["required"] = list(required)
    if description:
        value["description"] = description
    if min_properties is not None:
        value["minProperties"] = min_properties
    return value


version = {"type": "integer", "minimum": 0, "description": "Phiên bản hiện tại mà client đã đọc."}
for name in ("Review", "Voucher", "StoreApplication"):
    schemas[name]["properties"]["version"] = deepcopy(version)
schemas["Voucher"]["properties"]["status"] = {
    "type": "string", "enum": ["ACTIVE", "STOPPED"]
}

schemas["AddressCreate"] = shape(
    "Address", ("recipient_name", "phone", "line1", "ward", "district", "city", "is_default"),
    ("recipient_name", "phone", "line1", "ward", "district", "city"),
)
schemas["AddressUpdate"] = shape(
    "Address", ("recipient_name", "phone", "line1", "ward", "district", "city", "is_default"),
    min_properties=1,
)
schemas["StoreApplicationSubmit"] = shape(
    "StoreApplication", ("proposed_name", "contact"), ("proposed_name", "contact"),
)
schemas["StoreApplicationDecision"] = {
    "type": "object",
    "properties": {
        "status": {"type": "string", "enum": ["APPROVED", "REJECTED"]},
        "decision_reason": {"type": "string", "description": "Bắt buộc khi từ chối."},
        "expected_version": deepcopy(version),
    },
    "required": ["status", "expected_version"],
}
schemas["ProductCreate"] = shape(
    "Product", ("product_type_id", "title", "description", "attributes", "variants", "status"),
    ("product_type_id", "title", "attributes"),
)
schemas["ProductUpdate"] = shape(
    "Product", ("product_type_id", "title", "description", "attributes", "variants", "status"),
    ("expected_version",),
    description="Gửi expected_version và ít nhất một trường cần thay đổi; ẩn/hiện do Admin dùng endpoint kiểm duyệt riêng.",
    min_properties=2,
)
schemas["ProductUpdate"]["properties"]["expected_version"] = deepcopy(version)
schemas["CartItemCreate"] = shape("CartItem", ("variant_id", "quantity"), ("variant_id", "quantity"))
schemas["CartItemUpdate"] = shape("CartItem", ("quantity",), ("quantity",))
schemas["ReviewCreate"] = shape("Review", ("order_item_id", "rating", "body"), ("order_item_id", "rating"))
schemas["ReviewUpdate"] = shape(
    "Review", ("rating", "body"), ("expected_version",),
    description="Sửa điểm và/hoặc nội dung đánh giá; quyền sở hữu và Order Completed được kiểm tra lại.",
    min_properties=2,
)
schemas["ReviewUpdate"]["properties"]["expected_version"] = deepcopy(version)
schemas["VoucherCreate"] = shape(
    "Voucher",
    ("code", "scope", "store_id", "discount_type", "discount_value", "min_goods_vnd",
     "max_discount_vnd", "starts_at", "ends_at", "usage_limit", "per_customer_limit"),
    ("code", "scope", "discount_type", "discount_value", "starts_at", "ends_at",
     "usage_limit", "per_customer_limit"),
    description="Scope STORE/PLATFORM phải khớp endpoint và quyền của người gọi; store_id lấy từ membership hiện hành.",
)
schemas["VoucherUpdate"] = shape(
    "Voucher",
    ("discount_type", "discount_value", "min_goods_vnd", "max_discount_vnd",
     "starts_at", "ends_at", "usage_limit", "per_customer_limit", "status"),
    ("expected_version",),
    description="Gửi expected_version và ít nhất một điều kiện được phép sửa. Không sửa lịch sử redemption.",
    min_properties=2,
)
schemas["VoucherUpdate"]["properties"]["expected_version"] = deepcopy(version)
schemas["TaxonomyCreate"] = shape(
    "TaxonomyWrite",
    ("name", "parent_id", "category_id", "product_type_id", "data_type", "required", "unit",
     "variant_axis", "allowed_values"), ("name",),
)
schemas["TaxonomyUpdate"] = shape(
    "TaxonomyWrite",
    ("name", "parent_id", "category_id", "product_type_id", "data_type", "required", "unit",
     "variant_axis", "allowed_values"), ("expected_version",), min_properties=2,
)
schemas["TaxonomyUpdate"]["properties"]["expected_version"] = deepcopy(version)
schemas["StaffMembershipUpdate"]["properties"]["expected_version"] = deepcopy(version)
schemas["StaffMembershipUpdate"]["required"] = ["expected_version"]
schemas["StaffMembershipUpdate"]["minProperties"] = 2

request_schemas = {
    "createAddress": "AddressCreate", "updateAddress": "AddressUpdate",
    "submitStoreApplication": "StoreApplicationSubmit", "reviewStoreApplication": "StoreApplicationDecision",
    "createProduct": "ProductCreate", "updateProduct": "ProductUpdate",
    "addCartItem": "CartItemCreate", "updateCartItem": "CartItemUpdate",
    "createReview": "ReviewCreate", "updateReview": "ReviewUpdate",
    "createStoreVoucher": "VoucherCreate", "createPlatformVoucher": "VoucherCreate",
    "updateStoreVoucher": "VoucherUpdate", "updatePlatformVoucher": "VoucherUpdate",
    "createCategory": "TaxonomyCreate", "createProductType": "TaxonomyCreate",
    "createAttributeDefinition": "TaxonomyCreate",
    "updateCategory": "TaxonomyUpdate", "updateProductType": "TaxonomyUpdate",
    "updateAttributeDefinition": "TaxonomyUpdate",
}
seen = set()
for methods in api["paths"].values():
    for op in methods.values():
        operation_id = op["operationId"]
        if operation_id in request_schemas:
            schema = op["requestBody"]["content"]["application/json"]["schema"]
            schema["$ref"] = "#/components/schemas/" + request_schemas[operation_id]
            seen.add(operation_id)
assert seen == set(request_schemas), set(request_schemas) - seen

# The old shared taxonomy schema now serves no operation or response.
schemas.pop("TaxonomyWrite")
path.write_text(json.dumps(api, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
