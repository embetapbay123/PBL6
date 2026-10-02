# ERD 01 — Tài khoản và quyền (M3)

![ERD 01-identity-access](01-identity-access.svg)


[Xem mã sơ đồ](01-identity-access.mmd) · [Mục lục ERD](README.md) · [Từ điển dữ liệu](../../data-dictionary.md)

M3 quản lý danh tính và quyền toàn hệ thống. `User` là gốc; `CustomerProfile` chỉ tồn tại khi cần hồ sơ mua hàng, nên một User có **0 hoặc 1** hồ sơ này. `Address.customer_user_id` trỏ thẳng `User.id`, không trỏ `CustomerProfile.id`. Một User có thể lưu nhiều địa chỉ.

## Ý nghĩa từng entity

| Entity | Là gì | Dùng để làm gì |
| --- | --- | --- |
| `User` | Tài khoản đăng nhập và trạng thái hiệu lực. | Xác thực, khóa tài khoản và làm ID người dùng chung cho các service. |
| `CustomerProfile` | Hồ sơ mua hàng tùy chọn của User. | Lưu tên hiển thị, số điện thoại; không thay thế User làm ID Customer. |
| `Address` | Địa chỉ nhận hàng Customer lưu. | Cho chọn địa chỉ khi mua; Order sẽ chụp bản sao để giữ lịch sử. |
| `Role` | Nhóm quyền cấp hệ thống. | Phân biệt quyền Customer, Administrator và các quyền chung. |
| `Permission` | Một thao tác được phép. | Là đơn vị kiểm tra quyền, ví dụ đọc hay chỉnh tài nguyên. |
| `UserRole` | Bảng nối User với Role. | Cho một User mang nhiều vai trò đồng thời. |
| `RolePermission` | Bảng nối Role với Permission. | Quy định mỗi Role được thực hiện những thao tác nào. |
| `RefreshSession` | Phiên làm mới đăng nhập. | Duy trì đăng nhập và thu hồi phiên khi logout/khóa/đổi mật khẩu. |
| `OneTimeToken` | Mã một lần đã băm, có hạn. | Xác minh email hoặc đặt lại mật khẩu mà không lưu token thô. |
| `M3Audit` | Nhật ký thay đổi nhạy cảm của M3. | Truy nguyên ai khóa User/Store, duyệt Store hoặc đổi quyền, vào request nào. |

## Đọc quan hệ và luồng

| Nhóm entity | Ý nghĩa và quan hệ |
| --- | --- |
| `User`, `RefreshSession` | Một User mở nhiều phiên refresh. Token phiên chỉ lưu dạng hash; khóa User hoặc thu hồi phiên làm token cũ không còn hiệu lực. |
| `OneTimeToken` | Một User có thể yêu cầu nhiều mã xác minh email/đặt lại mật khẩu theo thời gian. Mỗi mã có `purpose`, `expires_at`, `consumed_at`; chỉ lưu hash. |
| `Role`, `Permission`, `UserRole`, `RolePermission` | Hai bảng nối biểu diễn quan hệ nhiều–nhiều: User có nhiều Role và một Role có nhiều Permission. Quyền Store cụ thể nằm ở [ERD 02](02-store-membership.md). |
| `M3Audit` | Ghi actor, đối tượng, hành động, lý do, request ID và thay đổi trước/sau cho khóa tài khoản, Store, duyệt đơn và phân quyền. `target_type`/`target_id` là tham chiếu đa loại nên không vẽ FK tới mọi bảng. |

**Ví dụ:** Guest đăng ký → tạo User → cấp mã `EMAIL_VERIFY` → người dùng mở link → đánh dấu mã đã dùng và `email_verified_at`. Khi quên mật khẩu, tạo mã `PASSWORD_RESET` khác; xác nhận thành công đổi hash và thu hồi phiên cũ. Mock mailbox là dịch vụ demo bên ngoài ERD; database chỉ giữ hash và trạng thái mã.

Một User có thể vừa mua hàng vừa là Seller/Owner. Vì vậy JWT không được hiểu là “chỉ một role”; backend kiểm tra Role, trạng thái User và [StoreMembership](02-store-membership.md) tại request có quyền nhạy cảm. Các entity M2 dùng tên `customer_user_id` để chỉ `User.id` của sơ đồ này; đó là **tham chiếu logic**, không có FK xuyên service.
