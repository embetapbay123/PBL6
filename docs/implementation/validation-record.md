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
| Documentation link/status check | PASS — 76 Markdown /99 public API | 72 file docs + README gốc/Web/Mobile + mẫu issue; requirements/traceability/link và contract ownership/status |
| GitHub CI lần đầu (`c33f022`) | FAIL — 5/10 integration; Mobile PASS | [Run ban đầu](https://github.com/embetapbay123/PBL6/actions/runs/36961385925): năm test dừng ở login500; các bước docs/contract/Node/Web build trước đó đạt |
| Android APK/device | NOT_RUN | Lệnh APK bị chặn do máy thiếu Android SDK; không có emulator/device result |
| Tải100 user/soak | NOT_RUN | Có k6 Catalog script; không có latency/capacity claim |
| AI evaluation/provider/payment/checkout recovery | NOT_RUN | Các nghiệp vụ chưa triển khai |

API công khai: **8 IMPLEMENTED_SAMPLE,4 MOCK_ONLY,87 NOT_IMPLEMENTED**. Internal:2 lookup mẫu,6 command guard/501. Mẫu Product chỉ title/description/expected_version. Mock Chat không có session/history lưu thật; recommendation chưa cá nhân hóa/training/consent thật.

Lệnh tái hiện ở [README](../../README.md) và [verification plan](verification-plan.md). Test source ở backend/tests, frontend/tests và mobile/test. Screenshot ở artifacts/screenshots, backup ở artifacts/backups (được ignore để không commit dữ liệu). Restore drill giữ database riêng, không thay dữ liệu m1–m4.

Các lỗi phát hiện khi dựng khung đã sửa: seed Inventory thiếu store_id; gateway cấu hình/DNS startup; refresh required rỗng sai OpenAPI3.0; response201 nội bộ lệch contract200; Product variant_values và AI payload thiếu field đích; unrouted event không được đánh dấu published. Kết quả trên chỉ áp dụng bản cuối đã sửa; không quy đổi thành PASS cho nghiệp vụ còn501.

Python test có warning deprecation từ Starlette/AnyIO; không làm test thất bại. Nền framework/config là bản khởi đầu; owner giữ lockfile, kiểm dependencies, quyền/tải/retention theo môi trường trước deploy.

## Rà soát bàn giao cho member — 02/10/2026

README dẫn thẳng tới [task đầu tiên](task-assignment.md), phân công hiện hành, API nội bộ và mẫu issue. Project plan bỏ bảng owner AI cũ; roadmap ghi99 API; Web origin sửa thành port3000 theo vite.config.ts.

Lượt CI đầu tiên phát hiện vấn đề môi trường Linux: khóa private được tạo mode0600 bởi tài khoản runner, M3 chạy UID1000 nên không đọc được khi UID khác. Setup nay ghi LOCAL_UID/LOCAL_GID, M3 dùng các ID đó để đọc khóa bind-mount; khóa vẫn không nằm trong Git và không mở quyền đọc cho mọi User. Kết quả CI gắn với từng commit; xem [Scaffold checks](https://github.com/embetapbay123/PBL6/actions/workflows/ci.yml) hoặc badge README để biết bản mới nhất, không dùng lượt FAIL cũ làm trạng thái cố định của repo.

Kiểm tra đợt cập nhật: docs74 file và cả hai OpenAPI PASS; setup chạy lại giữ nguyên cấu hình/khóa PASS; kiểm quyền mode0600 trong Linux container xác nhận UID khác bị EACCES và UID khớp đọc được PASS; Compose config hợp lệ và10 integration local chạy lại PASS. Kiểm quyền dùng file giả, không in nội dung khóa thật.

## Kanban và task trên GitHub — 02/10/2026

Đã tạo8 issue (#1–#8), cả8 Assignee tạm embetapbay123 theo yêu cầu; owner thực hiện theo label riêng. Board khởi đầu5 Todo +3 Backlog, chưa tự gắn task nào In progress/Done. Metadata/assignee được đọc lại từ GitHub để kiểm chứng.

Kiểm sync: source API/snapshot cho cùng board và chạy lại không đổi file; status trùng được cảnh báo ở Blocked; task đóng not_planned không tính Done; PR bị loại; title được escape để không phá bảng/HTML. Các smoke check đạt; docs76 file đạt. Workflow dùng token repo để đọc issue và chỉ commit board sinh ra. GitHub Projects native chưa tạo: credential hiện thiếu scope project, tab trình duyệt trả504; board hiện là Issues + Markdown đồng bộ.
