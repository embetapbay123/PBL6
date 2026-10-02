# Biên bản kiểm tra khung 2.2

Ngày: 02/10/2026. Môi trường local Windows/Docker Desktop, Node22.15.1, Python3.12.2 host/3.12.10 container, Flutter3.41.4/Dart3.11.1. Database giả; không gọi OpenAI/SePay thật. Đây là kiểm chứng khung, chưa nghiệm thu marketplace theo 98 FR/28 NFR.

| Kiểm tra | Kết quả | Phạm vi |
| --- | --- | --- |
| Node compile / Docker build | PASS | M1/M2/M3/shared và image M4/Web |
| Node unit | PASS — 5 test | JWT, service allowlist, SePay raw-body/timestamp, fingerprint và poison event validation |
| Integration DB/HTTP/broker | PASS — 10 test | Auth/replay/logout/CSRF; scope/version/audit/outbox; DB isolation; duplicate/unrouted/command concurrent; M4 và internal caller |
| Python M4 | PASS — 4 test | Mock deterministic; auth/health; 429; Chat validation/mock label |
| React build / Playwright Edge | PASS — 3 test | API catalog/empty state; login/profile/reload/logout; legacy mock accessible |
| Web visual QA | PASS | 1280px/390px; không tràn ngang, artifact screenshot local |
| Flutter analyze/test | PASS — 2 test | Analyzer không lỗi; pending widget và error utility, chưa e2e thiết bị |
| Migration/seed | PASS | 54 domain entity ở4 DB; migrate append-only + fake4 account/3 Product |
| Backup/restore M1 | PASS | Dump4 DB; restore M1 vào restore_drill_m1_20261002; 3 Product,2 migration,0 inventory invariant violation |
| OpenAPI | PASS | Swagger Parser validate87 public path/99 operation +8 internal path; types sinh được |
| Documentation link/status check | PASS — 69 Markdown /99 public API | Requirements/traceability/link và contract ownership/status |
| GitHub CI | NOT_RUN | Workflow đã tạo, chưa chạy trên GitHub |
| Android APK/device | NOT_RUN | Lệnh APK bị chặn do máy thiếu Android SDK; không có emulator/device result |
| Tải100 user/soak | NOT_RUN | Có k6 Catalog script; không có latency/capacity claim |
| AI evaluation/provider/payment/checkout recovery | NOT_RUN | Các nghiệp vụ chưa triển khai |

API công khai: **8 IMPLEMENTED_SAMPLE,4 MOCK_ONLY,87 NOT_IMPLEMENTED**. Internal:2 lookup mẫu,6 command guard/501. Mẫu Product chỉ title/description/expected_version. Mock Chat không có session/history lưu thật; recommendation chưa cá nhân hóa/training/consent thật.

Lệnh tái hiện ở [README](../../README.md) và [verification plan](verification-plan.md). Test source ở backend/tests, frontend/tests và mobile/test. Screenshot ở artifacts/screenshots, backup ở artifacts/backups (được ignore để không commit dữ liệu). Restore drill giữ database riêng, không thay dữ liệu m1–m4.

Các lỗi phát hiện khi dựng khung đã sửa: seed Inventory thiếu store_id; gateway cấu hình/DNS startup; refresh required rỗng sai OpenAPI3.0; response201 nội bộ lệch contract200; Product variant_values và AI payload thiếu field đích; unrouted event không được đánh dấu published. Kết quả trên chỉ áp dụng bản cuối đã sửa; không quy đổi thành PASS cho nghiệp vụ còn501.

Python test có warning deprecation từ Starlette/AnyIO; không làm test thất bại. Nền framework/config là bản khởi đầu; owner giữ lockfile, kiểm dependencies, quyền/tải/retention theo môi trường trước deploy.
