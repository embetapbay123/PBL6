# Báo cáo triển khai tái thiết kế trang Quản lý đơn hàng Desktop chuẩn Shopee

**Thời điểm hoàn tất**: 09/11/2026  
**Mục tiêu**: Hiện thực hóa đầy đủ bản thiết kế 7 trụ cột chuẩn Shopee Desktop từ ảnh chụp thực tế đơn hàng của người dùng (`https://shopee.vn/user/purchase?type=6`).  
**Môi trường**: Production Demo tại `https://demo.congnguyen.me/customer/orders`.

---

## 1. Tóm tắt các hạng mục đã hoàn thành

### Trụ cột 1: Thanh tìm kiếm nội bộ đơn hàng (Inline Order Search Bar)
- **Vị trí**: Đặt trực tiếp dưới thanh tab trạng thái đơn (`OrderStatusTabs`).
- **Input & Trải nghiệm**:
  - Placeholder: `"Bạn có thể tìm kiếm theo tên Shop, ID đơn hàng hoặc Tên Sản phẩm"`.
  - Icon kính lúp tìm kiếm ở bên trái, nút xóa nhanh `(X)` khi có ký tự.
  - Tích hợp nút `Tìm đơn hàng` chuẩn màu cam Shopee (`#ee4d2d`), tự động cập nhật URL filter param `q` không giật lag.

### Trụ cột 2: Header thẻ đơn hàng định danh Shop & Vận chuyển (Card Header)
- **Bên trái (Shop identity)**:
  - Tag đỏ cam `Yêu thích` nhận diện thương hiệu.
  - Tên cửa hàng (Store Name) đậm nét, click dẫn sang trang chi tiết gian hàng.
  - Nút **`Chat`** nhỏ gọn (`order-header-chat-btn`), viền cam, click mở ngay widget hội thoại kèm ngữ cảnh ID đơn hàng (`order_id`).
  - Nút **`Xem Shop`** viền xám nhẹ nhàng (`order-view-store-link`).
  - Mã đơn hàng thu gọn (ví dụ: `Đơn #A1B2C3D4`) để người dùng dễ tra cứu.
- **Bên phải (Logistics milestone & Status tag)**:
  - Cột mốc giao nhận thời gian thực: `🚚 ĐVVC lấy hàng thành công ⓘ` (xanh dương) hoặc `🚚 Giao hàng thành công ⓘ` (xanh lá).
  - Trạng thái đơn hàng viết hoa: `CHỜ GIAO HÀNG`, `HOÀN THÀNH`, `ĐÃ HỦY`.

### Trụ cột 3: Danh sách sản phẩm kèm đơn giá theo dòng (Product Item Rows)
- Hiển thị thumbnail sản phẩm vuông 48-72px, sắc nét với viền chống tràn.
- Tiêu đề sản phẩm giới hạn 1-2 dòng, hiển thị phân loại hàng: `Phân loại: [Tên biến thể] · x[Số lượng]`.
- Hiển thị đơn giá sản phẩm căn phải trên từng dòng (ví dụ `68.900 ₫`), theo đúng cách Shopee thể hiện giá trước khi tính tổng.

### Trụ cột 4: Khối tổng tiền nổi bật (Shopee Typography Highlight)
- Dòng thành tiền tách riêng ở cuối danh sách sản phẩm, căn phải:
  - Nhãn: `Thành tiền: ` (màu xám trung tính).
  - Giá trị nổi bật: Font 21px, đậm nét, màu cam Shopee `#ee4d2d` (ví dụ `34.965₫`).

### Trụ cột 5: Footer & Hệ thống nút thao tác thông minh (No Hidden Dropdowns)
- **Bên trái**: Microcopy hướng dẫn bảo vệ người mua theo ngữ cảnh:
  - Khi đơn đang giao (`SHIPPED`): *"Vui lòng chỉ nhấn 'Đã nhận được hàng' khi đơn hàng đã được giao đến bạn và sản phẩm nhận được không có vấn đề nào."*
  - Khi đơn đã hủy (`CANCELLED`): *"Đã hủy bởi người mua / hệ thống · Lệnh hoàn tiền..."*
- **Bên phải**: Loại bỏ hoàn toàn dropdown menu `...` gây ẩn thao tác; hiển thị trực diện các nút bấm theo trạng thái:
  - Đơn **COMPLETED**: `[Mua Lại]` (Primary cam) · `[Đánh Giá]` · `[Yêu Cầu Đổi Trả]` · `[Xem Chi Tiết]`.
  - Đơn **SHIPPED**: `[Đã Nhận Hàng]` (Primary cam) · `[Yêu Cầu Trả Hàng/Hoàn Tiền]` · `[Xem Chi Tiết]`.
  - Đơn **CANCELLED**: `[Mua Lại]` (Primary cam) · `[Xem Chi Tiết Hủy / Hoàn Tiền]` · `[Xem Chi Tiết]`.

---

## 2. Chi tiết các tệp mã nguồn cập nhật

| Tệp nguồn | Nội dung cập nhật |
| :--- | :--- |
| `frontend/src/features/customer/OrderHistoryPage.tsx` | Tích hợp thanh tìm kiếm Shopee, Header Shop (Badge Yêu thích + Chat + Xem Shop), mốc vận chuyển, tổng tiền highlight, microcopy và bộ nút bấm trực tiếp. |
| `frontend/src/features/customer/ContactStoreButton.tsx` | Hỗ trợ thuộc tính `compact?: boolean` tạo nút Chat mini viền cam kèm icon `MessageCircle` mở nhanh hội thoại có gắn mã đơn. |
| `frontend/src/components/OrderListTools.tsx` | Bổ sung `showPrice?: boolean` cho `OrderListIdentity` và format đơn giá từng dòng sản phẩm. |
| `frontend/src/styles/customer-polish.css` | Viết đầy đủ bộ CSS hoàn thiện chuẩn Shopee: `.order-inline-search-bar`, `.order-store-badge`, `.order-header-chat-btn`, `.order-delivery-milestone`, `.order-total-price-highlight`, `.order-btn-highlight`. |

---

## 3. Kết quả Kiểm thử & Triển khai

1. **Kiểm tra biên dịch Typescript & Vite**:
   - Chạy lệnh `npm --prefix frontend run build`.
   - Kết quả: `✓ built in 12.81s`, 0 errors, 0 type issues.
2. **Triển khai Server Demo**:
   - Chạy lệnh `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-demo-web.ps1`.
   - Kết quả: Recreated container `pbl6-demo-web-1`, `DEPLOY_OK`.
   - Website đã hoạt động ổn định tại: **https://demo.congnguyen.me/customer/orders**
