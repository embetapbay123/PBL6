# Kiểm tra trước commit/push — 14/11/2026

Phạm vi: các thay đổi được stage trên `codex/live-ui-search-api`, cùng hai commit đang có ở local nhưng chưa push. Kiểm tra bí mật là kiểm tra mẫu và giá trị đã biết, không phải chứng nhận không có mọi lỗ hổng.

## Kết quả và xử lý

- Không phát hiện key OpenAI, token GitHub/AWS/Slack/JWT thật hay giá trị trùng 22 secret đọc trong bộ nhớ từ `.env` riêng trong phần stage. Scanner chỉ ghi tên file/loại lỗi, không ghi giá trị bí mật; có kiểm tra XML bên trong DOCX/XLSX/PPTX.
- Kiểm tra hai commit chưa push chỉ gặp credential giả trong test và khóa TLS cố định của SMTP unit test. Khóa test này không dùng cho triển khai.
- Bỏ mật khẩu SSH mặc định trong các công cụ triển khai/nghiệm thu. Đọc credential từ môi trường hoặc dùng SSH key/agent khi công cụ hỗ trợ. Askpass mới đọc biến môi trường của tiến trình, không ghi password vào file lệnh; helper deploy cũ dùng thư mục tạm riêng.
- `.gitignore` và `.dockerignore` loại `.local`, dữ liệu phục hồi ACL, outputs, bằng chứng kiểm thử thô và cấu hình test riêng. Các helper quản trị ad-hoc được giữ local. `.env` và `infrastructure/secrets` vẫn bị loại.
- Bỏ câu log raw exception được thêm trong quá trình debug; raw error có thể chứa tham số truy vấn/thông tin nhạy cảm.
- Mở rộng `scan_git_candidate.py` để bắt token phổ biến và kiểm tra Office XML; ba test scanner qua. Không OCR ảnh nhúng hoặc quét lịch sử toàn bộ các nhánh đã tồn tại trên remote.

## Phần ví chưa được đưa vào commit

Giữ nguyên WIP ở working tree; không stage migration/controller/service ví hoặc tích hợp ví trong thanh toán/callback/hoàn tiền/điều hướng. Hai file CheckoutPage và LiveApp được stage chọn lọc: giữ sửa voucher/sidebar đã nghiệm thu, không mang các phần ví theo.

Các rủi ro đọc từ code ví cần xử lý trước khi phát hành:

1. Rút tiền đánh dấu COMPLETED và trừ số dư khi chưa có giao dịch chuyển tiền tương ứng.
2. Xác nhận đã hoàn COD bên ngoài còn cộng thêm vào số dư ví, có thể tạo hai quyền lợi cho một khoản hoàn.
3. Thanh toán ví chưa đối chiếu đầy đủ trạng thái/vòng đời đơn và ghi trạng thái chuẩn bị trước khi hoàn tất luồng tồn kho.

Các phát hiện này không chứng minh một giao dịch khai thác đã xảy ra. Không chạy chức năng ví, đổi dữ liệu tiền hay rollout M2 trong đợt kiểm tra Git này. Cần dùng bản đã commit làm nguồn phát hành để tránh vô tình đóng gói WIP đang giữ local.

## Kiểm tra bản sắp push

Bản kiểm tra được xuất từ **Git index** sang thư mục local riêng, không build nhầm với WIP ví:

- Build frontend và backend: qua.
- OpenAPI validation và contract drift: qua, 197 public + 15 internal operations.
- Backend Node: 57 suite / 433 test qua. Đã cập nhật assertion đếm operation cũ sau khi bổ sung API.
- Trình duyệt trên bundle production: 43 test qua cho giỏ, chat, sort/gợi ý và thử đồ AI. Lượt dev server trước đó có ba lỗi assertion do StrictMode; cùng ba ca và cả bộ 43 ca sau đó qua trên production preview.
- M4 Python: 157 test qua, 60 test cần PostgreSQL/Redis được skip vì máy này chưa cấu hình các dịch vụ test. Đã bổ sung điều kiện skip có lý do cho hai ca trước đó lỗi do thiếu biến môi trường; chúng vẫn chạy khi có dịch vụ test. Không thay kết quả này bằng tuyên bố đã chạy integration DB.
- Catalog/seed: 6 test qua; cài đặt edge guard: 2 test qua; scanner: 3 test qua.
- PowerShell parse và staged whitespace check: qua.

Không gọi model trả phí, thanh toán hoặc gửi tin nhắn tới người khác. Key từng chia sẻ trong hội thoại nên được thu hồi/đổi. Nếu máy chủ vẫn dùng mật khẩu SSH mặc định cũ thì cần đổi mật khẩu hoặc chuyển sang SSH key; xóa mặc định khỏi code không xóa credential khỏi lịch sử Git đã có.
