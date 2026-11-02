# Nghiệm thu chỉnh giao diện và nút thao tác — 29/10/2026

Đợt chỉnh này xử lý phản hồi giao diện thưa, thiếu nút hành động. Các thay đổi backend/API và dữ liệu có sẵn trong workspace được giữ lại.

## Giao diện và thao tác

- Thay bố cục storefront bằng header có tìm kiếm thực, giỏ hàng, đăng nhập/đăng ký, điều hướng mobile, banner gọn, danh mục, bộ lọc và lựa chọn lưới/danh sách.
- Thẻ sản phẩm có thêm giỏ, chọn phân loại khi cần, yêu thích/bỏ yêu thích và liên kết gian hàng. Trạng thái yêu thích được đọc lại từ server, dùng Query cache chung; không tự ghi nhận giao dịch thành công khi API lỗi.
- Chi tiết sản phẩm có nút tăng/giảm số lượng, thêm giỏ, mua ngay, xem gian hàng và nhắn tin. Mua ngay chỉ chuyển checkout với mã cart item do API trả về. Kết quả thêm giỏ không chắc chắn chặn gửi lại và hướng người dùng kiểm tra giỏ.
- Trung tâm tài khoản có các lối vào hồ sơ, đơn mua, địa chỉ, yêu thích, hội thoại, thông báo, đổi trả, lời mời, mở Store, quyền riêng tư, đổi mật khẩu và portal theo vai trò.
- Lịch sử đơn có các nút dẫn đến hủy, đổi trả và đánh giá theo trạng thái đơn. Các đích đến là form/luồng hiện có.
- Seller dùng bảng sản phẩm, tìm/lọc trên trang, thêm sản phẩm qua dialog, xem chi tiết, chỉnh sửa, xem gian hàng, làm mới và dừng/mở bán. Cập nhật trạng thái gửi expected_version; xung đột yêu cầu đọc lại trước khi thử tiếp.
- Admin có sidebar với icon riêng, chỉ số có nhãn tiếng Việt, nút đi tới quản lý đơn/duyệt Store, lối tắt taxonomy/thuộc tính/kiểm duyệt, bộ lọc đơn trên trang và dialog số tiền/trạng thái đơn từ dữ liệu danh sách.
- Đồng bộ màu xanh, typography, form, bảng, trạng thái nút, dialog và điều hướng tài khoản. Bổ sung favicon P6 và theme color.

## Kiểm tra

- `npm run build` từ root: TypeScript và Vite production build thành công.
- Bộ Playwright đầy đủ sau phần dựng UI/nút mới: **101 passed, 3 skipped** trên 104 test. Các skip gồm live messaging chưa bật cờ test và 2 test chỉ chạy ở fixture mode.
- Sau các sửa cuối về yêu thích tồn tại trên server, nút liên hệ và điều hướng: `test live-market settings messaging customer public-store`: **39 passed, 1 skipped**, gồm test bổ sung đọc lại yêu thích sau reload.
- Các test mới kiểm tra payload thêm giỏ, PUT/DELETE yêu thích, chọn đúng biến thể, chặn gửi lại sau 503, số lượng và cart selection khi mua ngay, version dừng bán/409, lọc và dialog đơn Admin, Guest yêu cầu đăng nhập, tìm kiếm header và focus dialog.
- Kiểm tra render trực tiếp trên API test riêng tại 1440, 768, 390px: 9 route/trạng thái vai trò, **27 tổ hợp**; không tràn ngang, không có alert bất thường, không có pageerror/requestfailed. Console được kiểm tra và lỗi favicon mặc định đã sửa.
- Ảnh và report cục bộ: `artifacts/ui-review/`, `artifacts/ui-review/responsive-report.json`. Script kiểm tra: `artifacts/verify-responsive-ui.mjs`.
- `git diff --check -- frontend`: thành công; chỉ có cảnh báo chuyển CRLF/LF.

## Phạm vi xác minh

Các kiểm thử tương tác dùng HTTP fixture có kiểm tra request/response; nhiều kiểm thử có sẵn chạy đăng nhập và đọc/ghi trên stack test riêng. Bộ kiểm tra ảnh dùng dữ liệu/API thật của `pbl6-fe-verify`, không thay lỗi bằng dữ liệu mẫu. Các sản phẩm seed chưa có ảnh được hiển thị đúng trạng thái thiếu ảnh.

Preview phát triển: `http://127.0.0.1:3109`, proxy tới gateway test riêng `http://127.0.0.1:18080`. Chưa triển khai thay đổi giao diện vào stack dùng chung hay xác minh provider thanh toán/email/hoàn tiền bên ngoài trong đợt chỉnh UI này.
