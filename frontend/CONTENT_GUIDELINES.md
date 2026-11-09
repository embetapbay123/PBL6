# Chữ trên giao diện

Mục tiêu: nhìn được trạng thái, dữ liệu cần thiết và việc cần làm mà không phải đọc hướng dẫn dài.

- Mỗi thông báo chỉ nên có một ý. Ưu tiên nút một hoặc hai từ như **Lưu**, **Làm mới**, **Hủy đơn**. Chỉ thêm từ khi cần phân biệt hành động.
- Mỗi trạng thái giải thích một lần trong cùng màn hình. Không lặp lại nội dung badge, tiêu đề hoặc nút bằng đoạn văn bên dưới.
- Chỉ dẫn chung, định nghĩa, lịch sử và chính sách dài đặt trong `details` có nhãn cụ thể. Không tự mở toàn bộ nội dung phụ.
- Giữ tiền, số lượng, tình trạng thanh toán, phí, hạn đổi trả và cảnh báo cần hành động ở đúng bước. Cảnh báo chưa rõ kết quả phải nói rõ có được gửi hoặc trả tiền lại hay không.
- Loại bỏ từ kỹ thuật khỏi luồng thông thường: API, snapshot, consume, operation ID, version. Mã kỹ thuật đầy đủ chỉ hiện trong thông tin hỗ trợ khi cần.
- Thiếu dữ liệu hoặc lỗi cần nêu vấn đề và cách xử lý. Không thay lỗi bằng thông báo thành công hoặc lời hứa chưa có căn cứ.
- Giữ nhãn trường, tên truy cập cho nút và thông báo lỗi. Không rút gọn bằng cách giấu chữ bằng CSS, cắt mất nội dung hoặc chỉ dùng tooltip cho thông tin bắt buộc.
- Chỉ dùng một phần hướng dẫn mở rộng cho cùng một chủ đề; tránh nhiều lớp `details` lồng nhau.

Khi rà một màn hình, kiểm tra theo thứ tự: bỏ câu lặp → rút câu còn một ý → chuyển phần tham khảo vào chi tiết → kiểm tra desktop/mobile và thao tác chính.
