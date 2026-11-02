# 10 — Yêu thích và đánh giá

Review 29/10/2026. Trạng thái dưới đây không thay thế bằng chứng; PASS chỉ áp dụng phạm vi và loại test ghi trong từng dòng. BLOCKED và N/A có lý do riêng.

| Ca kiểm tra | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| Favorite persistence và ownership | PASS | favorites integration + reload test có sẵn. |
| Tim giữa nhiều thẻ/chi tiết | FAIL | CR-003/004. |
| Bỏ mục cuối trang >1 | FAIL | CR-019 xác nhận total=20, page=2, thông báo toàn danh sách trống. |
| Sản phẩm không public trong favorites | PASS | 404 chuyển unavailable card, các lỗi khác không giả rỗng. |
| Đánh giá mục đã mua/COMPLETED/owner/replay/version | PASS | reviews integration + browser; real journey tạo review từ order item thật. |
| Sửa review không tự bỏ moderation HIDDEN | PASS | Backend review update giữ status theo tests/source. |
| Lối vào sửa review HIDDEN sau reload | FAIL | CR-015 CONFIRMED lượt 03 bằng UI/API thật 1440/390: sửa VISIBLE được → Admin hide → reload/tìm lại item → không có sửa, gửi lại 409 REVIEW_ALREADY_EXISTS. Review gốc đã phục hồi. |

## Phát hiện

- [CR-003](findings.md#cr-003) — Chi tiết sản phẩm không đọc trạng thái yêu thích đã lưu
- [CR-004](findings.md#cr-004) — Tim trên các thẻ cùng sản phẩm không đồng bộ
- [CR-015](findings.md#cr-015) — Đánh giá bị ẩn không có đường sửa sau khi tải lại
- [CR-019](findings.md#cr-019) — Bỏ yêu thích cuối trang 2 hiển thị danh sách trống dù còn 20 mục

## Nguồn kiểm tra

- Mã frontend theo feature và service backend tương ứng; OpenAPI/runtime contracts hiện tại.
- Unit: `artifacts/core-review-unit-results.json`; integration: `artifacts/core-review-integration.json` và `artifacts/core-review/m3-isolated-results.json`.
- Browser hồi quy: `artifacts/core-review-playwright.json`; tái hiện riêng: `artifacts/core-review/results.json` + `repro.spec.ts`.
- Hành trình thật: `artifacts/core-review/journeys.json`; ảnh mới: `artifacts/core-review/visual/`.
