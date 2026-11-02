# 01 — Xác thực và phân quyền

Review 29/10/2026. Trạng thái dưới đây không thay thế bằng chứng; PASS chỉ áp dụng phạm vi và loại test ghi trong từng dòng. BLOCKED và N/A có lý do riêng.

| Ca kiểm tra | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| Đăng ký/xác minh/reset/changePassword và lỗi token | PASS | Auth security PostgreSQL/HTTP tự host + auth-forms browser; adapter email có kiểm soát. |
| Login/reload/logout/đổi tài khoản trong một tab | PASS | scaffold và auth-forms, cookie httpOnly và epoch của request cũ. |
| Refresh context sau 401 | FAIL | CR-016: token cập nhật nhưng session/cache cũ. |
| Tài khoản/Store khóa, quyền thu hồi và ownership | PASS | Backend integration identity/catalog/messaging/handoff; guard resolve context hiện hành. |
| Hai tab thật đổi tài khoản khi token cũ bị thu hồi | FAIL | Lượt 03 X17 UI/API thật 1440/390: refresh trả B, đọc địa chỉ B nhưng còn kênh Owner A. Thu hồi token A có kiểm soát bằng đổi mật khẩu fixture; không giả là đã ngồi chờ expiry tự nhiên. Mật khẩu đã phục hồi. |
| Gửi email qua provider thật | BLOCKED | Chỉ peer SMTP/adapter test, không gửi email bên ngoài. |

Lượt 03 tiếp tục dùng runtime riêng, register/retry/reset trả 503 EMAIL_DELIVERY_UNAVAILABLE. Các PASS auth security ở bảng là subcase lịch sử bằng adapter kiểm soát; C14–C16 đầy đủ qua email runtime hiện BLOCKED. C18 logout/login một tab qua, khác với lỗi hai tab X17. X16 thu product permission của SELLER thật chặn token cũ 403; quyền inventory khác vẫn được dùng. Xem [lượt 03](continuation-03-auth-aftersales.md).

## Phát hiện

- [CR-016](findings.md#cr-016) — Refresh token đổi context nhưng UI và cache vẫn giữ phiên cũ

## Nguồn kiểm tra

- Mã frontend theo feature và service backend tương ứng; OpenAPI/runtime contracts hiện tại.
- Unit: `artifacts/core-review-unit-results.json`; integration: `artifacts/core-review-integration.json` và `artifacts/core-review/m3-isolated-results.json`.
- Browser hồi quy: `artifacts/core-review-playwright.json`; tái hiện riêng: `artifacts/core-review/results.json` + `repro.spec.ts`.
- Hành trình thật: `artifacts/core-review/journeys.json`; ảnh mới: `artifacts/core-review/visual/`.
