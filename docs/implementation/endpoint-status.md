# Trạng thái endpoint của khung 2.2

OpenAPI mô tả hợp đồng đích. `IMPLEMENTED_SAMPLE` có phạm vi nhỏ để làm mẫu; `MOCK_ONLY` không có AI thật; `NOT_IMPLEMENTED` chưa nghiệm thu đầy đủ; endpoint có thể kiểm quyền/nghiệp vụ rồi truyền lỗi dependency hoặc trả 501. `IMPLEMENTED` mô tả handler thật trong nhánh hiện tại, không tự đóng issue trước review/merge. DTO/runtime validation có đủ cho 99 public API; đó không phải nghiệp vụ đã hoàn thành. Chi tiết mẫu updateProduct: chỉ title/description/expected_version; trường hợp lệ ngoài phạm vi mẫu trả 501, input sai trả 422.

Sau merge PR #90 trên main: Payment read/attempt và consent GET/PATCH đã có handler thật; public 28 IMPLEMENTED / 8 SAMPLE / 4 MOCK / 59 pending. Payment callback/Refund, confirm checkout và các producer M1 chưa đủ vẫn giữ scope riêng. Có handler không tự đóng issue trước review/merge.

Sau phần M4 và Refund runtime độc lập: 29 IMPLEMENTED / 14 IMPLEMENTED_SAMPLE / 56 NOT_IMPLEMENTED. Refund read kiểm quyền thật; provider refund vẫn disabled, PAY-03 chưa đóng. Sáu API recommendation/chat/metrics có nhánh `AI_MODE=real`, vẫn đánh SAMPLE vì provider, chất lượng dữ liệu và nghiệm thu toàn phạm vi còn thiếu. Xem [AI runtime handoff](ai-runtime-handoff.md), [Refund handoff](refund-runtime-handoff.md); status không tự đóng AI-02/03/04 hoặc PAY-03.

Cập nhật review ngày 10/10/2026: **36 IMPLEMENTED / 12 IMPLEMENTED_SAMPLE / 51 NOT_IMPLEMENTED** ở public API. Inventory backend #99 và public Catalog #100 đã bàn giao; Auth/RBAC của PR #101 chưa merge do review còn lỗi. Các số ở hai đoạn trước là mốc lịch sử, không phải tổng hiện tại.

Internal API có 11 operation: **8 IMPLEMENTED, 2 IMPLEMENTED_SAMPLE, 1 NOT_IMPLEMENTED**. QuoteVariants, ReserveInventory, ConsumeReservation, ReleaseReservation, ListLowStockVariants, VerifyReviewEligibility, ResolveCheckoutContext và ResolveAiMetricsScope đã có handler thật. RestockOrder vẫn thuộc INV-03 #15; ResolveContext/ActiveStores còn sample. Xem [Internal OpenAPI](../contracts/internal-api.json), [Inventory handoff](inv-02-handoff.md) và [Week 2](week2.md). Owner Checkout, Payment, Inventory và M3 giữ nguyên; có handler không tự đóng toàn bộ issue.

| API | Operation | Service / module | Owner | Trạng thái |
| --- | --- | --- | --- | --- |
| `POST /auth/register` | register | M3 / auth | Trí | NOT_IMPLEMENTED |
| `POST /auth/verify-email` | verifyEmail | M3 / auth | Trí | NOT_IMPLEMENTED |
| `POST /auth/login` | login | M3 / auth | Trí | IMPLEMENTED_SAMPLE |
| `POST /auth/refresh` | refresh | M3 / auth | Trí | IMPLEMENTED_SAMPLE |
| `POST /auth/logout` | logout | M3 / auth | Trí | IMPLEMENTED_SAMPLE |
| `POST /auth/reset-password` | resetPassword | M3 / auth | Trí | NOT_IMPLEMENTED |
| `POST /auth/reset-password/confirm` | confirmResetPassword | M3 / auth | Trí | NOT_IMPLEMENTED |
| `POST /auth/change-password` | changePassword | M3 / auth | Trí | NOT_IMPLEMENTED |
| `GET /me/context` | getAuthContext | M3 / profile | Trí | IMPLEMENTED_SAMPLE |
| `GET /me` | getProfile | M3 / profile | Trí | IMPLEMENTED_SAMPLE |
| `PATCH /me` | updateProfile | M3 / profile | Trí | IMPLEMENTED |
| `GET /me/addresses` | listAddresses | M3 / profile | Trí | IMPLEMENTED |
| `POST /me/addresses` | createAddress | M3 / profile | Trí | IMPLEMENTED |
| `PATCH /me/addresses/{id}` | updateAddress | M3 / profile | Trí | IMPLEMENTED |
| `DELETE /me/addresses/{id}` | deleteAddress | M3 / profile | Trí | IMPLEMENTED |
| `POST /me/store-applications` | submitStoreApplication | M3 / store | Trí | NOT_IMPLEMENTED |
| `GET /me/store-applications` | listOwnStoreApplications | M3 / store | Trí | NOT_IMPLEMENTED |
| `GET /admin/store-applications` | listStoreApplications | M3 / store | Trí | NOT_IMPLEMENTED |
| `PATCH /admin/store-applications/{id}` | reviewStoreApplication | M3 / store | Trí | NOT_IMPLEMENTED |
| `GET /store` | getOwnStore | M3 / store | Trí | NOT_IMPLEMENTED |
| `PATCH /store` | updateOwnStore | M3 / store | Trí | NOT_IMPLEMENTED |
| `GET /store/staff` | listStoreStaff | M3 / staff | Trí | NOT_IMPLEMENTED |
| `GET /store/staff/invitations` | listStaffInvitations | M3 / staff | Trí | NOT_IMPLEMENTED |
| `POST /store/staff/invitations` | inviteStaff | M3 / staff | Trí | NOT_IMPLEMENTED |
| `POST /store/staff/invitations/{id}/revoke` | revokeStaffInvitation | M3 / staff | Trí | NOT_IMPLEMENTED |
| `GET /me/invitations` | listOwnInvitations | M3 / staff | Trí | NOT_IMPLEMENTED |
| `POST /me/invitations/{id}/accept` | acceptInvitation | M3 / staff | Trí | NOT_IMPLEMENTED |
| `GET /categories` | listCategories | M1 / catalog | Thịnh | IMPLEMENTED |
| `GET /product-types` | listProductTypes | M1 / catalog | Thịnh | IMPLEMENTED |
| `GET /products` | listProducts | M1 / catalog | Thịnh | IMPLEMENTED |
| `GET /products/{id}` | getProduct | M1 / catalog | Thịnh | IMPLEMENTED |
| `GET /stores/{id}/products` | listStoreProducts | M1 / catalog | Thịnh | NOT_IMPLEMENTED |
| `GET /store/products` | listOwnStoreProducts | M1 / catalog | Thịnh | NOT_IMPLEMENTED |
| `POST /store/products` | createProduct | M1 / catalog | Thịnh | NOT_IMPLEMENTED |
| `PATCH /store/products/{id}` | updateProduct | M1 / catalog | Thịnh | IMPLEMENTED_SAMPLE |
| `POST /store/products/{id}/variants` | createVariant | M1 / catalog | Thịnh | NOT_IMPLEMENTED |
| `POST /store/products/{id}/images` | addProductImage | M1 / catalog | Thịnh | NOT_IMPLEMENTED |
| `GET /store/inventory` | listStoreInventory | M1 / inventory | Thịnh | IMPLEMENTED |
| `POST /store/inventory/adjustments` | adjustInventory | M1 / inventory | Thịnh | IMPLEMENTED |
| `GET /store/inventory/movements` | listStockMovements | M1 / inventory | Thịnh | IMPLEMENTED |
| `GET /cart/items` | listCartItems | M2 / cart | Hoa | IMPLEMENTED |
| `POST /cart/items` | addCartItem | M2 / cart | Hoa | IMPLEMENTED |
| `PATCH /cart/items/{id}` | updateCartItem | M2 / cart | Hoa | IMPLEMENTED |
| `DELETE /cart/items/{id}` | removeCartItem | M2 / cart | Hoa | IMPLEMENTED |
| `POST /checkout/quotes` | quoteCheckout | M2 / order | Hoa | NOT_IMPLEMENTED |
| `POST /orders/batches` | confirmCheckout | M2 / order | Hoa | NOT_IMPLEMENTED |
| `GET /orders/batches/{id}` | getPurchaseGroupOrders | M2 / order | Hoa | IMPLEMENTED |
| `POST /orders/{id}/payment-attempts` | createPaymentAttempt | M2 / payment | Công | IMPLEMENTED |
| `GET /payments/{id}` | getPayment | M2 / payment | Công | IMPLEMENTED |
| `POST /payment-callbacks/sandbox` | sandboxCallback | M2 / payment | Công | NOT_IMPLEMENTED |
| `GET /orders/{id}/refund` | getOrderRefund | M2 / payment | Công | IMPLEMENTED |
| `GET /me/orders` | listOwnOrders | M2 / order | Hoa | IMPLEMENTED |
| `GET /me/orders/{id}` | getOwnOrder | M2 / order | Hoa | IMPLEMENTED |
| `POST /me/orders/{id}/cancel` | cancelOwnOrder | M2 / order | Hoa | NOT_IMPLEMENTED |
| `GET /store/orders` | listStoreOrders | M2 / order | Hoa | IMPLEMENTED |
| `GET /store/orders/{id}` | getStoreOrder | M2 / order | Hoa | IMPLEMENTED |
| `PATCH /store/orders/{id}/status` | transitionStoreOrder | M2 / order | Hoa | IMPLEMENTED |
| `POST /store/orders/{id}/cancel` | cancelStoreOrder | M2 / order | Hoa | NOT_IMPLEMENTED |
| `POST /store/orders/{id}/cod-collection` | collectCod | M2 / order | Hoa | NOT_IMPLEMENTED |
| `POST /vouchers/validate` | validateVouchers | M2 / voucher | Hoa | NOT_IMPLEMENTED |
| `GET /store/vouchers` | listStoreVouchers | M2 / voucher | Hoa | IMPLEMENTED |
| `POST /store/vouchers` | createStoreVoucher | M2 / voucher | Hoa | IMPLEMENTED |
| `PATCH /store/vouchers/{id}` | updateStoreVoucher | M2 / voucher | Hoa | IMPLEMENTED |
| `GET /admin/vouchers` | listPlatformVouchers | M2 / voucher | Hoa | IMPLEMENTED |
| `POST /admin/vouchers` | createPlatformVoucher | M2 / voucher | Hoa | IMPLEMENTED |
| `PATCH /admin/vouchers/{id}` | updatePlatformVoucher | M2 / voucher | Hoa | IMPLEMENTED |
| `GET /products/{id}/reviews` | listProductReviews | M1 / review | Thịnh | NOT_IMPLEMENTED |
| `POST /me/reviews` | createReview | M1 / review | Thịnh | NOT_IMPLEMENTED |
| `PATCH /me/reviews/{id}` | updateReview | M1 / review | Thịnh | NOT_IMPLEMENTED |
| `POST /admin/reviews/{id}/hide` | hideReview | M1 / review | Thịnh | NOT_IMPLEMENTED |
| `POST /admin/reviews/{id}/restore` | restoreReview | M1 / review | Thịnh | NOT_IMPLEMENTED |
| `GET /admin/users` | listUsers | M3 / administration | Trí | NOT_IMPLEMENTED |
| `PATCH /admin/users/{id}` | updateUserState | M3 / administration | Trí | NOT_IMPLEMENTED |
| `GET /admin/stores` | listStores | M3 / administration | Trí | NOT_IMPLEMENTED |
| `PATCH /admin/stores/{id}` | updateStoreState | M3 / administration | Trí | NOT_IMPLEMENTED |
| `GET /admin/orders` | listAllOrders | M2 / report | Hoa | IMPLEMENTED |
| `GET /admin/dashboard` | getPlatformDashboard | M2 / report | Hoa | NOT_IMPLEMENTED |
| `PATCH /admin/roles/{id}` | updateRole | M3 / administration | Trí | NOT_IMPLEMENTED |
| `POST /chat/sessions` | createChatSession | M4 / chat | Công | IMPLEMENTED_SAMPLE |
| `POST /chat/sessions/{id}/messages` | sendChatMessage | M4 / chat | Công | IMPLEMENTED_SAMPLE |
| `GET /me/chat/sessions` | listOwnChatSessions | M4 / chat | Công | IMPLEMENTED_SAMPLE |
| `GET /recommendations/for-you` | getForYou | M4 / recommendation | Công | IMPLEMENTED_SAMPLE |
| `GET /products/{id}/related` | getRelatedProducts | M4 / recommendation | Công | IMPLEMENTED_SAMPLE |
| `PATCH /store/staff/{id}` | updateStaff | M3 / staff | Trí | NOT_IMPLEMENTED |
| `GET /store/reports` | getStoreReport | M2 / report | Hoa | NOT_IMPLEMENTED |
| `GET /store/vouchers/{id}/usage` | getStoreVoucherUsage | M2 / voucher | Hoa | IMPLEMENTED |
| `GET /admin/vouchers/{id}/usage` | getPlatformVoucherUsage | M2 / voucher | Hoa | IMPLEMENTED |
| `POST /admin/categories` | createCategory | M1 / moderation | Thịnh | NOT_IMPLEMENTED |
| `PATCH /admin/categories/{id}` | updateCategory | M1 / moderation | Thịnh | NOT_IMPLEMENTED |
| `POST /admin/product-types` | createProductType | M1 / moderation | Thịnh | NOT_IMPLEMENTED |
| `PATCH /admin/product-types/{id}` | updateProductType | M1 / moderation | Thịnh | NOT_IMPLEMENTED |
| `POST /admin/attribute-definitions` | createAttributeDefinition | M1 / moderation | Thịnh | NOT_IMPLEMENTED |
| `PATCH /admin/attribute-definitions/{id}` | updateAttributeDefinition | M1 / moderation | Thịnh | NOT_IMPLEMENTED |
| `POST /admin/products/{id}/hide` | hideProduct | M1 / moderation | Thịnh | NOT_IMPLEMENTED |
| `POST /admin/products/{id}/restore` | restoreProduct | M1 / moderation | Thịnh | NOT_IMPLEMENTED |
| `GET /ai/metrics` | getAiMetrics | M4 / evaluation | Công | IMPLEMENTED_SAMPLE |
| `GET /me/personalization-consent` | getPersonalizationConsent | M4 / consent | Công | IMPLEMENTED |
| `PATCH /me/personalization-consent` | updatePersonalizationConsent | M4 / consent | Công | IMPLEMENTED |
| `POST /payment-callbacks/sepay` | sepayCallback | M2 / payment | Công | NOT_IMPLEMENTED |
