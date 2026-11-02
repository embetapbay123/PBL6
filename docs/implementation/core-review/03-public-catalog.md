# 03 — Khám phá và chi tiết sản phẩm

Review 29/10/2026. Trạng thái dưới đây không thay thế bằng chứng; PASS chỉ áp dụng phạm vi và loại test ghi trong từng dòng. BLOCKED và N/A có lý do riêng.

| Ca kiểm tra | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| Tìm kiếm/lọc/sort/phân trang/URL/back-forward | PASS | catalog-state/scaffold + catalog integration. |
| Store khóa và sản phẩm ẩn/dừng | PASS | public-store/catalog integration; không lộ detail public. |
| Variant/giá/ảnh/số lượng và unavailable | PASS | customer/live-market fixture; DB QuoteVariants xác minh tồn khả dụng. |
| Danh mục→Store→product; recommendations API | PASS | public-store/ai-widgets và source routing. |
| Hết hàng trên luồng thêm giỏ | PASS | Backend quote trả conflict, UI không bịa add thành công; chưa coi nút enabled là bằng chứng còn tồn. |
| Chat nổi và nội dung thẻ mobile | FAIL | CR-005, ảnh mới xem trực tiếp. |
| Ảnh thật trên mọi route, bàn phím hệ điều hành mobile | BLOCKED | Seed chính thiếu ảnh; có fixture ảnh; chưa có thiết bị vật lý. |

## Phát hiện

- [CR-005](findings.md#cr-005) — Chat nổi che thông tin thẻ sản phẩm trên mobile

## Nguồn kiểm tra

- Mã frontend theo feature và service backend tương ứng; OpenAPI/runtime contracts hiện tại.
- Unit: `artifacts/core-review-unit-results.json`; integration: `artifacts/core-review-integration.json` và `artifacts/core-review/m3-isolated-results.json`.
- Browser hồi quy: `artifacts/core-review-playwright.json`; tái hiện riêng: `artifacts/core-review/results.json` + `repro.spec.ts`.
- Hành trình thật: `artifacts/core-review/journeys.json`; ảnh mới: `artifacts/core-review/visual/`.
