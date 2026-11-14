# Bổ sung dữ liệu demo ngày 14/11/2026

Đã thêm dataset `marketplace-expansion-2026-v1` vào https://demo.congnguyen.me và kiểm tra trên giao diện public.

## Dữ liệu đã thêm

| Nhóm | Số lượng | Nội dung |
| --- | ---: | --- |
| Gian hàng | 4 | Nếp Việt Wear, Góc Nhỏ Home, Mộc & Mây Workspace, Bước Nhẹ Accessories |
| Sản phẩm | 64 | Thời trang, túi/phụ kiện, đồ dùng nhà và góc làm việc; thêm cả vào An Nhiên và Mây Xanh để các tài khoản demo cũ có dữ liệu mới |
| Phân loại | 136 | Màu/cỡ cho quần áo, phân loại tiêu chuẩn cho các nhóm còn lại; mức giá và tồn 0/1/nhiều |
| Liên kết ảnh | 103 | Dùng 37 ảnh catalog đã có, phù hợp nhóm sản phẩm và màu; không gọi gen ảnh |
| Đơn hàng | 54 | 6 chờ xác nhận, 6 đã xác nhận, 6 đang xử lý, 6 đang giao, 24 hoàn tất, 6 đã hủy |
| Đánh giá | 24 | Tạo qua API từ mục hàng thuộc đơn hoàn tất; có nhãn `[DEMO]`, điểm 3–5 sao |
| Voucher | 24 | Giảm cố định/phần trăm, mức mua tối thiểu, trần giảm; có mẫu đang hoạt động, tạm dừng, sắp có hiệu lực và hết hạn |
| Vận đơn | 30 | 6 đã lấy hàng/đang giao, 24 giao thành công; 24 bằng chứng COD từ hệ thống Delivery của dự án |
| Tài khoản bổ sung | 10 | 4 chủ gian hàng mới, 6 khách mẫu; tên `[DEMO]`, email `seed26.*@pbl6.test`, địa chỉ/điện thoại minh họa |

Hai tài khoản đăng nhập nhanh Khách hàng A/B đều có thêm 7 đơn. Chủ Store An Nhiên/Mây Xanh có thêm 8 sản phẩm và 9 đơn mỗi cửa hàng. Admin xem được cả các cửa hàng mới, các voucher và dữ liệu báo cáo.

## Cách tạo và tính toàn vẹn

- Bổ sung vào dataset hiện tại. Không reset database, đổi thông tin cửa hàng cũ, sửa sản phẩm cũ hay xóa các dữ liệu QA có sẵn.
- Bootstrap danh tính CUSTOMER mẫu trực tiếp trong M3; cửa hàng được đăng ký/duyệt qua API. Catalog, phân loại, nhập kho, ảnh, voucher, checkout, hủy, đánh giá đều chạy qua API nghiệp vụ.
- Checkout dùng BUY_NOW để giữ nguyên giỏ đang lưu. Trước/sau seed đối chiếu hash các dòng giỏ của tài khoản demo cũ và các đơn đã hoàn tất/hủy/hết hạn trước đó; đều giữ nguyên.
- Đơn mới dùng vận chuyển PLATFORM. Đã tạo kho cho bốn cửa hàng mới, đặt kiện qua PBL6, dùng API operator của Delivery để phân công/lấy/giao và ghi nhận COD mẫu. Webhook có chữ ký cập nhật PBL6, sau đó mới tạo đánh giá. Không sửa trực tiếp shipping mode hoặc trạng thái đơn để vượt điều kiện của nghiệp vụ.
- Lượt đầu dừng khi seed cũ thử chuyển tay trạng thái đơn PLATFORM. Đã bổ sung luồng Delivery và tiếp tục bằng các mã checkout cố định; nhận lại các bản ghi đã tạo, không sinh đơn thay thế/trùng.
- Tồn kho của toàn bộ 136 phân loại mới khớp sổ `stock_movement`: **0 sai lệch**.
- Có **24 lần thu COD mẫu**, tổng **15.912.000đ**, bằng tổng phải trả của 24 đơn hoàn tất; có đúng 24 bút toán COLLECTION. Đây là dữ liệu mô phỏng trên Delivery do dự án sở hữu, không phải xác nhận chuyển tiền ngân hàng hoặc giao nhận bên ngoài.
- Không gọi model chat, gen ảnh hoặc mua dịch vụ vận chuyển bên ngoài. Thời gian nghiệp vụ do API ghi tại thời điểm tạo; không lùi ngày để làm đầy biểu đồ lịch sử.

## Kiểm tra

- Ba test cho mặc định read-only, chống tham số reset, định danh ổn định, title/SKU duy nhất, ảnh đã tồn tại, biến thể và phân bố kịch bản đều qua.
- Chạy lại toàn bộ seed sau lần hoàn tất: **cùng ID** cho store, product, order, review, voucher, shipment; vẫn 64/54/24/24/30 bản ghi và 24 lần thu COD, không nhân đôi tiền hay tồn. Lượt cuối logout các phiên MOBILE do nó tạo bằng refresh token chỉ giữ trong RAM.
- Browser public, không intercept API: **5 nhóm kiểm tra qua** — gian hàng/ảnh, review từ đơn hoàn tất, lịch sử đơn Customer, sản phẩm/báo cáo Seller, voucher/báo cáo tài chính Admin. Không có pageerror hay HTTP 429/5xx trong lượt này.
- Đây là kiểm tra dữ liệu và smoke UI của các màn liên quan, không thay thế bộ nghiệm thu đầy đủ cho mọi chức năng.

## Chạy lại và bằng chứng

Seed mặc định chỉ xem kế hoạch:

```powershell
node scripts/seed_demo_expansion.cjs --plan
node --test scripts/test_seed_demo_expansion.cjs
```

Áp dụng/resume trên đúng demo đang cấu hình:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/expand-demo-data.ps1
```

Wrapper lấy cấu hình từ các container đang chạy, xác nhận DB `import2_m1/m2/m3`, không đoán mật khẩu hay DB. Trước mỗi lần áp dụng lưu dump riêng M1/M2/M3 và Delivery, kiểm tra catalog dump bằng `pg_restore --list`; đây là snapshot từng DB, không phải chứng nhận restore đồng bộ liên dịch vụ. Backup nằm riêng trên server trong `artifacts/backups/demo-expansion-2026-v1/`, quyền truy cập hạn chế. Không đưa password/key/token vào report hoặc Git.

Bằng chứng local tại `outputs/demo-expansion-2026-11-14/`:

- `before.json`: kiểm kê trước khi thêm.
- `report.json`: bản ghi và kết quả lần chạy cuối; `first-complete-report.json` giữ lần hoàn tất đầu.
- `final-verification.json`: đối chiếu DB, cùng ID sau chạy lại, 24 COLLECTION và tổng tiền khớp.
- `ui-verification.json`: 5 kiểm tra UI cùng trạng thái lỗi mạng/JavaScript.
- Ảnh `new-store.png`, `product-reviews.png`, `customer-orders.png`, `seller-products.png`, `seller-report.png`, `admin-vouchers.png`, `admin-financial-report.png`.
- `initial-run.log`, `first-complete-run.log`, `idempotence-run.log`: các lượt và việc tiếp tục sau khi điều chỉnh cho Delivery.

Chỉ các bản ghi thuộc namespace DX26/seed26 và mã idempotency của dataset được seed nhận lại. Nếu dữ liệu đã bị người dùng thay đổi trái với mục tiêu mẫu, script dừng để xem xét, không âm thầm ghi đè.
