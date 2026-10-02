# Ma trận truy vết 2.1 Draft

Mỗi dòng FR trỏ đến Story hoặc technical task, Use Case chính xác, OpenAPI operationId và Test Case theo yêu cầu. `—` ở cột API nghĩa là yêu cầu nội bộ/phi chức năng không có endpoint công khai; nếu chưa có UC thì `TASK-FR-*` là đầu việc kỹ thuật, không tạo ca sử dụng giả.

NFR có bảng riêng ở cuối tài liệu: NFR → technical task/UC → API liên quan → TC-NFR. Một NFR kiến trúc có thể không gắn một API duy nhất; không tạo Use Case giả chỉ để lấp ô.

| FR | Story/technical task | Use Case | OpenAPI operationId | Test |
| --- | --- | --- | --- | --- |
| FR-ADDR-01 | US-ADDR-01, US-ADDR-02, US-ADDR-03, US-ADDR-04 | UC-ADDR-MANAGE | createAddress, deleteAddress, listAddresses, updateAddress | TC-FR-ADDR-01 |
| FR-ADMIN-01 | US-ADMIN-01 | UC-ADMIN-MONITOR | getPlatformDashboard, listAllOrders | TC-FR-ADMIN-01 |
| FR-ADMIN-02 | US-ADMIN-02 | UC-ADMIN-ACCOUNT | listUsers, updateUserState | TC-FR-ADMIN-02 |
| FR-ADMIN-03 | US-ADMIN-03 | UC-ADMIN-RBAC | updateRole | TC-FR-ADMIN-03 |
| FR-ADMIN-04 | US-ADMIN-04 | UC-ADMIN-PRODUCT | hideProduct, restoreProduct | TC-FR-ADMIN-04 |
| FR-ADMIN-05 | US-ADMIN-05 | UC-ADMIN-MONITOR | getPlatformDashboard, listAllOrders | TC-FR-ADMIN-05 |
| FR-ADMIN-06 | US-AIMON-01 | UC-AIMON-VIEW | getAiMetrics | TC-FR-ADMIN-06 |
| FR-ADMIN-07 | US-REC-07 | UC-AIMON-VIEW | getAiMetrics | TC-FR-ADMIN-07 |
| FR-AI-01 | US-CHAT-01 | UC-CHAT-TALK | createChatSession, sendChatMessage | TC-FR-AI-01 |
| FR-AI-02 | US-CHAT-02 | UC-CHAT-TALK | createChatSession, sendChatMessage | TC-FR-AI-02 |
| FR-AI-03 | US-CHAT-03 | UC-CHAT-TALK | createChatSession, sendChatMessage | TC-FR-AI-03 |
| FR-AI-04 | US-CHAT-04 | UC-CHAT-TALK | createChatSession, sendChatMessage | TC-FR-AI-04 |
| FR-AI-05 | US-CHAT-04 | UC-CHAT-TALK | createChatSession, sendChatMessage | TC-FR-AI-05 |
| FR-AI-06 | US-CHAT-05 | UC-CHAT-TALK | createChatSession, sendChatMessage | TC-FR-AI-06 |
| FR-AI-07 | US-CHAT-06 | UC-CHAT-TALK | createChatSession, sendChatMessage | TC-FR-AI-07 |
| FR-AI-08 | US-CHAT-07 | UC-CHAT-HISTORY | listOwnChatSessions | TC-FR-AI-08 |
| FR-AUTH-01 | US-AUTH-01 | UC-AUTH-REGISTER | register, verifyEmail | TC-FR-AUTH-01 |
| FR-AUTH-02 | US-AUTH-02, US-AUTH-03 | UC-AUTH-LOGIN, UC-AUTH-LOGOUT | login, logout | TC-FR-AUTH-02 |
| FR-AUTH-03 | US-AUTH-04, US-AUTH-05 | UC-AUTH-RESET, UC-AUTH-CHANGE | changePassword, confirmResetPassword, resetPassword | TC-FR-AUTH-03 |
| FR-AUTH-04 | TASK-FR-AUTH-04 | — | — | TC-FR-AUTH-04 |
| FR-AUTH-05 | TASK-FR-AUTH-05 | — | — | TC-FR-AUTH-05 |
| FR-CART-01 | US-CART-01 | UC-CART-ADD | addCartItem | TC-FR-CART-01 |
| FR-CART-02 | US-CART-02, US-CART-03 | UC-CART-EDIT | removeCartItem, updateCartItem | TC-FR-CART-02 |
| FR-CART-03 | US-CART-04 | UC-CART-SELECT | listCartItems | TC-FR-CART-03 |
| FR-CAT-01 | US-CAT-01 | UC-CAT-BROWSE | listCategories, listProducts | TC-FR-CAT-01 |
| FR-CAT-02 | US-CAT-02 | UC-CAT-BROWSE | listCategories, listProducts | TC-FR-CAT-02 |
| FR-CATEGORY-ADMIN-01 | US-CATEGORY-01 | UC-ADMIN-TAX | createAttributeDefinition, createCategory, createProductType, updateAttributeDefinition, updateCategory, updateProductType | TC-FR-CATEGORY-ADMIN-01 |
| FR-CHECKOUT-01 | US-CHECKOUT-01 | UC-CHECKOUT-CONFIRM | confirmCheckout, getPurchaseGroupOrders | TC-FR-CHECKOUT-01 |
| FR-CHECKOUT-02 | US-CHECKOUT-03 | UC-CHECKOUT-QUOTE | quoteCheckout | TC-FR-CHECKOUT-02 |
| FR-CHECKOUT-03 | US-CHECKOUT-02 | UC-CHECKOUT-QUOTE | quoteCheckout | TC-FR-CHECKOUT-03 |
| FR-CHECKOUT-04 | TASK-FR-CHECKOUT-04 | UC-CHECKOUT-CONFIRM | confirmCheckout, getPurchaseGroupOrders | TC-FR-CHECKOUT-04 |
| FR-CHECKOUT-05 | TASK-FR-CHECKOUT-05 | UC-CHECKOUT-CONFIRM | confirmCheckout, getPurchaseGroupOrders | TC-FR-CHECKOUT-05 |
| FR-CHECKOUT-06 | US-CHECKOUT-01 | UC-CHECKOUT-QUOTE, UC-CHECKOUT-CONFIRM | confirmCheckout, getPurchaseGroupOrders, quoteCheckout | TC-FR-CHECKOUT-06 |
| FR-CHECKOUT-07 | TASK-FR-CHECKOUT-07 | UC-CHECKOUT-CONFIRM | confirmCheckout, getPurchaseGroupOrders | TC-FR-CHECKOUT-07 |
| FR-INV-01 | US-INV-01 | UC-INV-VIEW | listStoreInventory | TC-FR-INV-01 |
| FR-INV-02 | US-INV-02 | UC-INV-ADJUST | adjustInventory | TC-FR-INV-02 |
| FR-INV-03 | US-INV-03 | UC-INV-HISTORY | listStockMovements | TC-FR-INV-03 |
| FR-MPROD-01 | US-MPROD-01 | UC-SPROD-LIST | listOwnStoreProducts | TC-FR-MPROD-01 |
| FR-MPROD-02 | US-MPROD-02 | UC-SPROD-CREATE | createProduct | TC-FR-MPROD-02 |
| FR-MPROD-03 | US-MPROD-03 | UC-SPROD-CREATE | listProductTypes, createProduct | TC-FR-MPROD-03 |
| FR-MPROD-04 | US-MPROD-04 | UC-SPROD-CREATE | createProduct | TC-FR-MPROD-04 |
| FR-MPROD-05 | US-MPROD-05 | UC-SPROD-EDIT, UC-SPROD-HIDE | updateProduct | TC-FR-MPROD-05 |
| FR-MPROD-06 | US-MPROD-06 | UC-SPROD-IMAGE | addProductImage | TC-FR-MPROD-06 |
| FR-MPROD-07 | US-MPROD-07 | UC-SPROD-VARIANT | createVariant | TC-FR-MPROD-07 |
| FR-MPROD-08 | TASK-FR-MPROD-08 | UC-SPROD-CREATE | createProduct | TC-FR-MPROD-08 |
| FR-MPROD-09 | TASK-FR-MPROD-09 | UC-SPROD-CREATE, UC-SPROD-EDIT | createProduct, updateProduct | TC-FR-MPROD-09 |
| FR-MPROD-10 | TASK-FR-MPROD-10 | UC-SPROD-VARIANT | createVariant | TC-FR-MPROD-10 |
| FR-ORDER-01 | US-ORDER-01 | UC-CHECKOUT-CONFIRM | confirmCheckout, getPurchaseGroupOrders | TC-FR-ORDER-01 |
| FR-ORDER-02 | US-ORDER-02, US-ORDER-03 | UC-ORDER-LIST | getOwnOrder, listOwnOrders | TC-FR-ORDER-02 |
| FR-ORDER-03 | US-ORDER-04 | UC-ORDER-LIST | getOwnOrder, listOwnOrders | TC-FR-ORDER-03 |
| FR-ORDER-04 | US-ORDER-05 | UC-ORDER-CANCEL | cancelOwnOrder | TC-FR-ORDER-04 |
| FR-ORDER-05 | TASK-FR-ORDER-05 | UC-ORDER-CANCEL, UC-SORDER-CANCEL | cancelOwnOrder, cancelStoreOrder | TC-FR-ORDER-05 |
| FR-ORDER-06 | TASK-FR-ORDER-06 | — | — | TC-FR-ORDER-06 |
| FR-PAY-01 | US-PAY-01 | UC-PAY-SANDBOX | createPaymentAttempt, getPayment | TC-FR-PAY-01 |
| FR-PAY-02 | US-PAY-02 | UC-PAY-SANDBOX | createPaymentAttempt, getPayment | TC-FR-PAY-02 |
| FR-PAY-03 | US-PAY-01, US-COD-01 | UC-PAY-COD | confirmCheckout | TC-FR-PAY-03 |
| FR-PAY-04 | US-COD-02 | UC-SORDER-COD | collectCod | TC-FR-PAY-04 |
| FR-PAY-05 | US-REFUND-01 | UC-ORDER-CANCEL, UC-REFUND-TRACK | cancelOwnOrder, getOrderRefund | TC-FR-PAY-05 |
| FR-PROD-01 | US-PROD-01 | UC-PROD-DETAIL | getProduct | TC-FR-PROD-01 |
| FR-PROFILE-01 | US-PROFILE-01, US-PROFILE-02 | UC-PROFILE-EDIT | getProfile, updateProfile | TC-FR-PROFILE-01 |
| FR-PTYPE-01 | US-PTYPE-01, US-PTYPE-02 | UC-ADMIN-TAX | createAttributeDefinition, createCategory, createProductType, updateAttributeDefinition, updateCategory, updateProductType | TC-FR-PTYPE-01 |
| FR-REC-01 | TASK-FR-REC-01 | UC-REC-FOR-YOU | getForYou | TC-FR-REC-01 |
| FR-REC-02 | US-REC-01 | UC-REC-FOR-YOU | getForYou | TC-FR-REC-02 |
| FR-REC-03 | US-REC-05 | UC-REC-FOR-YOU | getForYou | TC-FR-REC-03 |
| FR-REC-04 | US-REC-02 | UC-REC-FOR-YOU | getForYou | TC-FR-REC-04 |
| FR-REC-05 | US-REC-03 | UC-REC-RELATED | getRelatedProducts | TC-FR-REC-05 |
| FR-REC-06 | US-REC-02 | UC-REC-FOR-YOU | getForYou | TC-FR-REC-06 |
| FR-REC-07 | US-REC-04 | UC-REC-FOR-YOU | getForYou | TC-FR-REC-07 |
| FR-REC-08 | US-REC-06 | UC-AIMON-VIEW | getAiMetrics | TC-FR-REC-08 |
| FR-REC-09 | TASK-FR-REC-09 | UC-REC-FOR-YOU | getForYou | TC-FR-REC-09 |
| FR-REC-10 | TASK-FR-REC-10 | UC-REC-FOR-YOU | getForYou | TC-FR-REC-10 |
| FR-REC-11 | US-REC-04 | UC-REC-FOR-YOU | getForYou | TC-FR-REC-11 |
| FR-REP-01 | US-REP-01 | UC-REP-STORE | getStoreReport | TC-FR-REP-01 |
| FR-REP-02 | US-REP-02, US-REP-03 | UC-REP-STORE | getStoreReport | TC-FR-REP-02 |
| FR-REP-03 | TASK-FR-REP-03 | UC-REP-STORE | getStoreReport | TC-FR-REP-03 |
| FR-REV-01 | US-REV-01, US-REV-02 | UC-REV-CREATE, UC-REV-EDIT | createReview, updateReview | TC-FR-REV-01 |
| FR-REV-02 | TASK-FR-REV-02 | UC-REV-BROWSE | listProductReviews | TC-FR-REV-02 |
| FR-REV-03 | US-REV-03 | UC-REV-MODERATE | hideReview, restoreReview | TC-FR-REV-03 |
| FR-SEARCH-01 | US-SEARCH-01 | UC-SEARCH-QUERY | listProducts | TC-FR-SEARCH-01 |
| FR-SEARCH-02 | US-SEARCH-02 | UC-SEARCH-FILTER | listProducts | TC-FR-SEARCH-02 |
| FR-SEARCH-03 | US-SEARCH-03 | UC-SEARCH-FILTER | listProducts | TC-FR-SEARCH-03 |
| FR-SEARCH-04 | US-SEARCH-04 | UC-SEARCH-QUERY | listProducts | TC-FR-SEARCH-04 |
| FR-SORDER-01 | US-SORDER-01, US-SORDER-02 | UC-SORDER-LIST | getStoreOrder, listStoreOrders | TC-FR-SORDER-01 |
| FR-SORDER-02 | US-SORDER-03 | UC-SORDER-STATUS, UC-SORDER-CANCEL | cancelStoreOrder, transitionStoreOrder | TC-FR-SORDER-02 |
| FR-SORDER-03 | TASK-FR-SORDER-03 | UC-SORDER-STATUS | transitionStoreOrder | TC-FR-SORDER-03 |
| FR-STORE-01 | US-STORE-01 | UC-STORE-EDIT | getOwnStore, updateOwnStore | TC-FR-STORE-01 |
| FR-STORE-02 | US-STORE-02, US-STORE-03, US-STORE-04, US-STORE-05, US-STORE-06 | UC-STAFF-INVITE, UC-STAFF-LIST, UC-STAFF-PERMISSIONS, UC-STAFF-LOCK | inviteStaff, listStaffInvitations, listStoreStaff, revokeStaffInvitation, updateStaff | TC-FR-STORE-02 |
| FR-STORE-03 | TASK-FR-STORE-03 | — | — | TC-FR-STORE-03 |
| FR-STORE-04 | US-ADMIN-STORE-01 | UC-ADMIN-STORE | listStores, updateStoreState | TC-FR-STORE-04 |
| FR-STORE-05 | US-STORE-APPLY-01 | UC-STORE-APPLY | listOwnStoreApplications, submitStoreApplication | TC-FR-STORE-05 |
| FR-STORE-06 | US-STORE-APPLY-01, US-STORE-APPLY-02 | UC-STORE-REVIEW | listStoreApplications, reviewStoreApplication | TC-FR-STORE-06 |
| FR-STORE-07 | US-STAFF-01, US-STAFF-02 | UC-STAFF-INVITE, UC-STAFF-ACCEPT, UC-STAFF-INBOX | acceptInvitation, inviteStaff, listOwnInvitations, revokeStaffInvitation | TC-FR-STORE-07 |
| FR-STORE-08 | TASK-FR-STORE-08 | UC-ADMIN-STORE | listStores, updateStoreState | TC-FR-STORE-08 |
| FR-STOREVIEW-01 | US-STOREVIEW-01 | UC-STORE-BROWSE | listStoreProducts | TC-FR-STOREVIEW-01 |
| FR-VCH-01 | US-VCH-01, US-VCH-02 | UC-VCH-STORE, UC-VCH-PLATFORM | createPlatformVoucher, createStoreVoucher, listPlatformVouchers, listStoreVouchers, updatePlatformVoucher, updateStoreVoucher | TC-FR-VCH-01 |
| FR-VCH-02 | US-VCH-03 | UC-VCH-APPLY | quoteCheckout, validateVouchers | TC-FR-VCH-02 |
| FR-VCH-03 | US-VCH-03 | UC-VCH-APPLY, UC-VCH-USAGE | getPlatformVoucherUsage, getStoreVoucherUsage, quoteCheckout, validateVouchers | TC-FR-VCH-03 |
| FR-VCH-04 | US-VCH-03 | UC-CHECKOUT-QUOTE, UC-VCH-APPLY | quoteCheckout, validateVouchers | TC-FR-VCH-04 |

## Truy vết NFR

| NFR | Story/technical task | UC liên quan | API/contract liên quan | Test |
| --- | --- | --- | --- | --- |
| NFR-AI-01 | TASK-NFR-AI-01: đánh giá RAG grounded | UC-CHAT-TALK | sendChatMessage | TC-NFR-AI-01 |
| NFR-AI-02 | TASK-NFR-AI-02: so model/baseline cùng split | UC-REC-FOR-YOU | getForYou | TC-NFR-AI-02 |
| NFR-API-01 | TASK-NFR-API-01: validate OpenAPI | — | 99 operation trong OpenAPI hiện hành2.2 | TC-NFR-API-01 |
| NFR-ARCH-01 | TASK-NFR-ARCH-01: kiểm ownership DB | — | integration-contract | TC-NFR-ARCH-01 |
| NFR-ISO-01 | TASK-NFR-ISO-01: test scope Customer/Store | UC-ORDER-LIST, UC-SORDER-LIST | getOwnOrder, getStoreOrder | TC-NFR-ISO-01 |
| NFR-PERF-01 | TASK-NFR-PERF-01: đo latency API | — | quoteCheckout, listProducts | TC-NFR-PERF-01 |
| NFR-PERF-02 | TASK-NFR-PERF-02: đo latency chat | UC-CHAT-TALK | sendChatMessage | TC-NFR-PERF-02 |
| NFR-PERF-03 | TASK-NFR-PERF-03: tải 100 concurrent users | — | API nghiệp vụ thông thường | TC-NFR-PERF-03 |
| NFR-PERF-04 | TASK-NFR-PERF-04: kiểm pagination | UC-CAT-BROWSE, UC-ORDER-LIST | listProducts, listOwnOrders | TC-NFR-PERF-04 |
| NFR-PERF-05 | TASK-NFR-PERF-05: kiểm index/explain | — | data-dictionary | TC-NFR-PERF-05 |
| NFR-PRIV-01 | TASK-NFR-PRIV-01: lọc prompt | UC-CHAT-TALK | sendChatMessage | TC-NFR-PRIV-01 |
| NFR-PRIV-02 | TASK-NFR-PRIV-02: khử PII/secret trong log | UC-CHAT-TALK | sendChatMessage, integration-contract | TC-NFR-PRIV-02 |
| NFR-REL-01 | TASK-NFR-REL-01: test mua SKU cuối | UC-CHECKOUT-CONFIRM | confirmCheckout, ReserveInventory | TC-NFR-REL-01 |
| NFR-REL-02 | TASK-NFR-REL-02: retry cùng key | UC-CHECKOUT-CONFIRM | confirmCheckout | TC-NFR-REL-02 |
| NFR-REL-03 | TASK-NFR-REL-03: index bất đồng bộ | UC-SPROD-EDIT, UC-CHAT-TALK | ProductChanged | TC-NFR-REL-03 |
| NFR-REL-04 | TASK-NFR-REL-04: command/event chống lặp | UC-PAY-SANDBOX, UC-CHECKOUT-CONFIRM | callback, reserve/consume/release/refund | TC-NFR-REL-04 |
| NFR-SEC-01 | TASK-NFR-SEC-01: kiểm password hash | UC-AUTH-REGISTER, UC-AUTH-LOGIN | register, login | TC-NFR-SEC-01 |
| NFR-SEC-02 | TASK-NFR-SEC-02: kiểm JWT/context | UC-AUTH-LOGIN, UC-STAFF-PERMISSIONS | login, getAuthContext | TC-NFR-SEC-02 |
| NFR-SEC-03 | TASK-NFR-SEC-03: validate/authorization | UC-CHECKOUT-CONFIRM, UC-SORDER-STATUS | confirmCheckout, transitionStoreOrder | TC-NFR-SEC-03 |
| NFR-SEC-04 | TASK-NFR-SEC-04: secret management | — | deployment | TC-NFR-SEC-04 |
| NFR-SEC-05 | TASK-NFR-SEC-05: expiry/revoke phiên | UC-AUTH-LOGOUT, UC-AUTH-RESET | logout, refresh, confirmResetPassword | TC-NFR-SEC-05 |
| NFR-SEC-06 | TASK-NFR-SEC-06: rate limit | UC-AUTH-LOGIN, UC-SEARCH-QUERY, UC-CHAT-TALK | login, listProducts, sendChatMessage | TC-NFR-SEC-06 |
| NFR-SEC-07 | TASK-NFR-SEC-07: HTTPS/ownership | UC-ORDER-LIST, UC-SORDER-LIST | getOwnOrder, getStoreOrder | TC-NFR-SEC-07 |
| NFR-SEC-08 | TASK-NFR-SEC-08: upload ảnh an toàn | UC-SPROD-IMAGE | addProductImage | TC-NFR-SEC-08 |
| NFR-SEC-09 | TASK-NFR-SEC-09: audit quản trị | UC-ADMIN-ACCOUNT, UC-ADMIN-STORE, UC-ADMIN-PRODUCT | updateUserState, updateStoreState, hideProduct | TC-NFR-SEC-09 |
| NFR-SEC-10 | TASK-NFR-SEC-10: quyền sau khóa/thu hồi | UC-STAFF-LOCK, UC-ADMIN-STORE | updateStaff, updateStoreState | TC-NFR-SEC-10 |
| NFR-DATA-01 | TASK-NFR-DATA-01: kiểm FK xuyên DB | — | ERD, integration-contract | TC-NFR-DATA-01 |
| NFR-MONEY-01 | TASK-NFR-MONEY-01: đối soát tiền từng Order | UC-CHECKOUT-CONFIRM, UC-VCH-APPLY | quoteCheckout, confirmCheckout | TC-NFR-MONEY-01 |

Các TC-NFR nằm trong [requirements acceptance](requirements-acceptance.md) và phải có kết quả chạy thực tế trước khi đánh dấu PASS. Dòng không có UC là đầu việc kỹ thuật, không phải Use Case giả.
