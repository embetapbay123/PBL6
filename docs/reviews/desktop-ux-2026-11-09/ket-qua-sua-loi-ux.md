# Tổng Hợp Kết Quả Sửa Lỗi UI/UX & Tối Ưu Hóa Giao Diện Desktop
## Đối chiếu chuẩn Shopee & Lazada — Triệt tiêu quá tải nhận thức

* **Ngày thực hiện:** 09/11/2026
* **Môi trường triển khai:** https://demo.congnguyen.me (Desktop tiêu chuẩn 1366 × 768 và 1440 × 900)
* **Báo cáo review gốc:** [shopee-lazada-ux-review.md](./shopee-lazada-ux-review.md)
* **Trạng thái:** Toàn bộ 6 phát hiện (T09 – T14) và các hạng mục tinh chỉnh phát sinh đều đã được khắc phục, kiểm thử build thành công và deploy live.

---

## 1. Danh sách các hạng mục đã xử lý

| Mã | Phân hệ / Màn hình | Vấn đề ban đầu | Giải pháp & Kết quả sau sửa | Trạng thái |
|---|---|---|---|---|
| **T09** | Đơn hàng & Đổi trả (`OrderPresentation.tsx`, `ReturnRequestView.tsx`) | Rò rỉ chỉ dẫn nội bộ của thủ kho (*"Xác nhận với khách trước khi lấy hàng"*, *"không ghi giao dịch hoàn tiền giả"*) ra giao diện khách mua. | Bổ sung phân định ngữ cảnh `scope?: "CUSTOMER" \| "STORE" \| "ADMIN"`. Khách hàng chỉ thấy câu chữ tiêu chuẩn (*"Phân loại tiêu chuẩn"*, *"Đơn 0đ không phát sinh khoản hoàn"*); ẩn hoàn toàn trạng thái đối chiếu kho nội bộ với khách. | **Đã đóng** |
| **T10** | Đặt hàng (`CheckoutPage.tsx`) | Phân mảnh nhận thức: bung sẵn toàn bộ địa chỉ, mỗi shop 1 dropdown thanh toán riêng, ô nhập voucher thủ công chiếm diện tích lớn. | 1. Thẻ địa chỉ thu gọn ($65\text{px}$) kèm nút *"Thay đổi"* (chọn xong tự đóng).<br>2. Bộ chọn phương thức thanh toán toàn đơn (COD / SePay 1-click), gom per-store vào dropdown mở rộng khi cần.<br>3. Nút *"Chọn mã"* mở Drawer là chính, đưa form nhập tay vào `<details>`. Chiều cao trang giảm >45%. | **Đã đóng** |
| **T11** | Chi tiết sản phẩm (`ProductDetail.tsx`) | Link thừa `← Tất cả sản phẩm`, nút Shop chen giữa Tên và Giá, cảnh báo tồn kho kiểu debug, thuộc tính render thô `JSON.stringify`. | 1. Xóa link thừa (đã có breadcrumb).<br>2. Di dời nút Shop xuống dưới khối Mua & Chính sách, tạo luồng mắt liền mạch: Tên $\rightarrow$ Đánh giá $\rightarrow$ Giá + Tồn $\rightarrow$ Phân loại $\rightarrow$ Nút Mua.<br>3. Hàm `formatAttributeValue` làm sạch dữ liệu hiển thị.<br>4. Câu chữ tồn kho ngắn gọn theo `CONTENT_GUIDELINES.md`. | **Đã đóng** |
| **T12** | Quản trị kiểm duyệt (`ProductModeration.tsx`) | Mở sẵn 20 `<form>` kèm `<textarea>` khiến trang kéo dài >$11.000\text{px}$. | Đóng gói form quyết định vào `<details>` với nút toggle *"Ẩn sản phẩm…"* / *"Bỏ ẩn sản phẩm…"*. Chiều cao mỗi thẻ giảm từ ~$500\text{px}$ xuống ~$80\text{px}$ (giảm >80%). | **Đã đóng** |
| **T13** | Giỏ hàng (`CartPage.tsx`, `CartProduct.tsx`) | Dòng giỏ dàn trải dạng card bo tròn, thông tin bẻ dòng nhiều tầng, mỗi món cao $160\text{px} - 220\text{px}$. | Chuyển sang dạng Bảng phẳng chuẩn Desktop (Sản phẩm \| Đơn giá \| Số lượng \| Số tiền \| Thao tác), ẩn giá trùng lặp trong cột sản phẩm. | **Đã đóng** |
| **T14** | Tìm kiếm / Trang chủ (`MarketplaceHome.tsx`) | Vẫn giữ khối gợi ý `CustomerRecommendations` ở chân trang khi đang lọc tìm kiếm từ khóa cụ thể. | Thêm điều kiện ẩn gợi ý khi có bộ lọc (`!filtered \|\| items.length === 0`). Trang tìm kiếm kết thúc bằng thanh phân trang, không gây nhiễu nhận thức. | **Đã đóng** |
| **P01** *(Polish)* | Tinh chỉnh Giỏ hàng (`CartPage.tsx`, `commerce.css`) | 1. Số tiền dài bị chèn ép sát nút Xóa.<br>2. Tên Shop quá to (padding 18px thừa).<br>3. Ô số lượng chỉ cho bấm `-` / `+`, không cho gõ số trực tiếp. | 1. Tái phân bổ lưới 12 cột: cột Thành tiền chiếm `col-span-2` kèm `whitespace-nowrap` chống che chữ `₫`.<br>2. Thu gọn thanh gian hàng còn ~34px, icon 15px, bỏ padding thừa.<br>3. Component `QuantityInput` cho phép click gõ số trực tiếp (Enter/Blur tự lưu) hoặc bấm nút. | **Đã đóng** |
| **P02** *(Polish)* | Chuẩn hóa bộ chọn số lượng (`ProductDetail.tsx`, `commerce.css`) | Ô số lượng trang sản phẩm bị lỗi viền lồng viền (nút bo tròn độc lập, ô input có viền lồi bên trong). | Đồng bộ class `.cart-qty-control` chuẩn Shopee/Lazada: viền đơn liền khối `1px solid #cbd5e1`, phẳng hoàn toàn, chiều cao 30px, các ô ngăn cách bằng đường kẻ dọc mảnh. | **Đã đóng** |

---

## 2. Chi tiết các file mã nguồn đã thay đổi

### Frontend Components & Views
1. **`frontend/src/components/OrderPresentation.tsx`**
   - Thêm tham số `scope?: "CUSTOMER" | "STORE" | "ADMIN"` cho `OrderItemIdentity`, `OrderDeliveryAddress`, `ReturnPolicyNotice`.
   - Chuẩn hóa thông điệp thân thiện cho khách mua hàng, giữ câu nhắc tác nghiệp kho cho `scope="STORE"` / `scope="ADMIN"`.
2. **`frontend/src/features/returns/ReturnRequestView.tsx`**
   - Ẩn dòng thông tin "Trạng thái kho" (đối chiếu kho, cộng tồn) đối với khách hàng (`scope === 'CUSTOMER'`).
   - Đơn 0đ: Đổi thành `"Đơn 0đ không phát sinh khoản hoàn."` (loại bỏ câu nhắc hạch toán nội bộ).
3. **`frontend/src/features/customer/MarketplaceHome.tsx`**
   - Điều kiện render `CustomerRecommendations`: `{(!filtered || products.data?.items?.length === 0) && ...}`.
4. **`frontend/src/features/customer/ProductDetail.tsx`**
   - Bỏ link `← Tất cả sản phẩm`.
   - Di chuyển `product-store-actions` xuống dưới khối Mua hàng & Chính sách.
   - Thêm hàm `formatAttributeValue` xử lý thuộc tính mảng/object sạch sẽ.
   - Đổi bộ chọn số lượng sang class chuẩn phẳng liền khối `.cart-qty-control`.
5. **`frontend/src/features/customer/CheckoutPage.tsx`**
   - Thêm state `showAddressPicker`, hiển thị mặc định thẻ địa chỉ tóm tắt 1 dòng + nút *"Thay đổi"*.
   - Bổ sung bộ chọn thanh toán toàn đơn (COD / SePay), gom tùy chỉnh từng gian hàng vào `<details>`.
   - Thêm `<details>` cho form nhập mã voucher trực tiếp, hiển thị mã đang áp dụng dạng badge.
6. **`frontend/src/features/admin/ProductModeration.tsx`**
   - Bọc form nhập lý do kiểm duyệt và `<textarea>` vào thẻ `<details>` với nút tóm tắt *"Ẩn sản phẩm…"* / *"Bỏ ẩn sản phẩm…"*.
7. **`frontend/src/live/CartProduct.tsx`**
   - Bổ sung cờ `hideInlinePrices?: boolean` để ẩn khối đơn giá & thành tiền nội dòng khi hiển thị trên bảng giỏ hàng desktop.
8. **`frontend/src/live/StoreLabel.tsx`**
   - Bổ sung prop `iconSize?: number` (mặc định 18, hỗ trợ 15 cho header giỏ hàng), format link inline không vỡ layout.
9. **`frontend/src/features/customer/CartPage.tsx`**
   - Tạo component `QuantityInput`: cho phép nhập số lượng bằng bàn phím (hỗ trợ Enter/blur) và bấm nút `-` / `+`.
   - Thêm hàm `setDirectQuantity` cập nhật số lượng trực tiếp qua API.
   - Header bảng chuẩn: `Sản phẩm (5 cột) | Đơn giá (2 cột) | Số lượng (2 cột) | Số tiền (2 cột) | Thao tác (1 cột)`.
   - Tinh gọn `StoreGroupHeader` thành thanh tiêu đề sát viền trên.
10. **`frontend/src/live/commerce.css`**
    - Đặt `padding: 0;` cho `.cart-store-group`.
    - Định nghĩa CSS chuyên biệt cho `.cart-qty-control` và `.purchase-quantity`: viền đơn liền khối mảnh, phẳng `border-radius: 0` bên trong, triệt tiêu viền lồng viền và mũi tên cuộn mặc định của trình duyệt.

---

## 3. Quy trình xác minh & Triển khai

1. **Kiểm tra biên dịch Typescript & Vite:**
   ```bash
   npm --prefix frontend run build
   # Kết quả: tsc -b thành công (0 lỗi), vite build hoàn tất trong 8-10 giây.
   ```
2. **Triển khai lên máy chủ demo:**
   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-demo-web.ps1
   # Kết quả: Container pbl6-demo-web-1 recreate thành công, DEPLOY_OK.
   ```
3. **Kiểm tra công khai:**
   - URL: https://demo.congnguyen.me
   - Đã kiểm tra trực quan trên các màn hình: Trang chủ tìm kiếm, Giỏ hàng (`/cart`), Chi tiết sản phẩm (`/products/:id`), Thanh toán (`/checkout`), Quản trị kiểm duyệt (`/admin/products`), Đơn hàng & Đổi trả (`/customer/orders`, `/customer/returns`).
