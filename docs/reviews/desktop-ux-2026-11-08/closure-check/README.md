# Kiểm chứng đóng N01/N02 — 08/11/2026

Đối chiếu mã hiện tại với demo https://demo.congnguyen.me trên desktop 1366 × 768 và 1440 × 900. Không sửa frontend/backend, không deploy. Phạm vi chỉ gồm số đếm đơn chờ, màu link primary và độ dày thẻ kiểm duyệt.

## Kết quả

| Nội dung | Kết quả | Kết luận |
|---|---|---|
| N01 — Làm mới số đếm | Query đã dùng staleTime 0. Callback cập nhật và đóng dialog đều làm mới pendingOrders và invalidate query số đếm. Effect đổi status cũng refetch. Trên UI, banner 3 đơn dẫn đúng tới 3 đơn PENDING; mở/đóng chi tiết rồi quay lại Tất cả vẫn hoạt động | Đã sửa đường đi mã gây ra N01. Chưa chạy ca thay đổi trạng thái làm số đếm từ 1 về 0 trên demo dùng chung |
| N02 — Mất chữ khi hover | Link Kiểm duyệt sản phẩm ở trạng thái hover=true, focus=true có chữ `rgb(255,255,255)` trên nền `rgb(168,54,27)`; chữ hiện rõ | Có thể đóng lỗi tương phản 1:1. Tuyên bố AAA cần sửa thành AA cho chữ nhỏ |
| Thẻ kiểm duyệt | Thẻ đầu đóng cả hai details: **436,8px tại 1366 × 768**, **427,2px tại 1440 × 900**. Textarea vẫn 44px, font 12px. Mở được mô tả đầy đủ | Đã giảm padding, nhưng mật độ chỉ cải thiện nhẹ so với lượt trước |

## N01: phạm vi xác nhận

Source `frontend/src/live/SellerWorkspace.tsx` đã có đủ cơ chế cập nhật số đếm tại các đường được báo lỗi. Không còn tình trạng callback chỉ refetch danh sách.

Để tránh thay đổi đơn trên demo dùng chung, lượt review không xác nhận/hủy đơn. Vì vậy đây là xác nhận bản sửa qua source và smoke UI, chưa phải bằng chứng E2E cho chuỗi 3 → 2 → 0. Trường hợp đó nên được kiểm thử với dữ liệu cô lập; khi pendingCount về 0, điều kiện render hiện tại sẽ ẩn banner.

Ghi chú nhỏ về triển khai: gọi cả `pendingOrders.refetch()` và invalidate cùng một active query là dư; có thể chọn một cơ chế để giảm refetch/hủy request không cần thiết. Không xem đây là lỗi chặn đóng N01.

## N02: màu hover đã sửa, mức tương phản cần ghi đúng

Tính theo relative luminance sRGB, chữ trắng `#ffffff` trên nền `#a8361b` đạt **6,55:1**, vượt AA 4,5:1 nhưng thấp hơn AAA 7:1 cho chữ thường. Tab đang dùng chữ nhỏ nên không thể ghi AAA >7:1. Đây là đính chính mức tiêu chuẩn, không phải lỗi mất chữ còn tồn tại. [W3C SC 1.4.6](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html).

Ảnh [tab sau sửa](evidence/primary-hover.png) thể hiện chữ đã đọc rõ tại trạng thái từng gây lỗi.

## Mật độ thẻ kiểm duyệt

So cùng viewport 1440 × 900: **449,2 → 427,2px**, giảm **22px, khoảng 4,9%**. Thẻ vẫn chiếm phần lớn chiều cao màn hình khi cộng khối bộ lọc phía trên.

Các phần còn chiếm không gian: cụm đầu 156,8px, hai summary đóng mỗi khối 44px và form 136,8px. Thông tin Store nhiều dòng, UUID đầy đủ và trạng thái lặp giữa badge/metadata vẫn là phần có thể tinh gọn. Không cần tiếp tục giảm chiều cao textarea hoặc vùng bấm summary chỉ để đạt số pixel thấp hơn.

Đánh giá: cập nhật spacing có tác dụng nhưng chưa nên mô tả là giảm đáng kể độ dày thẻ. Đây là phần polish UX còn lại, không phát sinh lỗi chức năng mới trong phạm vi kiểm tra.

Ảnh: [thẻ đóng](evidence/moderation-card.png), [mô tả mở đầy đủ](evidence/moderation-description.png).

## Kiểm tra

- `npm --prefix frontend run build`: **PASS** (TypeScript + Vite). Còn cảnh báo chunk lớn hơn 500kB như lượt trước.
- Không thấy console error trong phiên kiểm tra trang kiểm duyệt.
- Không chạy lại toàn bộ E2E; không đặt hàng, đổi trạng thái đơn hoặc quyết định kiểm duyệt trên demo.
- Đã đăng nhập lại Chủ Store An Nhiên và bỏ viewport override sau kiểm chứng.
- [Ảnh hàng đợi sau mở/đóng dialog và đổi tab](evidence/orders.png).

Lượt trước: [kiểm chứng N01/N02 và V01–V03](../final-check/README.md).
