# Kiểm chứng V01–V03 và hai đính chính — 08/11/2026

Review desktop trên demo https://demo.congnguyen.me, viewport 1366 × 768 và đối chiếu thẻ kiểm duyệt tại 1440 × 900. Đối chiếu mã local; không sửa frontend/backend và không deploy trong lượt này. Đây là kiểm chứng bản sửa, không phải audit lại toàn bộ ứng dụng.

## Kết quả

| Mục | Kết quả thực tế | Trạng thái |
|---|---|---|
| V01 — Kiểm duyệt | Textarea cao **44px**, min-height 44px, font 12px. Thumbnail gọn; mở được mô tả đầy đủ. Thẻ đầu khi đóng cả hai details vẫn cao **449,2px** ở cả hai viewport, so với 634px của lượt trước | Đã sửa lỗi CSS và khả năng đọc mô tả; cải thiện chiều cao khoảng 29%, chưa xác nhận được tuyên bố ~200px |
| V02 — Ưu tiên đơn | Nhãn **Cần xác nhận** đúng PENDING. Banner hiển thị 3 đơn; bấm nút chuyển tới `/seller/orders?status=PENDING`, danh sách đúng 3 đơn cần xác nhận | Đạt mục tiêu đưa việc cần làm vào tầm nhìn mà giữ chế độ tra cứu; còn lỗi đồng bộ số đếm bên dưới |
| V03 — Kho | Đã bỏ nhãn “Ảnh hiện tại”; view tồn chính được phân cách với nhóm tra cứu. Dòng SKU chỉ giữ Xem sản phẩm, Điều chỉnh và Thêm; Chỉnh sửa sản phẩm hiện và truy cập được trong menu | Có thể đóng V03 trong phạm vi kiểm tra |
| R01 — Sidebar | Chữ active đo được `rgb(124,45,18)` trên `rgb(255,241,235)`, tương ứng `#7c2d12` / `#fff1eb` | Đạt ngưỡng tương phản AAA cho chữ nhỏ; tỷ lệ tính lại **8,49:1**, không phải 8,79:1 |
| R02 — Chính sách | Checkout một shop Mây Xanh hiện đúng nhãn **Chính sách đổi trả**, mở được thời hạn, phí, điều kiện và địa chỉ nhận trả | Có thể đóng đính chính nhãn |

Ngưỡng tương phản AAA cho chữ thường là 7:1 theo [W3C SC 1.4.6](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html). Kết luận này áp dụng cho cặp màu chữ active được đo, không phải chứng nhận WCAG toàn ứng dụng.

## Hai lỗi còn cần xử lý

### N01 — P2: Banner không làm mới số đơn chờ sau khi xử lý đơn

**Bằng chứng source:** `frontend/src/live/SellerWorkspace.tsx:1384–1390` tải số đếm bằng query riêng `store-orders-pending-count`. Callback `updated` tại dòng 1485–1488 chỉ gọi `data.refetch()` cho danh sách `store-orders`; không refetch/invalidate query số đếm. `useCommand` chỉ quản lý busy/error/notice, không làm mới cache. Query số đếm không có polling.

**Tình huống:** vào Tất cả đang có 3 đơn chờ → xác nhận/hủy một đơn → đóng modal. Danh sách được cập nhật nhưng banner có thể vẫn báo 3. Nếu chuyển sang tab PENDING rồi quay lại Tất cả trong cùng trang, query số đếm cũng không tự chạy theo bộ lọc. `staleTime: 15000` chỉ đánh dấu dữ liệu cũ sau thời gian đó; không phải lịch tự refetch.

**Hướng sửa:** refetch/invalidate cả danh sách và số đếm sau cập nhật trạng thái thành công. Kiểm tra trường hợp xử lý đơn chờ cuối cùng: banner phải biến mất. Đây là phát hiện từ đường đi mã; không xác nhận/hủy đơn trên demo dùng chung để tái hiện.

### N02 — P2: Chữ tab primary biến mất khi con trỏ ở trên tab

Trên `/admin?tab=catalog&section=products`, sau bấm tab **Kiểm duyệt sản phẩm**, con trỏ còn ở trên tab và nhãn không đọc được. Computed style của link là **color `rgb(198,66,32)` và background `rgb(198,66,32)`**, tương phản 1:1.

**Nguyên nhân:** `.live-market a:hover` tại `frontend/src/live/commerce.css:54–56` đặt chữ về accent và có specificity cao hơn `.live-market .ui-button-primary` trong `frontend/src/styles/ui-components.css:20–26`. Các tab được render dưới dạng Link primary tại `frontend/src/features/admin/AdminOperations.tsx:104`.

**Hướng sửa:** quy định foreground rõ cho link primary ở hover/focus/active trong component button, rồi kiểm tra tab và các CTA dạng link dùng chung. Không cần đổi màu sidebar vừa sửa.

Ảnh: [tab bị mất chữ](evidence/moderation.png).

## Ghi nhận về mật độ thẻ kiểm duyệt

Không coi 200px là điều kiện nghiệp vụ bắt buộc, nhưng báo cáo hoàn thành nên dùng số đo thực tế. Thẻ đầu 449,2px gồm cụm đầu 156,8px, hai summary đóng mỗi khối 44px và form 138,8px, cộng padding/margin. Thông tin Store vẫn chiếm nhiều dòng; trạng thái kiểm duyệt còn lặp giữa badge và đoạn metadata; UUID đầy đủ vẫn mở sẵn. Nếu tiếp tục giảm tải đọc, đây là phần có thể tinh gọn tiếp. Không cần bỏ khả năng xem mô tả đầy đủ hoặc thông tin nhận diện gian hàng.

Ảnh: [thẻ tại 1440 × 900](evidence/moderation-1440.png), [textarea sau sửa](evidence/moderation-card.png), [mở mô tả](evidence/moderation-description.png).

## Kiểm tra và bằng chứng

- `npm --prefix frontend run build`: **PASS** (TypeScript + Vite). Vite còn cảnh báo chunk lớn hơn 500kB; không chặn build.
- Không chạy lại toàn bộ E2E và không xác nhận tuyên bố toàn bộ E2E đã pass trong lượt này.
- Không đặt hàng, xác nhận/hủy đơn, sửa tồn hay kiểm duyệt sản phẩm trên demo. Đã khôi phục chọn toàn bộ giỏ hàng và đăng nhập lại Chủ Store An Nhiên.
- [Banner đơn hàng](evidence/orders-banner.png), [kho](evidence/inventory.png), [menu thao tác kho](evidence/inventory-menu.png), [chính sách một shop](evidence/checkout-policy.png).

Các mục R03/R04/R08 đã được kiểm chứng ở [lượt trước](../README.md); không kiểm lại toàn bộ các tình huống đó trong lượt này.
