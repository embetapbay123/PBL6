# Bảo mật, dữ liệu cá nhân và audit — 2.1 Draft

**Phạm vi:** M1–M4, Web/Mobile/Portal, môi trường demo. Đây là yêu cầu thiết kế, chưa xác nhận bằng triển khai. Đối chiếu NFR-SEC-01–10, NFR-PRIV-01/02, NFR-ISO-01, [RBAC](rbac.md), [ERD](data-dictionary.md) và [API](api-spec.md).

## Danh tính và phiên

- M3 lưu password dưới dạng BCrypt hash, không lưu hoặc trả password thuần. Link xác minh email và reset dùng token ngẫu nhiên một lần; database chỉ giữ token hash, mục đích, expiry và thời điểm dùng. Mock mailbox chỉ bật trong demo có kiểm soát; API reset trả thông điệp giống nhau dù email tồn tại hay không.
- Access token JWT có hạn; refresh token quản lý riêng và thu hồi khi logout, reset/đổi mật khẩu theo chính sách phiên, hoặc khóa User. Token xác thực danh tính; quyền Seller/Owner/Admin và `store_id` được kiểm tra lại theo User/StoreMembership hiện hành ở request nhạy cảm. Quyền đã thu hồi không được tiếp tục có hiệu lực chỉ vì JWT còn hạn.
- Login, reset, search và chat chịu rate limit cấu hình; input được validate phía server. Demo dùng HTTPS. Secret chỉ đi qua biến môi trường hoặc secret store của môi trường, không commit hoặc ghi vào log.

## Phân loại và sử dụng dữ liệu

| Dữ liệu | Nơi sở hữu | Cách dùng và giới hạn |
| --- | --- | --- |
| Email, mật khẩu hash, token phiên | M3 | Xác thực; chỉ M3 xử lý token/password; không đẩy vào M4/LLM. |
| Hồ sơ, điện thoại, địa chỉ | M3; snapshot địa chỉ ở M2 Order | Customer xem/sửa của mình; Store chỉ thấy phần cần giao Order thuộc Store. Snapshot Order không đổi khi Address gốc đổi. |
| Order, Payment, Refund | M2 | Customer chỉ xem của mình; Store chỉ xem Order thuộc Store; Admin tra cứu toàn sàn theo quyền. Không ghi thông tin thanh toán nhạy cảm của gateway ngoài dữ liệu sandbox cần đối soát. |
| Chat và hành vi | M4 | Lịch sử Customer chỉ người đó xem; Guest dùng anonymous key theo phiên. Cá nhân hóa chỉ dùng khi có PersonalizationConsent hiệu lực; khi rút consent, ngừng thu thập/sử dụng dữ liệu mới và xử lý dữ liệu cũ theo chính sách demo được ghi khi triển khai. |
| Product/embedding | M1 nguồn; M4 bản chỉ mục | Card chat/gợi ý phải kiểm tra trạng thái bán, kiểm duyệt, Store và giá hiện hành với M1 trước khi phục vụ. |

Không đưa password, JWT, API key, địa chỉ, điện thoại hay dữ liệu cá nhân không cần thiết vào prompt LLM. Prompt và log dùng Product context tối thiểu; nội dung Product từ Store là dữ liệu không tin cậy, không được thực thi như chỉ thị hệ thống. Log kỹ thuật dùng correlation ID và ID nghiệp vụ, khử thông tin nhạy cảm.

## Audit và hiệu lực quyền

Mỗi thao tác khóa/mở User hoặc Store, duyệt/từ chối Store, cấp/thu hồi quyền Seller, quản lý voucher, ẩn/hiện Product/Review, điều chỉnh tồn và chuyển trạng thái/hủy Order cần ghi actor_user_id, hành động, object ID, thời điểm UTC, lý do nếu bắt buộc, trạng thái trước/sau và correlation ID. Audit thuộc service sở hữu đối tượng; không sửa/xóa bản ghi audit qua API nghiệp vụ. Các bảng liên quan được mô tả ở [data dictionary](data-dictionary.md); không dùng audit để thay thế trạng thái hiện hành của entity.

Khóa User chặn request mới của User đó. Khóa Store ngăn bán mới và ẩn Product công khai; Order đã tạo vẫn có thể được Seller/Owner hợp lệ xử lý theo quy tắc vận hành. Khóa Seller membership hoặc thu hồi permission chặn API Store tương ứng từ request tiếp theo. UI ẩn thao tác không có quyền, backend vẫn kiểm tra ownership và version.

## Kiểm chứng bắt buộc

Test hai Customer truy cập chéo Address/Cart/Order/Review/Chat; hai Store truy cập chéo Product/Inventory/Order; Owner cấp quyền Admin/Owner cho Seller; token còn hạn sau khi khóa User/Store/membership; reset token dùng lại/hết hạn; upload sai loại/kích thước; log/prompt chứa secret; Guest/Customer chưa consent và Customer rút consent; audit thiếu lý do hoặc bản ghi. Kết quả chạy nằm trong [Test Plan](test-plan.md), chưa đánh dấu PASS trong tài liệu thiết kế.
