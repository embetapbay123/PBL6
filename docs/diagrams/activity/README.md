# Hướng dẫn đọc activity diagram PBL6

Hai activity diagram trong thư mục này là **bản dễ đọc ở mức nghiệp vụ**: cho thấy câu chuyện và chỗ phải ra quyết định, không yêu cầu người đọc hiểu API hay database. Mỗi trang hiển thị hình ngay đầu, tiếp theo là phần **Hiểu nhanh**; [bản activity kỹ thuật](../technical/activity/) dành cho nhóm triển khai. Mũi tên đi theo trình tự; hình thoi `if` chọn một nhánh.

| Sơ đồ | Nội dung |
| --- | --- |
| [01 — Xác nhận giỏ](01-checkout.md) | Tính quote, reserve toàn bộ, tạo Order và xử lý COD/sandbox riêng |
| [02 — Hủy Order](02-cancel-order.md) | Kiểm quyền/trạng thái, release hoặc restock, Refund hoặc hủy nghĩa vụ COD |

Các trang giải thích dùng thuật ngữ trong [Business Rules](../../business-rules.md). Nếu cần thứ tự gọi giữa M1/M2/M3/gateway, đọc [sequence diagram](../sequence/README.md); nếu cần bảng entity, đọc [ERD](../erd/README.md).
