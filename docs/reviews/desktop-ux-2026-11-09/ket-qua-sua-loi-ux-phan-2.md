# Báo Cáo Kết Quả Xử Lý Lỗi UI/UX Desktop — Phần 2 (T15 – T19)

* **Ngày thực hiện:** 09/11/2026.  
* **Môi trường:** Production Demo (`https://demo.congnguyen.me`).  
* **Báo cáo gốc:** [shopee-lazada-part2-review.md](./shopee-lazada-part2-review.md).  
* **Trạng thái:** **100% ĐÃ HOÀN THÀNH & DEPLOYED (DEPLOY_OK)**.

---

## 1. Bảng tổng hợp kết quả giải quyết 5 lỗi (T15 – T19)

| Mã | Hạng mục | Thực trạng ban đầu | Giải pháp đã triển khai | Trạng thái |
|---|---|---|---|:---:|
| **T15** | Chi tiết đơn hàng (`OrderDetailPage.tsx`, `OrderPresentation.tsx`) | Diễn biến đơn bị giấu trong `<details>` đóng, form hủy đơn mở sẵn input rỗng và chính sách đổi trả bung chiếm 180px sidebar. | • Tạo component `OrderProgressTracker` (Horizontal Stepper 4 bước: *Đơn đã đặt* $\rightarrow$ *Đã xác nhận* $\rightarrow$ *Đang giao hàng* $\rightarrow$ *Hoàn tất*) hiển thị trực quan ngay đầu trang.<br>• Thay form hủy đơn thô bằng nút *"Hủy đơn hàng"* mở Modal với danh sách lý do chọn nhanh.<br>• Đóng mặc định `<details className="return-policy-details">`. | **ĐÃ XONG** |
| **T16** | Trang Gian hàng (`StorePage.tsx`) | Thiếu hoàn toàn khối Voucher khuyến mãi của shop; thiếu bộ lọc và sắp xếp sản phẩm trong gian hàng. | • Tích hợp query `listAvailableVouchers` theo `store_ids: id`.<br>• Hiển thị Carousel/Grid "Mã Giảm Giá Của Shop" kèm nút "Sao chép mã" có phản hồi trực quan.<br>• Bổ sung thanh công cụ sắp xếp: *Mặc định*, *Đánh giá cao*, *Giá thấp đến cao*, *Giá cao đến thấp*. | **ĐÃ XONG** |
| **T17** | Hệ thống Đánh giá (`ProductReviews.tsx`, `OrderDetailPage.tsx`) | Quét tải vòng lặp toàn bộ đơn hoàn tất cũ của user ngay trên trang PDP công khai; nhồi nhét form viết review kèm dropdown chọn đơn. | • Bỏ vòng lặp query `listOwnOrders` nặng nề trên trang PDP; chỉ hiển thị khi có yêu cầu đơn cụ thể.<br>• Thêm Modal viết đánh giá in-place trực tiếp tại `OrderDetailPage.tsx` gắn đúng mã sản phẩm trong đơn, có chấm sao và nhận xét chi tiết. | **ĐÃ XONG** |
| **T18** | Điều hướng Tài khoản (`CustomerSubNav.tsx`, `commerce.css`) | 11 liên kết ngang dàn trải gây vỡ thành 2-3 hàng trên màn hình 1366 × 768. | • Tách nhóm 6 tab cốt lõi: *Đơn hàng*, *Sổ địa chỉ*, *Đổi trả*, *Yêu thích*, *Đánh giá*, *Hồ sơ*.<br>• Đưa các mục phụ vào menu thả xuống *"Thêm ▾"*.<br>• Thiết lập CSS `flex-wrap: nowrap; overflow-x: auto;` chống tràn và không bao giờ bị vỡ hàng. | **ĐÃ XONG** |
| **T19** | Lịch sử đơn hàng (`OrderHistoryPage.tsx`) | Thiếu hành động CTA *"Mua lại"* (Repurchase / Buy Again) trên các đơn hàng đã hoàn tất hoặc đã hủy. | • Bổ sung nút CTA nổi bật *"Mua lại"* trên thẻ đơn hàng hoàn tất/hủy.<br>• Handler tự động thêm toàn bộ sản phẩm và SKU hợp lệ vào giỏ hàng (`addCartItem`) và điều hướng ngay tới `/cart`. | **ĐÃ XONG** |

---

## 2. Chi tiết kỹ thuật & Vị trí thay đổi mã nguồn

1. **`frontend/src/components/OrderPresentation.tsx`**:
   - Thêm `OrderProgressTracker` dùng `ProgressSteps` thể hiện các mốc: `["Đơn đã đặt", "Đã xác nhận", "Đang giao hàng", "Hoàn tất"]`. Đơn bị hủy/hết hạn hiển thị trạng thái riêng rõ ràng.
   - Nâng cấp `OrderTimeline` với summary thể hiện số lượng sự kiện trạng thái.
2. **`frontend/src/features/customer/OrderDetailPage.tsx`**:
   - Đặt `OrderProgressTracker` ngay đầu trang.
   - Thêm nút *"Mua lại"* khi đơn ở trạng thái `COMPLETED` hoặc `CANCELLED`.
   - Chuyển thao tác hủy đơn thành modal popup `CancelOrderModal` với các tùy chọn lý do thông dụng.
   - Thu gọn chính sách đổi trả (bỏ `open`).
   - Thêm Modal đánh giá sản phẩm in-place cho từng món hàng đã nhận.
3. **`frontend/src/features/customer/OrderHistoryPage.tsx`**:
   - Thêm hàm `handleRepurchase(order)` xử lý batch thêm hàng vào giỏ và chuyển trang `/cart`.
   - Hiển thị nút CTA *"Mua lại"* trên thẻ đơn hàng đã xong/hủy.
4. **`frontend/src/features/customer/StorePage.tsx`**:
   - Tích hợp `listAvailableVouchers` hiển thị voucher shop và nút sao chép mã code.
   - Thêm thanh công cụ sắp xếp 4 chế độ (Mặc định, Đánh giá cao, Giá tăng dần, Giá giảm dần).
5. **`frontend/src/features/customer/ProductReviews.tsx`**:
   - Triệt tiêu vòng lặp fetch ngầm toàn bộ đơn hàng của khách hàng trên trang chi tiết sản phẩm.
   - Chuyển hướng người mua muốn đánh giá về đúng trang Đơn hàng.
6. **`frontend/src/features/customer/CustomerSubNav.tsx` & `frontend/src/live/commerce.css`**:
   - Chuẩn hóa điều hướng ngang thành 1 hàng duy nhất (`nowrap`), gom nhóm 6 tab chính và menu thả xuống *"Thêm ▾"*.

---

## 3. Kiểm thử & Triển khai

- **Build Frontend:** `npm --prefix frontend run build` $\rightarrow$ **0 errors, build thành công trong 7.5s**.
- **Deploy Demo Server:** `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-demo-web.ps1` $\rightarrow$ **DEPLOY_OK** tại `https://demo.congnguyen.me/`.
