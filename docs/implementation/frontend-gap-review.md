# Rà soát marketplace — 28/10/2026

## Đã triển khai trong workspace

- Storefront mới, gian hàng công khai, yêu thích, sản phẩm đã xem; route Customer/Seller tải theo nhu cầu. API lỗi không tự chuyển sang fixture.
- Seller đọc sản phẩm nháp/ẩn, tạo/sửa thuộc tính, biến thể, SKU, giá, ảnh, thứ tự ảnh; taxonomy trả code và form tải đủ các trang dữ liệu. Ghi theo version, giữ nội dung khi xung đột, xử lý riêng lỗi ảnh sau khi Product được tạo.
- Chat người mua–Store lưu database, phân quyền participant/membership, chống gửi trùng theo client_message_id, retry giữ nguyên nội dung và mã. Giao diện Customer/Seller polling.
- Thông báo đơn hàng, sự kiện thanh toán và đổi trả dựa trên lịch sử thật; read marker riêng cho từng Customer.
- Yêu cầu đổi trả toàn Order, quyết định Store/Admin, nhận hàng trả, gửi và xác nhận hàng đổi. Chặn hoàn tất refund khi thiếu bằng chứng đủ tiền.
- Review sau mua đã thay 501 bằng handler thật; M2 xác minh quyền sở hữu và Order COMPLETED. Chỉnh sửa giữ quyết định kiểm duyệt, Admin đọc danh sách và cập nhật theo version.
- Admin chọn định nghĩa thuộc tính/sản phẩm/đánh giá từ dữ liệu API. Bỏ ẩn Product không chuyển trạng thái bán.

## Chưa đủ bằng chứng hoàn thành toàn bộ kế hoạch

- Hoàn online sau giao hàng đã có hàng đợi và đối soát chứng từ; provider chuyển tiền thật và hoàn COD chưa có adapter tài chính; chưa có bằng chứng provider hoàn tiền thật. Không thay bằng trạng thái thành công giả.
- Email, thanh toán online và AI cần nghiệm thu riêng với provider test và cấu hình ngoài. SMTP peer nội bộ, fixture browser và payment provider disabled không thay cho nghiệm thu đó.
- Phải tiếp tục rà soát các màn còn lại và kiểm tra thiết kế, bàn phím, responsive, mất mạng và retry toàn bộ Customer/Seller/Admin; một bộ test đã qua không chứng minh mọi màn đều hoàn thiện.
- Nhật ký metadata của M1/M2/M3 đã có API, phân trang và lọc theo hành động/loại đối tượng. Tài liệu endpoint trạng thái cũ có mốc lịch sử, không dùng làm bằng chứng handler còn stub.

## Bằng chứng và quy tắc

Xem [frontend-verification-handoff.md](frontend-verification-handoff.md) để biết test nào chạy với database, test nào dùng fixture và giới hạn triển khai. Contract/types/runtime được sinh lại đồng bộ. Chưa triển khai lên môi trường dùng chung, chưa commit thay đổi của người dùng.
