# Ma trận quyền 2.1 Draft

Quyền là giao của vai trò, trạng thái User, StoreMembership và phạm vi tài nguyên. `G` = Guest, `C` = Customer, `S` = Seller, `O` = Store Owner, `A` = Administrator. `✓` cho phép sau khi backend kiểm tra scope; `—` từ chối. Một User có thể dùng quyền C cùng S/O. User bị khóa không dùng bất kỳ quyền đăng nhập nào. Admin không tự có quyền thao tác Seller của một Store.

| Thao tác/permission code | G | C | S | O | A | Phạm vi |
| --- | --- | --- | --- | --- | --- | --- |
| catalog.read | ✓ | ✓ | ✓ | ✓ | ✓ | Product/Store công khai |
| chat.basic | ✓ | ✓ | — | — | — | Session hiện tại |
| auth.register | ✓ | — | — | — | — | Tạo User mới |
| auth.login_reset | ✓ | — | — | — | — | Tiền đăng nhập; Seller/Owner/Admin cũng là Guest trước khi xác thực |
| auth.logout_change | — | ✓ | ✓ | ✓ | ✓ | Chính phiên/User đã đăng nhập; change kiểm tra mật khẩu cũ |
| profile.read_write | — | ✓ | ✓ | ✓ | ✓ | Chính User đó |
| address.read_write | — | ✓ | — | — | — | Địa chỉ của chính Customer |
| cart.read_write | — | ✓ | — | — | — | Giỏ của chính Customer |
| checkout.create | — | ✓ | — | — | — | Giỏ Customer, Store còn bán |
| payment.read | — | ✓ | — | — | ✓ | Customer của Order tương ứng; Admin audit |
| order.customer_read_cancel | — | ✓ | — | — | — | Đơn của chính Customer |
| refund.customer_read | — | ✓ | — | — | — | Refund của chính Customer |
| voucher.apply | — | ✓ | — | — | — | Voucher hợp lệ theo scope |
| review.read | ✓ | ✓ | ✓ | ✓ | ✓ | Chỉ Review đang hiển thị |
| review.create_edit | — | ✓ | — | — | — | OrderItem Completed của chính Customer |
| store.application.create_read | — | ✓ | — | — | — | Đơn mở Store của Customer; membership active bị từ chối tạo mới |
| store.application.review | — | — | — | — | ✓ | Toàn sàn |
| store.info.update | — | — | — | ✓ | — | Đúng Store membership |
| staff.read | — | — | — | ✓ | — | Seller và lời mời trong đúng Store |
| staff.invite | — | — | — | ✓ | — | Lời mời Seller trong cùng Store |
| staff.invitation.read_own | — | ✓ | — | — | — | Lời mời gửi đến email đã xác minh của chính User |
| staff.invitation.revoke | — | — | — | ✓ | — | Chỉ lời mời PENDING của đúng Store; audit |
| staff.permission.manage | — | — | — | ✓ | — | Chỉ bốn nhóm quyền Seller được cấp/thu hồi |
| staff.membership.lock_unlock | — | — | — | ✓ | — | Khóa/mở membership Seller, không khóa User toàn hệ thống |
| product.store.read_write | — | — | ✓ | ✓ | — | Product của Store; Admin dùng product.moderate |
| inventory.store.read_adjust | — | — | ✓ | ✓ | — | Variant của Store, StockMovement audit |
| order.store.read_status_cancel | — | — | ✓ | ✓ | — | Order của Store, trạng thái hợp lệ |
| cod.store.collect | — | — | ✓ | ✓ | — | Order COD Store ở Shipped |
| report.store.read | — | — | — | ✓ | — | Store của Owner |
| voucher.store.manage | — | — | — | ✓ | — | Voucher của Store |
| voucher.platform.manage | — | — | — | — | ✓ | Toàn sàn |
| store.lock_manage | — | — | — | — | ✓ | Toàn sàn; không khóa Owner đang xử lý đơn qua quyền Store |
| user.lock_manage | — | — | — | — | ✓ | Toàn sàn; audit |
| taxonomy.manage | — | — | — | — | ✓ | Category, ProductType, AttributeKey toàn sàn |
| role.permission.manage | — | — | — | — | ✓ | Role hệ thống; có bảo vệ quyền Admin |
| product.moderate | — | — | — | — | ✓ | Ẩn/bỏ ẩn Product, lý do và audit bắt buộc; không đổi sale status |
| review.moderate | — | — | — | — | ✓ | Ẩn/hiện lại Review, lý do và audit bắt buộc |
| report.platform.read | — | — | — | — | ✓ | Toàn sàn |
| ai.monitor.read | — | — | — | — | ✓ | Log đã loại dữ liệu nhạy cảm |

Owner chỉ cấp các permission `product.store.*`, `inventory.store.*`, `order.store.*`, `cod.store.collect` cho Seller; quyền báo cáo, voucher, quản lý nhân viên, khóa Store và Admin không thể được cấp theo lời mời. Trong MVP, role Seller mặc định có bốn nhóm trên; nếu Owner thu hồi một nhóm, quyền bị từ chối ngay cả khi JWT cũ còn hạn.

`UC-ADMIN-RBAC` cho Administrator quản lý định nghĩa Role/Permission hệ thống; `UC-STAFF-PERMISSIONS` cho Owner gán/thu hồi trên membership của Store trong đúng bốn nhóm đã định nghĩa. Owner không sửa Role hệ thống.

Các cột là **vai trò của request**, không phải giới hạn cố định của một User. Cùng User là Seller/Owner có thể gửi request mua hàng với Customer context; lúc đó áp cột C và `customer_user_id = User.id` của chính mình. Quyền Seller/Owner không tự cho phép truy cập giỏ, đơn hoặc đánh giá của người khác. Administrator chỉ dùng chức năng Customer nếu User đó được cấp Customer context riêng, không mặc nhiên do vai trò Admin.

Mọi API chi tiết theo tài nguyên phải kiểm tra `customer_user_id` (luôn là `User.id`) hoặc `store_id` ở backend và trả 404 với tài nguyên ngoài scope để không lộ sự tồn tại. API quản trị dùng 403 khi actor thiếu permission cho thao tác trên nhóm tài nguyên đã biết. Client ẩn chức năng không thay thế kiểm tra backend. Refresh/session bị revoke khi khóa User; backend cũng tra User/Membership status khi xử lý request nhạy cảm.

Audit ghi actor, target, hành động, lý do, thời gian, request ID, trước/sau ở mức không chứa secret cho: cấp quyền, khóa User/Store, duyệt Store, điều chỉnh kho, chuyển trạng thái Order, hủy/Refund, kiểm duyệt Product/Review và voucher. [Test Plan](test-plan.md) có trường hợp truy cập chéo Store/Customer và quyền bị thu hồi.
