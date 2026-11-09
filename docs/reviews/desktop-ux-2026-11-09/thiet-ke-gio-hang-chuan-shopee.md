# Thiết kế Giao diện Giỏ hàng Desktop Chuẩn Shopee

**Thời điểm phân tích**: 09/11/2026  
**Nguồn đối sánh**: Ảnh chụp thực tế Giỏ hàng Shopee Desktop (`https://shopee.vn/cart`) do người dùng cung cấp.  
**Mục tiêu**: Loại bỏ hoàn toàn thanh Sidebar chật hẹp, chuyển đổi Giỏ hàng sang mô hình Bảng toàn chiều rộng (Full-width 12-column Grid) kết hợp Thanh thanh toán cố định ở đáy (Sticky Bottom Bar) chuẩn Shopee 100%.

---

## 1. Phân tích đối chiếu từ 2 ảnh chụp thực tế Shopee

Trong 2 ảnh chụp màn hình giỏ hàng của Shopee:

```
+--------------------------------------------------------------------------------------------------------------------------+
| [ ] Sản phẩm                                             Đơn Giá          Số Lượng         Số Tiền           Thao Tác     |
+--------------------------------------------------------------------------------------------------------------------------+
| [ ] [Yêu thích] chasinrabbits.vn  [Chat]                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------ |
| [Mua Kèm] Bạn đã chọn 3 quà tặng  Thay Đổi >                                                                             |
| [ ] [ẢNH]  Tên sản phẩm 2 dòng                     Phân Loại: Hạt       265.653₫     [-] 1 [+]     265.653₫           Xóa      |
|            [Tag 11.11] [MUA 1 MIỄN PHÍ 1]                                                                            Tìm tương tự |
| ------------------------------------------------------------------------------------------------------------------------ |
| 🎟 Đã giảm 45.000₫  Xem thêm voucher >                                                                                    |
| 🚚 Giảm 500.000₫ phí vận chuyển đơn tối thiểu 0₫  Tìm hiểu thêm >                                                         |
+--------------------------------------------------------------------------------------------------------------------------+
| [ ] [Yêu thích] The PetFamily Store  [Chat]                                                                              |
| ...                                                                                                                      |
+--------------------------------------------------------------------------------------------------------------------------+
| === STICKY BOTTOM BAR (CỐ ĐỊNH Ở ĐÁY MÀN HÌNH) ========================================================================= |
|                                                                    🎟 Shopee Voucher              Chọn hoặc nhập mã >     |
| ------------------------------------------------------------------------------------------------------------------------ |
| [ ] Chọn Tất Cả (19)    Xóa      Lưu vào mục Đã thích   |  Tổng thanh toán (5 sản phẩm): 2.079.897₫    [   Mua Hàng   ]  |
|                                                         |  Tiết kiệm 627.944₫                                            |
+--------------------------------------------------------------------------------------------------------------------------+
```

---

## 2. 5 Trụ cột Kiến trúc Tái thiết kế Giỏ hàng

### Trụ cột 1: Chuyển đổi sang Bố cục Toàn chiều rộng (Full-width 100%)
- **Vấn đề hiện tại**: CSS `.cart-layout` đang ép giỏ hàng thành 2 cột (`grid-template-columns: minmax(0, 1fr) 340px;`). Cột Sidebar 340px làm cho bảng sản phẩm bên trái bị co hẹp, làm vỡ chữ và khiến giỏ hàng trông chật chội.
- **Giải pháp**: Xóa bỏ Sidebar 340px trong `.cart-layout`. Giỏ hàng trải rộng 100% trong Container tối đa 1200px.

### Trụ cột 2: Thanh tiêu đề Bảng (Cart Table Header Bar)
- Chiều cao ~46px, nền trắng `#ffffff`, viền nhẹ `#e2e8f0`, bo góc 4px.
- Phân bổ 12 cột:
  - Cột 1 - 5 (Col 5): Checkbox Chọn tất cả + Nhãn `"Sản phẩm ({tổng món} món)"`
  - Cột 6 - 7 (Col 2): `"Đơn giá"` (Căn phải)
  - Cột 8 - 9 (Col 2): `"Số lượng"` (Căn giữa)
  - Cột 10 - 11 (Col 2): `"Số tiền"` (Căn phải)
  - Cột 12 (Col 1): `"Thao tác"` (Căn giữa)

### Trụ cột 3: Khối Cửa hàng (Store Group Header & Footer)
- **Header**:
  - Checkbox chọn cả shop.
  - Tag đỏ cam `Yêu thích` (`background: #ee4d2d; color: #fff; font-size: 11px; padding: 2px 5px; border-radius: 2px;`).
  - Tên Store đậm nét + Nút Chat mini (`ContactStoreButton compact`).
- **Footer**:
  - Dòng Voucher Shop: Icon vé cam `🎟 Voucher của Shop  Xem thêm voucher >`.
  - Dòng Vận chuyển: Icon xe tải `🚚 Miễn phí vận chuyển cho đơn hàng`.

### Trụ cột 4: Hàng Sản phẩm (Product Rows & Shopee Color Accent)
- Thumbnail vuông 80×80px, bo góc nhẹ.
- Tên sản phẩm giới hạn 2 dòng (line-clamp-2).
- Dropdown Phân loại hàng: `Phân Loại Hàng: [Tên biến thể] ▾`.
- Stepper Số lượng: `[-] [ input ] [+]` chuẩn chiều cao 30px, viền xám mảnh.
- **Thành tiền**: Màu cam Shopee `#ee4d2d`, font 15px đậm nét (thay vì màu xanh lá cũ).
- Nút Xóa màu xám chuột, hover màu cam/đỏ.

### Trụ cột 5: Thanh Thanh toán Cố định ở đáy (Sticky Bottom Bar)
- Cố định ở đáy màn hình (`position: sticky; bottom: 0; z-index: 40; background: #fff; box-shadow: 0 -4px 16px rgba(0,0,0,0.08); border-top: 1px solid #e2e8f0;`).
- **Tầng trên (Voucher)**:
  - Cột phải: `🎟 Shopee Voucher  Chọn hoặc nhập mã >`.
- **Tầng dưới (Action)**:
  - Bên trái:
    - Checkbox `Chọn Tất Cả ({tổng số})`.
    - Nút `Xóa` các món đã chọn.
  - Bên phải:
    - Nhãn: `Tổng thanh toán ({số lượng đã chọn} sản phẩm):`.
    - Tiền tổng: **`{subtotal} ₫`** (màu `#ee4d2d`, font 24px đậm nét).
    - Nút **`Mua Hàng`**: Nền cam Shopee `#ee4d2d`, cao 44px, rộng 180px, chữ trắng in hoa đậm nét, hover `#d73211`.
