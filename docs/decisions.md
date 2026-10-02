# Decision log 2.1 Draft

Các quyết định dưới đây được ghi từ trao đổi về kế hoạch 2.0. `Confirmed` nghĩa là lựa chọn phạm vi đã được người dùng xác nhận; `Design default` là giá trị/cách triển khai cụ thể hóa kế hoạch, có thể thay đổi bằng quyết định mới trước khi Approved.

| ID | Trạng thái | Quyết định | Hệ quả |
| --- | --- | --- | --- |
| ADR-01 | Superseded by ADR-23 | Một checkout nhiều Store, một Order/Store. | Giữ ý một Order/Store; bỏ CheckoutSession và PaymentAllocation. |
| ADR-02 | Confirmed | Bốn service độc lập, mỗi service sở hữu dữ liệu. | Không có FK xuyên DB; cần API/event và idempotency. |
| ADR-03 | Superseded by ADR-23 | Một phương thức cho toàn checkout; có sandbox và COD. | Payment nay riêng từng Order; phương thức có thể khác giữa các Store. |
| ADR-04 | Confirmed, expanded | Hủy từng Order AWAITING_PAYMENT/PENDING/CONFIRMED; trả trước hoàn mock. | Chưa trả thì release tồn; đã trả thì Refund riêng, không sửa Order khác. |
| ADR-05 | Confirmed | Voucher Store và toàn sàn được cộng dồn. | Áp Store trước, toàn sàn sau; phân bổ xuống Order. |
| ADR-06 | Confirmed | Customer đánh giá sau mua. | Review theo OrderItem Completed. |
| ADR-07 | Confirmed | Một User có thể mua và làm Owner/Seller; tối đa một Store membership active. | Auth context không còn một role cố định. |
| ADR-08 | Confirmed | Customer đăng ký mở Store; Admin duyệt/từ chối. | StoreApplication và approval flow. |
| ADR-09 | Confirmed | PlantUML cho Use Case, Mermaid cho ERD, có đặc tả và bảng quan hệ. | Sơ đồ lưu mã chỉnh sửa được. |
| ADR-10 | Design default | Phí giao hàng cố định theo Store; không có voucher khác, COD/ship mock. | Tổng tiền VND tính theo BR-31. |
| ADR-11 | Design default | Reservation 15 phút, idempotency key ≥24 giờ, cảnh báo recovery sau 5 lần. | Cấu hình env, test timeout/callback muộn. |
| ADR-12 | Design default | Một Review/OrderItem, rating 1–5; chưa có media hoặc Seller reply. | Review eligibility qua M2. |
| ADR-13 | Design default | SKU duy nhất trong Store, Variant mặc định khi không có lựa chọn. | Cart/Inventory luôn dùng Variant. |
| ADR-14 | Design default | Model recommendation CF/MF đánh giá K=10 với split thời gian và baseline. | Báo cáo kết quả chưa thực thi, không đánh dấu đạt giả. |
| ADR-15 | Updated by ADR-23 | Payment COD giữ `payable_vnd` gốc và `collectible_vnd` còn phải thu của chính Order. | Hủy Order trước thu làm Payment riêng CANCELLED, không sửa snapshot. |
| ADR-16 | Superseded by ADR-23 | Callback Success muộn sau khi release từng hoàn toàn checkout. | Nay Order đã tồn tại ở EXPIRED; Refund gắn đúng Payment và Order đó. |
| ADR-17 | Design default | Seller/Owner xác nhận giao để hoàn tất Order sandbox; COD hoàn tất sau xác nhận giao và thu đủ từng Order. | Không có Customer xác nhận nhận hàng hoặc tự hoàn tất theo thời gian trong MVP; Review chỉ sau Completed. |
| ADR-18 | Design default | Guest là trạng thái trước đăng nhập cho mọi tài khoản; Customer/Seller/Admin dùng chung đăng xuất, đổi mật khẩu và hồ sơ. | Quên mật khẩu và đổi mật khẩu là hai Use Case/API khác nhau; một User có thể đóng nhiều actor theo request. |
| ADR-19 | Design default | Seller/Owner dùng Customer context để mua hàng; MVP không cấm mua Product của Store mình. | Checkout/Order vẫn kiểm tra quyền Customer, không dùng quyền Store để vượt scope. |
| ADR-20 | Design default | Admin ẩn và bỏ ẩn Product/Review hai chiều, có lý do và audit. | Product giữ riêng `status` bán DRAFT/ACTIVE/STOPPED và `moderation_status` VISIBLE/HIDDEN; bỏ ẩn không tự đăng bán. |
| ADR-21 | Design default | Demo xác minh email đăng ký, reset và lời mời dùng mock mailbox cục bộ; lời mời có inbox của User theo email đã xác minh và Owner được thu hồi trước khi nhận. | Chưa có email production; token không xuất hiện trong response/log; lời mời hết hạn không cấp quyền. |
| ADR-22 | Known MVP limitation | Seller/Owner tự xác nhận giao thành công để hoàn tất sandbox; Customer chưa có xác nhận nhận hàng hoặc quy trình khiếu nại. | Seller kiểm soát thời điểm Review mở vì Review cần Order Completed; phải ghi rõ khi demo và cân nhắc quy trình đối chứng ở phiên bản sau. |
| ADR-23 | Confirmed 29/09/2026 | Tạo nguyên tập một Order/Store trước thanh toán; Customer chọn SANDBOX/COD và trả riêng từng Order. Không lưu Purchase/Checkout như entity nghiệp vụ. | purchase_group_id chỉ liên kết Order; Payment unique Order; sandbox chưa trả giữ tồn có hạn; IdempotencyRecord kỹ thuật có TTL; voucher sàn phân bổ snapshot xuống Order. |

**Đợt tài liệu 2.1:** SRS, đặc tả UC, hình nhúng, OpenAPI, security/privacy, AI evaluation và test/triển khai được mở rộng để dễ đọc khi nộp báo cáo. Đây là chỉnh sửa cách diễn đạt và contract thiết kế theo ADR-23, **không phải quyết định đổi nghiệp vụ**. Mọi quyết định nghiệp vụ mới phát hiện khi review phải có ADR riêng trước khi sửa baseline.

**Chưa có bằng chứng ngoài bộ tài liệu:** Đề Cương.docx, code thực tế, ERD/API cũ hoặc kết quả kiểm thử. Khi các nguồn này được cung cấp, đối chiếu và bổ sung ADR nếu phát hiện khác biệt; không tự sửa quyết định đã Confirmed bằng suy đoán.
