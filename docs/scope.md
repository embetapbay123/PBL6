# Phạm vi và thuật ngữ — 2.1 Draft

**Trạng thái:** Draft, cập nhật 29/09/2026. Các quyết định trong bảng dưới là chỉ đạo đã chốt cho bản thiết kế này; các con số vận hành là mặc định thiết kế có thể cấu hình. [Nguồn cũ](legacy/srs.md) chỉ để truy vết.

| Chủ đề | Quyết định MVP |
| --- | --- |
| Marketplace | Nhiều Store hoạt động; một Customer mua từ nhiều Store trong một checkout; một Order cho mỗi Store. |
| Xác nhận giỏ và thanh toán | Một địa chỉ cho lần xác nhận; chọn SANDBOX/COD theo Store, tạo một Order/Store trước thanh toán; mỗi Order có Payment và hạn trả riêng. |
| Voucher | Một voucher toàn sàn mỗi checkout và tối đa một voucher mỗi Store; cộng dồn, áp Store trước rồi toàn sàn. |
| Sau mua | Theo dõi và hủy riêng từng Order ở Pending/Confirmed; trả trước có Refund mock; COD bỏ nghĩa vụ thu. |
| Tài khoản | Một User có thể vừa là Customer vừa là Seller/Owner. Chỉ một Store membership đang hoạt động của User trong MVP. |
| Store | Customer nộp đơn mở Store, Administrator duyệt/từ chối. Mỗi Store có đúng một Owner đang hoạt động. |
| Sản phẩm | Catalog đa loại, thuộc tính động, Variant/SKU, tồn kho theo Variant, ảnh, đánh giá sau mua. |
| AI | RAG grounded từ Product còn hiển thị; recommendation baseline Content/Behavioral và model CF/MF huấn luyện offline. |
| Nền tảng | Client Web và Flutter/Android cho Customer; Management Portal cho Owner/Seller/Admin theo quyền. |
| Kiến trúc | M1 Catalog & Inventory; M2 Order & Payment; M3 Identity & Store; M4 AI. Bốn service độc lập, sở hữu DB riêng. |

**Ngoài phạm vi:** commission, payout, settlement, wallet, tranh chấp/đổi trả sau Processing, hãng vận chuyển và cổng thanh toán production, COD do Shipper thật thu, huấn luyện LLM, Mobile quản trị, voucher dùng nhiều mã cùng phạm vi, ảnh/video review. Promotion trong tài liệu nguồn được hiện thực bằng Voucher của MVP; không có chương trình khuyến mãi khác.

## Thuật ngữ

| Tên thống nhất | Nghĩa |
| --- | --- |
| User | Danh tính đăng nhập duy nhất; có thể có nhiều vai trò/ngữ cảnh. |
| Guest / Visitor | Guest là trạng thái chưa đăng nhập để đăng ký, đăng nhập, quên mật khẩu. Visitor là actor trừu tượng của chức năng công khai mà Guest và Customer cùng dùng. |
| Authenticated User | Actor trừu tượng của đăng xuất, đổi mật khẩu và hồ sơ cá nhân sau đăng nhập; Customer, Seller và Administrator kế thừa, Owner kế thừa qua Seller. |
| Customer | Vai trò mua hàng và sở hữu địa chỉ, giỏ, đơn, đánh giá. |
| Seller | Nhân viên vận hành một Store; không xem báo cáo doanh thu tổng hoặc quản lý voucher. |
| Store Owner | Chủ một Store; có quyền Seller và quyền nhân viên, voucher, báo cáo Store. |
| Administrator | Vai trò toàn sàn; không mặc nhiên là Owner của Store. |
| StoreMembership | Quan hệ User–Store với vai trò Owner hoặc Seller, trạng thái và quyền hiệu lực. |
| Checkout | Quy trình báo giá và xác nhận CartItem; không phải thực thể nghiệp vụ lưu lâu dài. |
| purchase_group_id | UUID chung trên các Order tạo trong một lần xác nhận giỏ; không có bảng Purchase/Checkout. |
| Order | Phần mua hàng thuộc đúng một Store; giữ snapshot, Payment và trạng thái riêng. |
| Payment | Nghĩa vụ tiền riêng của một Order; sandbox trả qua gateway, COD thu khi giao Order đó. |
| IdempotencyRecord | Bản ghi kỹ thuật có TTL để request tạo Order bị retry không tạo trùng. |
| Reservation | Lượng Variant bị giữ để ngăn bán quá tồn trước khi checkout kết thúc. |
| Voucher | Mã giảm tiền hàng của một Store hoặc toàn sàn. |
| Refund | Khoản hoàn tiền mock của Order trả trước đã hủy, trạng thái độc lập với Order. |
| Review | Đánh giá gắn đúng một OrderItem đã Completed; có thể ẩn bởi Admin. |

Tên role dùng trong API và sơ đồ là `GUEST`, `CUSTOMER`, `SELLER`, `STORE_OWNER`, `ADMIN`. Một User có thể có CUSTOMER cùng SELLER hoặc STORE_OWNER. Quyền hiệu lực được xác định từ membership đang hoạt động tại request, không suy ra chỉ từ vai trò cũ trong JWT. `store_id` do server xác nhận, không tin giá trị do client gửi.

Seller/Owner có thể dùng Customer context để mua hàng như các Customer khác; việc cùng User mang nhiều actor không phải quan hệ kế thừa Seller → Customer. Việc mua Product của chính Store chưa bị cấm trong MVP, nhưng không tạo quyền đọc/sửa Order ngoài quy tắc Customer/Store hiện hành. Seller chỉ được Owner cấp/thu hồi quyền trong bốn nhóm vận hành đã ghi ở [RBAC](rbac.md); quyền Owner/Admin và voucher/báo cáo Store không thể cấp qua lời mời.

Mọi số tiền lưu dạng số nguyên VND; không dùng số thực. Mốc thời gian lưu UTC, hiển thị theo Asia/Bangkok trong demo. Phí giao hàng cố định theo Store, cấu hình không âm; mặc định khi chưa cấu hình là 0 VND. Reservation 15 phút và idempotency key ít nhất 24 giờ là mặc định cấu hình, phải lưu trong môi trường triển khai.

## Trật tự tài liệu

[Yêu cầu](functional-requirements.md) là danh mục FR/NFR chi tiết. [Quy tắc](business-rules.md) chốt hành vi và bất biến. [Use Case](use-cases.md), [ERD/từ điển dữ liệu](data-dictionary.md), [API](api-spec.md) và [kiểm thử](test-plan.md) đều dẫn chiếu mã yêu cầu; khi có mâu thuẫn phải ghi trong [decision log](decisions.md) trước khi đổi baseline.
