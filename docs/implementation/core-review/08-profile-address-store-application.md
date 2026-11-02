# 08 — Hồ sơ, địa chỉ và mở Store

Review 29/10/2026. Trạng thái dưới đây không thay thế bằng chứng; PASS chỉ áp dụng phạm vi và loại test ghi trong từng dòng. BLOCKED và N/A có lý do riêng.

| Ca kiểm tra | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| Hồ sơ load/update/validation và lỗi | PASS | profile.address integration và source form; GET sau update. |
| Đồng bộ hub sau lưu | FAIL | CR-011. |
| Địa chỉ thêm/xóa/default/ownership | PASS | profile.address PostgreSQL/HTTP; browser API mode. |
| Sửa nội dung địa chỉ qua UI | FAIL | CR-010. |
| Địa chỉ đổi sau quote | PASS | ResolveCheckoutContext và quote fingerprint/recovery tests; snapshot theo server. |
| Hồ sơ Store pending/rejected/approved và race | PASS | store.regression, store-applications browser; real journey approval tạo Store mới. |
| Quyền/membership sau duyệt ở phiên đang mở | FAIL | Context refresh cần chủ động; CR-016 ghi root cause session không đồng bộ. Invitation đã có refreshContext riêng. |

Lượt04 S01–S04 đã có UI/API thật hai viewport với Customer riêng: gửi/trùng/pending/rejected/gửi lại/duyệt đều khớp; reload nhận STORE_OWNER/membership OWNER và vào portal được. S04 FRICTION vì thiếu hướng dẫn kiểm tra lại/tiếp tục, không phải mất membership hoặc bắt buộc logout. Ca này tách với CR-016 context của hai identity lẫn sau refresh. Hồ sơ/Store test đã thu hồi, lịch sử giữ. Xem [lượt04](continuation-04-seller-catalog-stock.md).

## Phát hiện

- [CR-010](findings.md#cr-010) — Không có thao tác sửa nội dung địa chỉ đã lưu
- [CR-011](findings.md#cr-011) — Lưu hồ sơ không cập nhật tổng quan tài khoản
- [CR-016](findings.md#cr-016) — Refresh token đổi context nhưng UI và cache vẫn giữ phiên cũ

## Nguồn kiểm tra

- Mã frontend theo feature và service backend tương ứng; OpenAPI/runtime contracts hiện tại.
- Unit: `artifacts/core-review-unit-results.json`; integration: `artifacts/core-review-integration.json` và `artifacts/core-review/m3-isolated-results.json`.
- Browser hồi quy: `artifacts/core-review-playwright.json`; tái hiện riêng: `artifacts/core-review/results.json` + `repro.spec.ts`.
- Hành trình thật: `artifacts/core-review/journeys.json`; ảnh mới: `artifacts/core-review/visual/`.
