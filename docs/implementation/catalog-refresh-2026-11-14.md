# Catalog demo: mẫu riêng và dọn TEST

Đã cập nhật https://demo.congnguyen.me ngày 14/11/2026. Catalog công khai có **106 sản phẩm**, 6 gian hàng và 5 danh mục.

## Dữ liệu mới

- 72 mẫu mới, mỗi gian hàng 12 mẫu; 134 biến thể cỡ, giá, thuộc tính và tồn kho.
- Mỗi mẫu có một ảnh đại diện riêng. Đã duyệt bảng ảnh để loại các góc chụp của cùng một món và sửa tên cho khớp ảnh. Không dùng lại ảnh của catalog gốc.
- 72 ảnh WebP, tối đa 1.200 px, tổng 4.822.630 byte. Nguồn, URL đã quan sát, kích thước và SHA-256 nằm trong `frontend/public/catalog/diverse-sources.json`. Ảnh từ Burst/Shopify, theo [điều khoản của nguồn](https://www.shopify.com/stock-photos/legal/terms); đây là ảnh minh họa cho dữ liệu demo.
- 24 đơn COD hoàn tất và 24 đánh giá mẫu mới, qua Delivery nội bộ và webhook ký. Có 24 bằng chứng COD; không gọi hãng vận chuyển bên ngoài hay API tạo ảnh trả phí.
- Giữ các ưu đãi từ đợt trước. Thêm danh mục Chăm sóc cá nhân với 6 món; trang chủ có đủ ảnh cho 5 danh mục và tự chia cột.

| Gian hàng | Sản phẩm đang bán | Mẫu mới |
|---|---:|---:|
| An Nhiên Studio | 30 | 12 |
| Mây Xanh Living | 28 | 12 |
| Nếp Việt Wear | 12 | 12 |
| Góc Nhỏ Home | 12 | 12 |
| Mộc & Mây Workspace | 12 | 12 |
| Bước Nhẹ Accessories | 12 | 12 |

64 sản phẩm `DX26` của đợt mở rộng trước đã STOPPED. Giữ ID, đơn, đánh giá và sổ kho cũ; không đổi chúng thành món khác.

## Dọn fixture TEST-CONG

Phạm vi đã rà: 182 sản phẩm, 10 loại, 7 danh mục, 2 gian hàng và 6 tài khoản thuộc namespace kiểm thử `TEST-CONG` / `qa.cong.*@pbl6.test`.

- Xóa 49 sản phẩm không có đơn, giỏ, yêu thích, đánh giá, lịch sử kho, reservation hoặc tồn kho. Xóa các bản ghi con tương ứng theo khóa ngoại.
- 133 sản phẩm có liên kết được STOPPED/HIDDEN, đổi tên hồ sơ lưu trữ. Loại và danh mục không còn dùng được xóa; phần còn liên kết được ngừng hoạt động.
- Khóa 2 gian hàng và 6 tài khoản fixture, thu hồi phiên theo API. Không xóa tài khoản thật dựa riêng vào tên hiển thị `test`.
- Giữ nguyên đơn và snapshot lịch sử, sổ tiền, giỏ, stock movement và reservation. Chuỗi TEST trong lịch sử/audit cũ có thể vẫn còn để đối chiếu.
- Tìm kiếm công khai `TEST`: 0 kết quả; không còn danh mục/loại TEST hoạt động.

Đã sao lưu riêng M1/M2/M3 và Delivery trên máy demo, kiểm tra danh mục dump bằng `pg_restore --list`. Đây không phải xác nhận diễn tập khôi phục đồng bộ nhiều dịch vụ. Không tắt trigger bảo vệ sổ tiền.

## Kiểm tra

- Build frontend thành công; deploy web hoàn tất public smoke check `DEPLOY_OK`.
- 6 kiểm tra tự động của seed/catalog qua.
- Chạy lại refresh: giữ 72 sản phẩm, 24 đơn và 24 đánh giá; không phát sinh đơn trùng. Sai lệch sổ kho: 0; giỏ và các đơn kết thúc trước đó được giữ nguyên.
- Playwright chạy trực tiếp demo, không intercept API: **9/9 nhóm qua**, không page error hay phản hồi API 429/5xx. Bao gồm ảnh tải thật và khớp hash, 6 catalog, sắp xếp giá, trang chủ desktop, mobile 390×844, lọc danh mục mới, đánh giá, đơn khách, sản phẩm/báo cáo seller và ưu đãi/báo cáo admin.

Chứng cứ: `outputs/catalog-refresh-2026-11-14/report.json`, `database-verification.json`, `ui-verification.json` và ảnh chụp cùng thư mục.

Quy trình chạy lại có checkpoint và backup: `scripts/refresh-demo-catalog.ps1`. Kế hoạch mặc định chỉ đọc: `node scripts/seed_distinct_catalog.cjs --plan`. Không chạy lại seed DX26 cũ để tái kích hoạt những mẫu đã ngừng bán.
