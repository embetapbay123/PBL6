# Đợt 57 — Yêu thích và đánh giá thuộc sở hữu

**F13: CR-003/004/015/019 đã FIXED/VERIFIED trong phạm vi desktop đã chốt. Tổng 49/52 finding gốc VERIFIED, 3 còn mở.** Chưa nghiệm thu vận hành toàn hệ thống: F07/UX-09, F17/CR-021/UX-10, F00/F18, sáu chuỗi cuối cùng baseline và rollback snapshot writer còn mở. Mobile được người dùng miễn; nghiên cứu người thật vẫn `USER_VALIDATION_PENDING`.

Runtime riêng `Node56/AI56/frontend57`, gateway18080/frontend3109; HEAD `49ce6ee9b6f5ad473ca40244614d3c79cd2c1846` cộng working tree. Chỉ frontend và test thay đổi trong đợt này; không thêm API, migration hoặc thay provider. Manifest/source56 của backend/AI và các baseline cũ giữ nguyên. Không commit hoặc triển khai production.

## Lỗi bổ sung và cách sửa

| ID | Mức / trạng thái | Điều kiện, actual và tác động | Sửa / tiêu chí nghiệm thu |
|---|---|---|---|
| CF-057-01 | P2 · CONFIRMED → FIXED/VERIFIED | Tab B đã nhận GET yêu thích rỗng nhưng chưa trả về UI; tab A lưu thành công và phát tín hiệu. GET cũ ghi đè khiến tab B mất trạng thái vừa lưu. Runtime trial tái hiện; fixture ban đầu PASS chưa mô phỏng đúng timing thật. | `favorite-state.ts` hủy query đang đọc trước invalidate khi nhận tín hiệu. Runtime giữ GET cũ qua `route.fetch`, phát tín hiệu sau PUT200 rồi trả dữ liệu cũ: hai tab vẫn đồng bộ, reload đúng. Tín hiệu không mang token/dữ liệu cá nhân. |
| CF-057-02 | P2 · CONFIRMED → FIXED/VERIFIED | Danh sách 21→20 clamp về trang1; tab khác thêm thành21. Khi mở lại trang2, cache rỗng cũ khiến UI lập tức về trang1, không tới món thứ21. Baseline và runtime run2 tái hiện. | `FavoritesPage.tsx` chỉ clamp sau GET hiện tại hoàn tất thành công; không xóa trong lúc refetch, không hiển thị empty giả khi loading/error. Cả nút tim và nút bỏ yêu thích ngoài thẻ qua chuỗi21→20→21→20. |
| CF-057-03 | P2 · CONFIRMED → FIXED/VERIFIED | Tạo đánh giá đã commit nhưng mất ACK: form inline cho sửa/gửi tiếp trước khi biết kết quả. Form riêng có thể phát hai PATCH khi kích hoạt rất nhanh. Server đã có unique/CAS; không kết luận đã phát sinh hai hiệu ứng database. | `ProductReviews.tsx`, `OwnReviewsPage.tsx`, `owned-review.tsx`: flight guard; khóa đối tượng/body khi UNKNOWN, đọc riêng đánh giá thuộc sở hữu và kiểm item/product/id/version. GET lỗi giữ attempt; đọc thấy nội dung đã lưu xác nhận mà không POST/PATCH lại. Chưa có bản tạo chỉ cho retry chủ động đúng body cũ. |
| CF-057-04 | P2 · CONFIRMED → FIXED/VERIFIED | Khi tab khác sửa trước, editor giữ draft nhưng không cho xem nội dung mới trước lần ghi tiếp; người dùng khó biết sẽ ghi đè gì. | GET riêng trả version mới, hiển thị rating/body/trạng thái mới cạnh draft giữ nguyên. Chỉ thao tác Lưu rõ ràng mới dùng version mới; không tự ghi đè hoặc tự mở lại đánh giá HIDDEN. |
| CF-057-05 | P2 · CONFIRMED → FIXED/VERIFIED | Chọn mục đánh giá chủ yếu theo mã đơn/item, khó phân biệt hai phân loại của cùng sản phẩm. Dữ liệu cũ thiếu snapshot chưa có chỉ dẫn đầy đủ. | Nhãn lấy tên, phân loại, lượng từ snapshot OrderItem, kèm mã đơn rút gọn; selection summary xác nhận món đang đánh giá. Legacy nói rõ thiếu tên/phân loại lúc đặt; không dựng lịch sử từ catalog hiện tại. |

Vị trí mã là `frontend/src/features/customer/` và các file nêu trong bảng. Không thay điều kiện backend: chỉ Customer sở hữu item COMPLETED được đánh giá; Customer khác bị từ chối; sửa đánh giá bị ẩn không phục hồi public.

## Bằng chứng và giới hạn

Artifact nằm tại `artifacts/core-fix/fix-20261030T100153Z/`:

- `review-recovery-baseline56-fixed-selector.json`: 4 FAIL chứng minh recovery/preview/double-activation cũ. Bản trước đó không có hậu tố fixed-selector là lỗi selector harness, không dùng chứng minh bug.
- `favorite-page-growth-baseline57.json`: 1 FAIL; `review-item-identity-baseline57.json`: 2 FAIL. `favorite-initial-get-baseline56.json` PASS nhưng chưa bao phủ race mạng thật; giữ nguyên để tránh diễn giải sai.
- `favorites-reviews-ui57-accepted.json`: **22 ca Edge desktop PASS**, gồm 9 favorites/owned, 9 recovery/identity và 4 reviews hiện có. Các report trial/identity có selector lỗi giữ lịch sử; không tính là app regression.
- `favorites-reviews-runtime57-final.json`: **1 hành trình thật PASS**, checkpoint trong thư mục cùng tên. Hai tab, hai Customer, hai Store, API/worker thật; chỉ fault phản hồi tại browser sau commit, không thay backend bằng fixture. Tạo review UI một POST; hai API create cùng nội dung trả cùng ID. Sửa hai tab gặp409, so bản mới rồi lưu một PATCH; lost ACK đọc lại xác nhận. HIDDEN/stopped vẫn sửa được qua trang riêng, public404; Customer khác không đọc/sửa được.
- `favorites-reviews-final-state57.json`: SELECT độc lập xác nhận review HIDDEN/v3/rating4, audit CREATE→HIDE→UPDATE→UPDATE, đúng item COMPLETED. Cả bốn lượt runtime: 8 Store LOCKED, 65 sản phẩm/variant STOPPED, taxonomy thu hồi hiển thị, favorites của8Customer rỗng; 4đơn COMPLETED và4đơn CANCELLED, ledger quantity/reserved khớp, không restock hai lần. Hai review đã tạo ở run3/final đều đúng audit/version.
- Có **4 khoản xác nhận COD thủ công tổng480000, hoàn0** trên cả4lượt; lượt được nghiệm thu thu120000. Đây là fixture có xác nhận thủ công, không phải bằng chứng tiền mặt/ngân hàng thật. 65 sản phẩm không thay nghiệm thu dataset300sản phẩm/100đơn.
- Trial thất bại race GET; run2 thất bại page cache; run3 hoàn tất nhánh review nhưng assertion favorites chạy trước ACK DELETE. Final đã đợi DELETE200 trước đọc lại. Không xóa các report thất bại, không chạy lại giao dịch để làm mất dấu.
- Đã xem `favorites-valid-page-desktop.png` và `owned-review-conflict-desktop.png`: phân trang đúng và bản mới/draft cùng đọc được. Ảnh filler cố ý không có media, dùng placeholder, không coi là bộ ảnh sản phẩm thật.
- Build frontend **2076 modules PASS**, còn cảnh báo chunk lớn cũ. `source-match-favorites-reviews57.json`/`runtime-image-favorites-reviews57.json`: **395 backend,43 AI,317 frontend/contract/test/config,10 image** đối chiếu; backend/AI unchanged56. Không tuyên bố chạy lại374unit/10SQL/9Python của56.

Các gate contract/drift/docs/typing/whitespace/secret cuối được ghi tại `favorites-reviews-gates57.json`; chỉ nghiệm thu khi tất cả PASS. Không chạy mobile, screen reader, native zoom hoặc thiết bị thật; không gán PASS cho phần này. Sáu chuỗi cuối, rollback writer và nghiên cứu người thật vẫn tách khỏi nghiệm thu F13.
