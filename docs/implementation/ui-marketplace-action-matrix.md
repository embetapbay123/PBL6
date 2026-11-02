# UI marketplace graphite + cam trầm — ma trận thao tác

Bản này thay lớp giao diện web, giữ contract và quy tắc nghiệp vụ. Chi tiết nghiệp vụ/backend và provider tiếp tục được ghi trong `marketplace-feature-matrix.md`. Ma trận dưới đây bao phủ route thực tế, thao tác, quyền và endpoint qua operation registry; không bổ sung nút cho tính năng chưa có API.

## Quy ước chung

- Đọc dữ liệu: skeleton/trạng thái tải → dữ liệu/rỗng; lỗi giữ thông báo thật và nút thử lại cho GET.
- Ghi dữ liệu: khóa thao tác đang chạy; chỉ thông báo thành công sau response thành công. Validation hiển thị tại trường có thông tin field; lỗi khác giữ ở form.
- Xung đột version: yêu cầu tải dữ liệu mới; không tự ghi đè. Checkout/thanh toán giữ nguyên quote, body và idempotency khi kết quả chưa chắc chắn.
- Chat Store thử lại bằng cùng client_message_id; AI không tự gửi lại. Đổi tài khoản xóa UI state/cache riêng. Không tự thay API lỗi bằng fixture.

| Route / nhóm | Vị trí thao tác | Vai trò | Operation/API hiện có | Hoàn tất / lỗi / thử lại |
| --- | --- | --- | --- | --- |
| `/`, `/?q/category/sort/page` | Header tìm kiếm, sidebar/drawer danh mục, toolbar sort/reset, phân trang | Public | listProducts, listCategories | URL giữ trạng thái; GET thử lại; drawer chỉ áp dụng khi xác nhận |
| Catalog/card, `/products/:id` | Card thêm giỏ/yêu thích; gallery, biến thể, stepper, mua ngay | Public đọc; Customer ghi | getProduct, addCartItem, addFavorite/removeFavorite | Guest đăng nhập; API xác nhận; add không chắc chắn yêu cầu kiểm tra giỏ |
| `/stores/:id` | Header gian hàng, Nhắn tin, sản phẩm/phân trang | Public/Customer | getPublicStore, listStoreProducts, startStoreConversation | Không bịa tên Store hoặc trạng thái bán; contact mở đúng thread |
| `/login`, `/auth`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/change-password` | Form xác thực và liên kết liên quan | Public/phiên hiện tại | login/register/verifyEmail, request/confirm reset, changePassword/logout | Token chỉ gửi đúng thao tác; không giả xác minh/email đã gửi |
| `/profile`, `/customer/profile` | Menu tài khoản, sidebar và form hồ sơ | Phiên hiện tại/Customer | getProfile/updateProfile | Dữ liệu người dùng hiện tại; lỗi form giữ dữ liệu nhập |
| `/customer/addresses` | Danh sách và form thêm/sửa/xóa/đặt mặc định | Customer | Address operations | Kết quả thực; lỗi giữ ở form |
| `/customer/favorites` | Card mua hàng và bỏ yêu thích | Customer | listFavorites, getProduct, removeFavorite | Không tồn tại → trạng thái không còn hiển thị; lỗi khác không giả rỗng |
| `/cart` | Nhóm Store, chọn, stepper/xóa, tổng kết, CTA mobile | Customer | listCartItems/updateCartItem/removeCartItem | Chọn theo user; giá cuối chỉ từ checkout quote |
| `/checkout` | Địa chỉ, Store/payment/voucher, tổng kết và CTA mobile | Customer | quoteCheckout, confirmCheckout | Không xác nhận quote cũ; lỗi không chắc chắn giữ nguyên giao dịch |
| `/orders/:id/pay` | Mã thanh toán/QR, trạng thái, thử lại khi được phép | Customer sở hữu | getOwnOrder, payment attempt operations | Không retry UNKNOWN; thành công chỉ từ API |
| `/customer/orders`, `/customer/orders/:id` | Đơn, chi tiết, hủy/nhận hàng/đổi trả/đánh giá | Customer sở hữu | listOwnOrders/getOwnOrder/cancelOwnOrder, receipt/return/review operations | Hành động theo trạng thái và version; refund requested khác refund completed |
| `/customer/returns` | Danh sách/chi tiết yêu cầu | Customer | listOwnReturns, return detail operations | GET có phân trang và lỗi thực |
| `/customer/notifications` | Mở thông báo, đánh dấu đọc, liên kết đơn | Customer | notification operations | Không bịa thanh toán thành công |
| `/customer/invitations` | Xem lời mời/chấp nhận | Customer | listOwnInvitations, acceptInvitation, refresh context | Accept xong cập nhật membership; DTO query chuẩn hóa phân trang |
| `/customer/store-applications` | Form mở Store, lịch sử | Customer | Store application operations | Pending/rejected/approved theo server; không browser fallback |
| `/customer/settings` | Quyền riêng tư, lời mời và mở Store | Customer | Consent/invitation/application operations | Giữ version; cập nhật lại phiên sau đổi membership |
| `/customer/messages/:id?`, chat nổi | Danh sách, composer, lịch sử, mở/thu nhỏ/đóng/full page | Customer; Guest AI | listOwnConversations/messages, sendOwnConversationMessage; AI sessions/messages | Chia sẻ draft/pending; polling khi hoạt động; dừng khi đóng/tab ẩn |
| `/seller` | Sidebar, tổng quan, thêm sản phẩm/xem Store | Store membership | getOwnStore, dashboard data | Chỉ dữ liệu thật, không widget Customer |
| `/seller/products`, `/:id/edit` | Toolbar, row sửa + menu phụ; sections thông tin/thuộc tính/biến thể/ảnh | Quyền sản phẩm; Owner | list/getOwnStoreProduct, update/createProduct, taxonomy/variant/image operations | Bản nháp/ẩn vẫn sửa được; expected_version; 409 tải lại |
| `/seller/inventory` | Bảng và dialog điều chỉnh/lịch sử | Quyền inventory | Inventory operations | Giữ operation ID/body/version khi thử lại chưa chắc chắn |
| `/seller/orders` | Danh sách, chi tiết, chuyển trạng thái/COD/hủy | Quyền order/COD tương ứng | Store order/COD operations | COD cần xác nhận thu thực; version và quyền phía server |
| `/seller/returns` | Danh sách và xử lý yêu cầu | Quyền order | Store return operations | Không tự coi hoàn tiền provider đang chờ là hoàn tất |
| `/seller/messages/:id?` | Inbox và composer dùng chung | Quyền order; Owner | Store conversation/message operations | Tách scope CUSTOMER/STORE; giữ client_message_id khi retry |
| `/seller/vouchers` | Tạo/sửa/trạng thái/usage | Owner | Store voucher operations | Scope Store; hạn mức/điều kiện theo API |
| `/seller/staff` | Mời, quyền, khóa/mở, thu hồi | Owner | staff/invitation operations | Có expected_version; lỗi phân trang lời mời đã sửa bằng generated DTO |
| `/seller/settings`, `/seller/reports` | Form Store, khoảng thời gian/báo cáo | Owner | Own Store/report operations | Không bịa doanh thu; lỗi tích hợp hiển thị thật |
| `/admin?tab=dashboard/users/stores/roles` | Sidebar, chỉ số, bảng và thao tác quyền/trạng thái | Admin + quyền server | Platform dashboard, users/Stores/roles operations | Version và kiểm quyền server; bảng mobile cuộn trong vùng |
| `/admin?tab=catalog&section=taxonomy/attributes/products/reviews` | Các mục con, form hoặc danh sách kiểm duyệt | Admin + quyền server | Taxonomy, attribute, Product/Review moderation operations | Lý do + version; tách khỏi trang form dài |
| `/admin?tab=orders/returns/vouchers` | Toolbar, bảng, lọc trên trang/chi tiết/xử lý | Admin + quyền server | All orders, Admin return/platform voucher operations | Ghi rõ phạm vi lọc; snapshot đơn không tự cập nhật nghiệp vụ |
| `/admin?tab=ai/audit`, `/admin/store-applications` | Telemetry, bộ lọc nhật ký, duyệt Store | Admin + quyền server | AI metrics, audit, Store application operations | Metrics/provider chưa chạy hiển thị đúng trạng thái; duyệt có lý do/version |

## Thiết kế và kiểm thử

- `commerce.css` là stylesheet UI đang dùng; hai stylesheet cũ được lưu ngoài luồng chạy tại `artifacts/previous-ui-styles/`.
- Font Be Vietnam Pro có giấy phép OFL, tự phục vụ từ `public/fonts/`.
- Query cache và chat provider đặt dưới scope phiên. ConversationWorkspace được dùng chung cho widget và trang Tin nhắn.
- Bộ ảnh/JSON nghiệm thu API thật: `artifacts/ui-review/`; ảnh chat và checkout fixture: `artifacts/ui-professional/`. Checkout fixture được ghi rõ trong tên ảnh.
- Preview API thật ở `http://127.0.0.1:3109`, gateway test riêng `http://127.0.0.1:18080`; chưa phát hành stack dùng chung.
