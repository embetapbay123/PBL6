# 09 — Nhân viên và cấu hình Store

Review 29/10/2026. Trạng thái dưới đây không thay thế bằng chứng; PASS chỉ áp dụng phạm vi và loại test ghi trong từng dòng. BLOCKED và N/A có lý do riêng.

| Ca kiểm tra | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| Invite/accept/revoke/expiry/trùng/nhiều Store | PASS | staff.invitation.integration tự host, DB unique membership; các nhánh repository được chạy lại. |
| Gửi lời mời qua gateway test có email mock | BLOCKED | staff.invitation.http nhận 503 EMAIL_DELIVERY_UNAVAILABLE; đây là cấu hình email mock không gửi thư, không coi là bug auth. |
| Thay quyền/lock hiện hành và Store scope | PASS | identity.lookup/messaging/catalog integration resolve live context; không dùng token cũ để vượt quyền. |
| UI tải toàn bộ staff/invitations | FAIL | CR-012. |
| Owner/Seller và cấu hình Store/version | PASS | store.regression và Seller permission browser. |
| Phí giao hàng thay đổi và quote | PASS | identity lookup/commerce quote binding/version kiểm lại; chưa test browser hai phiên đổi phí đồng thời. |

Lượt05 S39 runtimeEMAIL_ADAPTERmock đãkiểm, inviteStaff503 EMAIL_DELIVERY_UNAVAILABLEvàinvitationREVOKED nên chưa cópendingaccess; delivery/acceptBLOCKED. S40 UIhai viewport cấp/revokepermission đúngemail/version;409khôngghiđè, browserreloadmới retryđược. CR-012hơn100vẫngiữ; không dùng những ca này xácnhận toàn bộmời/nhiềuStore đãreviewđủ.

## Phát hiện

Lượt 03 X16: thu product.store.read_write của nhân viên SELLER thật; access token đang dùng nhận 403 khi GET product, quyền inventory khác vẫn 200. UI fixture mở editor bị từ chối và không PATCH; permissions đã khôi phục. Ca này không xác nhận toàn bộ luồng mời/khóa/nhiều Store đã walkthrough đủ. X17 lẫn context UI giữa hai tab thuộc CR-016, không phải bằng chứng server bỏ guard.

- [CR-012](findings.md#cr-012) — Quản lý nhân viên/lời mời bỏ dữ liệu sau trang đầu

## Nguồn kiểm tra

- Mã frontend theo feature và service backend tương ứng; OpenAPI/runtime contracts hiện tại.
- Unit: `artifacts/core-review-unit-results.json`; integration: `artifacts/core-review-integration.json` và `artifacts/core-review/m3-isolated-results.json`.
- Browser hồi quy: `artifacts/core-review-playwright.json`; tái hiện riêng: `artifacts/core-review/results.json` + `repro.spec.ts`.
- Hành trình thật: `artifacts/core-review/journeys.json`; ảnh mới: `artifacts/core-review/visual/`.
