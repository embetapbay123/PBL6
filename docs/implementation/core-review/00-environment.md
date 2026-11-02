# 00 — Môi trường và dữ liệu

Review 29/10/2026. Trạng thái dưới đây không thay thế bằng chứng; PASS chỉ áp dụng phạm vi và loại test ghi trong từng dòng. BLOCKED và N/A có lý do riêng.

| Ca kiểm tra | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| Commit và working tree | PASS | HEAD 49ce6ee; 170 dòng status trước tạo artifact; source chưa commit được giữ nguyên. |
| Runtime test/gateway/worker/broker | PASS | docker ps: pbl6-fe-verify riêng, gateway 18080; frontend 3109 trả 200. Các container pbl6 demo không được dùng làm đích. |
| Nguồn backend đang chạy | PASS | 5 file nghiệp vụ checksum LF trùng workspace; không suy rộng thành toàn bộ image giống workspace. |
| Migrations cần dùng | PASS | Các API/DB journeys dùng favorites, return, audit, messaging hoạt động; schema M3 riêng áp toàn bộ migrations. |
| Edge và localhost | PASS | Browser test hiện tại chạy được khi dùng exec có quyền phù hợp. |
| Provider thật và thiết bị vật lý | BLOCKED | Payment/refund/AI provider disabled/none, email mock; không có iOS/Android vật lý. |

## Phát hiện

Chưa ghi nhận bug mới đủ bằng chứng trong phạm vi đã chạy; vẫn còn giới hạn được nêu ở bảng.

## Nguồn kiểm tra

- Mã frontend theo feature và service backend tương ứng; OpenAPI/runtime contracts hiện tại.
- Unit: `artifacts/core-review-unit-results.json`; integration: `artifacts/core-review-integration.json` và `artifacts/core-review/m3-isolated-results.json`.
- Browser hồi quy: `artifacts/core-review-playwright.json`; tái hiện riêng: `artifacts/core-review/results.json` + `repro.spec.ts`.
- Hành trình thật: `artifacts/core-review/journeys.json`; ảnh mới: `artifacts/core-review/visual/`.
