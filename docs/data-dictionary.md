# Từ điển dữ liệu và ERD — baseline nghiệp vụ 2.1 / schema chốt 2.2

**Schema chốt 2.2:** xem [schema để code](implementation/database-schema.md), bao gồm constraint/index migration 003. **Khung 2.2:** migration/model 54 entity đã có; technical tables và refresh_session.family_id bổ sung ở [ADR](implementation/scaffold-decisions.md). Không tạo FK xuyên database; không bật synchronize. Migration là nguồn schema runtime, ERD là thiết kế đích.

[ERD tổng quan](diagrams/erd/00-overview.mmd) chỉ thể hiện thực thể nghiệp vụ; tám ERD chi tiết ở dưới. [Hướng dẫn đọc riêng từng sơ đồ](diagrams/erd/README.md) giải thích luồng và quan hệ bằng ví dụ. Nhãn quan hệ trên sơ đồ viết bằng tiếng Việt; tên entity/cột giữ nguyên theo schema để đối chiếu API. Checkout là quy trình tạo Order, không có bảng Checkout/Purchase. Các Order cùng lần xác nhận chia sẻ purchase_group_id UUID; IdempotencyRecord là bảng kỹ thuật có TTL, không là lịch sử mua hàng. Dấu -- là FK cùng database, dấu .. là tham chiếu logic xuyên service.

## Quy ước chung

customer_user_id luôn tham chiếu User.id của M3, không tham chiếu CustomerProfile.id; CustomerProfile là tùy chọn cho User có Customer context. ID REF không tạo FK xuyên database. Tiền là bigint VND, thời gian UTC. OrderItem và address_snapshot bất biến sau khi tạo Order. CartItem có thể bị xóa sau khi mua nên OrderItem không có FK tới CartItem.

OneTimeToken chỉ lưu hash và hạn dùng cho EMAIL_VERIFY/PASSWORD_RESET. Mock mailbox là hạ tầng demo ngoài ERD nghiệp vụ. M1Audit, M2Audit, M3Audit ghi actor/target/hành động/lý do/trước-sau đã lược dữ liệu nhạy cảm. ReviewAudit là lịch sử kiểm duyệt Review. Điểm trung bình Product là truy vấn hoặc cache suy ra từ Review VISIBLE; MVP không lưu cột rating trên Product.

Giá nguồn là ProductVariant.price_vnd; available = Inventory.quantity - Inventory.reserved_quantity. Order giữ snapshot tiền hàng/giảm giá/phí; Payment.payable_vnd phải bằng Order.payable_vnd cho cùng order_id. Tổng Order của purchase_group_id bằng quote lúc xác nhận. Voucher toàn sàn phân bổ xuống từng Order, lượt dùng tính một lần theo purchase_group_id; hủy/hết hạn một Order sau tạo không tính lại Order khác.

quote_id trỏ bản báo giá tạm trong cache TTL ngắn để giao diện xác nhận; M2 luôn tính lại trước khi ghi Order. Cache quote không là dữ liệu lịch sử mua hàng và không xuất hiện trong ERD. Lịch sử và số tiền chốt nằm trên Order/OrderItem.

| Bất biến | Quy tắc |
| --- | --- |
| Tạo Order | Unique (purchase_group_id, store_id); M2 tạo nguyên tập Order trong một transaction. |
| Payment | Unique order_id; một Payment cho mỗi Order; mỗi Payment sandbox tối đa một Attempt Success. |
| Tồn | 0 <= reserved_quantity <= quantity; reservation theo order_id, command có operation_id chống lặp. |
| Refund | Refund.order_id bắt buộc và phải khớp Payment.order_id; không hoàn vượt tiền đã thu. |
| Review | Unique order_item_id, rating 1–5; eligibility xác minh với M2. |
| Quyền | Một membership active/User và một Owner active/Store; permission thay đổi có version/audit. |

## Các miền dữ liệu

### 01-identity-access — M3

[Mã ERD](diagrams/erd/01-identity-access.mmd). Index đề xuất: User(email), Address(customer_user_id, is_default), RefreshSession(user_id, expires_at), OneTimeToken(user_id, purpose, expires_at). Các mã FR/UC dưới đây là phạm vi dùng chung của miền; [ma trận truy vết](traceability.md) có ánh xạ chính xác theo từng yêu cầu.

| Entity | Mục đích và ràng buộc riêng | FR/UC dùng miền |
| --- | --- | --- |
| User | Danh tính đăng nhập toàn hệ thống; PK/FK nội bộ; status theo quy ước chung | FR-AUTH-01/02/03/05, FR-PROFILE-01, FR-ADDR-01, FR-ADMIN-03; UC-AUTH-REGISTER/LOGIN/RESET, UC-PROFILE-EDIT, UC-ADDR-MANAGE, UC-ADMIN-RBAC |
| CustomerProfile | Thông tin cá nhân phục vụ mua hàng; unique user_id | FR-AUTH-01/02/03/05, FR-PROFILE-01, FR-ADDR-01, FR-ADMIN-03; UC-AUTH-REGISTER/LOGIN/RESET, UC-PROFILE-EDIT, UC-ADDR-MANAGE, UC-ADMIN-RBAC |
| Address | Địa chỉ giao hàng do Customer quản lý; PK/FK nội bộ; status theo quy ước chung | FR-AUTH-01/02/03/05, FR-PROFILE-01, FR-ADDR-01, FR-ADMIN-03; UC-AUTH-REGISTER/LOGIN/RESET, UC-PROFILE-EDIT, UC-ADDR-MANAGE, UC-ADMIN-RBAC |
| Role | Nhóm quyền ở cấp hệ thống; PK/FK nội bộ; status theo quy ước chung | FR-AUTH-01/02/03/05, FR-PROFILE-01, FR-ADDR-01, FR-ADMIN-03; UC-AUTH-REGISTER/LOGIN/RESET, UC-PROFILE-EDIT, UC-ADDR-MANAGE, UC-ADMIN-RBAC |
| Permission | Thao tác được hệ thống cho phép; PK/FK nội bộ; status theo quy ước chung | FR-AUTH-01/02/03/05, FR-PROFILE-01, FR-ADDR-01, FR-ADMIN-03; UC-AUTH-REGISTER/LOGIN/RESET, UC-PROFILE-EDIT, UC-ADDR-MANAGE, UC-ADMIN-RBAC |
| RolePermission | Gán permission cho role hệ thống; PK/FK nội bộ; status theo quy ước chung | FR-AUTH-01/02/03/05, FR-PROFILE-01, FR-ADDR-01, FR-ADMIN-03; UC-AUTH-REGISTER/LOGIN/RESET, UC-PROFILE-EDIT, UC-ADDR-MANAGE, UC-ADMIN-RBAC |
| UserRole | Gán role cho User; PK/FK nội bộ; status theo quy ước chung | FR-AUTH-01/02/03/05, FR-PROFILE-01, FR-ADDR-01, FR-ADMIN-03; UC-AUTH-REGISTER/LOGIN/RESET, UC-PROFILE-EDIT, UC-ADDR-MANAGE, UC-ADMIN-RBAC |
| RefreshSession | Phiên refresh có thể revoke; PK/FK nội bộ; status theo quy ước chung | FR-AUTH-01/02/03/05, FR-PROFILE-01, FR-ADDR-01, FR-ADMIN-03; UC-AUTH-REGISTER/LOGIN/RESET, UC-PROFILE-EDIT, UC-ADDR-MANAGE, UC-ADMIN-RBAC |
| OneTimeToken | Token xác minh email hoặc reset mật khẩu đã băm; unique token_hash; purpose EMAIL_VERIFY hoặc PASSWORD_RESET; chỉ lưu hash | FR-AUTH-01/02/03/05, FR-PROFILE-01, FR-ADDR-01, FR-ADMIN-03; UC-AUTH-REGISTER/LOGIN/RESET, UC-PROFILE-EDIT, UC-ADDR-MANAGE, UC-ADMIN-RBAC |
| M3Audit | Audit khóa User/Store, duyệt Store và quyền nhân viên; PK/FK nội bộ; status theo quy ước chung | FR-AUTH-01/02/03/05, FR-PROFILE-01, FR-ADDR-01, FR-ADMIN-03; UC-AUTH-REGISTER/LOGIN/RESET, UC-PROFILE-EDIT, UC-ADDR-MANAGE, UC-ADMIN-RBAC |

| Entity.cột | PostgreSQL | NULL | Default/nguồn | Vai trò và quy tắc |
| --- | --- | --- | --- | --- |
| User.id | uuid | Không | gen_random_uuid() | PK |
| User.email | varchar | Không | — | Duy nhất |
| User.email_verified_at | timestamptz | Có | — | Dữ liệu nghiệp vụ |
| User.password_hash | varchar | Không | — | Dữ liệu nghiệp vụ; chỉ lưu hash, hạn chế log |
| User.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| User.created_at | timestamptz | Không | now() | Dữ liệu nghiệp vụ |
| User.version | int | Không | 0 | Dữ liệu nghiệp vụ |
| CustomerProfile.id | uuid | Không | gen_random_uuid() | PK |
| CustomerProfile.user_id | uuid | Không | — | FK nội bộ |
| CustomerProfile.display_name | varchar | Không | — | Dữ liệu nghiệp vụ |
| CustomerProfile.phone | varchar | Có | — | Dữ liệu nghiệp vụ |
| CustomerProfile.updated_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| Address.id | uuid | Không | gen_random_uuid() | PK |
| Address.customer_user_id | uuid | Không | — | FK nội bộ |
| Address.recipient_name | varchar | Không | — | Dữ liệu nghiệp vụ |
| Address.phone | varchar | Không | — | Dữ liệu nghiệp vụ |
| Address.line1 | varchar | Không | — | Dữ liệu nghiệp vụ |
| Address.ward | varchar | Không | — | Dữ liệu nghiệp vụ |
| Address.district | varchar | Không | — | Dữ liệu nghiệp vụ |
| Address.city | varchar | Không | — | Dữ liệu nghiệp vụ |
| Address.is_default | boolean | Không | — | Dữ liệu nghiệp vụ |
| Address.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| Role.id | uuid | Không | gen_random_uuid() | PK |
| Role.code | varchar | Không | — | Duy nhất |
| Role.scope | varchar | Không | — | Dữ liệu nghiệp vụ |
| Role.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| Permission.id | uuid | Không | gen_random_uuid() | PK |
| Permission.code | varchar | Không | — | Duy nhất |
| Permission.resource | varchar | Không | — | Dữ liệu nghiệp vụ |
| Permission.action | varchar | Không | — | Dữ liệu nghiệp vụ |
| RolePermission.role_id | uuid | Không | — | PK + FK nội bộ |
| RolePermission.permission_id | uuid | Không | — | PK + FK nội bộ |
| UserRole.user_id | uuid | Không | — | PK + FK nội bộ |
| UserRole.role_id | uuid | Không | — | PK + FK nội bộ |
| UserRole.granted_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| RefreshSession.id | uuid | Không | gen_random_uuid() | PK |
| RefreshSession.user_id | uuid | Không | — | FK nội bộ |
| RefreshSession.token_hash | varchar | Không | — | Dữ liệu nghiệp vụ; chỉ lưu hash, hạn chế log |
| RefreshSession.expires_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| RefreshSession.revoked_at | timestamptz | Có | — | Dữ liệu nghiệp vụ |
| OneTimeToken.id | uuid | Không | gen_random_uuid() | PK |
| OneTimeToken.user_id | uuid | Không | — | FK nội bộ |
| OneTimeToken.purpose | varchar | Không | — | Dữ liệu nghiệp vụ |
| OneTimeToken.token_hash | varchar | Không | — | Dữ liệu nghiệp vụ; chỉ lưu hash, hạn chế log |
| OneTimeToken.expires_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| OneTimeToken.consumed_at | timestamptz | Có | — | Dữ liệu nghiệp vụ |
| OneTimeToken.created_at | timestamptz | Không | now() | Dữ liệu nghiệp vụ |
| M3Audit.id | uuid | Không | gen_random_uuid() | PK |
| M3Audit.actor_user_id | uuid | Có | — | FK nội bộ |
| M3Audit.target_type | varchar | Không | — | Dữ liệu nghiệp vụ |
| M3Audit.target_id | uuid | Không | — | Dữ liệu nghiệp vụ |
| M3Audit.action | varchar | Không | — | Dữ liệu nghiệp vụ |
| M3Audit.reason | text | Có | — | Dữ liệu nghiệp vụ |
| M3Audit.request_id | varchar | Không | — | Dữ liệu nghiệp vụ |
| M3Audit.before_json | jsonb | Có | — | Dữ liệu nghiệp vụ |
| M3Audit.after_json | jsonb | Có | — | Dữ liệu nghiệp vụ |
| M3Audit.created_at | timestamptz | Không | now() | Dữ liệu nghiệp vụ |

**Quan hệ:** User ||--o| CustomerProfile (FK nội bộ); User ||--o{ Address (FK nội bộ); User ||--o{ RefreshSession (FK nội bộ); User ||--o{ OneTimeToken (FK nội bộ); User ||--o{ UserRole (FK nội bộ); Role ||--o{ UserRole (FK nội bộ); Role ||--o{ RolePermission (FK nội bộ); Permission ||--o{ RolePermission (FK nội bộ).

**Dẫn chiếu:** [FR/NFR](functional-requirements.md), [Use Case](use-cases.md), [contract](api-spec.md).

### 02-store-membership — M3

[Mã ERD](diagrams/erd/02-store-membership.mmd). Index đề xuất: StoreApplication(applicant_user_id, status), StoreMembership(user_id, status), StoreMembership(store_id, role, status), StaffInvitation(store_id, status). Các mã FR/UC dưới đây là phạm vi dùng chung của miền; [ma trận truy vết](traceability.md) có ánh xạ chính xác theo từng yêu cầu.

| Entity | Mục đích và ràng buộc riêng | FR/UC dùng miền |
| --- | --- | --- |
| StoreApplication | Đơn xin mở Store và quyết định Admin; unique pending applicant_user_id | FR-STORE-01/02/05/06/07/08; UC-STORE-APPLY/REVIEW/EDIT, UC-STAFF-INVITE/ACCEPT/LOCK |
| Store | Gian hàng có trạng thái bán và phí giao cố định; PK/FK nội bộ; status theo quy ước chung | FR-STORE-01/02/05/06/07/08; UC-STORE-APPLY/REVIEW/EDIT, UC-STAFF-INVITE/ACCEPT/LOCK |
| StoreMembership | Tư cách Owner/Seller của User tại Store; unique active user_id; unique active OWNER per store_id | FR-STORE-01/02/05/06/07/08; UC-STORE-APPLY/REVIEW/EDIT, UC-STAFF-INVITE/ACCEPT/LOCK |
| StaffInvitation | Lời mời Seller cần chấp nhận; PK/FK nội bộ; status theo quy ước chung | FR-STORE-01/02/05/06/07/08; UC-STORE-APPLY/REVIEW/EDIT, UC-STAFF-INVITE/ACCEPT/LOCK |
| MembershipPermission | Quyền Seller được Owner cấp trong giới hạn; PK/FK nội bộ; status theo quy ước chung | FR-STORE-01/02/05/06/07/08; UC-STORE-APPLY/REVIEW/EDIT, UC-STAFF-INVITE/ACCEPT/LOCK |

| Entity.cột | PostgreSQL | NULL | Default/nguồn | Vai trò và quy tắc |
| --- | --- | --- | --- | --- |
| StoreApplication.id | uuid | Không | gen_random_uuid() | PK |
| StoreApplication.applicant_user_id | uuid | Không | — | FK nội bộ |
| StoreApplication.proposed_name | varchar | Không | — | Dữ liệu nghiệp vụ |
| StoreApplication.contact | varchar | Không | — | Dữ liệu nghiệp vụ |
| StoreApplication.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| StoreApplication.decision_reason | text | Có | — | Dữ liệu nghiệp vụ |
| StoreApplication.decided_by_user_id | uuid | Có | — | FK nội bộ |
| StoreApplication.submitted_at | timestamptz | Không | now() | Dữ liệu nghiệp vụ |
| StoreApplication.decided_at | timestamptz | Có | — | Dữ liệu nghiệp vụ |
| StoreApplication.version | int | Không | 0 | Dữ liệu nghiệp vụ |
| Store.id | uuid | Không | gen_random_uuid() | PK |
| Store.application_id | uuid | Không | — | FK nội bộ |
| Store.name | varchar | Không | — | Dữ liệu nghiệp vụ |
| Store.slug | varchar | Không | — | Duy nhất |
| Store.description | text | Có | — | Dữ liệu nghiệp vụ |
| Store.logo_url | varchar | Có | — | Dữ liệu nghiệp vụ |
| Store.contact | varchar | Không | — | Dữ liệu nghiệp vụ |
| Store.shipping_fee_vnd | bigint | Không | — | Dữ liệu nghiệp vụ |
| Store.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| Store.version | int | Không | 0 | Dữ liệu nghiệp vụ |
| StoreMembership.id | uuid | Không | gen_random_uuid() | PK |
| StoreMembership.store_id | uuid | Không | — | FK nội bộ |
| StoreMembership.user_id | uuid | Không | — | FK nội bộ |
| StoreMembership.role | varchar | Không | — | Dữ liệu nghiệp vụ |
| StoreMembership.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| StoreMembership.joined_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| StoreMembership.version | int | Không | 0 | Dữ liệu nghiệp vụ |
| StaffInvitation.id | uuid | Không | gen_random_uuid() | PK |
| StaffInvitation.store_id | uuid | Không | — | FK nội bộ |
| StaffInvitation.invited_email | varchar | Không | — | Dữ liệu nghiệp vụ |
| StaffInvitation.invited_user_id | uuid | Có | — | FK nội bộ |
| StaffInvitation.invited_by_user_id | uuid | Không | — | FK nội bộ |
| StaffInvitation.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| StaffInvitation.token_hash | varchar | Không | — | Dữ liệu nghiệp vụ; chỉ lưu hash, hạn chế log |
| StaffInvitation.expires_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| StaffInvitation.version | int | Không | 0 | Dữ liệu nghiệp vụ |
| MembershipPermission.membership_id | uuid | Không | — | PK + FK nội bộ |
| MembershipPermission.permission_id | uuid | Không | — | PK + FK nội bộ |
| MembershipPermission.granted_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| MembershipPermission.version | int | Không | 0 | Dữ liệu nghiệp vụ |

**Quan hệ:** StoreApplication ||--o| Store (FK nội bộ); Store ||--o{ StoreMembership (FK nội bộ); Store ||--o{ StaffInvitation (FK nội bộ); StoreMembership ||--o{ MembershipPermission (FK nội bộ).

**Dẫn chiếu:** [FR/NFR](functional-requirements.md), [Use Case](use-cases.md), [contract](api-spec.md).

### 03-catalog-review — M1

[Mã ERD](diagrams/erd/03-catalog-review.mmd). Index đề xuất: Product(store_id, status, moderation_status), GIN Product(attributes_json), ProductVariant(product_id, status), Review(product_id, status, created_at). Các mã FR/UC dưới đây là phạm vi dùng chung của miền; [ma trận truy vết](traceability.md) có ánh xạ chính xác theo từng yêu cầu.

| Entity | Mục đích và ràng buộc riêng | FR/UC dùng miền |
| --- | --- | --- |
| Category | Phân cấp danh mục dùng chung; PK/FK nội bộ; status theo quy ước chung | FR-CAT-01, FR-MPROD-02/07/10, FR-REV-01/02/03; UC-CAT-BROWSE, UC-SPROD-CREATE/VARIANT, UC-REV-CREATE/MODERATE |
| ProductType | Kiểu sản phẩm với bộ thuộc tính riêng; unique (category_id, name) | FR-CAT-01, FR-MPROD-02/07/10, FR-REV-01/02/03; UC-CAT-BROWSE, UC-SPROD-CREATE/VARIANT, UC-REV-CREATE/MODERATE |
| AttributeDefinition | Định nghĩa kiểu, bắt buộc, tập giá trị và biến thể; unique (product_type_id, code) | FR-CAT-01, FR-MPROD-02/07/10, FR-REV-01/02/03; UC-CAT-BROWSE, UC-SPROD-CREATE/VARIANT, UC-REV-CREATE/MODERATE |
| Product | Thông tin sản phẩm thuộc Store; status bán tách moderation_status; PK/FK nội bộ; status theo quy ước chung | FR-CAT-01, FR-MPROD-02/07/10, FR-REV-01/02/03; UC-CAT-BROWSE, UC-SPROD-CREATE/VARIANT, UC-REV-CREATE/MODERATE |
| ProductVariant | SKU bán được và giá bán; unique (store_id, sku); unique (product_id, variant_signature) với signature chuẩn hóa từ variant_values_json; store_id phải khớp Product.store_id | FR-CAT-01, FR-MPROD-02/07/10, FR-REV-01/02/03; UC-CAT-BROWSE, UC-SPROD-CREATE/VARIANT, UC-REV-CREATE/MODERATE |
| ProductImage | Ảnh Product hoặc Variant có thứ tự; PK/FK nội bộ; status theo quy ước chung | FR-CAT-01, FR-MPROD-02/07/10, FR-REV-01/02/03; UC-CAT-BROWSE, UC-SPROD-CREATE/VARIANT, UC-REV-CREATE/MODERATE |
| Review | Đánh giá sau mua gắn OrderItem; unique order_item_id; rating between 1 and 5; VISIBLE/HIDDEN, ReviewAudit ghi cả ẩn/hiện lại | FR-CAT-01, FR-MPROD-02/07/10, FR-REV-01/02/03; UC-CAT-BROWSE, UC-SPROD-CREATE/VARIANT, UC-REV-CREATE/MODERATE |
| ReviewAudit | Lịch sử sửa/ẩn/hiện lại đánh giá; PK/FK nội bộ; status theo quy ước chung | FR-CAT-01, FR-MPROD-02/07/10, FR-REV-01/02/03; UC-CAT-BROWSE, UC-SPROD-CREATE/VARIANT, UC-REV-CREATE/MODERATE |
| M1Audit | Audit kiểm duyệt Product và chỉnh sửa nhạy cảm; PK/FK nội bộ; status theo quy ước chung | FR-CAT-01, FR-MPROD-02/07/10, FR-REV-01/02/03; UC-CAT-BROWSE, UC-SPROD-CREATE/VARIANT, UC-REV-CREATE/MODERATE |

| Entity.cột | PostgreSQL | NULL | Default/nguồn | Vai trò và quy tắc |
| --- | --- | --- | --- | --- |
| Category.id | uuid | Không | gen_random_uuid() | PK |
| Category.parent_id | uuid | Có | — | FK nội bộ |
| Category.name | varchar | Không | — | Dữ liệu nghiệp vụ |
| Category.slug | varchar | Không | — | Duy nhất |
| Category.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| ProductType.id | uuid | Không | gen_random_uuid() | PK |
| ProductType.category_id | uuid | Không | — | FK nội bộ |
| ProductType.name | varchar | Không | — | Dữ liệu nghiệp vụ |
| ProductType.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| AttributeDefinition.id | uuid | Không | gen_random_uuid() | PK |
| AttributeDefinition.product_type_id | uuid | Không | — | FK nội bộ |
| AttributeDefinition.code | varchar | Không | — | Dữ liệu nghiệp vụ |
| AttributeDefinition.name | varchar | Không | — | Dữ liệu nghiệp vụ |
| AttributeDefinition.data_type | varchar | Không | — | Dữ liệu nghiệp vụ |
| AttributeDefinition.required | boolean | Không | — | Dữ liệu nghiệp vụ |
| AttributeDefinition.variant_factor | boolean | Không | — | Dữ liệu nghiệp vụ |
| AttributeDefinition.allowed_values | jsonb | Có | — | Dữ liệu nghiệp vụ |
| AttributeDefinition.unit | varchar | Có | — | Dữ liệu nghiệp vụ |
| Product.id | uuid | Không | gen_random_uuid() | PK |
| Product.store_id | uuid | Không | — | ID tham chiếu logic |
| Product.product_type_id | uuid | Không | — | FK nội bộ |
| Product.title | varchar | Không | — | Dữ liệu nghiệp vụ |
| Product.description | text | Có | — | Dữ liệu nghiệp vụ |
| Product.attributes_json | jsonb | Không | — | Dữ liệu nghiệp vụ |
| Product.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| Product.moderation_status | varchar | Không | — | Dữ liệu nghiệp vụ |
| Product.version | int | Không | 0 | Dữ liệu nghiệp vụ |
| ProductVariant.id | uuid | Không | gen_random_uuid() | PK |
| ProductVariant.product_id | uuid | Không | — | FK nội bộ |
| ProductVariant.store_id | uuid | Không | — | ID tham chiếu logic |
| ProductVariant.sku | varchar | Không | — | Dữ liệu nghiệp vụ |
| ProductVariant.price_vnd | bigint | Không | — | Dữ liệu nghiệp vụ |
| ProductVariant.variant_values_json | jsonb | Không | — | Dữ liệu nghiệp vụ |
| ProductVariant.variant_signature | varchar | Không | — | Dữ liệu nghiệp vụ |
| ProductVariant.is_default | boolean | Không | — | Dữ liệu nghiệp vụ |
| ProductVariant.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| ProductImage.id | uuid | Không | gen_random_uuid() | PK |
| ProductImage.product_id | uuid | Không | — | FK nội bộ |
| ProductImage.variant_id | uuid | Có | — | FK nội bộ |
| ProductImage.url | varchar | Không | — | Dữ liệu nghiệp vụ |
| ProductImage.position | int | Không | — | Dữ liệu nghiệp vụ |
| ProductImage.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| Review.id | uuid | Không | gen_random_uuid() | PK |
| Review.product_id | uuid | Không | — | FK nội bộ |
| Review.order_item_id | uuid | Không | — | ID tham chiếu logic |
| Review.customer_user_id | uuid | Không | — | ID tham chiếu logic |
| Review.rating | int | Không | — | Dữ liệu nghiệp vụ |
| Review.body | text | Có | — | Dữ liệu nghiệp vụ |
| Review.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| Review.hidden_reason | text | Có | — | Dữ liệu nghiệp vụ |
| Review.created_at | timestamptz | Không | now() | Dữ liệu nghiệp vụ |
| Review.updated_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| Review.version | int | Không | 0 | Dữ liệu nghiệp vụ |
| ReviewAudit.id | uuid | Không | gen_random_uuid() | PK |
| ReviewAudit.review_id | uuid | Không | — | FK nội bộ |
| ReviewAudit.actor_user_id | uuid | Không | — | ID tham chiếu logic |
| ReviewAudit.action | varchar | Không | — | Dữ liệu nghiệp vụ |
| ReviewAudit.reason | text | Có | — | Dữ liệu nghiệp vụ |
| ReviewAudit.created_at | timestamptz | Không | now() | Dữ liệu nghiệp vụ |
| M1Audit.id | uuid | Không | gen_random_uuid() | PK |
| M1Audit.actor_user_id | uuid | Không | — | ID tham chiếu logic |
| M1Audit.target_type | varchar | Không | — | Dữ liệu nghiệp vụ |
| M1Audit.target_id | uuid | Không | — | Dữ liệu nghiệp vụ |
| M1Audit.action | varchar | Không | — | Dữ liệu nghiệp vụ |
| M1Audit.reason | text | Có | — | Dữ liệu nghiệp vụ |
| M1Audit.request_id | varchar | Không | — | Dữ liệu nghiệp vụ |
| M1Audit.before_json | jsonb | Có | — | Dữ liệu nghiệp vụ |
| M1Audit.after_json | jsonb | Có | — | Dữ liệu nghiệp vụ |
| M1Audit.created_at | timestamptz | Không | now() | Dữ liệu nghiệp vụ |

**Quan hệ:** Category ||--o{ ProductType (FK nội bộ); ProductType ||--o{ AttributeDefinition (FK nội bộ); ProductType ||--o{ Product (FK nội bộ); Product ||--o{ ProductVariant (FK nội bộ); Product ||--o{ ProductImage (FK nội bộ); ProductVariant ||--o{ ProductImage (FK nội bộ); Product ||--o{ Review (FK nội bộ); Review ||--o{ ReviewAudit (FK nội bộ).

**Dẫn chiếu:** [FR/NFR](functional-requirements.md), [Use Case](use-cases.md), [contract](api-spec.md).

### 04-inventory — M1

[Mã ERD](diagrams/erd/04-inventory.mmd). Index đề xuất: Inventory(store_id, variant_id), InventoryReservation(order_id, status), StockMovement(order_id, created_at). Các mã FR/UC dưới đây là phạm vi dùng chung của miền; [ma trận truy vết](traceability.md) có ánh xạ chính xác theo từng yêu cầu.

| Entity | Mục đích và ràng buộc riêng | FR/UC dùng miền |
| --- | --- | --- |
| Inventory | Tồn vật lý và phần giữ theo Variant; unique variant_id; check quantity >= 0 and reserved_quantity between 0 and quantity | FR-INV-01/02/03, FR-CHECKOUT-04/05; UC-INV-VIEW/ADJUST/HISTORY, UC-CHECKOUT-CONFIRM |
| InventoryReservation | Nhóm hàng giữ cho một checkout; unique order_id; reserve bằng ID dự kiến và release nếu tạo Order lỗi | FR-INV-01/02/03, FR-CHECKOUT-04/05; UC-INV-VIEW/ADJUST/HISTORY, UC-CHECKOUT-CONFIRM |
| ReservationItem | Lượng SKU cụ thể trong reservation; unique (reservation_id, inventory_id); quantity > 0 | FR-INV-01/02/03, FR-CHECKOUT-04/05; UC-INV-VIEW/ADJUST/HISTORY, UC-CHECKOUT-CONFIRM |
| StockMovement | Bút toán tồn kho có mã thao tác chống lặp; PK/FK nội bộ; status theo quy ước chung | FR-INV-01/02/03, FR-CHECKOUT-04/05; UC-INV-VIEW/ADJUST/HISTORY, UC-CHECKOUT-CONFIRM |

| Entity.cột | PostgreSQL | NULL | Default/nguồn | Vai trò và quy tắc |
| --- | --- | --- | --- | --- |
| Inventory.id | uuid | Không | gen_random_uuid() | PK |
| Inventory.variant_id | uuid | Không | — | FK nội bộ |
| Inventory.store_id | uuid | Không | — | ID tham chiếu logic |
| Inventory.quantity | int | Không | — | Dữ liệu nghiệp vụ |
| Inventory.reserved_quantity | int | Không | 0 | Dữ liệu nghiệp vụ |
| Inventory.version | int | Không | 0 | Dữ liệu nghiệp vụ |
| InventoryReservation.id | uuid | Không | gen_random_uuid() | PK |
| InventoryReservation.order_id | uuid | Không | — | ID tham chiếu logic |
| InventoryReservation.purchase_group_id | uuid | Không | — | Dữ liệu nghiệp vụ |
| InventoryReservation.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| InventoryReservation.expires_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| InventoryReservation.created_at | timestamptz | Không | now() | Dữ liệu nghiệp vụ |
| ReservationItem.id | uuid | Không | gen_random_uuid() | PK |
| ReservationItem.reservation_id | uuid | Không | — | FK nội bộ |
| ReservationItem.inventory_id | uuid | Không | — | FK nội bộ |
| ReservationItem.quantity | int | Không | — | Dữ liệu nghiệp vụ |
| ReservationItem.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| StockMovement.id | uuid | Không | gen_random_uuid() | PK |
| StockMovement.inventory_id | uuid | Không | — | FK nội bộ |
| StockMovement.reservation_item_id | uuid | Có | — | FK nội bộ |
| StockMovement.order_id | uuid | Có | — | ID tham chiếu logic |
| StockMovement.operation_id | uuid | Không | — | Duy nhất |
| StockMovement.delta_quantity | int | Không | — | Dữ liệu nghiệp vụ |
| StockMovement.delta_reserved | int | Không | — | Dữ liệu nghiệp vụ |
| StockMovement.reason | varchar | Không | — | Dữ liệu nghiệp vụ |
| StockMovement.actor_user_id | uuid | Không | — | ID tham chiếu logic |
| StockMovement.created_at | timestamptz | Không | now() | Dữ liệu nghiệp vụ |

**Quan hệ:** InventoryReservation ||--|{ ReservationItem (FK nội bộ); Inventory ||--o{ ReservationItem (FK nội bộ); Inventory ||--o{ StockMovement (FK nội bộ); ReservationItem ||--o{ StockMovement (FK nội bộ).

**Dẫn chiếu:** [FR/NFR](functional-requirements.md), [Use Case](use-cases.md), [contract](api-spec.md).

### 05-cart-checkout — M2

[Mã ERD](diagrams/erd/05-cart-checkout.mmd). Index đề xuất: Cart(customer_user_id), CartItem(cart_id, variant_id), IdempotencyRecord(customer_user_id, key). Các mã FR/UC dưới đây là phạm vi dùng chung của miền; [ma trận truy vết](traceability.md) có ánh xạ chính xác theo từng yêu cầu.

| Entity | Mục đích và ràng buộc riêng | FR/UC dùng miền |
| --- | --- | --- |
| Cart | Giỏ của Customer; unique customer_user_id | FR-CART-01/02/03, FR-CHECKOUT-01/02/03/06/07; UC-CART-ADD/EDIT/SELECT, UC-CHECKOUT-QUOTE/CONFIRM |
| CartItem | Variant và lượng chưa xác nhận mua; unique (cart_id, variant_id); quantity > 0 | FR-CART-01/02/03, FR-CHECKOUT-01/02/03/06/07; UC-CART-ADD/EDIT/SELECT, UC-CHECKOUT-QUOTE/CONFIRM |
| IdempotencyRecord | Bản ghi kỹ thuật chống gửi lặp, giữ purchase_group_id và response trong 24 giờ; unique (customer_user_id, key); key giữ tối thiểu 24 giờ | FR-CART-01/02/03, FR-CHECKOUT-01/02/03/06/07; UC-CART-ADD/EDIT/SELECT, UC-CHECKOUT-QUOTE/CONFIRM |

| Entity.cột | PostgreSQL | NULL | Default/nguồn | Vai trò và quy tắc |
| --- | --- | --- | --- | --- |
| Cart.id | uuid | Không | gen_random_uuid() | PK |
| Cart.customer_user_id | uuid | Không | — | ID tham chiếu logic |
| Cart.updated_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| CartItem.id | uuid | Không | gen_random_uuid() | PK |
| CartItem.cart_id | uuid | Không | — | FK nội bộ |
| CartItem.variant_id | uuid | Không | — | ID tham chiếu logic |
| CartItem.store_id | uuid | Không | — | ID tham chiếu logic |
| CartItem.quantity | int | Không | — | Dữ liệu nghiệp vụ |
| CartItem.added_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| IdempotencyRecord.id | uuid | Không | gen_random_uuid() | PK |
| IdempotencyRecord.customer_user_id | uuid | Không | — | ID tham chiếu logic |
| IdempotencyRecord.key | varchar | Không | — | Dữ liệu nghiệp vụ |
| IdempotencyRecord.payload_hash | varchar | Không | — | Dữ liệu nghiệp vụ |
| IdempotencyRecord.purchase_group_id | uuid | Không | — | Dữ liệu nghiệp vụ |
| IdempotencyRecord.response_json | jsonb | Có | — | Dữ liệu nghiệp vụ |
| IdempotencyRecord.expires_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |

**Quan hệ:** Cart ||--o{ CartItem (FK nội bộ).

**Dẫn chiếu:** [FR/NFR](functional-requirements.md), [Use Case](use-cases.md), [contract](api-spec.md).

### 06-order-shipping — M2

[Mã ERD](diagrams/erd/06-order-shipping.mmd). Index đề xuất: Order(customer_user_id, created_at), Order(store_id, status, created_at), Order(purchase_group_id, store_id), OrderStatusHistory(order_id, created_at). Các mã FR/UC dưới đây là phạm vi dùng chung của miền; [ma trận truy vết](traceability.md) có ánh xạ chính xác theo từng yêu cầu.

| Entity | Mục đích và ràng buộc riêng | FR/UC dùng miền |
| --- | --- | --- |
| Order | Đơn của đúng một Store trong checkout; unique (purchase_group_id, store_id); payable_vnd >= 0; cùng nhóm tạo nguyên tập | FR-ORDER-01/02/03/04/05, FR-SORDER-01/02/03; UC-ORDER-LIST/CANCEL, UC-SORDER-STATUS/CANCEL/COD |
| OrderItem | Snapshot dòng hàng đã mua; quantity > 0; snapshot bất biến, không FK đến CartItem có thể bị xóa | FR-ORDER-01/02/03/04/05, FR-SORDER-01/02/03; UC-ORDER-LIST/CANCEL, UC-SORDER-STATUS/CANCEL/COD |
| OrderStatusHistory | Lịch sử chuyển trạng thái và actor; PK/FK nội bộ; status theo quy ước chung | FR-ORDER-01/02/03/04/05, FR-SORDER-01/02/03; UC-ORDER-LIST/CANCEL, UC-SORDER-STATUS/CANCEL/COD |
| Shipment | Theo dõi vận chuyển mô phỏng của Order; PK/FK nội bộ; status theo quy ước chung | FR-ORDER-01/02/03/04/05, FR-SORDER-01/02/03; UC-ORDER-LIST/CANCEL, UC-SORDER-STATUS/CANCEL/COD |

| Entity.cột | PostgreSQL | NULL | Default/nguồn | Vai trò và quy tắc |
| --- | --- | --- | --- | --- |
| Order.id | uuid | Không | gen_random_uuid() | PK |
| Order.purchase_group_id | uuid | Không | — | Dữ liệu nghiệp vụ |
| Order.customer_user_id | uuid | Không | — | ID tham chiếu logic |
| Order.store_id | uuid | Không | — | ID tham chiếu logic |
| Order.address_snapshot | jsonb | Không | — | Dữ liệu nghiệp vụ; bất biến sau checkout |
| Order.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| Order.payment_method | varchar | Không | — | Dữ liệu nghiệp vụ |
| Order.payment_expires_at | timestamptz | Có | — | Dữ liệu nghiệp vụ |
| Order.goods_vnd | bigint | Không | — | Dữ liệu nghiệp vụ |
| Order.store_discount_vnd | bigint | Không | — | Dữ liệu nghiệp vụ |
| Order.platform_discount_vnd | bigint | Không | — | Dữ liệu nghiệp vụ |
| Order.shipping_vnd | bigint | Không | — | Dữ liệu nghiệp vụ |
| Order.payable_vnd | bigint | Không | — | Dữ liệu nghiệp vụ |
| Order.version | int | Không | 0 | Dữ liệu nghiệp vụ |
| Order.created_at | timestamptz | Không | now() | Dữ liệu nghiệp vụ |
| OrderItem.id | uuid | Không | gen_random_uuid() | PK |
| OrderItem.order_id | uuid | Không | — | FK nội bộ |
| OrderItem.product_id | uuid | Không | — | ID tham chiếu logic |
| OrderItem.variant_id | uuid | Không | — | ID tham chiếu logic |
| OrderItem.product_snapshot | jsonb | Không | — | Dữ liệu nghiệp vụ; bất biến sau checkout |
| OrderItem.sku_snapshot | varchar | Không | — | Dữ liệu nghiệp vụ; bất biến sau checkout |
| OrderItem.unit_price_vnd | bigint | Không | — | Dữ liệu nghiệp vụ |
| OrderItem.quantity | int | Không | — | Dữ liệu nghiệp vụ |
| OrderItem.line_total_vnd | bigint | Không | — | Dữ liệu nghiệp vụ |
| OrderStatusHistory.id | uuid | Không | gen_random_uuid() | PK |
| OrderStatusHistory.order_id | uuid | Không | — | FK nội bộ |
| OrderStatusHistory.from_status | varchar | Có | — | Dữ liệu nghiệp vụ |
| OrderStatusHistory.to_status | varchar | Không | — | Dữ liệu nghiệp vụ |
| OrderStatusHistory.actor_user_id | uuid | Không | — | ID tham chiếu logic |
| OrderStatusHistory.reason | text | Có | — | Dữ liệu nghiệp vụ |
| OrderStatusHistory.operation_id | uuid | Không | — | Duy nhất |
| OrderStatusHistory.created_at | timestamptz | Không | now() | Dữ liệu nghiệp vụ |
| Shipment.id | uuid | Không | gen_random_uuid() | PK |
| Shipment.order_id | uuid | Không | — | FK nội bộ |
| Shipment.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| Shipment.tracking_code | varchar | Có | — | Dữ liệu nghiệp vụ |
| Shipment.shipped_at | timestamptz | Có | — | Dữ liệu nghiệp vụ |
| Shipment.delivered_at | timestamptz | Có | — | Dữ liệu nghiệp vụ |

**Quan hệ:** Order ||--|{ OrderItem (FK nội bộ); Order ||--o{ OrderStatusHistory (FK nội bộ); Order ||--o| Shipment (FK nội bộ).

**Dẫn chiếu:** [FR/NFR](functional-requirements.md), [Use Case](use-cases.md), [contract](api-spec.md).

### 07-payment-voucher — M2

[Mã ERD](diagrams/erd/07-payment-voucher.mmd). Index đề xuất: Payment(order_id), PaymentEvent(provider_event_id), Refund(payment_id, order_id, status), Voucher(scope, store_id, status, ends_at), VoucherReservation(voucher_id, purchase_group_id, status). Các mã FR/UC dưới đây là phạm vi dùng chung của miền; [ma trận truy vết](traceability.md) có ánh xạ chính xác theo từng yêu cầu.

| Entity | Mục đích và ràng buộc riêng | FR/UC dùng miền |
| --- | --- | --- |
| Payment | Nghĩa vụ tiền riêng một Order; unique order_id; payable_vnd = Order.payable_vnd; collected_vnd <= collectible_vnd <= payable_vnd | FR-PAY-01/02/03/04/05, FR-VCH-01/02/03/04; UC-PAY-SANDBOX/COD, UC-VCH-STORE/PLATFORM/APPLY |
| PaymentAttempt | Một lần gọi cổng sandbox cho Order; partial unique successful attempt per payment_id | FR-PAY-01/02/03/04/05, FR-VCH-01/02/03/04; UC-PAY-SANDBOX/COD, UC-VCH-STORE/PLATFORM/APPLY |
| PaymentEvent | Callback đã nhận và deduplicate; PK/FK nội bộ; status theo quy ước chung | FR-PAY-01/02/03/04/05, FR-VCH-01/02/03/04; UC-PAY-SANDBOX/COD, UC-VCH-STORE/PLATFORM/APPLY |
| Refund | Hoàn tiền mock của một Order trả trước; order_id bắt buộc, Payment.order_id = Refund.order_id; unique successful refund per Order; không vượt số đã thu | FR-PAY-01/02/03/04/05, FR-VCH-01/02/03/04; UC-PAY-SANDBOX/COD, UC-VCH-STORE/PLATFORM/APPLY |
| CODCollection | Khoản cần thu/đã thu của Order COD; unique order_id; amount_collected_vnd <= amount_due_vnd | FR-PAY-01/02/03/04/05, FR-VCH-01/02/03/04; UC-PAY-SANDBOX/COD, UC-VCH-STORE/PLATFORM/APPLY |
| Voucher | Điều kiện và mức giảm của mã ưu đãi; PK/FK nội bộ; status theo quy ước chung | FR-PAY-01/02/03/04/05, FR-VCH-01/02/03/04; UC-PAY-SANDBOX/COD, UC-VCH-STORE/PLATFORM/APPLY |
| VoucherReservation | Lượt dùng đang giữ lúc tạo nhóm Order; unique (voucher_id, purchase_group_id, store_id); platform store_id NULL; khóa lượt khi tạo Order | FR-PAY-01/02/03/04/05, FR-VCH-01/02/03/04; UC-PAY-SANDBOX/COD, UC-VCH-STORE/PLATFORM/APPLY |
| VoucherRedemption | Giảm giá chụp trên Order, lượt voucher sàn đếm theo nhóm; unique (voucher_id, order_id); voucher toàn sàn đếm một lượt theo purchase_group_id | FR-PAY-01/02/03/04/05, FR-VCH-01/02/03/04; UC-PAY-SANDBOX/COD, UC-VCH-STORE/PLATFORM/APPLY |
| M2Audit | Audit voucher, thanh toán, hoàn tiền và đơn; PK/FK nội bộ; status theo quy ước chung | FR-PAY-01/02/03/04/05, FR-VCH-01/02/03/04; UC-PAY-SANDBOX/COD, UC-VCH-STORE/PLATFORM/APPLY |

| Entity.cột | PostgreSQL | NULL | Default/nguồn | Vai trò và quy tắc |
| --- | --- | --- | --- | --- |
| Payment.id | uuid | Không | gen_random_uuid() | PK |
| Payment.order_id | uuid | Không | — | FK nội bộ |
| Payment.method | varchar | Không | — | Dữ liệu nghiệp vụ |
| Payment.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| Payment.payable_vnd | bigint | Không | — | Dữ liệu nghiệp vụ |
| Payment.collectible_vnd | bigint | Không | — | Dữ liệu nghiệp vụ |
| Payment.collected_vnd | bigint | Không | 0 | Dữ liệu nghiệp vụ |
| Payment.refunded_vnd | bigint | Không | 0 | Dữ liệu nghiệp vụ |
| Payment.version | int | Không | 0 | Dữ liệu nghiệp vụ |
| PaymentAttempt.id | uuid | Không | gen_random_uuid() | PK |
| PaymentAttempt.payment_id | uuid | Không | — | FK nội bộ |
| PaymentAttempt.provider_reference | varchar | Không | — | Duy nhất |
| PaymentAttempt.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| PaymentAttempt.amount_vnd | bigint | Không | — | Dữ liệu nghiệp vụ |
| PaymentAttempt.created_at | timestamptz | Không | now() | Dữ liệu nghiệp vụ |
| PaymentEvent.id | uuid | Không | gen_random_uuid() | PK |
| PaymentEvent.attempt_id | uuid | Không | — | FK nội bộ |
| PaymentEvent.provider_event_id | varchar | Không | — | Duy nhất |
| PaymentEvent.event_type | varchar | Không | — | Dữ liệu nghiệp vụ |
| PaymentEvent.payload_hash | varchar | Không | — | Dữ liệu nghiệp vụ |
| PaymentEvent.received_at | timestamptz | Không | now() | Dữ liệu nghiệp vụ |
| Refund.id | uuid | Không | gen_random_uuid() | PK |
| Refund.payment_id | uuid | Không | — | FK nội bộ |
| Refund.order_id | uuid | Không | — | FK nội bộ |
| Refund.amount_vnd | bigint | Không | — | Dữ liệu nghiệp vụ |
| Refund.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| Refund.operation_id | uuid | Không | — | Duy nhất |
| Refund.created_at | timestamptz | Không | now() | Dữ liệu nghiệp vụ |
| CODCollection.id | uuid | Không | gen_random_uuid() | PK |
| CODCollection.order_id | uuid | Không | — | FK nội bộ |
| CODCollection.amount_due_vnd | bigint | Không | — | Dữ liệu nghiệp vụ |
| CODCollection.amount_collected_vnd | bigint | Không | — | Dữ liệu nghiệp vụ |
| CODCollection.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| CODCollection.operation_id | uuid | Không | — | Duy nhất |
| CODCollection.collected_at | timestamptz | Có | — | Dữ liệu nghiệp vụ |
| Voucher.id | uuid | Không | gen_random_uuid() | PK |
| Voucher.code | varchar | Không | — | Duy nhất |
| Voucher.scope | varchar | Không | — | Dữ liệu nghiệp vụ |
| Voucher.store_id | uuid | Có | — | ID tham chiếu logic |
| Voucher.owner_user_id | uuid | Không | — | ID tham chiếu logic |
| Voucher.discount_type | varchar | Không | — | Dữ liệu nghiệp vụ |
| Voucher.discount_value | bigint | Không | — | Dữ liệu nghiệp vụ |
| Voucher.max_discount_vnd | bigint | Có | — | Dữ liệu nghiệp vụ |
| Voucher.min_goods_vnd | bigint | Không | — | Dữ liệu nghiệp vụ |
| Voucher.starts_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| Voucher.ends_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| Voucher.usage_limit | int | Không | — | Dữ liệu nghiệp vụ |
| Voucher.per_customer_limit | int | Không | — | Dữ liệu nghiệp vụ |
| Voucher.status | varchar | Không | 'ACTIVE' | `ACTIVE` hoặc `STOPPED`; thời gian hết hạn được suy từ `ends_at`, không ghi đè Redemption lịch sử |
| Voucher.version | int | Không | 0 | Dữ liệu nghiệp vụ |
| VoucherReservation.id | uuid | Không | gen_random_uuid() | PK |
| VoucherReservation.voucher_id | uuid | Không | — | FK nội bộ |
| VoucherReservation.purchase_group_id | uuid | Không | — | Dữ liệu nghiệp vụ |
| VoucherReservation.customer_user_id | uuid | Không | — | ID tham chiếu logic |
| VoucherReservation.store_id | uuid | Có | — | ID tham chiếu logic |
| VoucherReservation.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| VoucherReservation.discount_vnd | bigint | Không | — | Dữ liệu nghiệp vụ |
| VoucherReservation.expires_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| VoucherRedemption.id | uuid | Không | gen_random_uuid() | PK |
| VoucherRedemption.voucher_id | uuid | Không | — | FK nội bộ |
| VoucherRedemption.purchase_group_id | uuid | Không | — | Dữ liệu nghiệp vụ |
| VoucherRedemption.order_id | uuid | Không | — | FK nội bộ |
| VoucherRedemption.customer_user_id | uuid | Không | — | ID tham chiếu logic |
| VoucherRedemption.discount_vnd | bigint | Không | — | Dữ liệu nghiệp vụ |
| VoucherRedemption.redeemed_at | timestamptz | Không | now() | Dữ liệu nghiệp vụ |
| M2Audit.id | uuid | Không | gen_random_uuid() | PK |
| M2Audit.actor_user_id | uuid | Có | — | ID tham chiếu logic |
| M2Audit.target_type | varchar | Không | — | Dữ liệu nghiệp vụ |
| M2Audit.target_id | uuid | Không | — | Dữ liệu nghiệp vụ |
| M2Audit.action | varchar | Không | — | Dữ liệu nghiệp vụ |
| M2Audit.reason | text | Có | — | Dữ liệu nghiệp vụ |
| M2Audit.request_id | varchar | Không | — | Dữ liệu nghiệp vụ |
| M2Audit.before_json | jsonb | Có | — | Dữ liệu nghiệp vụ |
| M2Audit.after_json | jsonb | Có | — | Dữ liệu nghiệp vụ |
| M2Audit.created_at | timestamptz | Không | now() | Dữ liệu nghiệp vụ |

**Quan hệ:** Payment ||--o{ PaymentAttempt (FK nội bộ); PaymentAttempt ||--o{ PaymentEvent (FK nội bộ); Payment ||--o{ Refund (FK nội bộ); Voucher ||--o{ VoucherReservation (FK nội bộ); Voucher ||--o{ VoucherRedemption (FK nội bộ).

**Dẫn chiếu:** [FR/NFR](functional-requirements.md), [Use Case](use-cases.md), [contract](api-spec.md).

### 08-ai — M4

[Mã ERD](diagrams/erd/08-ai.mmd). Index đề xuất: ChatMessage(session_id, created_at), RecommendationInteraction(user_id, occurred_at), PersonalizationConsent(user_id), ProductEmbedding(product_id, source_version), vector index for ProductEmbedding.vector. Các mã FR/UC dưới đây là phạm vi dùng chung của miền; [ma trận truy vết](traceability.md) có ánh xạ chính xác theo từng yêu cầu.

| Entity | Mục đích và ràng buộc riêng | FR/UC dùng miền |
| --- | --- | --- |
| ChatSession | Phiên chat của Customer hoặc Guest; PK/FK nội bộ; status theo quy ước chung | FR-AI-01/02/03/04/05/06/07/08, FR-REC-01/02/03/04/05/06/07/08/09/10/11; UC-CHAT-TALK/HISTORY, UC-REC-FOR-YOU/RELATED |
| ChatMessage | Lượt hội thoại và card liên quan; PK/FK nội bộ; status theo quy ước chung | FR-AI-01/02/03/04/05/06/07/08, FR-REC-01/02/03/04/05/06/07/08/09/10/11; UC-CHAT-TALK/HISTORY, UC-REC-FOR-YOU/RELATED |
| SearchHistory | Truy vấn của Customer phục vụ AI; PK/FK nội bộ; status theo quy ước chung | FR-AI-01/02/03/04/05/06/07/08, FR-REC-01/02/03/04/05/06/07/08/09/10/11; UC-CHAT-TALK/HISTORY, UC-REC-FOR-YOU/RELATED |
| RecommendationInteraction | Implicit feedback gồm view/cart/purchase đã dedup; PK/FK nội bộ; status theo quy ước chung | FR-AI-01/02/03/04/05/06/07/08, FR-REC-01/02/03/04/05/06/07/08/09/10/11; UC-CHAT-TALK/HISTORY, UC-REC-FOR-YOU/RELATED |
| PersonalizationConsent | Opt-in/withdrawal của User cho cá nhân hóa; unique user_id; không dùng hành vi cá nhân khi chưa opt-in | FR-AI-01/02/03/04/05/06/07/08, FR-REC-01/02/03/04/05/06/07/08/09/10/11; UC-CHAT-TALK/HISTORY, UC-REC-FOR-YOU/RELATED |
| UserPreference | Hồ sơ sở thích suy ra từ hành vi; unique user_id | FR-AI-01/02/03/04/05/06/07/08, FR-REC-01/02/03/04/05/06/07/08/09/10/11; UC-CHAT-TALK/HISTORY, UC-REC-FOR-YOU/RELATED |
| ProductEmbedding | Vector Product có source version; unique (product_id, source_version) | FR-AI-01/02/03/04/05/06/07/08, FR-REC-01/02/03/04/05/06/07/08/09/10/11; UC-CHAT-TALK/HISTORY, UC-REC-FOR-YOU/RELATED |
| ModelVersion | Phiên bản mô hình và artifact; PK/FK nội bộ; status theo quy ước chung | FR-AI-01/02/03/04/05/06/07/08, FR-REC-01/02/03/04/05/06/07/08/09/10/11; UC-CHAT-TALK/HISTORY, UC-REC-FOR-YOU/RELATED |
| TrainingRun | Một lần huấn luyện với dataset/split; PK/FK nội bộ; status theo quy ước chung | FR-AI-01/02/03/04/05/06/07/08, FR-REC-01/02/03/04/05/06/07/08/09/10/11; UC-CHAT-TALK/HISTORY, UC-REC-FOR-YOU/RELATED |
| ModelEvaluation | Metric Top-K so baseline cho một run; unique (training_run_id, baseline_name, k) | FR-AI-01/02/03/04/05/06/07/08, FR-REC-01/02/03/04/05/06/07/08/09/10/11; UC-CHAT-TALK/HISTORY, UC-REC-FOR-YOU/RELATED |

| Entity.cột | PostgreSQL | NULL | Default/nguồn | Vai trò và quy tắc |
| --- | --- | --- | --- | --- |
| ChatSession.id | uuid | Không | gen_random_uuid() | PK |
| ChatSession.user_id | uuid | Có | — | ID tham chiếu logic |
| ChatSession.anonymous_key | varchar | Có | — | Dữ liệu nghiệp vụ |
| ChatSession.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| ChatSession.created_at | timestamptz | Không | now() | Dữ liệu nghiệp vụ |
| ChatMessage.id | uuid | Không | gen_random_uuid() | PK |
| ChatMessage.session_id | uuid | Không | — | FK nội bộ |
| ChatMessage.role | varchar | Không | — | Dữ liệu nghiệp vụ |
| ChatMessage.content | text | Không | — | Dữ liệu nghiệp vụ |
| ChatMessage.product_refs | jsonb | Có | — | Dữ liệu nghiệp vụ |
| ChatMessage.created_at | timestamptz | Không | now() | Dữ liệu nghiệp vụ |
| SearchHistory.id | uuid | Không | gen_random_uuid() | PK |
| SearchHistory.user_id | uuid | Không | — | ID tham chiếu logic |
| SearchHistory.query | text | Không | — | Dữ liệu nghiệp vụ |
| SearchHistory.created_at | timestamptz | Không | now() | Dữ liệu nghiệp vụ |
| RecommendationInteraction.id | uuid | Không | gen_random_uuid() | PK |
| RecommendationInteraction.user_id | uuid | Không | — | ID tham chiếu logic |
| RecommendationInteraction.product_id | uuid | Không | — | ID tham chiếu logic |
| RecommendationInteraction.event_id | varchar | Không | — | Duy nhất |
| RecommendationInteraction.event_type | varchar | Không | — | Dữ liệu nghiệp vụ |
| RecommendationInteraction.weight | int | Không | — | Dữ liệu nghiệp vụ |
| RecommendationInteraction.occurred_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| PersonalizationConsent.id | uuid | Không | gen_random_uuid() | PK |
| PersonalizationConsent.user_id | uuid | Không | — | ID tham chiếu logic |
| PersonalizationConsent.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| PersonalizationConsent.source | varchar | Không | — | Dữ liệu nghiệp vụ |
| PersonalizationConsent.changed_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| PersonalizationConsent.version | int | Không | 0 | Dữ liệu nghiệp vụ |
| UserPreference.id | uuid | Không | gen_random_uuid() | PK |
| UserPreference.user_id | uuid | Không | — | ID tham chiếu logic |
| UserPreference.profile_json | jsonb | Không | — | Dữ liệu nghiệp vụ |
| UserPreference.updated_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| ProductEmbedding.id | uuid | Không | gen_random_uuid() | PK |
| ProductEmbedding.product_id | uuid | Không | — | ID tham chiếu logic |
| ProductEmbedding.source_version | int | Không | — | Dữ liệu nghiệp vụ |
| ProductEmbedding.vector | vector | Không | — | Dữ liệu nghiệp vụ |
| ProductEmbedding.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| ProductEmbedding.updated_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| ModelVersion.id | uuid | Không | gen_random_uuid() | PK |
| ModelVersion.algorithm | varchar | Không | — | Dữ liệu nghiệp vụ |
| ModelVersion.version | varchar | Không | 0 | Duy nhất |
| ModelVersion.artifact_uri | varchar | Không | — | Dữ liệu nghiệp vụ |
| ModelVersion.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| ModelVersion.trained_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| TrainingRun.id | uuid | Không | gen_random_uuid() | PK |
| TrainingRun.model_version_id | uuid | Không | — | FK nội bộ |
| TrainingRun.dataset_version | varchar | Không | — | Dữ liệu nghiệp vụ |
| TrainingRun.split_spec | jsonb | Không | — | Dữ liệu nghiệp vụ |
| TrainingRun.status | varchar | Không | — | Dữ liệu nghiệp vụ |
| TrainingRun.started_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |
| TrainingRun.finished_at | timestamptz | Có | — | Dữ liệu nghiệp vụ |
| ModelEvaluation.id | uuid | Không | gen_random_uuid() | PK |
| ModelEvaluation.training_run_id | uuid | Không | — | FK nội bộ |
| ModelEvaluation.baseline_name | varchar | Không | — | Dữ liệu nghiệp vụ |
| ModelEvaluation.k | int | Không | — | Dữ liệu nghiệp vụ |
| ModelEvaluation.precision_at_k | numeric | Không | — | Dữ liệu nghiệp vụ |
| ModelEvaluation.recall_at_k | numeric | Không | — | Dữ liệu nghiệp vụ |
| ModelEvaluation.ndcg_at_k | numeric | Không | — | Dữ liệu nghiệp vụ |
| ModelEvaluation.evaluated_at | timestamptz | Không | — | Dữ liệu nghiệp vụ |

**Quan hệ:** ChatSession ||--o{ ChatMessage (FK nội bộ); ModelVersion ||--o{ TrainingRun (FK nội bộ); TrainingRun ||--o{ ModelEvaluation (FK nội bộ).

**Dẫn chiếu:** [FR/NFR](functional-requirements.md), [Use Case](use-cases.md), [contract](api-spec.md).

## Quan hệ xuyên sơ đồ và service

| Bên giữ ID | Bên sở hữu | Kiểm tra |
| --- | --- | --- |
| M1 Product.store_id, Inventory.store_id, Review.customer_user_id | M3 | Kiểm tra Store/User hiện hành; không FK xuyên DB. |
| M1 Review.order_item_id, InventoryReservation.order_id, StockMovement.order_id | M2 | Xác minh qua contract; restock Order chống lặp bằng operation_id. |
| M2 Cart/Order.customer_user_id và Order.store_id | M3 | customer_user_id = User.id; snapshot Order không thay đổi. |
| M2 CartItem/OrderItem.variant_id | M1 | Quote kiểm tra giá/tồn; OrderItem giữ snapshot. |
| M4 user_id/product_id | M3/M1 | Đồng bộ event; kiểm tra Product hiện hành trước gợi ý. |

Quan hệ vật lý cùng M2 nhưng nằm ở hai ERD chi tiết: Order 1—1 Payment; Order 1—0..1 CODCollection; Order 1—0..1 Refund; Payment 1—0..1 Refund; Order 1—0..n VoucherRedemption. Cùng M3: Permission 1—0..n MembershipPermission. Các cạnh này không được vẽ lặp thực thể trên nhiều hình; xem sơ đồ tổng quan và FK ở bảng cột.

## Vòng đời và dữ liệu tạm

Không có bảng CheckoutSession, CheckoutItem, CheckoutStoreTotal hoặc PaymentAllocation. M2 tạo nguyên tập Order từ các CartItem đã chọn trong một transaction; mỗi Order có Payment riêng và snapshot tiền/địa chỉ. IdempotencyRecord có TTL tối thiểu 24 giờ, lưu cùng key/hash và purchase_group_id để retry trả lại tập Order; nó là dữ liệu kỹ thuật, không quản lý lịch sử mua hàng. Order sandbox AWAITING_PAYMENT giữ tồn có hạn, callback thành công consume hoặc RECOVERING theo chính Order; callback muộn sau EXPIRED hoàn tiền cho Order đó. COD consume khi Order được xác nhận, thu tiền khi giao.

Voucher toàn sàn được tính một lần trên tập Store tại xác nhận và phân bổ cố định xuống Order. VoucherRedemption gắn từng Order nhưng usage_limit/per_customer_limit của voucher sàn đếm DISTINCT purchase_group_id. Lỗi trước transaction Order release toàn bộ reservation/lượt giữ; hủy hoặc hết hạn một Order sau tạo không khôi phục lượt đã dùng, không tính lại Order khác. Xóa Product/Variant/Address/Voucher lịch sử chỉ soft-delete hoặc đổi status. Outbox/inbox và audit được triển khai trong database của service sở hữu.

## Nguồn sự thật, dữ liệu suy ra và bảo toàn lịch sử

| Dữ liệu | Nguồn sự thật | Bản sao/snapshot và quy tắc đối soát |
| --- | --- | --- |
| Giá bán hiện hành | M1 ProductVariant.price_vnd | M2 OrderItem giữ giá lúc xác nhận; M4 embedding không được dùng làm giá trả cho Customer. |
| Trạng thái bán/kiểm duyệt | M1 Product và M3 Store | M4 chỉ mục suy ra phải kiểm tra lại trước khi hiển thị; Order cũ không đổi. |
| Tồn khả dụng | M1 Inventory.quantity và reserved_quantity | `available` được tính, không là nguồn độc lập; StockMovement/Reservation có operation ID. |
| Tiền phải trả | M2 Order snapshot sau phân bổ voucher/phí | Payment.payable_vnd khớp Order; quote chỉ tạm, tổng purchase_group_id là tổng các Order. |
| Trạng thái tiền/hoàn | M2 Payment, PaymentAttempt, Refund và CODCollection | Order.status không thay thế Payment/Refund.status; báo cáo đọc đúng nguồn từng chỉ số. |
| Quyền Store | M3 StoreMembership/MembershipPermission | JWT và cache không là nguồn quyền sau khóa/thu hồi. |
| Rating Product | M1 Review VISIBLE | Tính khi đọc hoặc cache suy ra; cache cập nhật khi Review tạo/sửa/ẩn/hiện. |
| Consent cá nhân hóa | M4 PersonalizationConsent | Không suy consent từ lịch sử interaction; rút consent có hiệu lực trước lần phục vụ tiếp theo. |

**Bảo toàn lịch sử:** không hard-delete Product, Variant, Address, Voucher hoặc Store đã được Order/Review tham chiếu; dùng status/ngừng sử dụng. CartItem đã mua có thể xóa vì OrderItem giữ snapshot và không FK vào CartItem. Outbox/inbox/idempotency có TTL/retention kỹ thuật, không thay lịch sử Order. Audit trước/sau phải khử trường nhạy cảm theo [Security/Privacy](security-privacy.md). Các ID sang service khác là **tham chiếu logic**, được xác minh bằng API/event/đối soát, không tạo FK vật lý.
