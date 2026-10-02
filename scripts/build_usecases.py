"""Generate the 2.0 Use Case catalog and 13 editable PlantUML diagrams.

Run once for initial authoring; --force is required after edits.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs"
DIAGRAM = OUT / "diagrams" / "use-case"

# group, code, goal, actor, FR group, service, business object
CASES = [
 ("01-auth-profile", "UC-AUTH-REGISTER", "Đăng ký Customer", "Guest", "AUTH", "M3", "User"),
 ("01-auth-profile", "UC-AUTH-LOGIN", "Đăng nhập", "Guest", "AUTH", "M3", "Session"),
 ("01-auth-profile", "UC-AUTH-LOGOUT", "Đăng xuất", "Customer/Seller/Owner/Admin", "AUTH", "M3", "Session"),
 ("01-auth-profile", "UC-AUTH-RESET", "Đặt lại mật khẩu đã quên", "Guest", "AUTH", "M3", "Credential"),
 ("01-auth-profile", "UC-AUTH-CHANGE", "Đổi mật khẩu khi đã đăng nhập", "Authenticated", "AUTH", "M3", "Credential"),
 ("01-auth-profile", "UC-PROFILE-EDIT", "Xem và sửa hồ sơ cá nhân", "Authenticated", "PROFILE", "M3", "CustomerProfile"),
 ("01-auth-profile", "UC-ADDR-MANAGE", "Thêm, sửa, xóa và chọn địa chỉ", "Customer", "ADDR", "M3", "Address"),
 ("02-discovery", "UC-CAT-BROWSE", "Duyệt danh mục", "Guest/Customer", "CAT", "M1", "Category"),
 ("02-discovery", "UC-SEARCH-QUERY", "Tìm sản phẩm theo từ khóa", "Guest/Customer", "SEARCH", "M1", "Product"),
 ("02-discovery", "UC-SEARCH-FILTER", "Lọc và sắp xếp theo thuộc tính động", "Guest/Customer", "SEARCH", "M1", "Product"),
 ("02-discovery", "UC-PROD-DETAIL", "Xem chi tiết sản phẩm", "Guest/Customer", "PROD", "M1", "Product"),
 ("02-discovery", "UC-STORE-BROWSE", "Xem gian hàng công khai", "Guest/Customer", "STOREVIEW", "M1", "Store"),
 ("03-cart-checkout", "UC-CART-ADD", "Thêm Variant vào giỏ", "Customer", "CART", "M2", "CartItem"),
 ("03-cart-checkout", "UC-CART-EDIT", "Đổi số lượng hoặc xóa item", "Customer", "CART", "M2", "CartItem"),
 ("03-cart-checkout", "UC-CART-SELECT", "Chọn item của nhiều Store", "Customer", "CART", "M2", "CartItem"),
 ("03-cart-checkout", "UC-CHECKOUT-QUOTE", "Xem giá, voucher và phí theo Store", "Customer", "CHECKOUT", "M2", "Quote"),
 ("03-cart-checkout", "UC-CHECKOUT-CONFIRM", "Tạo Order riêng cho từng Store", "Customer", "CHECKOUT", "M2", "Order"),
 ("03-cart-checkout", "UC-PAY-SANDBOX", "Thanh toán sandbox cho một Order", "Customer", "PAY", "M2", "Payment"),
 ("03-cart-checkout", "UC-PAY-COD", "Chọn COD cho Order của Store", "Customer", "PAY", "M2", "Payment"),
 ("04-payment-customer-order", "UC-ORDER-LIST", "Xem danh sách, chi tiết và tracking đơn của mình", "Customer", "ORDER", "M2", "Order"),
 ("04-payment-customer-order", "UC-ORDER-CANCEL", "Hủy một Order còn cho phép", "Customer", "ORDER", "M2", "Order"),
 ("04-payment-customer-order", "UC-REFUND-TRACK", "Xem trạng thái hoàn tiền mock", "Customer", "PAY", "M2", "Refund"),
 ("05-voucher", "UC-VCH-STORE", "Quản lý voucher Store", "Owner", "VCH", "M2", "Voucher"),
 ("05-voucher", "UC-VCH-PLATFORM", "Quản lý voucher toàn sàn", "Admin", "VCH", "M2", "Voucher"),
 ("05-voucher", "UC-VCH-APPLY", "Áp voucher Store và toàn sàn", "Customer", "VCH", "M2", "VoucherReservation"),
 ("05-voucher", "UC-VCH-USAGE", "Xem lượt sử dụng voucher", "Owner/Admin", "VCH", "M2", "VoucherRedemption"),
 ("06-review", "UC-REV-BROWSE", "Xem review và điểm tổng hợp", "Guest/Customer", "REV", "M1", "Review"),
 ("06-review", "UC-REV-CREATE", "Đánh giá OrderItem đã hoàn tất", "Customer", "REV", "M1", "Review"),
 ("06-review", "UC-REV-EDIT", "Sửa đánh giá của mình", "Customer", "REV", "M1", "Review"),
 ("06-review", "UC-REV-MODERATE", "Ẩn hoặc hiện lại đánh giá", "Admin", "REV", "M1", "Review"),
 ("07-store-staff", "UC-STORE-APPLY", "Đăng ký mở Store", "Customer", "STORE", "M3", "StoreApplication"),
 ("07-store-staff", "UC-STORE-REVIEW", "Duyệt hoặc từ chối Store", "Admin", "STORE", "M3", "StoreApplication"),
 ("07-store-staff", "UC-STORE-EDIT", "Cập nhật thông tin Store", "Owner", "STORE", "M3", "Store"),
 ("07-store-staff", "UC-STAFF-INVITE", "Mời Seller và cấp quyền", "Owner", "STORE", "M3", "StaffInvitation"),
 ("07-store-staff", "UC-STAFF-ACCEPT", "Chấp nhận lời mời Seller", "Customer", "STORE", "M3", "StoreMembership"),
 ("07-store-staff", "UC-STAFF-INBOX", "Xem lời mời tham gia Store của tôi", "Customer", "STORE", "M3", "StaffInvitation"),
 ("07-store-staff", "UC-STAFF-LIST", "Xem danh sách Seller và lời mời của Store", "Owner", "STORE", "M3", "StoreMembership"),
 ("07-store-staff", "UC-STAFF-PERMISSIONS", "Cập nhật quyền Seller", "Owner", "STORE", "M3", "MembershipPermission"),
 ("07-store-staff", "UC-STAFF-LOCK", "Khóa hoặc mở quyền nhân viên", "Owner", "STORE", "M3", "StoreMembership"),
 ("08-product-management", "UC-SPROD-LIST", "Xem, tìm và lọc Product của Store", "Seller/Owner", "MPROD", "M1", "Product"),
 ("08-product-management", "UC-SPROD-CREATE", "Tạo Product theo ProductType", "Seller/Owner", "MPROD", "M1", "Product"),
 ("08-product-management", "UC-SPROD-EDIT", "Sửa và đăng bán lại Product", "Seller/Owner", "MPROD", "M1", "Product"),
 ("08-product-management", "UC-SPROD-VARIANT", "Tạo Variant/SKU mặc định hoặc có lựa chọn", "Seller/Owner", "MPROD", "M1", "ProductVariant"),
 ("08-product-management", "UC-SPROD-IMAGE", "Quản lý ảnh Product và Variant", "Seller/Owner", "MPROD", "M1", "ProductImage"),
 ("08-product-management", "UC-SPROD-HIDE", "Ngừng bán Product", "Seller/Owner", "MPROD", "M1", "Product"),
 ("09-inventory", "UC-INV-VIEW", "Xem tồn khả dụng và đang giữ", "Seller/Owner", "INV", "M1", "Inventory"),
 ("09-inventory", "UC-INV-ADJUST", "Nhập, xuất hoặc điều chỉnh tồn có lý do", "Seller/Owner", "INV", "M1", "StockMovement"),
 ("09-inventory", "UC-INV-HISTORY", "Xem lịch sử biến động kho", "Seller/Owner", "INV", "M1", "StockMovement"),
 ("10-store-orders-report", "UC-SORDER-LIST", "Xem danh sách và chi tiết đơn của Store", "Seller/Owner", "SORDER", "M2", "Order"),
 ("10-store-orders-report", "UC-SORDER-STATUS", "Chuyển trạng thái và xác nhận giao đơn", "Seller/Owner", "SORDER", "M2", "Order"),
 ("10-store-orders-report", "UC-SORDER-CANCEL", "Hủy đơn chưa xử lý có lý do", "Seller/Owner", "SORDER", "M2", "Order"),
 ("10-store-orders-report", "UC-SORDER-COD", "Ghi nhận thu đủ COD theo Order", "Seller/Owner", "PAY", "M2", "CODCollection"),
 ("10-store-orders-report", "UC-REP-STORE", "Xem báo cáo Store", "Owner", "REP", "M2", "Report"),
 ("11-platform-admin", "UC-ADMIN-ACCOUNT", "Khóa hoặc mở tài khoản", "Admin", "ADMIN", "M3", "User"),
 ("11-platform-admin", "UC-ADMIN-STORE", "Khóa hoặc mở Store", "Admin", "ADMIN", "M3", "Store"),
 ("11-platform-admin", "UC-ADMIN-TAX", "Quản lý Category, ProductType, AttributeKey", "Admin", "PTYPE", "M1", "Category"),
 ("11-platform-admin", "UC-ADMIN-RBAC", "Quản lý Role và Permission", "Admin", "ADMIN", "M3", "Role"),
 ("11-platform-admin", "UC-ADMIN-PRODUCT", "Ẩn hoặc bỏ ẩn Product", "Admin", "ADMIN", "M1", "Product"),
 ("11-platform-admin", "UC-ADMIN-MONITOR", "Giám sát đơn và nền tảng", "Admin", "ADMIN", "M2", "Report"),
 ("12-ai", "UC-CHAT-TALK", "Hội thoại RAG và xem card sản phẩm", "Guest/Customer", "AI", "M4", "ChatSession"),
 ("12-ai", "UC-CHAT-HISTORY", "Xem lại phiên chat của mình", "Customer", "AI", "M4", "ChatSession"),
 ("12-ai", "UC-REC-FOR-YOU", "Xem Dành cho bạn và fallback", "Customer", "REC", "M4", "Recommendation"),
 ("12-ai", "UC-REC-RELATED", "Xem gợi ý liên quan", "Guest/Customer", "REC", "M4", "Recommendation"),
 ("12-ai", "UC-AIMON-VIEW", "Giám sát log, model và index AI", "Admin", "AI", "M4", "ModelRun"),
]

# Exact FR and OpenAPI operationId connections. The values are separated by commas.
CASE_LINKS = {
 'UC-AUTH-REGISTER':('FR-AUTH-01','register,verifyEmail'), 'UC-AUTH-LOGIN':('FR-AUTH-02','login'),
 'UC-AUTH-LOGOUT':('FR-AUTH-02','logout'), 'UC-AUTH-RESET':('FR-AUTH-03','resetPassword,confirmResetPassword'),
 'UC-AUTH-CHANGE':('FR-AUTH-03','changePassword'),
 'UC-PROFILE-EDIT':('FR-PROFILE-01','getProfile,updateProfile'), 'UC-ADDR-MANAGE':('FR-ADDR-01','listAddresses,createAddress,updateAddress,deleteAddress'),
 'UC-CAT-BROWSE':('FR-CAT-01,FR-CAT-02','listCategories,listProducts'), 'UC-SEARCH-QUERY':('FR-SEARCH-01,FR-SEARCH-04','listProducts'),
 'UC-SEARCH-FILTER':('FR-SEARCH-02,FR-SEARCH-03','listProducts'), 'UC-PROD-DETAIL':('FR-PROD-01','getProduct'),
 'UC-STORE-BROWSE':('FR-STOREVIEW-01','listStoreProducts'), 'UC-CART-ADD':('FR-CART-01','addCartItem'),
 'UC-CART-EDIT':('FR-CART-02','updateCartItem,removeCartItem'), 'UC-CART-SELECT':('FR-CART-03','listCartItems'),
 'UC-CHECKOUT-QUOTE':('FR-CHECKOUT-02,FR-CHECKOUT-03,FR-CHECKOUT-06,FR-VCH-04','quoteCheckout'),
 'UC-CHECKOUT-CONFIRM':('FR-CHECKOUT-01,FR-CHECKOUT-04,FR-CHECKOUT-05,FR-CHECKOUT-06,FR-CHECKOUT-07,FR-ORDER-01','confirmCheckout,getPurchaseGroupOrders'),
 'UC-PAY-SANDBOX':('FR-PAY-01,FR-PAY-02','createPaymentAttempt,getPayment'), 'UC-PAY-COD':('FR-PAY-03','confirmCheckout'),
 'UC-ORDER-LIST':('FR-ORDER-02,FR-ORDER-03','listOwnOrders,getOwnOrder'), 'UC-ORDER-CANCEL':('FR-ORDER-04,FR-ORDER-05,FR-PAY-05','cancelOwnOrder'),
 'UC-REFUND-TRACK':('FR-PAY-05','getOrderRefund'), 'UC-VCH-STORE':('FR-VCH-01','createStoreVoucher,updateStoreVoucher,listStoreVouchers'),
 'UC-VCH-PLATFORM':('FR-VCH-01','createPlatformVoucher,updatePlatformVoucher,listPlatformVouchers'),
 'UC-VCH-APPLY':('FR-VCH-02,FR-VCH-03,FR-VCH-04','validateVouchers,quoteCheckout'), 'UC-VCH-USAGE':('FR-VCH-03','getStoreVoucherUsage,getPlatformVoucherUsage'),
 'UC-REV-BROWSE':('FR-REV-02','listProductReviews'), 'UC-REV-CREATE':('FR-REV-01','createReview'),
 'UC-REV-EDIT':('FR-REV-01','updateReview'), 'UC-REV-MODERATE':('FR-REV-03','hideReview,restoreReview'),
 'UC-STORE-APPLY':('FR-STORE-05','submitStoreApplication,listOwnStoreApplications'),
 'UC-STORE-REVIEW':('FR-STORE-06','listStoreApplications,reviewStoreApplication'), 'UC-STORE-EDIT':('FR-STORE-01','getOwnStore,updateOwnStore'),
 'UC-STAFF-INVITE':('FR-STORE-02,FR-STORE-07','inviteStaff,revokeStaffInvitation'), 'UC-STAFF-ACCEPT':('FR-STORE-07','acceptInvitation'),
 'UC-STAFF-INBOX':('FR-STORE-07','listOwnInvitations'),
 'UC-STAFF-LIST':('FR-STORE-02','listStoreStaff,listStaffInvitations'),
 'UC-STAFF-PERMISSIONS':('FR-STORE-02','updateStaff'),
 'UC-STAFF-LOCK':('FR-STORE-02','updateStaff'),
 'UC-SPROD-LIST':('FR-MPROD-01','listOwnStoreProducts'),
 'UC-SPROD-CREATE':('FR-MPROD-02,FR-MPROD-03,FR-MPROD-04,FR-MPROD-08,FR-MPROD-09','createProduct'),
 'UC-SPROD-EDIT':('FR-MPROD-05,FR-MPROD-09','updateProduct'), 'UC-SPROD-VARIANT':('FR-MPROD-07,FR-MPROD-10','createVariant'),
 'UC-SPROD-IMAGE':('FR-MPROD-06','addProductImage'), 'UC-SPROD-HIDE':('FR-MPROD-05','updateProduct'),
 'UC-INV-VIEW':('FR-INV-01','listStoreInventory'), 'UC-INV-ADJUST':('FR-INV-02','adjustInventory'),
 'UC-INV-HISTORY':('FR-INV-03','listStockMovements'), 'UC-SORDER-LIST':('FR-SORDER-01','listStoreOrders,getStoreOrder'),
 'UC-SORDER-STATUS':('FR-SORDER-02,FR-SORDER-03','transitionStoreOrder'), 'UC-SORDER-CANCEL':('FR-SORDER-02,FR-ORDER-05','cancelStoreOrder'),
 'UC-SORDER-COD':('FR-PAY-04','collectCod'), 'UC-REP-STORE':('FR-REP-01,FR-REP-02,FR-REP-03','getStoreReport'),
 'UC-ADMIN-ACCOUNT':('FR-ADMIN-02','listUsers,updateUserState'), 'UC-ADMIN-STORE':('FR-STORE-04,FR-STORE-08','listStores,updateStoreState'),
 'UC-ADMIN-TAX':('FR-PTYPE-01,FR-CATEGORY-ADMIN-01','createCategory,updateCategory,createProductType,updateProductType,createAttributeDefinition,updateAttributeDefinition'),
 'UC-ADMIN-RBAC':('FR-ADMIN-03','updateRole'), 'UC-ADMIN-PRODUCT':('FR-ADMIN-04','hideProduct,restoreProduct'),
 'UC-ADMIN-MONITOR':('FR-ADMIN-01,FR-ADMIN-05','listAllOrders,getPlatformDashboard'),
 'UC-CHAT-TALK':('FR-AI-01,FR-AI-02,FR-AI-03,FR-AI-04,FR-AI-05,FR-AI-06,FR-AI-07','createChatSession,sendChatMessage'),
 'UC-CHAT-HISTORY':('FR-AI-08','listOwnChatSessions'),
 'UC-REC-FOR-YOU':('FR-REC-01,FR-REC-02,FR-REC-03,FR-REC-04,FR-REC-06,FR-REC-07,FR-REC-09,FR-REC-10,FR-REC-11','getForYou'),
 'UC-REC-RELATED':('FR-REC-05','getRelatedProducts'),
 'UC-AIMON-VIEW':('FR-ADMIN-06,FR-ADMIN-07,FR-REC-08','getAiMetrics'),
}

ACTORS = {"Guest":"Khách vãng lai", "Customer":"Khách hàng", "Seller":"Nhân viên", "Owner":"Chủ Store", "Admin":"Quản trị viên"}
SECONDARY_ACTORS = {
 "UC-PAY-SANDBOX":"Cổng thanh toán sandbox",
 "UC-CHAT-TALK":"Dịch vụ LLM",
}
BR_BY_CASE = {
 "UC-CHECKOUT-QUOTE":"BR-18/27/28/29/31", "UC-CHECKOUT-CONFIRM":"BR-01/02/16/18/19/21/22/23/41",
 "UC-PAY-SANDBOX":"BR-17/22/23/40", "UC-PAY-COD":"BR-17/21/41",
 "UC-ORDER-CANCEL":"BR-24/25/26/39", "UC-SORDER-CANCEL":"BR-24/25/26/39",
 "UC-SORDER-COD":"BR-17/32", "UC-VCH-APPLY":"BR-27/28/29/30/31",
 "UC-REV-CREATE":"BR-37/38", "UC-REV-MODERATE":"BR-37/38",
 "UC-STORE-APPLY":"BR-03/33", "UC-STORE-REVIEW":"BR-03/33",
 "UC-STAFF-INVITE":"BR-03/04/35", "UC-STAFF-ACCEPT":"BR-03/35", "UC-STAFF-INBOX":"BR-03/35",
 "UC-SPROD-CREATE":"BR-08/09/36", "UC-SPROD-VARIANT":"BR-09/36",
 "UC-INV-ADJUST":"BR-10", "UC-SORDER-STATUS":"BR-24/39",
 "UC-CHAT-TALK":"BR-13/14/38", "UC-REC-FOR-YOU":"BR-12/20/38",
 "UC-AUTH-CHANGE":"BR-04/05", "UC-STAFF-LIST":"BR-03/04/35",
 "UC-STAFF-PERMISSIONS":"BR-04/06/35", "UC-SPROD-LIST":"BR-04/08/38",
}
SPECIAL = {
 "UC-AUTH-REGISTER": ("Guest nhập email, mật khẩu và thông tin Customer cơ bản.", "M3 kiểm tra định dạng, email chưa dùng và chính sách mật khẩu.", "M3 tạo User/CustomerProfile, chỉ lưu password hash và gửi link xác minh một lần vào mock mailbox demo.", "Người dùng mở link để M3 đặt email_verified_at; link sai/hết hạn không xác minh.", "Tài khoản mới chưa có quyền Store; chỉ email đã xác minh mới thấy/nhận lời mời."),
 "UC-AUTH-LOGIN": ("Guest nhập credential trên Client hoặc Portal.", "M3 xác minh tài khoản hiệu lực, password hash và rate limit.", "M3 tạo access/refresh session cho User, không đóng cứng một role trong JWT.", "Client gọi /me/context để lấy Customer, Store membership và permission hiện hành.", "Seller/Owner/Admin dùng cùng login; quyền cụ thể được kiểm tra lại ở request nghiệp vụ."),
 "UC-AUTH-RESET": ("Người chưa đăng nhập chọn quên mật khẩu và nhập email tài khoản.", "M3 phát mã/link một lần có hạn vào mock mailbox của môi trường demo; phản hồi giống nhau dù email không tồn tại.", "Người dùng mở mock mailbox theo email của mình và nhập mã cùng mật khẩu mới.", "M3 đổi hash, vô hiệu hóa mã và các refresh session cũ.", "Người dùng đăng nhập lại; mã hết hạn/đã dùng bị từ chối."),
 "UC-AUTH-CHANGE": ("Người dùng đã đăng nhập mở đổi mật khẩu và nhập mật khẩu cũ/mới.", "M3 xác minh phiên hiệu lực, mật khẩu cũ và chính sách mật khẩu mới.", "M3 cập nhật hash và thu hồi các phiên refresh khác.", "Hệ thống xác nhận thay đổi, yêu cầu đăng nhập lại ở phiên bị thu hồi.", "Sai mật khẩu cũ hoặc tài khoản bị khóa không làm đổi dữ liệu."),
 "UC-CHECKOUT-CONFIRM": ("Customer chọn item nhiều Store, một địa chỉ và phương thức theo từng Store.", "M2 tính lại giá/voucher/tồn và yêu cầu xác nhận lại nếu quote đổi.", "M2 tạo purchase_group_id và ID dự kiến cho từng Order; M1 reserve đủ mọi SKU, M2 giữ lượt voucher.", "M2 tạo nguyên tập Order, OrderItem snapshot và Payment riêng mỗi Order trong một transaction; không tạo một phần.", "COD consume tồn rồi chuyển PENDING; sandbox AWAITING_PAYMENT, giữ tồn tới khi trả hoặc hết hạn; trả danh sách Order."),
 "UC-PAY-SANDBOX": ("Customer mở Order AWAITING_PAYMENT của mình còn hạn.", "M2 tạo PaymentAttempt đúng Payment của Order và gửi gateway sandbox.", "Callback xác thực và chống lặp cập nhật Payment của riêng Order.", "Success: M1 consume reservation và Order chuyển PENDING; lỗi consume vào RECOVERING để worker retry, không thu lại.", "Nếu callback Success đến sau Order EXPIRED và reservation đã release, hoàn mock Payment của Order đó; Order khác không đổi."),
 "UC-PAY-COD": ("Customer chọn COD cho Store tương ứng trước khi tạo Order.", "M2 kiểm tra quote/địa chỉ/voucher của Order dự kiến.", "M2 tạo Order và Payment COD riêng cùng các Order khác trong một transaction.", "M1 consume tồn Order COD; nếu command lỗi Order ở PREPARING để retry, chưa báo sẵn sàng xử lý.", "M2 trả Order COD ở PENDING khi sẵn sàng; việc thu tiền khi giao thuộc UC-SORDER-COD."),
 "UC-ORDER-CANCEL": ("Customer mở Order của mình ở AWAITING_PAYMENT/Pending/Confirmed.", "M2 kiểm tra ownership, status và version.", "M2 đổi CANCELLED; nếu chưa trả tiền release tồn, nếu đã consume thì hoàn kho chống lặp.", "Sandbox đã trả tiền tạo Refund mock theo payable snapshot của Order; COD xóa nghĩa vụ thu.", "Các Order khác cùng purchase_group_id giữ nguyên số tiền/trạng thái."),
 "UC-VCH-APPLY": ("Customer nhập tối đa một mã Store/Store và một mã toàn sàn cho lần xác nhận giỏ.", "M2 kiểm tra thời gian, điều kiện min, hạn mức dùng và quyền áp dụng.", "Tính giảm Store trước, giảm toàn sàn sau; phân bổ theo phần dư lớn nhất.", "Hiển thị subtotal, giảm và phí từng Store để Customer xác nhận.", "Giữ lượt trong lúc tạo Order; chốt khi nguyên tập Order được tạo, lỗi thì release; hủy Order sau đó không khôi phục lượt."),
 "UC-REV-CREATE": ("Customer chọn OrderItem đã Completed của mình.", "M1 xác minh điều kiện mua và chủ sở hữu qua M2.", "M1 kiểm tra chưa có Review cho OrderItem, điểm 1–5.", "Lưu Review và audit; làm mới cache điểm tổng hợp suy ra từ Review VISIBLE nếu có.", "Chỉ Review hiển thị được đọc công khai."),
 "UC-STORE-APPLY": ("Customer mở form đăng ký Store và điền thông tin.", "M3 kiểm tra không có membership hoạt động hoặc đơn đang chờ.", "M3 tạo StoreApplication PENDING và trả mã theo dõi.", "Customer có thể xem trạng thái và lý do từ chối.", "Sau từ chối, Customer nộp đơn mới để gửi lại."),
 "UC-STORE-REVIEW": ("Admin mở đơn PENDING.", "M3 kiểm tra Admin và nội dung yêu cầu.", "Admin duyệt hoặc từ chối kèm lý do.", "Duyệt tạo Store và Owner membership trong một transaction M3.", "M3 ghi audit và cập nhật trạng thái cho Customer."),
 "UC-SORDER-COD": ("Seller/Owner mở Order COD của Store ở Shipped.", "M2 kiểm tra quyền Store, version và số tiền cần thu.", "Actor xác nhận đã giao và thu đủ đúng số tiền Order.", "M2 ghi CODCollection và chuyển Order Completed.", "Payment của chính Order chuyển SUCCEEDED; các Order cùng purchase_group_id không đổi."),
 "UC-CHAT-TALK": ("Guest/Customer nhập nhu cầu mua sắm.", "M4 truy xuất Product context, kiểm tra trạng thái/giá hiện hành qua M1.", "M4 thêm preference hợp lệ của Customer rồi gọi LLM.", "M4 chỉ trả card/link Product đã xác thực và câu trả lời grounded.", "Thiếu context/LLM lỗi: nêu giới hạn, không bịa sản phẩm."),
 "UC-STAFF-INVITE": ("Owner chọn Store của mình, email người được mời và tập quyền Seller.", "M3 kiểm tra membership Owner hoạt động và tập quyền không vượt Seller.", "M3 tạo lời mời có hạn dùng, gắn email/tài khoản; mock mailbox demo nhận link.", "Owner có thể thu hồi lời mời PENDING khi gửi nhầm; M3 ghi REVOKED và audit.", "Lời mời REVOKED hoặc hết hạn không thể cấp membership."),
 "UC-STAFF-ACCEPT": ("Customer mở lời mời còn hạn gắn đúng tài khoản/email.", "M3 kiểm tra email đã xác minh, lời mời PENDING chưa hết hạn và chưa có membership Store khác đang hoạt động.", "Customer xác nhận tham gia với quyền Seller đã được Owner cấp.", "M3 tạo StoreMembership trong một transaction và đánh dấu lời mời đã dùng.", "Auth context request kế tiếp nhận membership mới; token cũ không vượt quyền đã thu hồi."),
 "UC-STAFF-INBOX": ("Customer đã đăng nhập mở mục lời mời tham gia Store.", "M3 tìm StaffInvitation theo email đã xác minh của chính User.", "M3 đánh dấu lời mời PENDING quá hạn thành EXPIRED trước khi trả danh sách.", "M3 trả Store, quyền đề xuất, trạng thái và thời hạn; không trả token hash.", "Customer chọn lời mời còn hạn để chấp nhận qua UC-STAFF-ACCEPT."),
 "UC-STAFF-LIST": ("Owner mở danh sách Seller và lời mời của Store hiện hành.", "M3 kiểm tra Owner membership còn hiệu lực và xác định Store từ auth context.", "M3 trả Seller active/locked cùng tập quyền hiệu lực, lời mời pending/expired.", "Owner lọc theo trạng thái để chọn nhân viên cần điều chỉnh.", "Không trả nhân viên hoặc lời mời của Store khác."),
 "UC-STAFF-PERMISSIONS": ("Owner chọn Seller trong Store và tập quyền mới.", "M3 kiểm tra quyền Owner và mọi permission đều thuộc bốn nhóm Seller cho phép.", "M3 cập nhật MembershipPermission, version và audit trong transaction.", "Quyền bị thu hồi có hiệu lực ở request nhạy cảm kế tiếp dù JWT cũ còn hạn.", "Không cấp quyền voucher, báo cáo, Owner hoặc Admin."),
 "UC-STAFF-LOCK": ("Owner chọn Seller của Store và trạng thái khóa hoặc mở khóa.", "M3 kiểm tra membership Owner/Seller cùng Store, version và trạng thái hiện hành.", "M3 cập nhật trạng thái membership, giữ lịch sử và ghi audit.", "Khóa chặn API quản trị Store ngay; mở chỉ phục hồi tập quyền Seller đã được cấp.", "Không khóa User toàn hệ thống hoặc chuyển quyền Owner qua thao tác này."),
 "UC-SPROD-LIST": ("Seller/Owner mở danh sách Product của Store membership hiện hành.", "M1 kiểm tra quyền Store và lọc theo tên, trạng thái, ProductType với phân trang.", "M1 trả cả Product nháp/ngừng bán của Store đó kèm Variant và giá hiện hành cần quản lý.", "Actor chọn Product để sửa, quản lý ảnh/Variant hoặc ngừng bán.", "Không trả Product của Store khác; catalog công khai chỉ trả Product đang hiển thị."),
 "UC-SPROD-CREATE": ("Seller/Owner chọn ProductType và nhập tên, mô tả, ảnh, thuộc tính bắt buộc.", "M1 kiểm tra Store đang hoạt động, quyền membership và kiểu/giới hạn thuộc tính.", "Actor tạo một hoặc nhiều Variant; Product không có lựa chọn tạo SKU mặc định.", "M1 kiểm tra SKU duy nhất trong Store và tổ hợp thuộc tính duy nhất trong Product.", "M1 lưu Product nháp; chỉ công khai khi có Variant hợp lệ, giá và tồn theo quy tắc."),
 "UC-SPROD-VARIANT": ("Seller/Owner mở Product của Store và khai báo tổ hợp thuộc tính tạo biến thể.", "M1 kiểm tra ProductType, kiểu dữ liệu và giá trị được phép của từng thuộc tính.", "M1 kiểm tra SKU chưa tồn tại trong Store và tổ hợp chưa có trong Product.", "M1 lưu Variant với giá bán thực tế, tạo Inventory ban đầu bằng 0.", "Variant đã xuất hiện trong Order được ngừng bán, không xóa dữ liệu lịch sử."),
 "UC-SPROD-EDIT": ("Seller/Owner mở Product của Store để sửa nội dung, giá hoặc trạng thái bán.", "M1 kiểm tra membership, version, ProductType và giá/thuộc tính hợp lệ.", "M1 lưu sửa đổi; Order cũ giữ snapshot Product/Variant và giá.", "DRAFT hoặc STOPPED → ACTIVE chỉ khi Store hoạt động, có SKU/giá hợp lệ và Product không bị Admin ẩn.", "Nếu thiếu điều kiện đăng bán, M1 trả lỗi có mã; không đổi trạng thái bán."),
 "UC-SPROD-HIDE": ("Seller/Owner chọn Product của Store đang bán và xác nhận ngừng bán.", "M1 kiểm tra membership, version và trạng thái không bị Admin ẩn.", "M1 đổi trạng thái bán, không xóa Variant, ảnh, OrderItem hay lịch sử.", "Product biến mất khỏi catalog công khai, AI và checkout mới; Order cũ vẫn xử lý.", "Nếu cần bán lại, dùng UC-SPROD-EDIT khi không có khóa quản trị."),
 "UC-INV-ADJUST": ("Seller/Owner chọn SKU của Store, loại nhập/xuất/điều chỉnh, số lượng và lý do.", "M1 kiểm tra quyền membership, version và định danh thao tác chống lặp.", "M1 kiểm tra tồn mới không âm và không nhỏ hơn reserved_quantity.", "M1 cập nhật quantity cùng StockMovement trong một transaction.", "M1 trả tồn vật lý, đang giữ và khả dụng sau thay đổi."),
 "UC-SORDER-STATUS": ("Seller/Owner mở Order thuộc Store và chọn bước trạng thái kế tiếp.", "M2 kiểm tra membership, version và cạnh chuyển trạng thái hợp lệ.", "Actor xác nhận Pending → Confirmed → Processing → Shipped; với sandbox xác nhận giao thành công để chuyển Completed.", "M2 ghi Shipment/OrderStatusHistory, thời điểm và actor trong transaction.", "Order COD chuyển Completed qua UC-SORDER-COD sau khi ghi nhận thu đủ; version cũ trả 409."),
 "UC-SORDER-CANCEL": ("Seller/Owner mở Order AWAITING_PAYMENT/Pending/Confirmed thuộc Store và nhập lý do hủy.", "M2 kiểm tra quyền Store, status và version hiện tại.", "M2 chuyển CANCELLED, ghi lịch sử rồi release tồn chưa bán hoặc hoàn kho đã consume bằng mã chống lặp.", "Order trả trước tạo Refund mock riêng; COD xóa nghĩa vụ thu của Order.", "M2 trả Order và Refund độc lập; Order khác cùng purchase_group_id giữ nguyên."),
 "UC-VCH-STORE": ("Owner mở voucher của Store mình và nhập mã, loại giảm, hạn dùng và giới hạn.", "M2 kiểm tra Owner membership; Seller không được quản lý voucher.", "M2 kiểm tra giá trị tối thiểu, mức trần, tổng lượt và giới hạn mỗi Customer.", "M2 tạo/cập nhật voucher với phạm vi Store và ghi audit.", "Voucher đã dùng được ngừng áp dụng về sau nhưng Redemption lịch sử không đổi."),
 "UC-VCH-PLATFORM": ("Admin mở voucher toàn sàn và nhập mã, loại giảm, thời hạn và hạn mức.", "M2 kiểm tra quyền Administrator và mã không trùng trong phạm vi áp dụng.", "M2 kiểm tra ngưỡng sau giảm Store, mức trần và giới hạn sử dụng.", "M2 tạo/cập nhật voucher toàn sàn và ghi audit.", "Order cũ giữ snapshot giảm giá dù voucher được đổi hoặc khóa."),
 "UC-REV-MODERATE": ("Admin mở Review cần kiểm duyệt hoặc khôi phục.", "M1 kiểm tra quyền Administrator và trạng thái hiện hành.", "Admin nhập lý do và chọn ẩn hoặc hiện lại Review.", "M1 đổi trạng thái, ghi ReviewAudit gồm actor, hành động, lý do, thời điểm.", "M1 tính lại điểm tổng hợp chỉ từ Review VISIBLE và cập nhật danh sách công khai."),
 "UC-ADMIN-PRODUCT": ("Admin mở Product cần kiểm duyệt hoặc khôi phục.", "M1 kiểm tra quyền Administrator, version và trạng thái kiểm duyệt hiện hành.", "Admin nhập lý do và chọn ẩn hoặc bỏ ẩn Product.", "M1 đổi moderation_status và ghi audit; Product.status do Store đặt không đổi.", "Bỏ ẩn chỉ đưa Product ACTIVE của Store ACTIVE trở lại catalog; Product STOPPED/DRAFT vẫn không bán."),
 "UC-REC-FOR-YOU": ("Customer mở mục Dành cho bạn; M4 đọc tín hiệu và phiên bản model đang phục vụ.", "M4 xếp hạng bằng baseline/model được duyệt hoặc fallback khi thiếu tín hiệu/model lỗi.", "M4 loại Product không còn công khai theo dữ liệu M1 hiện hành.", "M4 trả danh sách có nguồn model/fallback và ghi impression có consent.", "M4 không trình bày metric dự kiến như kết quả đánh giá đã chạy."),
}

def save(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as stream:
        stream.write(text.rstrip()+"\n")

GROUP_TITLES = {
    "01-auth-profile": "Xác thực và hồ sơ",
    "02-discovery": "Khám phá sản phẩm",
    "03-cart-checkout": "Giỏ hàng, checkout và thanh toán",
    "04-payment-customer-order": "Đơn hàng và hoàn tiền Customer",
    "05-voucher": "Voucher",
    "06-review": "Đánh giá",
    "07-store-staff": "Store và nhân viên",
    "08-product-management": "Quản lý sản phẩm",
    "09-inventory": "Tồn kho",
    "10-store-orders-report": "Xử lý đơn và báo cáo Store",
    "11-platform-admin": "Quản trị nền tảng",
    "12-ai": "Chatbot và recommendation",
}

OVERVIEW = [
    ("OV-AUTH", "Xác thực và hồ sơ", ["Guest", "Customer", "Seller", "Admin"], ["01-auth-profile"]),
    ("OV-DISCOVER", "Khám phá sản phẩm", ["Visitor"], ["02-discovery", "06-review", "12-ai"]),
    ("OV-CHECKOUT", "Mua hàng đa Store\\nvà thanh toán", ["Customer"], ["03-cart-checkout", "05-voucher"]),
    ("OV-POST", "Theo dõi, hủy đơn\\nvà đánh giá", ["Customer"], ["04-payment-customer-order", "06-review"]),
    ("OV-APPLY", "Đăng ký mở Store\\nvà nhận lời mời", ["Customer"], ["07-store-staff"]),
    ("OV-CATALOG", "Quản lý sản phẩm\\nvà tồn kho", ["Seller"], ["08-product-management", "09-inventory"]),
    ("OV-FULFILL", "Xử lý đơn\\nvà thu COD", ["Seller"], ["10-store-orders-report"]),
    ("OV-STORE", "Quản lý Store, nhân viên,\\nvoucher và báo cáo", ["Owner"], ["05-voucher", "07-store-staff", "10-store-orders-report"]),
    ("OV-ADMIN", "Duyệt Store, voucher sàn,\\nkiểm duyệt và giám sát", ["Admin"], ["05-voucher", "06-review", "07-store-staff", "11-platform-admin", "12-ai"]),
    ("OV-AI", "Chat và gợi ý\\ncá nhân hóa", ["Visitor"], ["12-ai"]),
]

OVERVIEW_DETAIL = {
    "OV-AUTH": ["UC-AUTH-REGISTER", "UC-AUTH-LOGIN", "UC-AUTH-LOGOUT", "UC-AUTH-RESET", "UC-AUTH-CHANGE", "UC-PROFILE-EDIT", "UC-ADDR-MANAGE"],
    "OV-DISCOVER": ["UC-CAT-BROWSE", "UC-SEARCH-QUERY", "UC-SEARCH-FILTER", "UC-PROD-DETAIL", "UC-STORE-BROWSE", "UC-REV-BROWSE", "UC-REC-RELATED"],
    "OV-CHECKOUT": ["UC-CART-ADD", "UC-CART-EDIT", "UC-CART-SELECT", "UC-CHECKOUT-QUOTE", "UC-CHECKOUT-CONFIRM", "UC-PAY-SANDBOX", "UC-PAY-COD", "UC-VCH-APPLY"],
    "OV-POST": ["UC-ORDER-LIST", "UC-ORDER-CANCEL", "UC-REFUND-TRACK", "UC-REV-CREATE", "UC-REV-EDIT"],
    "OV-APPLY": ["UC-STORE-APPLY", "UC-STAFF-ACCEPT", "UC-STAFF-INBOX"],
    "OV-CATALOG": ["UC-SPROD-LIST", "UC-SPROD-CREATE", "UC-SPROD-EDIT", "UC-SPROD-VARIANT", "UC-SPROD-IMAGE", "UC-SPROD-HIDE", "UC-INV-VIEW", "UC-INV-ADJUST", "UC-INV-HISTORY"],
    "OV-FULFILL": ["UC-SORDER-LIST", "UC-SORDER-STATUS", "UC-SORDER-CANCEL", "UC-SORDER-COD"],
    "OV-STORE": ["UC-STORE-EDIT", "UC-STAFF-INVITE", "UC-STAFF-LIST", "UC-STAFF-PERMISSIONS", "UC-STAFF-LOCK", "UC-VCH-STORE", "UC-VCH-USAGE", "UC-REP-STORE"],
    "OV-ADMIN": ["UC-VCH-PLATFORM", "UC-VCH-USAGE", "UC-REV-MODERATE", "UC-STORE-REVIEW", "UC-ADMIN-ACCOUNT", "UC-ADMIN-STORE", "UC-ADMIN-TAX", "UC-ADMIN-RBAC", "UC-ADMIN-PRODUCT", "UC-ADMIN-MONITOR", "UC-AIMON-VIEW"],
    "OV-AI": ["UC-CHAT-TALK", "UC-CHAT-HISTORY", "UC-REC-FOR-YOU", "UC-REC-RELATED"],
}

def diagram_actor(roles):
    if roles == "Guest/Customer":
        return "Visitor"
    if roles == "Seller/Owner":
        return "Seller"
    if roles == "Customer/Seller/Owner/Admin":
        return "Authenticated"
    if roles == "Authenticated":
        return "Authenticated"
    return roles

def puml(cases, title, overview=False):
    lines = ["@startuml", "left to right direction", "skinparam packageStyle rectangle",
             "skinparam usecaseBackgroundColor #F5F9FF",
             "skinparam usecaseBorderColor #4774A5", f"title {title}"]
    if overview:
        lines.append('actor "Người truy cập" as Visitor')
        for actor in ("Guest", "Customer", "Seller", "Owner", "Admin"):
            lines.append(f'actor "{ACTORS[actor]}" as {actor}')
        lines += ["Guest --|> Visitor", "Customer --|> Visitor", "Owner --|> Seller"]
        lines.append('rectangle "PBL6 Marketplace" {')
        for code, label, *_ in OVERVIEW:
            lines.append(f'  usecase "{label}\\n[{code}]" as {code.replace("-", "_")}')
        lines.append("}")
        for code, _, actors, _ in OVERVIEW:
            for actor in actors:
                lines.append(f'{actor} -- {code.replace("-", "_")}')
        lines += ['actor "Cổng thanh toán sandbox" as Gateway',
                  'actor "Dịch vụ LLM" as LLM',
                  'Gateway -- OV_CHECKOUT', 'LLM -- OV_AI',
                  'note right of Customer',
                  '  Một User có thể dùng Customer và Seller/Owner',
                  '  theo ngữ cảnh request; catalog công khai cho mọi vai.',
                  'end note', '@enduml']
        return "\n".join(lines)
    group = cases[0][0]
    used = {diagram_actor(row[3]) for row in cases}
    if group == "03-cart-checkout":
        used.add("Gateway")
    if group == "12-ai":
        used.add("LLM")
    if "Visitor" in used:
        used.update(("Guest", "Customer"))
    if "Seller" in used:
        used.add("Owner")
    if "Authenticated" in used and group == "01-auth-profile":
        used.update(("Customer", "Seller", "Owner", "Admin"))
    labels = {**ACTORS, "Visitor": "Người truy cập", "Authenticated": "Người dùng đã đăng nhập",
              "Gateway": "Cổng thanh toán sandbox", "LLM": "Dịch vụ LLM"}
    for actor in ("Visitor", "Guest", "Authenticated", "Customer", "Seller", "Owner", "Admin", "Gateway", "LLM"):
        if actor in used:
            lines.append(f'actor "{labels[actor]}" as {actor}')
    if "Visitor" in used:
        lines += ["Guest --|> Visitor", "Customer --|> Visitor"]
    if "Authenticated" in used and group == "01-auth-profile":
        lines += ["Customer --|> Authenticated", "Seller --|> Authenticated", "Admin --|> Authenticated"]
    if "Seller" in used and "Owner" in used:
        lines.append("Owner --|> Seller")
    lines.append('rectangle "PBL6 Marketplace" {')
    for _, code, name, *_ in cases:
        lines.append(f'  usecase "{name}\\n[{code}]" as {code.replace("-", "_")}')
    lines.append("}")
    for _, code, _, actors, *_ in cases:
        for actor in diagram_actor(actors).split("/"):
            lines.append(f'{actor} -- {code.replace("-", "_")}')
    if group == "02-discovery":
        lines.append('UC_SEARCH_FILTER ..> UC_SEARCH_QUERY : <<extend>> [có bộ lọc]')
    if group == "03-cart-checkout":
        lines += ["Gateway -- UC_PAY_SANDBOX",
                  'note bottom of UC_CHECKOUT_CONFIRM',
                  '  Tạo một Order cho mỗi Store trong cùng transaction.',
                  '  Mỗi Order chọn SANDBOX hoặc COD riêng.',
                  '  purchase_group_id chỉ liên kết các Order.',
                  'end note']
    if group == "01-auth-profile":
        lines += ['note right of Authenticated',
                  '  Một User có thể mang Customer và Seller/Owner context.',
                  '  Quyền tính theo context của từng request.',
                  'end note']
    if group == "08-product-management":
        lines += ['note bottom of UC_SPROD_EDIT',
                  '  Seller cần product.store.* hiệu lực.',
                  '  DRAFT/STOPPED -> ACTIVE qua chức năng này.',
                  'end note']
    if group == "09-inventory":
        lines += ['note bottom of UC_INV_ADJUST',
                  '  Seller cần inventory.store.* hiệu lực.',
                  'end note']
    if group == "12-ai":
        lines.append("LLM -- UC_CHAT_TALK")
    if group == "10-store-orders-report":
        lines += ['note bottom of UC_SORDER_STATUS',
                  '  Seller cần order.store.* hiệu lực.',
                  '  Seller/Owner xác nhận giao thành công cho sandbox.',
                  '  COD cần cod.store.collect khi hoàn tất từng Order.',
                  'end note']
    lines.append("@enduml")
    return "\n".join(lines)

def main():
    target = OUT / "use-cases.md"
    if target.exists() and "--force" not in sys.argv[1:]:
        raise SystemExit("use-cases.md exists; --force required")
    assert set(CASE_LINKS) == {row[1] for row in CASES}
    assert {case for linked in OVERVIEW_DETAIL.values() for case in linked} == set(CASE_LINKS)
    bygroup = {}
    for row in CASES: bygroup.setdefault(row[0], []).append(row)
    story_by_fr = {}
    trace_path = OUT / "traceability.md"
    if trace_path.exists():
        for line in trace_path.read_text(encoding="utf-8").splitlines():
            cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
            if len(cells) >= 2 and re.fullmatch(r"FR-[A-Z0-9-]+", cells[0]):
                story_by_fr[cells[0]] = re.findall(r"US-[A-Z0-9-]+", cells[1])
    save(DIAGRAM / "00-overview.puml", puml(CASES,"Use Case tổng quan PBL6", True))
    for group, rows in bygroup.items():
        save(DIAGRAM / (group+".puml"), puml(rows,"Use Case PBL6 — " + GROUP_TITLES[group]))
    lines = ["# Đặc tả Use Case 2.0 Draft", "", "Có **một sơ đồ tổng quan** và **12 sơ đồ chi tiết** trong [diagrams/use-case](diagrams/use-case/). Bản chuyển đổi [Use Case 1.0](legacy/use-cases.md) chỉ để truy vết. Actor là vai trò nghiệp vụ; M1–M4 không là actor trong ranh giới marketplace.", "", "## Actor và quan hệ UML", "", "| Actor | Mục tiêu/phạm vi |", "| --- | --- |"]
    for a,label in ACTORS.items():
        lines.append(f"| {a} | {label}; chi tiết quyền ở [RBAC](rbac.md). |")
    lines += ["", "Owner kế thừa quyền nghiệp vụ Seller. Một User đồng thời có thể đóng vai Customer và Owner/Seller. Gateway sandbox và LLM là actor hỗ trợ ngoài ranh giới; database, gateway nội bộ và worker không là actor của sơ đồ tổng quan.", "", "| Nguồn | Đích | Loại | Lý do |", "| --- | --- | --- | --- |", "| Owner | Seller | Generalization | Owner có toàn quyền Seller trong Store. |", "| Customer | UC-CHECKOUT-CONFIRM | Association | Customer khởi tạo checkout. |", "| UC-PAY-SANDBOX | UC-CHECKOUT-CONFIRM | Extend khi chọn sandbox | COD là nhánh khác; không bắt buộc sandbox. |", "| UC-PAY-COD | UC-CHECKOUT-CONFIRM | Extend khi chọn COD | Tạo đơn trước thu tiền. |", "", "Không dùng `include` trong 2.0: các bước kỹ thuật bắt buộc như xác minh OrderItem, reserve tồn và kiểm tra giá được mô tả trong luồng và sequence, chưa có mục tiêu người dùng độc lập để tái sử dụng như Use Case chung.", "", "## Danh mục và phân rã", "", "| Nhóm | Mã Use Case | Mục tiêu | Actor | Service | FR chính |", "| --- | --- | --- | --- | --- | --- |"]
    catalog_start = lines.index("## Danh mục và phân rã")
    lines = [
        "# Đặc tả Use Case 2.0 Draft", "",
        "Có **một sơ đồ tổng quan** và **12 sơ đồ chi tiết** trong [diagrams/use-case](diagrams/use-case/). Bản chuyển đổi [Use Case 1.0](legacy/use-cases.md) chỉ để truy vết. Actor là vai trò nghiệp vụ; M1–M4, database và worker không là actor của ranh giới marketplace.",
        "", "## Actor và quan hệ UML", "",
        "| Actor | Phạm vi |", "| --- | --- |",
        "| Guest | Người chưa đăng nhập; đăng ký, đăng nhập và yêu cầu đặt lại mật khẩu. |",
        "| Authenticated (trừu tượng) | Người dùng đã đăng nhập; đăng xuất, đổi mật khẩu và hồ sơ. Customer, Seller, Administrator kế thừa hành vi này. |",
        "| Visitor (trừu tượng) | Người truy cập catalog công khai; Guest và Customer kế thừa hành vi này. Seller/Admin vẫn truy cập public API như mọi User. |",
        "| Customer | Mua hàng, theo dõi đơn, đánh giá và đăng ký Store. Một User có thể dùng đồng thời vai trò này với Seller/Owner. |",
        "| Seller | Nhân viên Store, quyền hiệu lực có thể bị Owner thu hồi theo [RBAC](rbac.md). |",
        "| Owner | Kế thừa Seller, thêm quản lý Store, nhân viên, voucher và báo cáo. |",
        "| Administrator | Quản trị toàn sàn; không mặc nhiên là Seller của Store. |",
        "| Gateway sandbox / LLM | Actor hỗ trợ ngoài hệ thống ở thanh toán sandbox / chat RAG. |",
        "", "Guest mô tả trạng thái **trước đăng nhập**, nên Seller/Owner/Admin cũng bắt đầu đăng nhập ở vai Guest. Generalization trên hình biểu diễn hành vi dùng chung, không gán vai trò vĩnh viễn cho User. Actor Customer và Seller/Owner có thể là cùng một User ở các request khác nhau.",
        "", "| Nguồn | Đích | Quan hệ | Điều kiện/lý do |", "| --- | --- | --- | --- |",
        "| Owner | Seller | Generalization actor | Owner có quyền nghiệp vụ Seller, vẫn chịu scope và permission hiệu lực. |",
        "| Customer / Seller / Admin | Authenticated | Generalization actor | Dùng đăng xuất, đổi mật khẩu và hồ sơ chung. |",
        "| Guest / Customer | Visitor | Generalization actor | Dùng chức năng catalog công khai; không kế thừa đăng ký/đăng nhập. |",
        "| Customer | UC-CHECKOUT-CONFIRM | Association | Customer khởi tạo checkout. |",
        "| Gateway sandbox | UC-PAY-SANDBOX | Association | Gateway chỉ tham gia nhánh sandbox. |",
        "| LLM | UC-CHAT-TALK | Association | Dịch vụ ngoài trả nội dung RAG. |",
        "| UC-SEARCH-FILTER | UC-SEARCH-QUERY | Extend | Sau truy vấn, người dùng tùy chọn lọc/sắp xếp. |",
        "| UC-VCH-APPLY | UC-CHECKOUT-QUOTE | Extend khái niệm | Voucher là lựa chọn khi xem giá; quan hệ xuyên nhóm ghi tại đây, không khai báo trùng UC trên hai hình. |",
        "| UC-PAY-SANDBOX / UC-PAY-COD | UC-CHECKOUT-CONFIRM | Nhánh theo từng Order | Sau tạo Order, mỗi Order có phương thức riêng; không dùng include/extend cho luồng thanh toán kỹ thuật. |",
        "| UC-SORDER-COD | UC-SORDER-STATUS | Nhánh có điều kiện | Chỉ ở bước SHIPPED → COMPLETED của COD, thu đủ là bắt buộc; sandbox hoàn tất qua STATUS. |",
        "", "**Không dùng include cho bước dữ liệu/kỹ thuật:** chọn địa chỉ, xác thực quyền, reserve tồn, ghi StockMovement, xác minh review và gọi callback nằm trong luồng hoặc sequence. Mỗi Order có đúng một phương thức SANDBOX hoặc COD; các Order cùng nhóm có thể chọn khác nhau và thanh toán riêng. Sơ đồ chi tiết chỉ khai báo mỗi UC đúng một lần. Luồng UI từ Product detail sang review/gợi ý, từ chat card sang Product detail là điều hướng, không phải include.",
        "", "## Danh mục và phân rã", "", "| Nhóm | Mã Use Case | Mục tiêu | Actor | Service | FR chính |", "| --- | --- | --- | --- | --- | --- |",
    ] + lines[catalog_start+4:]
    for group, code, name, actors, fr, service, obj in CASES:
        exact_fr,operations=CASE_LINKS[code]
        lines.append(f"| [{group}](diagrams/use-case/{group}.puml) | [{code}](#{code.lower()}) | {name} | {actors} | {service} | {exact_fr} |")
    lines += ["", "## Ánh xạ UC cũ", "", "| UC nguồn | UC 2.0 |", "| --- | --- |", "| UC-AUTH-01 | UC-AUTH-REGISTER, UC-AUTH-LOGIN, UC-AUTH-RESET |", "| UC-PROD-01/02 | UC-CAT-BROWSE, UC-SEARCH-QUERY/FILTER, UC-PROD-DETAIL |", "| UC-CART-01 | UC-CART-ADD/EDIT/SELECT |", "| UC-CHECKOUT-01 | UC-CHECKOUT-QUOTE/CONFIRM, UC-PAY-SANDBOX/COD |", "| UC-PAY-01 | UC-PAY-SANDBOX/COD, UC-REFUND-TRACK |", "| UC-ORDER-01 | UC-ORDER-LIST/CANCEL |", "| UC-STORE-01/02 | UC-STORE-APPLY/REVIEW/EDIT, UC-STAFF-INVITE/ACCEPT/LOCK |", "| UC-SPROD-01/02 | UC-SPROD-CREATE/EDIT/VARIANT/IMAGE/HIDE |", "| UC-INV-01 | UC-INV-VIEW/ADJUST/HISTORY |", "| UC-SORDER-01 | UC-SORDER-LIST/STATUS/CANCEL/COD |", "| UC-REP-01 | UC-REP-STORE |", "| UC-ADMIN-01/02/03 | UC-ADMIN-ACCOUNT/STORE/TAX/RBAC/PRODUCT/MONITOR |", "| UC-CHAT-01, UC-REC-01, UC-AIMON-01 | UC-CHAT-TALK/HISTORY, UC-REC-FOR-YOU/RELATED, UC-AIMON-VIEW |", "", "UC mới voucher/review được thêm, không ép ánh xạ giả sang UC 1.0.", "", "## Đặc tả chi tiết"]
    if lines[-1] == "## Đặc tả chi tiết":
        lines.pop()
    lines = [line.replace("UC-AUTH-RESET |", "UC-AUTH-RESET, UC-AUTH-CHANGE |")
             .replace("UC-STAFF-INVITE/ACCEPT/LOCK |", "UC-STAFF-INVITE/ACCEPT/INBOX/LIST/PERMISSIONS/LOCK |")
             .replace("UC-SPROD-CREATE/EDIT/VARIANT/IMAGE/HIDE |", "UC-SPROD-LIST/CREATE/EDIT/VARIANT/IMAGE/HIDE |")
             for line in lines]
    lines += ["", "## Ánh xạ Use Case tổng quan", "",
              "Mã `OV-*` là mục tiêu gộp của hình tổng quan, không thay thế mã `UC-*` chi tiết. Một nhóm có thể xuất hiện trong nhiều mục tiêu (ví dụ Review ở khám phá và sau mua).", "",
              "| Mã tổng quan | Nhóm sơ đồ chi tiết | UC chi tiết |", "| --- | --- | --- |"]
    for code, _, _, groups in OVERVIEW:
        linked = OVERVIEW_DETAIL[code]
        lines.append(f"| {code} | {', '.join(groups)} | {', '.join(linked)} |")
    lines += ["", "## Đặc tả chi tiết"]
    for group, code, name, actors, fr, service, obj in CASES:
        api = "API-"+fr
        steps = SPECIAL.get(code)
        if steps is None:
            access_check = "quyền truy cập công khai và trạng thái hiển thị" if actors == "Guest/Customer" else "danh tính, phạm vi dữ liệu và quyền hiệu lực"
            steps = (f"{actors} mở chức năng {name.lower()} trên giao diện được phép.", f"{service} kiểm tra {access_check} của {obj} theo [RBAC](rbac.md).", f"Actor cung cấp hoặc chọn dữ liệu cần cho {name.lower()}.", f"{service} kiểm tra hợp lệ, thực hiện thay đổi hoặc truy vấn {obj}; ghi audit khi là thao tác quản trị.", "Hệ thống trả kết quả mới nhất hoặc danh sách thuộc đúng phạm vi actor.")
        exact_fr,operations=CASE_LINKS[code]
        related_stories = sorted({story for fr_id in exact_fr.split(",") for story in story_by_fr.get(fr_id, [])})
        stories_label = ", ".join(related_stories) or "technical task theo FR"
        precondition = "vai trò/quyền hợp lệ" if "Guest" not in actors else "không cần đăng nhập; nếu đã đăng nhập, dùng phạm vi quyền hiện hành"
        object_condition = "" if code in ("UC-AUTH-REGISTER", "UC-AUTH-LOGIN", "UC-AUTH-RESET", "UC-AUTH-CHANGE") else f"; đối tượng {obj} tồn tại khi thao tác trên bản ghi cũ"
        secondary = SECONDARY_ACTORS.get(code, "không có actor ngoài hệ thống")
        rule_ids = BR_BY_CASE.get(code, "quy tắc của nhóm FR trong Business Rules")
        platform = "Web/Mobile/Portal theo tài khoản" if actors == "Authenticated" or group == "01-auth-profile" else ("Portal" if actors in ("Seller/Owner", "Owner", "Admin", "Owner/Admin") else "Web/Mobile")
        lines += ["", f"<a id=\"{code.lower()}\"></a>", f"### {code} — {name}", "", f"- **Actor chính:** {actors}. **Actor phụ:** {secondary}. **Phạm vi:** PBL6 Marketplace. **Nền tảng:** {platform}. **Service:** {service}.", f"- **Trigger:** actor chọn {name.lower()}. **Tiền điều kiện:** {precondition}{object_condition}.", f"- **Hậu điều kiện thành công:** {obj} được trả hoặc cập nhật đúng phạm vi; các bản ghi liên quan đồng bộ theo [quy tắc](business-rules.md). **Khi thất bại:** không ghi thay đổi nghiệp vụ một phần; tác vụ bất đồng bộ giữ trạng thái phục hồi khi được định nghĩa.", f"- **Dữ liệu vào/ra:** định danh đối tượng, trường được phép sửa/bộ lọc; trả mã và trạng thái {obj}. **Yêu cầu:** {exact_fr}. **Story:** {stories_label}. **Quy tắc:** {rule_ids}. **OpenAPI operationId:** {operations}. **Dữ liệu:** {obj}. **AC:** tiêu chí Given–When–Then ở [User Stories](user-stories.md) và các test nhóm {fr} trong [Test Plan](test-plan.md).", "", "Luồng chính:", ""]
        if code == "UC-CHECKOUT-CONFIRM":
            lines[-6] = "- **Trigger:** Customer xác nhận quote của item đã chọn. **Tiền điều kiện:** Customer sở hữu CartItem/Address, quote còn hạn và Idempotency-Key hợp lệ."
            lines[-5] = "- **Hậu điều kiện thành công:** tạo toàn bộ Order và Payment riêng từng Store, liên kết bằng purchase_group_id; không tạo Order một phần. **Khi thất bại:** release reservation/lượt voucher trước transaction hoặc giữ trạng thái PREPARING của Order COD để retry sau transaction."
            lines[-4] = f"- **Dữ liệu vào/ra:** cart_item_ids, address_id, payment_methods, voucher, quote_id, expected_payable_total_vnd, Idempotency-Key → OrderBatch. **Yêu cầu:** {exact_fr}. **Story:** {stories_label}. **Quy tắc:** {rule_ids}. **OpenAPI operationId:** {operations}. **Dữ liệu:** CartItem, Order, OrderItem, Payment, IdempotencyRecord. **AC:** [Story](user-stories.md), [Test Plan](test-plan.md)."
        elif code == "UC-PAY-SANDBOX":
            lines[-6] = "- **Trigger:** Customer chọn trả tiền một Order. **Tiền điều kiện:** Order SANDBOX của Customer đang AWAITING_PAYMENT và chưa hết hạn; Payment chưa SUCCEEDED."
            lines[-5] = "- **Hậu điều kiện thành công:** Payment riêng Order SUCCEEDED và Order PENDING sau consume tồn; lỗi consume giữ RECOVERING để retry. **Khi thất bại:** PaymentAttempt FAILED/EXPIRED hoặc Refund riêng Order nếu callback Success đến sau release; không đổi Order khác."
            lines[-4] = f"- **Dữ liệu vào/ra:** order_id, expected_order_version → PaymentAttempt/Payment và trạng thái Order; callback provider_event_id/signature. **Yêu cầu:** {exact_fr}. **Story:** {stories_label}. **Quy tắc:** {rule_ids}. **OpenAPI operationId:** {operations}. **Dữ liệu:** Order, Payment, PaymentAttempt, PaymentEvent, Refund. **AC:** [Story](user-stories.md), [Test Plan](test-plan.md)."
        elif code == "UC-PAY-COD":
            lines[-6] = "- **Trigger:** Customer chọn COD cho một Store trước khi xác nhận giỏ. **Tiền điều kiện:** Customer sở hữu CartItem/Address và Store còn hoạt động."
            lines[-5] = "- **Hậu điều kiện thành công:** Order Store đó có Payment COD và nghĩa vụ thu riêng; Order PENDING khi consume tồn xong. **Khi thất bại:** trước transaction không tạo Order; sau transaction lỗi consume giữ PREPARING để retry."
            lines[-4] = f"- **Dữ liệu vào/ra:** payment_methods[store_id]=COD trong yêu cầu tạo nhóm → Order và Payment COD của Store. **Yêu cầu:** {exact_fr}. **Story:** {stories_label}. **Quy tắc:** {rule_ids}. **OpenAPI operationId:** {operations}. **Dữ liệu:** Order, Payment, CODCollection. **AC:** [Story](user-stories.md), [Test Plan](test-plan.md)."
        lines.extend(f"{i}. {step}" for i,step in enumerate(steps,1))
        lines += ["", "Luồng thay thế/ngoại lệ:", ""]
        if code == "UC-AUTH-RESET":
            lines += ["- Tại bước 2, email không tồn tại vẫn trả cùng thông báo công khai; không phát token và không lộ tài khoản.",
                      "- Tại bước 3, token sai/hết hạn/đã dùng hoặc mật khẩu mới không đạt chính sách: trả lỗi hợp lệ, không đổi hash hay thu hồi phiên."]
        elif code == "UC-AUTH-CHANGE":
            lines += ["- Tại bước 2, phiên bị khóa/thu hồi hoặc mật khẩu cũ sai: trả 401/403/422 theo contract, không đổi hash.",
                      "- Tại bước 3, mật khẩu mới không đạt chính sách hoặc request lặp với phiên đã bị thu hồi: từ chối, không thay đổi một phần."]
        elif code in ("UC-AUTH-REGISTER", "UC-AUTH-LOGIN"):
            lines += ["- Tại bước 2–3, dữ liệu đăng ký hoặc credential không hợp lệ: trả mã lỗi không tiết lộ tài khoản, không tạo phiên/CustomerProfile một phần.",
                      "- Tài khoản bị khóa hoặc rate limit vượt ngưỡng: từ chối theo contract và ghi audit không chứa secret."]
        else:
            lines += ["- Tại bước 2, không có quyền hoặc khác Customer/Store scope: trả 403/404 theo contract; không lộ dữ liệu.",
                      "- Tại bước 3–4, dữ liệu không hợp lệ, xung đột phiên bản hoặc đối tượng không còn khả dụng: trả lỗi có mã; không ghi thay đổi một phần."]
        if code.startswith(("UC-CHECKOUT", "UC-PAY", "UC-ORDER-CANCEL", "UC-SORDER-COD", "UC-VCH")):
            lines.append("- Khi mạng/worker lỗi, tra cứu bằng purchase_group_id hoặc order_id và operation ID; xử lý lặp theo [BR-19/22](business-rules.md) và không tạo thanh toán/đơn trùng.")
    save(target, "\n".join(lines))
    print(f"Wrote {len(CASES)} detailed UC and {len(bygroup)+1} PlantUML diagrams")

if __name__ == "__main__": main()
