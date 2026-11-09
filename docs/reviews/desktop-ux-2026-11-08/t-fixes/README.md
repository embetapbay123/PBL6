# Kiểm chứng bản sửa T01–T08

Ngày 08/11/2026. Đối chiếu mã local và demo https://demo.congnguyen.me, desktop 1366 × 768, Khách hàng A. Không sửa frontend/backend hoặc deploy trong lượt review này.

## Kết luận

**Có thể đóng T01, T02, T04, T05, T06, T07 trong phạm vi đã kiểm tra. T03 và T08 mới hoàn thành một phần.** Có thêm một hồi quy P2 trong source truy vấn sắp xếp giá, S01 bên dưới.

| Mục | Kết quả kiểm chứng | Trạng thái |
|---|---|---|
| T01 | Tìm `áo`: 8 kết quả chính, 4 Dành cho bạn, 4 Sản phẩm đã xem. Không giao nhau giữa ba nhóm đang hiện. Toàn trang khoảng 2.794px, so với 5.598px của trường hợp lọc ở lượt trước | Đạt mục tiêu giảm tải; không so tỷ lệ chiều cao như benchmark tuyệt đối vì hai URL khác nhau |
| T02 | Hồ sơ đang kiểm hàng giữ câu trạng thái, trách nhiệm phí và khoản hoàn; địa chỉ/hướng dẫn gửi trước đó nằm trong details tham khảo đóng mặc định | Đạt |
| T03 | Trang 1 gộp 20 sự kiện thành 8 nhóm, tiêu đề có mã và trạng thái cụ thể. Nhưng cùng đơn xuất hiện ở trang 2/3 như một nhóm mới với trạng thái cũ | Chưa đóng |
| T04 | Thông báo đổi trả tới `/customer/returns?order_id=...`, tự mở đúng hồ sơ `#C6820A81` của đơn `#2EC54E27`. Link thanh toán có `#payment`, section tồn tại và mở được nội dung tiền | Đạt trong tình huống một hồ sơ/đơn đã thử |
| T05 | Hai sản phẩm đang hiển thị chỉ còn hai trái tim bỏ lưu, không còn nút cam Bỏ yêu thích ở ngoài. Source giữ nút phụ cho sản phẩm không còn công khai | Đạt; chưa thao tác bỏ lưu hoặc thử dữ liệu sản phẩm ngừng hiển thị trên demo |
| T06 | `áo` và `ao` đều cho đúng 8 tên sản phẩm áo, không còn tai nghe/đồ gia dụng trong vùng kết quả chính | Đạt lỗi khớp chuỗi con đã báo; xem hồi quy sắp xếp giá S01 |
| T07 | Dòng Áo thun sọc Coast còn **162px**, trước là 265,8px, giảm khoảng 39%. Picker chỉ mở khi bấm Đổi phân loại và Hủy được | Đạt. Hiện là form mở rộng inline, không phải popup/dialog như mô tả; cách này vẫn đáp ứng mục tiêu |
| T08 | Đã bỏ các dòng cập nhật hồ sơ chung. Nhưng vẫn còn 8 dòng Đã ghi biên bản kiểm hàng, trong đó ba dòng cùng phút 09:21 và hai dòng cùng phút 16:32 | Chưa đóng phần gộp/lược mốc kiểm hàng |

## T03 — P2: Gộp sau phân trang khiến trạng thái mới nhất chỉ đúng trong từng trang

**Tái hiện trên demo:** mở Thông báo → trang 1 → Trang sau → Trang sau.

| Trang | Nhóm của cùng đơn `#31FD4AD2` |
|---|---|
| 1 | **Đơn #31FD4AD2 đã hoàn tất**, có 3 cập nhật trước trong nhóm ORDER_STATUS |
| 2 | **Đơn #31FD4AD2: Đang chờ xác nhận**, một nhóm ORDER_STATUS khác |
| 3 | **Đơn #31FD4AD2: Đang xác nhận đặt hàng**, tiếp tục là một nhóm ORDER_STATUS khác |

Nhóm RETURN_STATUS của đơn `#2EC54E27` cũng tách giữa trang 1 và 2. Vì thế chưa thể gọi đây là một mục duy nhất theo `kind:order_id` trên toàn danh sách. Nút đánh dấu nhóm chỉ biết những sự kiện đã nhận trong trang hiện tại, không bao gồm sự kiện cùng nhóm nằm ở trang khác; đường này được xác nhận qua source, không đánh dấu đã đọc trên demo.

**Nguyên nhân:** backend vẫn LIMIT/OFFSET các sự kiện, mỗi trang 20; frontend sau đó mới tạo groupMap từ `query.data.items`. Primary là sự kiện đầu trang của nhóm, không phải luôn là sự kiện mới nhất toàn nhóm.

**Hướng sửa:** phân trang theo nhóm từ nguồn dữ liệu, lấy primary mới nhất và tổng chưa đọc của toàn nhóm; lịch sử nhóm tải riêng khi mở. Nếu phải xử lý phía client, cần một mô hình tải/gộp xuyên các trang có bảo toàn count và lịch sử, tránh chỉ gộp mảng 20 phần tử rồi trình bày như nhóm hoàn chỉnh. Không ẩn sự kiện thanh toán/đổi trả cần phản hồi chỉ để giảm số lượng.

**Kiểm tra sau sửa:** cùng đơn không được xuất hiện như nhóm trạng thái chính khác nhau ở ba trang; đánh dấu nhóm phải cập nhật đúng toàn nhóm và tổng chưa đọc.

**Vị trí:** [NotificationsPage.tsx:130](C:/PBL6/frontend/src/features/customer/NotificationsPage.tsx:130), [notification.service.ts:18](C:/PBL6/backend/commerce-service/src/notification/notification.service.ts:18).

**Ảnh:** [trang 1](evidence/notifications-page1.png), [trang 2](evidence/notifications-page2.png), [toàn trang 3](evidence/notifications-page3-full.png). Ảnh viewport trang 2 không chứa toàn bộ các nhóm; các trạng thái của đơn mẫu được đọc trực tiếp từ nội dung trang sau khi tải.

## T08 — P2: Lịch sử mẫu vẫn còn các mốc kiểm hàng cùng phút

Mở hồ sơ `#C6820A81` → Lịch sử đổi trả. Các dòng Đã ghi nhận cập nhật hồ sơ đã biến mất, nhưng vẫn có các dòng Đã ghi biên bản kiểm hàng:

- **09:21:52, 09:21:47, 09:21:44 ngày 03/11**.
- **16:32:54, 16:32:52 ngày 03/11**.

Cùng các mốc khác, tổng vẫn là 8 dòng kiểm hàng. Nội dung khách nhìn thấy của mỗi dòng chỉ là nhãn và thời điểm, không có kết luận để giải thích sự khác nhau giữa các lần lưu.

Source có hàm gộp nhưng chỉ xét hai sự kiện liên tiếp và bỏ qua gộp nếu event có note/fault_party. Đồng thời lọc riêng từng trang đã tải. Những note của action kiểm hàng lại không nằm trong tập customerNotes được render cho khách. Không nên xóa các sự kiện chỉ vì gần nhau về thời gian khi chúng chứa quyết định/tiền/phí khác nhau; cần gộp cách trình bày hoặc hiện kết luận có ý nghĩa.

**Hướng sửa:** giữ mốc kiểm hàng gần nhất làm tóm tắt, mở các lần ghi trước khi cần; hoặc nhóm các lần lưu cùng bước nhưng bảo toàn thay đổi quan trọng. Làm việc trên các trang đã tải theo cách không lặp nhóm tại ranh giới trang. Giữ nguyên audit cho seller/admin.

**Kiểm tra sau sửa:** ba mốc 09:21 không còn là ba dòng chính giống hệt nhau; chấp thuận, trách nhiệm phí, kết luận kiểm hàng và hoàn tiền vẫn truy cập được. Không gộp mất khoản hoàn hoặc quyết định mới.

**Vị trí:** [AfterSaleHistory.tsx:47](C:/PBL6/frontend/src/features/returns/AfterSaleHistory.tsx:47), lọc từng trang ở dòng 79.

**Ảnh:** [lịch sử sau bản sửa](evidence/return-history.png).

## S01 — P2 mới: Khóa sắp xếp giá đã tách khỏi SKU có thể mua trong khoảng lọc

**Phát hiện qua source, chưa tái hiện bằng dữ liệu demo.** Trong lần thay đổi repository để sửa tìm kiếm, cột `min_price` hiện là:

```sql
(SELECT min(v.price_vnd)
 FROM product_variant v
 WHERE v.product_id=p.id AND v.status='ACTIVE') AS min_price
```

Phần WHERE của kết quả vẫn kiểm tra SKU còn hàng và nằm trong khoảng giá. Nhưng giá dùng ORDER BY không còn JOIN inventory và không dùng min/max của bộ lọc. Frontend CatalogCard lại hiển thị giá của các SKU có thể mua trong khoảng đó. Vì vậy thứ tự giá và giá người dùng nhìn thấy có thể khác nhau.

**Ví dụ kiểm chứng logic:** lọc 140.000–200.000 ₫, sắp xếp giá tăng dần.

| Sản phẩm | SKU và tồn | Giá thẻ hiển thị | Khóa sort hiện tại |
|---|---|---|---|
| A | 100.000 ₫ hết hàng; 180.000 ₫ còn hàng | 180.000 ₫ | 100.000 ₫ |
| B | 150.000 ₫ còn hàng | 150.000 ₫ | 150.000 ₫ |

Cả A và B đều qua lọc. Query hiện tại xếp A trước B, trong khi giá hiển thị tăng dần phải là B rồi A. Trường hợp SKU 100.000 còn hàng nhưng nằm ngoài khoảng lọc cũng cho sai lệch tương tự.

**Hướng sửa:** khôi phục biểu thức giá đại diện dùng cùng điều kiện tồn/range với danh sách SKU đang được hiển thị; giữ fallback phù hợp cho sản phẩm hết hàng khi không có lọc. Kiểm tra cả price_asc và price_desc với sản phẩm nhiều SKU.

**Vị trí:** [catalog.repository.ts:70](C:/PBL6/backend/catalog-service/src/catalog/catalog.repository.ts:70); ORDER BY dùng alias ở dòng 62–63. Frontend chọn giá ở [CatalogCard.tsx](C:/PBL6/frontend/src/live/CatalogCard.tsx).

11 unit test đã chạy vẫn pass vì các test hiện tại kiểm tra phần điều kiện/ràng buộc và chuỗi ORDER BY, chưa kiểm tra dữ liệu nhiều SKU tạo ra thứ tự đúng theo giá thực tế. Cần bổ sung ca dữ liệu như bảng trên khi sửa hồi quy này.

## Bằng chứng các mục đã đạt

- [T01: toàn trang tìm áo](evidence/search-full.png), [T06: tìm ao](evidence/search-ao.png).
- [T02/T04: hồ sơ mở trực tiếp, tiền/phí còn rõ](evidence/return-after-inspection.png), [đích thanh toán](evidence/payment-anchor.png).
- [T05: yêu thích sau bỏ nút lặp](evidence/favorites.png).
- [T07: giỏ đóng picker](evidence/cart.png), [picker khi mở](evidence/cart-picker.png).

## Kiểm tra và giới hạn

- `npm --prefix frontend run build`: **PASS**, còn cảnh báo chunk lớn hơn 500kB.
- Backend Jest: `tests/unit/search.test.ts` và `tests/unit/catalog-price-range.test.ts`: **2 suites / 11 tests PASS**.
- Không chạy toàn bộ E2E hoặc test tích hợp database trong lượt review này.
- Không sửa số lượng/phân loại, bỏ lưu, đánh dấu thông báo, tạo yêu cầu hoặc đổi trạng thái đơn. Đã đóng picker và khôi phục đăng nhập Chủ Store An Nhiên; bỏ viewport override.
- Không thấy console error trong log cuối phiên quan sát. Không xem đó là chứng nhận mọi route không có lỗi.
- Chưa kiểm tra đổi trả có nhiều hồ sơ cùng một đơn, gợi ý hết dữ liệu, sản phẩm ngừng công khai và failure của thao tác đánh dấu nhóm.

Báo cáo trước: [review T01–T08](../next-flows/README.md).
