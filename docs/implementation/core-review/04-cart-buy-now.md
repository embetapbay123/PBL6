# 04 — Giỏ hàng và mua ngay

Review 29/10/2026. Trạng thái dưới đây không thay thế bằng chứng; PASS chỉ áp dụng phạm vi và loại test ghi trong từng dòng. BLOCKED và N/A có lý do riêng.

| Ca kiểm tra | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| Gộp cùng variant và concurrent adds | PASS | commerce-regression HTTP/DB + journeys 3+1=4 đúng semantics add. |
| Mua ngay khi giỏ có sẵn | FAIL | CR-001: UI dùng semantics add cho ý định mua riêng. |
| Min/max quantity, xóa/chọn một phần, nhiều Store | PASS | Cart validation unit/integration, customer/live-market và hành trình 2 Store. |
| Badge/cache sau mutation | FAIL | CR-008. |
| Checkout trong khi PATCH/DELETE giỏ đang chạy | FAIL | CR-018: fixture giữ PATCH xác nhận CTA vẫn enabled và chuyển bước khi request chưa xong. |
| Đổi giá/status/tồn kho trước quote/confirm | PASS | quote-variants/order-recovery/catalog integration kiểm lại và conflict; UI test chặn quote cũ. |

## Phát hiện

- [CR-001](findings.md#cr-001) — Mua ngay cộng số lượng cũ trong giỏ vào checkout
- [CR-008](findings.md#cr-008) — Badge giỏ không cập nhật sau xóa hoặc checkout
- [CR-018](findings.md#cr-018) — Cho chuyển checkout khi cập nhật giỏ đang chạy

## Nguồn kiểm tra

- Mã frontend theo feature và service backend tương ứng; OpenAPI/runtime contracts hiện tại.
- Unit: `artifacts/core-review-unit-results.json`; integration: `artifacts/core-review-integration.json` và `artifacts/core-review/m3-isolated-results.json`.
- Browser hồi quy: `artifacts/core-review-playwright.json`; tái hiện riêng: `artifacts/core-review/results.json` + `repro.spec.ts`.
- Hành trình thật: `artifacts/core-review/journeys.json`; ảnh mới: `artifacts/core-review/visual/`.
