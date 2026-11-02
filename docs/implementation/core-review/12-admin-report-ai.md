# 12 — Quản trị, báo cáo và AI

Review 29/10/2026. Trạng thái dưới đây không thay thế bằng chứng; PASS chỉ áp dụng phạm vi và loại test ghi trong từng dòng. BLOCKED và N/A có lý do riêng.

| Ca kiểm tra | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| User/Store lock, role/permission và cross-service revocation | PASS | store/identity.lookup/administration integration + auth guard source. |
| Taxonomy/attribute/moderation/version/audit | PASS | taxonomy/review/catalog/audit unit/integration; admin-catalog browser. |
| Voucher sàn | FAIL | Tính toán/quota/scope qua integration; UI quản lý thiếu edit/reactivation CR-013. |
| Doanh thu/discount/refund metrics | PASS | commerce SQL test kiểm trừ discount; refunded hiển thị riêng theo contract, không tự diễn giải là doanh thu net. |
| Khoảng thời gian báo cáo | FAIL | CR-014. |
| AI/gợi ý lỗi/provider none | PASS | ai-widgets fixtures, scope/handoff integration; UI không tự dựng câu trả lời thành công khi API lỗi. |
| Chất lượng model/provider/cost thực | BLOCKED | Không có provider thật; không suy ra chất lượng từ fallback/fixture. |

Lượt05 S42 cóUI/API/SQLreportStorethật hai viewport:104đơn,giátrị10672000,hànghoàntất90000,thu90000,hoàn0. Scopehiệnlọc payment theoorder.created_at; thêmPOL-07cầnchốtkỳcohort/cashflow, không tựkếtluận tiềnDBsai. Đây là snapshot lượt05; A24 đã đi UI/API/SQL Admin thật ở lượt06: tổng toàn sàn đúng, thiếu scopeStore/kỳ là OP-05 (FAIL). Không dùng reportOwner thay walkthroughAdmin. Xem [lượt05](continuation-05-seller-orders-operations.md).

## Phát hiện

- [CR-013](findings.md#cr-013) — Voucher thiếu thao tác sửa và mở lại
- [CR-014](findings.md#cr-014) — Báo cáo ngày mặc định bị lệch đầu tháng ở UTC+7

## Nguồn kiểm tra

- Mã frontend theo feature và service backend tương ứng; OpenAPI/runtime contracts hiện tại.
- Unit: `artifacts/core-review-unit-results.json`; integration: `artifacts/core-review-integration.json` và `artifacts/core-review/m3-isolated-results.json`.
- Browser hồi quy: `artifacts/core-review-playwright.json`; tái hiện riêng: `artifacts/core-review/results.json` + `repro.spec.ts`.
- Hành trình thật: `artifacts/core-review/journeys.json`; ảnh mới: `artifacts/core-review/visual/`.

Lượt06: đủ A01–A24 có kết luận riêng,10PASS/8FRICTION/6FAIL. CR-026/027 và UX-16/17/OP-05, A18 nối UX-15; xem [báo cáo Admin](continuation-06-admin.md) và coverage hiện hành. Các PASS kỹ thuật trong bảng lịch sử trên không chứng minh khả năng vận hành UI tương ứng.
