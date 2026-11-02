# Ma trận web marketplace

Phạm vi web Customer/Seller/Admin và API phục vụ web; Android ngoài đợt này. Cột bằng chứng nói rõ HTTP thật hay fixture. IMPLEMENTED mô tả code trong workspace, không thay nghiệm thu provider hay quyết định phát hành. Số test và điều kiện chạy ở [handoff kiểm thử](frontend-verification-handoff.md).

| Luồng / vai trò | UI và API chính | Trạng thái code / bằng chứng |
| --- | --- | --- |
| Khám phá / công khai | MarketplaceHome, listProducts/listCategories/getProduct; tìm kiếm, lọc, sort, phân trang và URL state | Handler/DB thật; catalog integration và catalog-state browser |
| Gian hàng / công khai | StorePage, getPublicStore/listStoreProducts | Chỉ Store ACTIVE; không trả contact/hồ sơ xét duyệt. HTTP test và public-store browser |
| Yêu thích, đã xem / Customer | FavoritesPage, listFavorites/addFavorite/removeFavorite; getForYou và InteractionRecorded | PostgreSQL và tracking worker; fixture browser AI/recommendation không chứng minh chất lượng mô hình |
| Tài khoản / Customer | AuthPage, register/verifyEmail/login/reset/changePassword; getProfile/updateProfile, địa chỉ | PostgreSQL/HTTP auth security, identity lookup và address integration; SMTP peer/capture, chưa gửi email qua provider thật |
| Lời mời, mở gian hàng / Customer | InvitationsPage/Modal, StoreApplicationPage; invitation/application APIs | HTTP guard/ownership/version thật; browser kiểm tra chấp nhận và cập nhật phiên |
| Giỏ hàng, checkout / Customer | CartPage, CheckoutPage; cart/quote/confirm/batch order APIs | HTTP/DB commerce và recovery test; multi-Store/mixed payment browser dùng fixture; không tự retry giao dịch không rõ kết quả |
| Thanh toán, đơn / Customer | PaymentPage, OrderHistory/Detail; attempt/payment, cancel/refund reads | Callback/COD/refund PostgreSQL; QR/provider disabled/error browser. Chuyển tiền thật chưa nghiệm thu |
| Đánh giá / Customer | ProductReviews; createReview/updateReview/listProductReviews, VerifyReviewEligibility M1→M2 | HTTP xác minh Order COMPLETED, ownership, retry/version; public chỉ VISIBLE, sửa không tự bỏ HIDDEN |
| Tin nhắn / Customer và Store | MessagesPage, conversation/message APIs | HTTP riêng từng participant, client_message_id chống trùng; hai phiên browser gọi API thật và reload lịch sử |
| Thông báo / Customer | NotificationsPage; listNotifications/markNotificationRead | Event thật từ Order/payment/returns, read marker riêng, polling; HTTP và fixture browser |
| Đổi trả / ba vai trò | OrderReturnsPanel, ReturnsPage; me/store/admin return APIs | HTTP toàn luồng EXCHANGE, quyền/version và lý do; REFUND online đã có queue/kernel chứng từ. Provider thật và hoàn COD chưa có adapter |
| Sản phẩm / Seller | ProductList/Edit, AttributeFields/VariantEditor; own product detail/create/update, variants/images | HTTP drafts/hidden/store scope, SKU/thuộc tính/ảnh và xung đột; browser desktop/tablet/mobile |
| Kho và xử lý đơn / Seller | StoreInventory/Orders; adjustment/history/transition/COD APIs | PostgreSQL reservation/consume/restock và commerce regression; fixture browser giữ operation ID, xác nhận tiền mặt và version |
| Ưu đãi / Store và Admin | VoucherPanel; store/platform vouchers | Thời hạn, điều kiện, hạn mức, cap phần trăm, trạng thái; PostgreSQL quota/reservation/redeem/release và browser kiểm tra scope |
| Nhân viên, thông tin Store / Owner | StaffPage/StoreSettings; staff invitations/permissions và own Store APIs | PostgreSQL/HTTP staff/store regressions; backend đọc membership/quyền hiện hành |
| Quản trị / Admin | Users, Stores, Roles, Store applications, taxonomy, Product/Review moderation | Server platform.admin, expected_version, lý do; HTTP taxonomy/review/role revocation xuyên service; browser Admin thao tác từ danh sách |
| Báo cáo và AI / Owner/Admin | StoreReports, AdminDashboard/AI metrics | SQL doanh thu và scope tests; không coi chất lượng model, token/cost chưa biết hoặc provider none là kết quả thật |
| Nhật ký / Admin | AuditLogPage; listCatalogAudit/listCommerceAudit/listIdentityAudit | Chỉ metadata, whitelist bảng, pagination/filter, không lộ before/after; HTTP ba service và browser mobile/quyền |
| Design system / mọi vai trò | commerce.css, shared states, Modal, ChatCenter | Layout responsive, reduced motion, focus/error/loading/empty. Dialog native + vòng focus, Escape và khôi phục opener; chat đóng/thu nhỏ/mở, chung draft/pending với trang Tin nhắn; browser kiểm tra các luồng liên quan |

Các thay đổi contract nằm trong OpenAPI public/internal, types/DTO/runtime/fixtures được sinh đồng bộ. API là mặc định; mock/fixture chỉ được chọn rõ ràng trong phát triển/kiểm thử. Các mốc NOT_IMPLEMENTED lịch sử trong tài liệu khác không phải bằng chứng về handler hiện tại.

Ma trận thao tác và thiết kế graphite/cam: [UI marketplace](ui-marketplace-action-matrix.md).
