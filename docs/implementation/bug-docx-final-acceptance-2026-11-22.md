# Nghiệm thu bug.docx trên Debian2

Cập nhật 22/11/2026. Website: https://demo.congnguyen.me. Phạm vi là 33 nhóm trong [plan](bug-docx-remaining-fix-plan-2026-11-14.md), không phải chứng nhận toàn bộ WIP ví/thanh toán của nền máy mới.

## Cách đọc bằng chứng

- **UI42:** `final-regression-passed.log`, 42 ca qua trên production preview của release giữ WIP hiện hành; bao gồm giỏ, bộ lọc, tài khoản, auth, sort và CMS. Các fixture API kiểm tra tương tác/hiển thị, không thay cho giao dịch BE.
- **Tabs12:** `returns-tabs-ui.log`, 12 ca qua sau sửa B33; có đo font, khoảng đệm, viền, bo góc và chiều cao link/nút ở 320/1366 px.
- **Boundary8:** `ui-boundaries-final-passed/results.json`, tám nhóm kiểm tra giao diện còn lại trên bundle hiện hành, gồm ảnh render 390 px; tất cả API được intercept, không ghi lên server.
- **Public:** API/UI thật không intercept, dùng danh tính/shop/catalog riêng. `voucher-public`, `search-public`, `store-media-public-retry`, `ai-media-public`, `ai-video-public`, `final-public-recheck`, `final-public-tabs`. Bằng chứng CMS riêng ở `bug-storefront-phase5-2026-11-21`.
- Các đường dẫn evidence trên nằm dưới `C:/PBL6/outputs/bug-debian2-reconciliation-2026-11-22/` nếu không ghi thư mục khác. Không đưa credential, DB dump, ảnh upload riêng hay evidence này vào Git.

## Đối chiếu 33 nhóm

| Nhóm | Kết quả trong phạm vi yêu cầu | Bằng chứng chính |
|---|---|---|
| B01 Voucher tốt nhất | Đạt | 28 PostgreSQL voucher; Public optimum trên 23 mã, mã Store ngoài trang đầu, UI chọn/bỏ/đổi; COD khớp quote 190.000 đ. |
| B02 Giỏ gọn, CTA và tiền | Đạt | UI42 cart-usability; Boundary8 giỏ ở max tồn, tổng 300.000 đ. |
| B03 Đổi phân loại dưới tên | Đạt | UI42/Tabs12: bàn phím, Escape trả focus, giữ số lượng, lỗi và mất ACK. |
| B04 Hover thêm giỏ | Đạt | Boundary8 đo computed background sang rgb(194,65,12). |
| B05 Bộ lọc giá | Đạt | UI42 customer-polish: Max/Áp dụng, lọc mobile và URL. |
| B06 Focus search | Đạt | UI42 đo outline input/khung search. |
| B07 Cuộn bộ lọc và chữ phụ | Đạt | UI42: viewport thấp vẫn focus/cuộn tới bộ lọc cuối; không còn link/chú thích cũ. |
| B08 Bỏ câu tự cập nhật thông báo | Đạt | Boundary8: không có câu cũ; đọc tất cả đổi trạng thái qua một request fixture. |
| B09 Thanh phụ chỉ Home | Đạt theo phương án plan | UI42 điều hướng; Home giữ thanh phụ, các route khác không tự lặp; menu mobile chủ động vẫn dùng được. |
| B10 Media, tìm và xóa chat | Đạt | Public 25 hội thoại/25 phiên; Store gửi ảnh/video thật và kiểm quyền; OpenAI đọc pixels/8 frame, xóa thu hồi tệp và giữ sổ phí. |
| B11 Mở rộng/thu nhỏ/đóng chat | Đạt | Bộ chat UI 44 ca trên release hiện hành có launcher/media/search; public phát video ở 390 px. |
| B12 Bỏ khối mở Store cũ | Đạt | Boundary8: form nhập được; trạng thái PENDING hiển thị ngắn, không có khối “Theo dõi hồ sơ và tiếp tục”. Không gửi hồ sơ thật trong ca này. |
| B13 Các link dưới đổi mật khẩu | Đạt | Boundary8 không lặp link auth; UI42 gửi current/new password và thu hồi phiên qua fixture. |
| B14 Card đơn | Đạt | UI42/Tabs12: số lượng x2 cạnh giá, tổng 2 đơn vị, không milestone lặp. |
| B15 Mục tài khoản/đổi trả | Đạt | UI42: tác vụ phụ trong details, menu bàn phím/Escape; không mất đường truy cập. |
| B16 Sổ địa chỉ | Đạt | UI42/Tabs12: địa chỉ dài và nút tại 320/390/768/1366 px. |
| B17 Sidebar đổi mật khẩu | Đạt | Boundary8: trang đổi mật khẩu có sidebar tài khoản ở desktop. |
| B18 Tiêu đề menu tài khoản | Đạt | UI42 account shortcuts/menu, bỏ heading lặp. |
| B19 Khóa cộng khi max tồn | Đạt | Boundary8 khóa ở 3, mở khi tồn 4; Public chặn quote cũ và chỉ một khách mua được món cuối. |
| B20 Báo hàng ít | Đạt, ngưỡng 1–3 | Boundary8 có “Chỉ còn 3”, không có ở tồn 4. |
| B21 Thành tiền dự tính | Đạt | UI42 + Boundary8 tổng chọn đúng, tiền hàng không giả gồm phí giao; Public COD/quote khớp. |
| B22 Chi tiết sản phẩm/số lượng | Đạt | Boundary8 border/điều khiển, khóa cộng và Mua ngay khi vượt tồn, cảnh báo rõ. |
| B23 Bỏ form đánh giá dài dưới sản phẩm | Đạt | Boundary8 không có textbox/Mục đơn hàng ở reviews sản phẩm; mở form từ đúng mục đơn đã mua, nội dung dài không đẩy mất nút. Không tạo review thật trong ca này. |
| B24 Bỏ link Giỏ hàng cuối trang | Đạt | Source đã bỏ; UI42/Boundary8 sản phẩm không lặp đường dẫn cũ. |
| B25 Ẩn SKU với Customer | Đạt | Boundary8 không hiện SKU nội bộ ở giỏ và chi tiết; vẫn có tên phân loại. |
| B26 Khối đếm sản phẩm | Đạt | UI42: trang mặc định gọn, số kết quả khi lọc còn hiển thị. |
| B27 Tên sort mặc định | Đạt | UI42 discovery/catalog-state, nhãn Mặc định và URL/history ổn định. |
| B28 CMS gian hàng và sort | Đạt | CMS 11 PostgreSQL/FFmpeg, 12 UI, 4 nhóm Public, hai shop × layout/link; Public sort toàn bộ 25 sản phẩm qua hai trang và reload. |
| B29 Thanh phụ/Tin nhắn | Đạt theo phương án B09 | Giữ chat ở header/dock/tài khoản, không lặp mục Tin nhắn trên thanh phụ Home. Đây là phương án plan, không ghi thành một xác nhận riêng của người dùng. |
| B30 Bố cục thông báo | Đạt | Boundary8 và ảnh mobile: nội dung còn đủ rộng, CTA xuống hàng, outline và nền phân biệt đọc/chưa đọc; không tràn trang. |
| B31 Menu đơn bị tràn | Đạt bằng luồng thay thế | Boundary8/card hiện hành dùng Mua lại/Đánh giá/chi tiết trực tiếp, không còn menu dấu ba chấm cũ. |
| B32 Chi tiết đơn gọn | Đạt | UI42/Tabs12: heading địa chỉ một lần, không khối hướng dẫn thường lặp; giữ cảnh báo tiền/kết quả chưa rõ và khả năng làm mới. |
| B33 Tab Đổi trả | Đạt | Boundary8 phát hiện lệch viền 2 px, sửa CSS dùng chung; Tabs12 và Public đo font/khoảng đệm/viền/chiều cao tại 320/390/1366 px, bấm vào đúng trang đổi trả. |

## Triển khai và giới hạn

- Các đợt M2/M3/M4 và CMS đã chuyển sang Debian2 bằng rollout riêng, backup trước migration, giữ source nền wallet/nhãn hủy đơn. Web cuối sau build thành công đã kết thúc `DEPLOY_OK`. `final-public-tabs` qua cả bốn nhóm, gồm B33 trên đơn COD thật của fixture riêng; cleanup cân bằng quantity 1/reserved 0, không còn catalog fixture active hoặc phiên đăng nhập hiệu lực. Không page error/HTTP bất thường trong lượt cuối.
- Node: 455 unit; 29 PostgreSQL/FFmpeg cho chat/CMS trên release chat; voucher có 28 ca riêng đã qua. AI private PostgreSQL: 259 passed, **3 skipped**; ba ca cần Redis/RabbitMQ thật gồm atomic edge limiter, demo password reservation và tracking worker broker. Không ghi 262 passed.
- Hai lượt OpenAI phân tích media thật có debit bảo thủ trong ledger là 366 + 472 = **838 micro-USD (0,000838 USD)**, không phải hóa đơn provider. Không gọi gen ảnh trong đợt nghiệm thu này. Giữ hạn mức chung 1 USD/ngày, 10 USD/tháng và cấu hình gen ảnh hiện có.
- Lượt ảnh qua nhưng lần polling metadata video kế tiếp trả 503 trước khi admit video trả phí. Đã thu hồi fixture lượt đó; nghiệm thu tiếp riêng video với một call mới, không gọi lại ảnh. Không kết luận đã tìm được nguyên nhân của 503 chỉ từ lượt sau qua. Cả hai ledger đã SETTLED, nội dung thu hồi, sổ tiền được giữ.
- Các lượt kiểm thử chưa qua vẫn được giữ: preview chưa chạy gây connection refused; fixture cũ thiếu storefront/GET profile hợp lệ gây crash giả; vài assertion QR/review/packing còn nhắm markup của nền trước. Bộ 42 ca và các kiểm tra mới không được gọi là toàn bộ E2E/CI của dự án, và không chứng nhận lại luồng ví/QR của WIP.
- Quét 2.351 text file toàn working tree chỉ báo khóa SMTP giả của unit test, trùng byte với HEAD và upstream. Bundle 64 file + tám file thay đổi trong các commit app sắp push không match token hoặc 22 secret local. Staged 23 file tooling/docs cũng qua đối chiếu 22 secret local. Không thay cho audit mọi lịch sử Git hoặc mọi lỗ hổng của ứng dụng.
