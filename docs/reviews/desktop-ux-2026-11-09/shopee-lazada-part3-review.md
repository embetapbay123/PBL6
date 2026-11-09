# Nghiên cứu UI/UX Desktop Part 3: Chuẩn hóa Thông báo, Sổ địa chỉ, Chi tiết đơn hàng và Đánh giá theo Shopee/Lazada

**Thời điểm thực hiện**: 09/11/2026  
**Phạm vi**: Giao diện Desktop (1366 × 768 và 1440 × 900)  
**Tiêu chuẩn đối sánh**: Trải nghiệm thực tế từ Shopee Vietnam và Lazada Desktop 2026  
**Quy tắc chỉ đạo**: Tuân thủ `c:\PBL6\docs\reviews\REVIEW_FRAMEWORK.md`, `frontend/CONTENT_GUIDELINES.md`, và nguyên tắc tinh gọn, loại bỏ tải trọng nhận thức (cognitive overload), chống ngợp thông tin cho người dùng.

---

## 1. Tổng quan hiện trạng đợt 3

Sau khi hoàn thành xuất sắc đợt 1 (T09 – T14) và đợt 2 (T15 – T19 + Triển khai Order Card chuẩn Shopee), hệ thống đã giải quyết được các nút thắt lớn nhất tại Trang chủ, Tìm kiếm, Chi tiết sản phẩm, Giỏ hàng dạng bảng 12 cột, Thanh toán thu gọn và Thẻ đơn hàng danh sách.

Tuy nhiên, khi đi sâu vào hành trình sau mua hàng (Post-purchase Customer Experience) và các trang quản trị cá nhân của khách hàng, vẫn còn **4 điểm nghẽn thị giác và luồng trải nghiệm** khiến giao diện chưa đạt độ mượt mà cao cấp như Shopee/Lazada:

1. **Trang Chi tiết đơn hàng (`OrderDetailPage.tsx`)**: Đã có Stepper tiến độ và Action buttons nhưng bố cục Sidebar - Main đang bị chia cắt, phần chi tiết thanh toán và địa chỉ nằm rời rạc trong Sidebar hẹp, danh sách sản phẩm thiếu nhận diện Store Header (Logo/Tên/Nút Chat) đồng bộ với trang danh sách.
2. **Trung tâm Thông báo (`NotificationsPage.tsx`)**: Thiếu phân luồng danh mục (Tabs bên trái hoặc trên đỉnh), toàn bộ thông báo đổ dồn vào 1 danh sách duy nhất. Mỗi dòng thông báo chỉ có icon Lucide trừu tượng (`Package`, `RotateCcw`), không có hình ảnh thu nhỏ (thumbnail) hay tên sản phẩm, buộc người dùng phải căng mắt đọc mã hash đơn `#A1B2C3D4` mới biết thông báo nói về cái gì.
3. **Sổ địa chỉ nhận hàng (`AddressPage.tsx`)**: Thẻ địa chỉ sử dụng các nút bấm lớn cồng kềnh (`addr-btn-default`, `addr-btn-danger`, `addr-btn-secondary`) chiếm diện tích ngang bất hợp lý, thiếu phân cấp thị giác kiểu Shopee (Tên + SĐT trên 1 hàng, nút Cập nhật / Xóa dạng Text Action căn phải, nút "Thiết lập mặc định" thanh mảnh).
4. **Trang Đánh giá của tôi (`OwnReviewsPage.tsx`)**: Thiếu tab phân tách giữa `"Chưa đánh giá"` (Call-to-Action tích cực để nhận thưởng/xu sau khi nhận hàng) và `"Đã đánh giá"`. Giao diện hiển thị thô sơ bằng `boot-card` thiếu ảnh đại diện sản phẩm và phân loại hàng.

---

## 2. Chi tiết 4 Vấn đề UI/UX & Giải pháp theo chuẩn Shopee/Lazada

---

### Vấn đề T20: Trang Chi tiết đơn hàng (Order Detail) chưa có Header đối chiếu & Bố cục thanh toán phẳng chuẩn Shopee

#### 1. Hiện trạng & Triệu chứng "Ngợp"
- Hiện tại, đỉnh trang có thanh điều hướng nhỏ `← Về đơn hàng` và tiêu đề `Chi tiết đơn hàng`, bên dưới là `OrderProgressTracker`. Sau đó lại xuất hiện `<header className="order-detail-overview">` với một loạt dòng chữ: Trạng thái, Thanh toán, Lệnh hoàn tiền... tạo cảm giác vụn vặt và trùng lặp thông tin với thanh tiến trình.
- Phần danh sách sản phẩm trong đơn không có Header gian hàng (Tên shop, Chat, Xem shop) như thẻ đơn ngoài danh sách, làm đứt gãy tính liên tục của trải nghiệm thị giác.
- Bố cục 2 cột (Main: Timeline + Items, Sidebar: Địa chỉ + Chính sách trả hàng + Bảng tiền + Hủy đơn) khiến bảng tiền bị ép hẹp vào Sidebar 300px, trong khi chuẩn Shopee/Lazada trên Desktop luôn đặt Bảng tổng kết thanh toán ở **toàn chiều rộng dưới cùng** với căn phải rõ ràng, tạo sự an tâm khi nhìn con số tiền cuối cùng.

#### 2. Phân tích đối sánh Shopee Desktop
Trên Shopee Desktop (`/user/purchase/order/:id`):
- **Top Bar**: Bên trái có nút `‹ TRỞ LẠI` (font 14px, màu xám chuột, hover cam); Bên phải hiển thị `MÃ ĐƠN HÀNG: 241109... | ĐƠN HÀNG ĐÃ HOÀN THÀNH` (chữ hoa màu đỏ cam nổi bật).
- **Stepping Bar**: 4-5 bước ngang rõ ràng có icon và ngày giờ thực hiện ở từng mốc.
- **Khối Thông tin Nhận hàng & Vận chuyển**: Nằm ngang song song ngay dưới Stepper. Bên trái là "Địa Chỉ Nhận Hàng" (Tên, SĐT, Địa chỉ chi tiết), Bên phải là "Thông Tin Vận Chuyển" (Đơn vị vận chuyển, Mã vận đơn, Mốc thời gian mới nhất).
- **Khối Sản phẩm**: Bao gồm Header Shop (Tên shop, nút Chat, nút Xem shop), các dòng sản phẩm có ảnh, tên, phân loại, số lượng, đơn giá và thành tiền theo dòng.
- **Khối Tổng kết thanh toán (Bill Summary)**: Đặt ở góc dưới bên phải, gồm:
  - Tổng tiền hàng
  - Phí vận chuyển
  - Giảm giá từ Shop
  - Giảm giá từ Sàn
  - **Tổng số tiền**: Màu đỏ cam `#ee4d2d`, font 24px đậm.
  - Phương thức thanh toán (COD, Chuyển khoản, v.v.).

#### 3. Phương án cải tiến
- Tái cấu trúc lại `OrderDetailPage.tsx`:
  - **Top Bar**: Thay nút back cũ bằng `‹ TRỞ LẠI` + Header Mã đơn và Trạng thái đơn bên phải.
  - **Khối Địa chỉ & Vận chuyển**: Gom thành layout 2 cột ngang đẹp mắt trên Desktop (`Order Delivery & Shipping Info Card`).
  - **Danh sách sản phẩm**: Thêm Header Shop (`Yêu thích` + Tên Shop + `Chat` + `Xem Shop`), giữ đồng bộ nhận diện thương hiệu.
  - **Khối Thanh toán**: Đặt ở chân trang dưới dạng Invoice Summary căn phải, hỗ trợ hiển thị từng khoản chiết khấu minh bạch.

---

### Vấn đề T21: Trung tâm Thông báo (`NotificationsPage.tsx`) gây quá tải nhận thức do thiếu Thumbnail và Bộ lọc theo kênh

#### 1. Hiện trạng & Triệu chứng "Ngợp"
- Toàn bộ thông báo (từ đơn hàng, thanh toán, đổi trả) dồn vào một luồng tuyến tính dài vô tận.
- Khi người dùng nhận được 5 thông báo "Đơn #A1B2C3D4 đang giao hàng", "Đơn #9F8E7D6C đã hoàn tất", họ **không thể biết đây là sản phẩm nào** (áo thun, sách, sạc điện thoại hay thực phẩm) nếu không click vào từng đơn.
- Các icon chỉ là icon hình khối Lucide xám xịt (`Package`, `CreditCard`, `RotateCcw`), không cung cấp bất kỳ manh mối thị giác cụ thể nào về món đồ người dùng quan tâm.

#### 2. Phân tích đối sánh Shopee Desktop
Shopee chia trang Thông báo (`https://shopee.vn/user/notifications/order`) thành:
- **Menu danh mục bên trái (hoặc Tabs trên đỉnh)**:
  - 📦 Cập nhật đơn hàng
  - 🏷 Khuyến mãi
  - 💰 Cập nhật ví / thanh toán
  - 📝 Hoạt động & Đánh giá
- **Thiết kế từng dòng thông báo**:
  - Bên trái: Thumbnail hình ảnh sản phẩm chính của đơn hàng (vuông 60×60px). Nhìn vào ảnh là người dùng nhận ra ngay kiện hàng nào đang đến.
  - Ở giữa: Tiêu đề in đậm (`Đơn hàng 241109... đã giao thành công`), mô tả chi tiết 1-2 dòng (`Kiện hàng gồm [Tên sản phẩm] đã được giao đến bạn vào lúc...`), ngày giờ hiển thị xám nhẹ 12px.
  - Bên phải: Nút bấm trực diện `Xem chi tiết đơn hàng`.
  - Trạng thái chưa đọc: Nền cam phấn rất nhạt `#fffaf8` kèm chấm đỏ nhỏ, tạo sự tinh tế, không dùng badge thô cứng.

#### 3. Phương án cải tiến
- Bổ sung bộ lọc phân loại nhanh trên đầu trang: `Tất cả` | `Đơn hàng` | `Thanh toán & Hoàn tiền` | `Đổi trả hàng`.
- Tận dụng `order_id` để hiển thị thumbnail ảnh sản phẩm nếu có, hoặc ít nhất phân loại trực quan với màu sắc thương hiệu riêng cho từng loại sự kiện.
- Đổi nút "Đánh dấu tất cả đã đọc" thành action gọn gàng ở góc trên bên phải header danh sách.

---

### Vấn đề T22: Sổ địa chỉ (`AddressPage.tsx`) bố cục cồng kềnh, thiếu thẩm mỹ Desktop chuẩn E-commerce

#### 1. Hiện trạng & Triệu chứng "Ngợp"
- Form thêm địa chỉ mở to đùng ngay giữa trang, chiếm diện tích lớn làm đẩy danh sách địa chỉ xuống dưới.
- Mỗi thẻ địa chỉ trong danh sách hiện tại hiển thị hàng loạt nút bấm to (`addr-btn-secondary`, `addr-btn-default`, `addr-btn-danger`) dàn trải chiếm nhiều diện tích, gây cảm giác nặng nề như bảng điều khiển kỹ thuật chứ không phải trang tài khoản mua sắm.

#### 2. Phân tích đối sánh Shopee Desktop
Trên Shopee (`https://shopee.vn/user/account/address`):
- **Header**: Tiêu đề "Địa chỉ của tôi" bên trái, nút đỏ cam `+ Thêm địa chỉ mới` ở góc trên bên phải.
- **Thẻ địa chỉ (Address Row)**:
  - Phân vùng trái (Nội dung):
    - Dòng 1: **Họ và tên** (in đậm font 15px) | **Số điện thoại** (màu xám ghi, cách nhau bằng thanh dọc `|`).
    - Dòng 2: Địa chỉ chi tiết (Số nhà, đường phố).
    - Dòng 3: Phường/Xã, Quận/Huyện, Tỉnh/Thành phố.
    - Dòng 4: Tag màu đỏ cam viền mảnh: `Mặc định` hoặc `Địa chỉ lấy hàng`.
  - Phân vùng phải (Thao tác):
    - Nút văn bản: `Cập nhật` (xanh/cam) và `Xóa` (đỏ/xám) xếp liền nhau.
    - Nút viền ngoài: `Thiết lập mặc định` (chỉ hiển thị với địa chỉ chưa mặc định, disabled khi đang là mặc định).

#### 3. Phương án cải tiến
- Điều chỉnh layout `AddressPage.tsx` sang mô hình chuẩn Shopee:
  - Đưa nút `+ Thêm địa chỉ mới` lên góc phải trên cùng cạnh tiêu đề.
  - Gom các nút thao tác bên phải thẻ thành dạng Text Action nhỏ gọn và nút `Thiết lập mặc định` viền mỏng tinh tế.
  - Chuyển Form thêm/sửa địa chỉ vào Dialog Modal hoặc trượt xuống mượt mà để không phá vỡ danh sách.

---

### Vấn đề T23: Trang Đánh giá của tôi (`OwnReviewsPage.tsx`) thiếu phân luồng "Chưa đánh giá" vs "Đã đánh giá"

#### 1. Hiện trạng & Triệu chứng "Ngợp"
- Khách hàng sau khi nhận hàng xong muốn vào viết đánh giá để nhận quyền lợi nhưng trang `/customer/reviews` chỉ liệt kê danh sách những đánh giá **đã tạo từ trước**.
- Không có bất kỳ danh sách nào hiển thị các sản phẩm đã mua thành công nhưng chưa được đánh giá, khiến khách hàng bị mất phương hướng (phải tự mò lại từng đơn hàng cũ trong lịch sử để bấm nút "Viết đánh giá").
- Giao diện thẻ đánh giá cũ rất sơ sài, thiếu ảnh thumbnail sản phẩm và phân loại hàng, văn bản hiển thị như tài liệu thô.

#### 2. Phân tích đối sánh Shopee Desktop
Shopee (`https://shopee.vn/user/purchase/review`):
- **2 Tab chính rõ ràng**:
  1. **Chưa đánh giá (Pending Reviews)**: Danh sách các sản phẩm từ đơn hàng `COMPLETED` mà người mua chưa gửi đánh giá, kèm nút cam nổi bật `Đánh giá ngay`.
  2. **Đã đánh giá (Reviewed)**: Danh sách các đánh giá đã gửi, hiển thị số sao ⭐, bình luận, ngày đăng, phản hồi từ người bán (nếu có) và nút `Sửa`.

#### 3. Phương án cải tiến
- Nâng cấp `OwnReviewsPage.tsx`:
  - Bổ sung 2 tab: `Chưa đánh giá` và `Đã đánh giá`.
  - Ở tab "Chưa đánh giá": Tận dụng danh sách đơn hàng `COMPLETED` để lọc ra các mục chưa có review và hiển thị nút `Đánh giá ngay`.
  - Ở tab "Đã đánh giá": Thêm thumbnail sản phẩm, phân loại hàng, hiển thị sao màu vàng kim và nút `Sửa đánh giá` tinh gọn.

---

## 3. Lộ trình triển khai khuyến nghị

| Thứ tự | Hạng mục | Tác động UX | Độ phức tạp |
| :---: | :--- | :--- | :---: |
| **1** | **Chi tiết đơn hàng (`OrderDetailPage.tsx`)**: Bố cục Top Bar `‹ TRỞ LẠI`, Shop Header, Card Địa chỉ + Vận chuyển 2 cột, Bill Summary căn phải. | ⭐⭐⭐⭐⭐ (Tối quan trọng cho Post-Purchase) | Vừa |
| **2** | **Sổ địa chỉ (`AddressPage.tsx`)**: Bố cục Shopee Header (+ Thêm địa chỉ mới góc phải), Thẻ địa chỉ tinh gọn với Text Actions `Cập nhật` / `Xóa` / `Thiết lập mặc định`. | ⭐⭐⭐⭐ (Cực kỳ trực quan, chuẩn E-commerce) | Nhẹ |
| **3** | **Trung tâm Thông báo (`NotificationsPage.tsx`)**: Tabs phân loại (`Tất cả`, `Đơn hàng`, `Thanh toán`, `Đổi trả`), thiết kế hàng thông báo hiện đại. | ⭐⭐⭐⭐ (Giảm ngợp thông tin cho người dùng tích cực) | Vừa |
| **4** | **Đánh giá của tôi (`OwnReviewsPage.tsx`)**: Phân tách 2 Tab `Chưa đánh giá` vs `Đã đánh giá` kèm thumbnail sản phẩm. | ⭐⭐⭐⭐ (Thúc đẩy tương tác UGC & Feedback vòng lặp) | Vừa |

---

*Tài liệu đợt 3 hoàn tất, sẵn sàng để lấy ý kiến và triển khai trực tiếp vào codebase theo chỉ đạo của người dùng.*
