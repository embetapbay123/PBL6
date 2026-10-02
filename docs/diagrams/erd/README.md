# Hướng dẫn đọc ERD PBL6

Mỗi sơ đồ có một trang giải thích riêng, **hình SVG nhúng ngay đầu trang**, bảng ý nghĩa/tác dụng của từng entity, cách đọc quan hệ và ví dụ nghiệp vụ. Đọc [tổng quan](00-overview.md) trước để thấy ranh giới M1–M4, sau đó mở miền dữ liệu cần tìm. Tên entity và cột giữ nguyên theo thiết kế database; nhãn quan hệ trên hình là tiếng Việt.

| Sơ đồ | Nội dung |
| --- | --- |
| [00 — Tổng quan](00-overview.md) | Quan hệ chính giữa User, Store, Product, Order, Payment và AI |
| [01 — Tài khoản và quyền](01-identity-access.md) | Đăng nhập, địa chỉ, vai trò, token một lần, audit M3 |
| [02 — Store và thành viên](02-store-membership.md) | Đơn mở Store, Owner/Seller, lời mời và quyền nhân viên |
| [03 — Catalog và đánh giá](03-catalog-review.md) | Loại sản phẩm, thuộc tính, SKU, ảnh, Review |
| [04 — Tồn kho](04-inventory.md) | Tồn vật lý, phần giữ, reservation và biến động |
| [05 — Giỏ và xác nhận mua](05-cart-checkout.md) | Giỏ, item và bản ghi chống gửi lặp; không có bảng Checkout |
| [06 — Đơn và giao hàng](06-order-shipping.md) | Order theo Store, snapshot, lịch sử trạng thái, Shipment |
| [07 — Thanh toán và voucher](07-payment-voucher.md) | Payment riêng Order, Attempt, Refund, COD và voucher |
| [08 — AI](08-ai.md) | Hội thoại, hành vi, consent, embedding và đánh giá model |

Trong Mermaid, `||` nghĩa là đúng một, `o|` là không hoặc một, `o{` là không hoặc nhiều, `|{` là một hoặc nhiều. **Nét liền** (`--`) thể hiện quan hệ vật lý trong cùng database; **nét chấm** (`..`) thể hiện tham chiếu logic sang service khác, không tạo khóa ngoại xuyên database. `PK` là khóa chính, `FK` là khóa ngoại nội bộ. Một số ID tham chiếu logic không mang nhãn `FK` trong hình; xem [từ điển dữ liệu](../../data-dictionary.md) để biết service sở hữu và ràng buộc đầy đủ.

Đây là sơ đồ **thiết kế 2.1 Draft**, chưa phải schema đã migration. Khi sửa entity hoặc quan hệ, cập nhật cả mã `.mmd`, SVG, trang giải thích tương ứng, [từ điển dữ liệu](../../data-dictionary.md) và contract liên quan.
