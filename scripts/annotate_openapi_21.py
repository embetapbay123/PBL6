"""Add report-friendly operation titles and representative request examples."""
from pathlib import Path
import json

path = Path(__file__).resolve().parents[1] / "docs/contracts/openapi.json"
api = json.loads(path.read_text(encoding="utf-8"))

titles = dict(line.split("|", 1) for line in """
register|Đăng ký tài khoản Customer
verifyEmail|Xác minh email bằng token một lần
login|Đăng nhập và nhận phiên
refresh|Gia hạn access token
logout|Đăng xuất và thu hồi phiên
resetPassword|Yêu cầu đặt lại mật khẩu
confirmResetPassword|Xác nhận mật khẩu mới
changePassword|Đổi mật khẩu khi đăng nhập
getAuthContext|Xem ngữ cảnh vai trò và Store hiện hành
getProfile|Xem hồ sơ của mình
updateProfile|Cập nhật hồ sơ của mình
listAddresses|Liệt kê địa chỉ giao hàng của mình
createAddress|Thêm địa chỉ giao hàng
updateAddress|Sửa địa chỉ giao hàng
deleteAddress|Xóa địa chỉ giao hàng
submitStoreApplication|Gửi đơn đăng ký Store
listOwnStoreApplications|Xem đơn đăng ký Store của mình
listStoreApplications|Admin xem các đơn đăng ký Store
reviewStoreApplication|Admin duyệt hoặc từ chối Store
getOwnStore|Xem Store do mình sở hữu
updateOwnStore|Sửa thông tin Store của mình
listStoreStaff|Xem thành viên Store
listStaffInvitations|Xem lời mời Seller của Store
inviteStaff|Mời Seller theo email
revokeStaffInvitation|Thu hồi lời mời Seller
listOwnInvitations|Xem lời mời Store gửi cho mình
acceptInvitation|Chấp nhận lời mời Seller
listCategories|Duyệt danh mục sản phẩm
listProductTypes|Xem các loại sản phẩm
listProducts|Tìm và lọc Product công khai
getProduct|Xem Product và Variant hiện hành
listStoreProducts|Xem Product công khai của một Store
listOwnStoreProducts|Xem Product trong Store của mình
createProduct|Tạo Product trong Store
updateProduct|Sửa hoặc ngừng bán Product
createVariant|Tạo Variant và SKU
addProductImage|Thêm ảnh Product hoặc Variant
listStoreInventory|Xem tồn kho Store
adjustInventory|Nhập, xuất hoặc điều chỉnh tồn
listStockMovements|Xem lịch sử biến động kho
listCartItems|Xem item trong giỏ của mình
addCartItem|Thêm Variant vào giỏ
updateCartItem|Đổi số lượng item trong giỏ
removeCartItem|Xóa item khỏi giỏ
quoteCheckout|Tính quote theo từng Store
confirmCheckout|Tạo một Order cho mỗi Store
getPurchaseGroupOrders|Xem các Order của cùng lần mua
createPaymentAttempt|Tạo lần thử thanh toán của một Order
getPayment|Xem Payment của Order
sandboxCallback|Nhận callback sandbox đã ký
getOrderRefund|Xem Refund của một Order
listOwnOrders|Xem các Order của Customer
getOwnOrder|Xem chi tiết Order của Customer
cancelOwnOrder|Customer hủy một Order
listStoreOrders|Xem các Order thuộc Store
getStoreOrder|Xem chi tiết Order thuộc Store
transitionStoreOrder|Chuyển trạng thái xử lý Order
cancelStoreOrder|Seller hoặc Owner hủy Order
collectCod|Ghi nhận thu đủ COD của Order
validateVouchers|Kiểm tra voucher trong quote
listStoreVouchers|Xem voucher của Store
createStoreVoucher|Tạo voucher Store
updateStoreVoucher|Sửa hoặc ngừng voucher Store
listPlatformVouchers|Admin xem voucher toàn sàn
createPlatformVoucher|Tạo voucher toàn sàn
updatePlatformVoucher|Sửa hoặc ngừng voucher toàn sàn
listProductReviews|Xem Review đang hiển thị
createReview|Viết Review cho OrderItem đã mua
updateReview|Sửa Review của mình
hideReview|Admin ẩn Review có lý do
restoreReview|Admin hiện lại Review có lý do
listUsers|Admin xem danh sách User
updateUserState|Admin khóa hoặc mở User
listStores|Admin xem danh sách Store
updateStoreState|Admin khóa hoặc mở Store
listAllOrders|Admin giám sát Order toàn sàn
getPlatformDashboard|Xem dashboard nền tảng
updateRole|Admin cập nhật Role và Permission
createChatSession|Bắt đầu phiên chat
sendChatMessage|Gửi câu hỏi cho chatbot RAG
listOwnChatSessions|Xem lịch sử chat của mình
getForYou|Xem gợi ý Dành cho bạn
getRelatedProducts|Xem Product liên quan
getAiMetrics|Admin xem chất lượng và tình trạng AI
updateStaff|Owner khóa hoặc sửa quyền Seller
getStoreReport|Owner xem báo cáo Store
getStoreVoucherUsage|Xem lượt voucher Store
getPlatformVoucherUsage|Admin xem lượt voucher toàn sàn
createCategory|Tạo Category
updateCategory|Sửa Category
createProductType|Tạo ProductType
updateProductType|Sửa ProductType
createAttributeDefinition|Tạo định nghĩa thuộc tính
updateAttributeDefinition|Sửa định nghĩa thuộc tính
hideProduct|Admin ẩn Product có lý do
restoreProduct|Admin hiện lại Product có lý do
""".strip().splitlines())

item_a = "11111111-1111-4111-8111-111111111111"
item_b = "22222222-2222-4222-8222-222222222222"
address = "33333333-3333-4333-8333-333333333333"
quote = "44444444-4444-4444-8444-444444444444"
store_a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
store_b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
selection = {
    "cart_item_ids": [item_a, item_b],
    "address_id": address,
    "payment_methods": {store_a: "COD", store_b: "SANDBOX"},
    "store_vouchers": {store_a: "STORE10"},
    "platform_voucher_code": "PBL6SALE",
}
examples = {
    "register": {"email": "customer@example.test", "password": "DemoPassword123!", "display_name": "Nguyễn An"},
    "submitStoreApplication": {"proposed_name": "Gian hàng An", "contact": "an@example.test"},
    "reviewStoreApplication": {"status": "REJECTED", "decision_reason": "Thiếu thông tin liên hệ", "expected_version": 0},
    "inviteStaff": {"invited_email": "seller@example.test", "permissions": ["PRODUCT_WRITE", "ORDER_PROCESS"]},
    "updateStaff": {"permissions": ["PRODUCT_WRITE"], "expected_version": 2},
    "createProduct": {"product_type_id": item_a, "title": "Áo thun cơ bản", "attributes": {"chat_lieu": "cotton"}, "status": "DRAFT"},
    "updateProduct": {"title": "Áo thun cotton", "expected_version": 1},
    "createVariant": {"sku": "TSHIRT-WHITE-M", "price_vnd": 100000, "variant_values": {"mau": "trắng", "size": "M"}},
    "adjustInventory": {"variant_id": item_a, "delta_quantity": 10, "reason": "Nhập kho demo", "operation_id": item_b, "expected_version": 0},
    "addCartItem": {"variant_id": item_a, "quantity": 2},
    "quoteCheckout": selection,
    "confirmCheckout": {**selection, "quote_id": quote, "expected_payable_total_vnd": 290000},
    "createPaymentAttempt": {"expected_order_version": 1},
    "sandboxCallback": {"provider_event_id": "evt-demo-001", "provider_reference": "pay-demo-001", "result": "SUCCESS", "signature": "demo-signature"},
    "cancelOwnOrder": {"expected_version": 3, "reason": "Đổi ý trước khi xử lý"},
    "transitionStoreOrder": {"to_status": "CONFIRMED", "expected_version": 1},
    "cancelStoreOrder": {"expected_version": 2, "reason": "Không thể xử lý đơn"},
    "collectCod": {"expected_version": 4, "amount_collected_vnd": 95690},
    "createStoreVoucher": {"code": "STORE10", "scope": "STORE", "discount_type": "PERCENT", "discount_value": 10, "starts_at": "2026-10-01T00:00:00Z", "ends_at": "2026-10-31T23:59:59Z", "usage_limit": 100, "per_customer_limit": 1},
    "updateStoreVoucher": {"status": "STOPPED", "expected_version": 2},
    "createPlatformVoucher": {"code": "PBL6SALE", "scope": "PLATFORM", "discount_type": "FIXED", "discount_value": 20000, "starts_at": "2026-10-01T00:00:00Z", "ends_at": "2026-10-31T23:59:59Z", "usage_limit": 1000, "per_customer_limit": 1},
    "updatePlatformVoucher": {"status": "STOPPED", "expected_version": 2},
    "createReview": {"order_item_id": item_a, "rating": 5, "body": "Sản phẩm đúng mô tả"},
    "updateReview": {"rating": 4, "body": "Đã dùng thêm một tuần", "expected_version": 1},
    "sendChatMessage": {"content": "Tìm áo thun cotton dưới 200000 đồng"},
}

seen = set()
for methods in api["paths"].values():
    for op in methods.values():
        operation_id = op["operationId"]
        assert operation_id in titles, operation_id
        seen.add(operation_id)
        op["summary"] = titles[operation_id]
        if "description" not in op:
            op["description"] = (
                f"{titles[operation_id]}. Phạm vi dữ liệu: {op['x-data-scope']}; "
                f"quyền: {', '.join(op['x-required-roles'])}. "
                "Điều kiện nghiệp vụ, trạng thái và lỗi xem api-spec.md cùng Use Case liên quan."
            )
        for code, response in op["responses"].items():
            if code.startswith("2") and response.get("description") == "Success":
                response["description"] = "Thành công: " + titles[operation_id].lower()
        if operation_id in examples:
            op["requestBody"]["content"]["application/json"]["example"] = examples[operation_id]

assert seen == set(titles)
path.write_text(json.dumps(api, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
