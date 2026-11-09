# Bản Thiết Kế Chi Tiết: Nâng Cấp Trang Quản Lý Đơn Hàng Theo Chuẩn Shopee Desktop
## Áp dụng 7 bài học thực tiễn từ hệ thống Shopee Vietnam (`https://shopee.vn/user/purchase`)

* **Ngày lập:** 09/11/2026.  
* **Tài liệu căn cứ:** [docs/reviews/REVIEW_FRAMEWORK.md](../REVIEW_FRAMEWORK.md) & 3 ảnh chụp thực tế Shopee Desktop.  
* **Phân hệ mục tiêu:** Giao diện Khách hàng — Danh sách đơn hàng (`/customer/orders`) & Chi tiết đơn hàng (`/customer/orders/:id`).  
* **Mục tiêu UX:** Triệt tiêu quá tải nhận thức, rõ ràng hành động tiếp theo (Task-Driven UX), tối ưu hóa trải nghiệm trên desktop 1366 × 768 và 1440 × 900.

---

## 1. Bối cảnh & Mục đích thiết kế

Qua đối chiếu trực tiếp từ ảnh chụp thực tế màn hình đơn hàng của Shopee Desktop, hệ thống PBL6 Market hiện tại tuy đã có đầy đủ logic nghiệp vụ nhưng cách tổ chức giao diện còn mang nặng tư duy lập trình (developer-centric) thay vì trải nghiệm người tiêu dùng (consumer-centric):
* Ô tìm kiếm đơn hàng bị giấu vào thẻ `<details>` đóng.
* Các nút hành động thiết yếu của người mua (`Yêu cầu đổi trả`, `Đánh giá`, `Hủy đơn`) bị giấu trong menu ba chấm `ActionMenu`.
* Thiếu nút tương tác nhanh với người bán (`[Chat]`, `[Xem Shop]`) trên từng thẻ đơn.
* Header của thẻ đơn chỉ có 1 badge xám, thiếu sự phân định giữa **Hành trình kiện hàng của bên vận chuyển** và **Trạng thái tài chính/vòng đời đơn hàng**.

Bản thiết kế này chuẩn hóa toàn bộ cấu trúc Thẻ Đơn Hàng, Thanh Tìm Kiếm Inline và Phân Bổ Nút Hành Động Động theo đúng tiêu chuẩn thực tế của Shopee.

---

## 2. 7 Nguyên tắc thiết kế cốt lõi (Core Design Principles)

### 2.1. Tách bạch 2 tầng trạng thái trên Header đơn hàng
* **Tầng 1 (Bên vận chuyển - Logistics Event):** Hiển thị bên phải với chữ xanh lá và icon xe tải `🚚`:
  * `🚚 Đơn vị vận chuyển lấy hàng thành công ⓘ`
  * `🚚 Đang giao hàng đến bạn ⓘ`
  * `🚚 Giao hàng thành công ⓘ`
* **Tầng 2 (Vòng đời đơn hàng - Order State):** Hiển thị chữ in hoa đậm màu cam hoặc đỏ:
  * `CHỜ GIAO HÀNG` (Cam)
  * `HOÀN THÀNH` (Xanh lá / Cam)
  * `ĐÃ HỦY` (Đỏ)
  * `TRẢ HÀNG/HOÀN TIỀN` (Xanh ngọc)

### 2.2. Bộ đôi nút tương tác nhanh với Gian hàng (`[Chat]` & `[Xem Shop]`)
* Ngay sau Tên Gian hàng (kèm badge `Mall` đỏ hoặc `Yêu thích` cam):
  * **Nút `[Chat]`:** Nút nhỏ bo góc, icon tin nhắn màu cam. Click là mở cửa sổ chat trực tiếp với Shop về đúng đơn hàng đó.
  * **Nút `[Xem Shop]`:** Nút viền xám mảnh, icon gian hàng. Click chuyển hướng tới `/stores/:id`.

### 2.3. Thanh tìm kiếm Inline toàn chiều ngang (Inline Order Search)
* Đưa ô tìm kiếm ra ngoài làm thanh công cụ chính đặt ngay dưới thanh Tab trạng thái.
* Placeholder trực quan: `🔍 Bạn có thể tìm kiếm theo tên Shop, ID đơn hàng hoặc Tên Sản phẩm`.
* Người dùng có thể tìm nhanh đơn hàng chỉ bằng 1 thao tác gõ phím.

### 2.4. Huy hiệu số đếm (Badge Counter) trên từng Tab trạng thái
* Hiển thị số lượng đơn đang chờ xử lý trên các Tab quan trọng:
  * `Chờ thanh toán (2)`
  * `Chờ giao hàng (8)`
  * `Đổi trả / Hoàn tiền (1)`

### 2.5. Phân cấp nút hành động động (Dynamic Action Buttons) — Bài trừ menu ẩn
Tuyệt đối không dùng menu ba chấm (`...`) để giấu hành động. Mọi trạng thái đều phơi bày tối đa 3 nút theo độ ưu tiên rõ ràng:
* **Trường hợp Đơn đã giao (Chờ khách xác nhận):**
  * `[Đã Nhận Hàng]` (Primary — Nền cam đậm, chữ trắng)
  * `[Yêu Cầu Trả Hàng/Hoàn Tiền]` (Secondary — Viền trắng, chữ xám đậm)
  * `[Liên Hệ Người Bán]` (Tertiary — Viền trắng, chữ xám)
* **Trường hợp Đơn hoàn tất:**
  * `[Mua Lại]` (Primary — Nền cam đậm)
  * `[Đánh Giá Sản Phẩm]` (Secondary)
  * `[Xem Chi Tiết]` (Tertiary)
* **Trường hợp Đơn bị hủy:**
  * `[Mua Lại]` (Primary — Nền cam đậm)
  * `[Xem Thông Tin Hoàn Tiền]` hoặc `[Xem Chi Tiết Hủy Đơn]` (Secondary)
  * `[Liên Hệ Người Bán]` (Tertiary)

### 2.6. Dòng cảnh báo vi mô (Microcopy) bảo vệ quyền lợi người mua
* Bên trái cụm nút hành động, luôn có dòng chữ nhỏ hỗ trợ tâm lý:
  * Đơn đang giao: `Vui lòng chỉ nhấn "Đã nhận được hàng" khi đơn hàng đã được giao đến bạn và sản phẩm nhận được không có vấn đề nào.`
  * Đơn bị hủy: `Đã hủy tự động bởi hệ thống Shopee ⓘ` hoặc `Đã hủy bởi Người bán ⓘ`.

### 2.7. Phân cấp thị giác số tiền (Typography & Hierarchy)
* Căn phải toàn bộ khối tiền ở góc dưới sản phẩm:
  * Giá cũ (nếu có giảm giá): gạch ngang màu xám `159.000₫`.
  * Giá thực mua: chữ đậm vừa `68.900₫`.
  * Dòng tổng kết: `Thành tiền:` font 14px + **`34.965₫`** font 20px màu đỏ cam đậm (#ee4d2d).

---

## 3. Bản vẽ cấu trúc chi tiết (ASCII Wireframe)

### 3.1. Tổng thể trang Đơn mua trên Desktop

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Tất cả   │  Chờ thanh toán   │  Vận chuyển   │  Chờ giao hàng (8)  │  Hoàn thành  │  Đã hủy  │ Đổi trả │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  🔍  Bạn có thể tìm kiếm theo tên Shop, ID đơn hàng hoặc Tên Sản phẩm                      [Tìm kiếm]  │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Yêu thích] THIÊN THẢO ORGANIC  [💬 Chat]  [🏪 Xem Shop]  │  🚚 ĐVVC lấy hàng thành công ⓘ  · CHỜ GIAO HÀNG │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────┐  1kg Yến Mạch Cán Dẹp Nhập Khẩu Đức - Hỗ Trợ Giảm Cân, Bữa Sáng Dinh Dưỡng...             │
│ │   Ảnh   │  Phân loại hàng: Cán vỡ, Túi 1kg                                   90.000₫   42.400₫       │
│ │  80x80  │  x1                                                                                        │
│ └─────────┘                                                                                            │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                            Thành tiền: 42.400₫         │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ⓘ Vui lòng chỉ nhấn "Đã nhận được hàng" khi bạn đã nhận và     │ [Đã Nhận Hàng] [Yêu Cầu Trả Hàng] [Chat]│
│   kiểm tra sản phẩm không có vấn đề nào.                       │                                       │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Mall] Baseus Flagship Store   [💬 Chat]  [🏪 Xem Shop]    │                                  ĐÃ HỦY   │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────┐  Cáp sạc nhanh Baseus Ultra-Fast Series Type-C sang 20W 480Mbps Cáp PVC...                 │
│ │   Ảnh   │  Phân loại hàng: Đen, 1M                                          159.000₫   68.900₫       │
│ │  80x80  │  x1                                                                                        │
│ └─────────┘                                                                                            │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                            Thành tiền: 34.965₫         │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ⓘ Đã hủy tự động bởi hệ thống Shopee                           │ [Mua Lại] [Xem Chi Tiết Hủy] [Chat]   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Kế hoạch sửa đổi mã nguồn (Implementation Specs)

### 4.1. File `frontend/src/features/customer/OrderHistoryPage.tsx`
* **Loại bỏ `<details className="order-advanced-filters">`:** Chuyển ô tìm kiếm thành thanh tìm kiếm trực tiếp (Inline Input) đặt ngay dưới `<OrderStatusTabs />`.
* **Cập nhật cấu trúc Thẻ Đơn Hàng (`order-history-card`):**
  * Tách Header thành 2 phần: Trái (`StoreLabel` + nút `Chat` + nút `Xem shop`) và Phải (`Hành trình vận chuyển` + `Trạng thái đơn`).
  * Tái cấu trúc Footer: Căn trái dòng **Microcopy**, căn phải khối **Thành tiền** font to màu đỏ cam, và hàng nút bấm hành động động không còn menu ba chấm.

### 4.2. File `frontend/src/components/OrderPresentation.tsx`
* Bổ sung component `OrderLogisticsBadge`: Hiển thị icon `🚚` kèm mô tả sự kiện vận chuyển mới nhất (`order.shipping_status` hoặc snapshot GHN).
* Bổ sung component `OrderMicrocopyPrompt`: Tự động trả về câu nhắc phù hợp theo trạng thái đơn hàng (`SHIPPED`, `CANCELLED`, `COMPLETED`).

### 4.3. File `frontend/src/live/commerce.css`
* Định dạng các class chuyên biệt:
  * `.order-inline-search-bar`: Chiều cao 40px, viền đơn mảnh, icon kính lúp căn trái.
  * `.order-card-header-actions`: Nút Chat bo góc viền cam/nền cam nhạt, nút Xem shop viền xám mảnh.
  * `.order-total-price-highlight`: Font chữ 20px, màu `#ee4d2d`, font-weight 600, ký hiệu `₫` superscript.
  * `.order-action-btn-primary`: Nền cam `#ee4d2d`, chữ trắng, hover nền `#d73211`.
  * `.order-action-btn-secondary`: Nền trắng, viền `#cbd5e1`, chữ `#334155`, hover viền `#94a3b8`.

---

## 5. Tiêu chuẩn kiểm chứng sau triển khai (Acceptance Criteria)

1. **Hiển thị trên Desktop 1366 × 768:**
   * Thanh tìm kiếm hiển thị trực tiếp ngay dưới tab trạng thái mà không cần click mở dropdown.
   * Thẻ đơn hàng có chiều cao tối ưu ($180\text{px} - 220\text{px}$ cho đơn 1 món), không bị phình to vô ích.
2. **Khả năng thao tác (Usability):**
   * Người mua có thể Chat ngay với Shop bằng nút `[Chat]` trên thẻ đơn mà không cần vào xem chi tiết.
   * Người mua thấy ngay nút `[Đã Nhận Hàng]` và `[Yêu Cầu Trả Hàng/Hoàn Tiền]` mà không phải mở menu ẩn.
   * Các đơn đã hủy/hoàn tất có nút `[Mua Lại]` kích hoạt luồng thêm hàng vào giỏ trong 1 chạm.
3. **Biên dịch & Toàn vẹn dữ liệu:**
   * `npm --prefix frontend run build` đạt $0$ lỗi.
   * Không phá vỡ dữ liệu phiên đăng nhập và các API truy vấn đơn hàng hiện hữu.
