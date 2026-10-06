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
| Documentation link/status check | PASS — 75 Markdown /99 public API | 71 file docs + README gốc/Web/Mobile + mẫu issue; requirements/traceability/link và contract ownership/status |
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

## Kanban GitHub Projects — 02/10/2026

[PBL6 — Team Kanban](https://github.com/users/embetapbay123/projects/1/views/2) là nguồn tiến độ duy nhất. Readback sau khi giao toàn bộ phạm vi xác nhận71 issue/card,24 Todo +47 Backlog, đủ6 Status option; view tổng nhóm theo Owner và dùng Status làm cột. Issue chứa scope/tiêu chí; Owner và Assignee ghi người thực hiện/tài khoản.

Username đã xác nhận: Công=embetapbay123, Thịnh=QT-2005, Hoa=mimidangeiu, Trí=phantri1912, Hatsaphone=HATSAPHONE. Cả4 member đã được cấu hình WRITER trên Project; Owner của toàn bộ task đã đọc lại đúng người. Trí đã nhận lời mời repo Write;14 task gán trực tiếp phantri1912 được đọc lại đúng. Hoa/Thịnh/Hatsaphone còn pending; các task đó vẫn tạm embetapbay123 nhưng Owner đúng người.

Đã bỏ board Markdown, workflow đồng bộ, hai script sync và hai file metadata trùng. Workflow cũ được disable trước khi bỏ label trạng thái; repo không còn label status:*. README/mẫu issue/hướng dẫn dùng kéo thẻ trực tiếp, thêm issue mới vào Project và nghiệm thu trước Done. View mặc định không sử dụng đã bỏ; task/nội dung issue giữ nguyên. Không lưu token cá nhân trong Git.

Kiểm tra docs75 Markdown và git diff --check đạt. Không thay code nghiệp vụ trong đợt này.

## Giao toàn bộ phạm vi — 02/10/2026

Đã giữ8 issue cũ và bổ sung63 issue, tổng71 task có owner, priority, scope, cách bắt đầu, dependency tích hợp, tiêu chí riêng và bằng chứng. Phân công: Công14, Thịnh14, Hoa18, Trí14, Hatsaphone11. Task được công bố trước toàn bộ; không mở issue từng đợt hoặc bắt UI/module chờ tất cả API thật để bắt đầu phần độc lập.

Đối chiếu99/99 public operation (mỗi operation một task BE chính),8/8 internal operation; cả API sample/mock cũng có task hoàn thiện. Readback71 issue/card, Owner/Priority đúng mapping, dependency URL đúng issue, không có task trùng/label status cũ. Priority ban đầu29 P0 +38 P1 +4 P2;24 Todo và47 Backlog, chưa tự gắn In progress/Done.

[Mở bảng tổng](https://github.com/users/embetapbay123/projects/1/views/3): BOARD_LAYOUT, group theo Owner single-select, cột theo Status. [View tiến độ](https://github.com/users/embetapbay123/projects/1/views/2) hiển thị Owner/Priority. Tài liệu scope được cập nhật một lần; không thêm bảng Markdown trạng thái, metadata task hay workflow/script đồng bộ vào repo. Status sống trên Project, nội dung task sống trong issue.

Có handoff rõ cho tracking search/view/cart/purchase và Guest chat, ngoài mapping operation. FLOW-01 chốt contract bổ sung; fixture chỉ để phát triển/test, nghiệm thu cần nguồn dữ liệu/API thật. Kiểm docs75 Markdown và git diff --check đạt; đây là giao kế hoạch, không nghiệm thu nghiệp vụ hoặc hứa deadline từ số task.

## Schema baseline đã chốt — 02/10/2026

- [Database schema](database-schema.md) chốt ownership, danh mục cột 54 entity, snapshot, transaction và chính sách đổi schema.
- Migration 003 bổ sung unique/FK/CHECK/index ở M1–M4; đã áp dụng trên database local có dữ liệu. M4 có revision Alembic tương ứng, dùng chung ledger với migrator Node.
- `python scripts/check_database_schema.py`: cả 4 bộ migration mới và 12 kiểm tra vi phạm invariant đạt; dữ liệu fixture hợp lệ ghi được; schema test rollback hoàn toàn.
- Kiểm tra được đưa vào CI; kết quả local không thay thế kết quả CI trên commit mới hoặc kiểm thử nghiệp vụ của member.
- Sau khi áp dụng migration 003: build backend thành công, 10 integration test hiện có đạt; `docs:check` đạt 76 Markdown / 99 API.

## Nền DTO/contract bàn giao 2.2.1 — 02/10/2026

- Public: 99 operation giữ 8 IMPLEMENTED_SAMPLE / 4 MOCK_ONLY / 87 NOT_IMPLEMENTED; Internal: 11 operation, 2 sample / 9 stub. Không hoàn thành nghiệp vụ thay member.
- Generated DTO/runtime registry, typed inputs/outputs và fixture bao phủ 110 operation; 7 event có schema, typed envelope và fixture. CI kiểm drift và generated types.
- Local: contract/parser và docs check đạt; backend/Web build đạt; 19 Node unit, 14 integration, 13 Python, 7 Web e2e và 2 Flutter test đạt; Flutter analyze không có lỗi. Web local chạy Playwright với Microsoft Edge.
- Schema invariant kiểm tra lại trên schema transaction tách biệt: 4 bộ migration và 12 tình huống vi phạm được chặn. Migration 001–003 không sửa.
- Demo Owner sửa tên/mô tả Product thật, reload đọc lại, sau test khôi phục tên; 409/422/501 form hiển thị lỗi. Order/Payment rollback và Catalog write/audit/outbox rollback được kiểm trên PostgreSQL.
- GitHub CI trên commit `03f89fc` đạt cả contracts-and-node và mobile: [run 37031999009](https://github.com/embetapbay123/PBL6/actions/runs/37031999009). Runner Linux kiểm setup, schema, migration/seed, integration, Python, Playwright Chromium và Flutter từ checkout mới. Compose chờ healthcheck PostgreSQL TCP trước khi kiểm schema/migrate để tránh chạy trong giai đoạn init database.
- Không chạy APK/device, tải 100 user, provider thanh toán thật hoặc AI thật; các phần này giữ trong task owner. CI trên GitHub phải xem theo commit mới, không suy từ kết quả local.

## Bàn giao M1 QuoteVariants — 05/10/2026

- [PR #86](https://github.com/embetapbay123/PBL6/pull/86) của Thịnh đã merge vào `main` tại commit `f4e49dba155b63ebe251d2c8a45d75e07a93d6ba`. QuoteVariants là `IMPLEMENTED`; internal hiện có 11 operation: 2 sample, 1 implemented, 8 stub. Public API giữ nguyên trạng thái.
- [CI trên merge commit](https://github.com/embetapbay123/PBL6/actions/runs/37282746278) đạt cả contracts-and-node/mobile, bao gồm schema, migration/seed, integration PostgreSQL/HTTP, Python, Web và Flutter. Đây là bằng chứng CI; đợt cập nhật docs không chạy lại integration local vì Docker chưa chạy.
- Chạy lại local riêng `tests/unit/quote-variants.test.ts`: 4 test đạt, kiểm lỗi dependency/service identity và mapper tiền an toàn. Contract parser, runtime drift và docs/link check đạt sau cập nhật tài liệu.
- [Issue #7](https://github.com/embetapbay123/PBL6/issues/7) đóng completed, thẻ Kanban Done; body có bằng chứng PR/CI, payload và tiêu chí đã đạt. Thịnh tiếp tục [CAT-04 #11](https://github.com/embetapbay123/PBL6/issues/11), vẫn Todo đến khi bắt đầu code.
- [CART-01 #3](https://github.com/embetapbay123/PBL6/issues/3), [CART-02 #8](https://github.com/embetapbay123/PBL6/issues/8), [ORDER-01 #21](https://github.com/embetapbay123/PBL6/issues/21) có đầu vào M1 thật để tích hợp; không chuyển Done chỉ vì dependency #7 đã merge. M2 phải gửi Store thật, không tự thêm field Product vào quote response và không dùng fallback giá/Store khi lỗi.
- ActiveStores của M3 vẫn là sample; kho reservation/consume/release/restock và luồng checkout xuyên service còn nghiệm thu theo issue owner. Không thêm migration hoặc đổi contract response trong đợt cập nhật docs này.

## 05/10/2026 — bản tổng Hoa trên feat/mob-03

- Đồng bộ Cart product_id và migration M2 004; migration 001–003 không đổi. 99 public + 11 internal operation, 7 event có DTO/fixture và drift check đạt. Public hiện 18 IMPLEMENTED / 8 IMPLEMENTED_SAMPLE / 4 MOCK_ONLY / 69 NOT_IMPLEMENTED; internal 2 sample / 2 IMPLEMENTED / 7 stub. Trạng thái là code trong nhánh, issue chưa Done trước review/merge/nghiệm thu.
- Backend build và 155 unit test đạt, gồm quota ledger và lỗi dependency. 26 integration test qua HTTP/PostgreSQL đạt: concurrent Cart, UPDATE RETURNING Cart/Voucher/Order, stale version, Order/COD state, review ownership/HTTP 200 và công thức doanh thu.
- Schema fresh migration/constraint check của 4 DB và 12 negative invariant check đạt. Không query DB xuyên service, không tự backfill Product ID cho Cart legacy.
- Flutter analyze sạch, 31 test đạt (widget + Dio request contract). Web build và 7 Playwright test đạt qua Chrome trên Windows; 13 Python test M4 đạt. CI vẫn phải kiểm trên Ubuntu và Flutter 3.41.4.
- Phạm vi chưa hoàn thành: quote/validate cần M3 ResolveCheckoutContext; confirm/cancel/confirm-state/ship-state còn 501 trước ghi; COD cần PaymentService; report cần low-stock và số liệu User/Store thật. Không dùng mock success trong test để nghiệm thu checkout/payment/Android thiết bị.
- Chi tiết tiếp tục: [bàn giao Hoa](hoa-consolidated-handoff.md). PR cũ bị thay thế chỉ là dọn chuỗi branch trùng; không đóng các issue nghiệp vụ một phần.

## 06/10/2026 — hoàn thiện phần độc lập của PR Hoa

- transitionStoreOrder được IMPLEMENTED: PENDING → CONFIRMED → PROCESSING → SHIPPED → COMPLETED; PREPARING không được nhảy trạng thái. Shipment mô phỏng, Order/history/audit/outbox cùng transaction. Đơn PENDING phải được checkout/payment consume kho trước đó; không gọi consume lần nữa khi Seller xác nhận.
- 155 backend unit và 28 HTTP/PostgreSQL integration test đạt. Test mới kiểm concurrent chuyển SHIPPED chỉ tạo một Shipment, thiếu Shipment rollback completion, completion chuyển DELIVERED và Voucher trùng code trả 409.
- Flutter analyze sạch, 40 test đạt: refresh lỗi tạm thời giữ token; giỏ tải đủ trang; quote response cũ/hết hạn bị chặn; địa chỉ tải lỗi có retry; confirm 409 tải quote mới; confirm 501 giữ màn hình và cùng Idempotency-Key qua retry. Mock success không chứng minh checkout giao dịch thật hoặc Android thiết bị.
- OpenAPI/parser, docs/link check và drift 99 public + 11 internal + 7 event đạt. Public hiện 19 IMPLEMENTED / 8 IMPLEMENTED_SAMPLE / 4 MOCK_ONLY / 68 NOT_IMPLEMENTED. Migration 001–003 không đổi; đợt này không thêm migration.
- Giữ đúng owner: Thịnh phụ trách command kho/low-stock M1, Trí phụ trách checkout context/count M3, Công phụ trách Payment. Confirm/cancel/COD còn dependency và chưa nghiệm thu thành công; issue vẫn mở và Review. CI cần xem theo head mới của [PR #88](https://github.com/embetapbay123/PBL6/pull/88).

## 06/10/2026 — M3 lookup/Profile/Address review

- PR #88 is merged into main at `25456d5`; PR #87 incorporates that main baseline without rewriting the member's commits.
- M3 checkout context and AI metrics scope now implement the internal contract with live sessions and caller restrictions. Profile updates and Address CRUD implement authenticated ownership and atomic audit writes. Public: 24 implemented / 8 sample / 4 mock / 63 pending; internal: 4 implemented / 2 sample / 5 pending. These counts describe the PR branch until merge.
- Backend build, 168 unit tests and 33 HTTP/PostgreSQL integration tests pass locally. Tests include strict response schemas, concurrent default addresses, audit rollback, missing/foreign addresses, unsafe fees, revoked membership and locked Stores. Contract/parser, generated drift and docs checks pass.
- Auth registration/verification/password additions remain separate tasks and explicit stubs. No mock email provider is counted as implemented. No migrations or service ownership changes. CI evidence must be read at PR #87's current head.

## 06/10/2026 — merged baseline and Week 2 handoff

- PR #88 merged at `25456d5`, #89 at `e0dfc31`, and #87 at `c43fdce`. [Main CI at c43fdce](https://github.com/embetapbay123/PBL6/actions/runs/37412724706) passed contracts-and-node/mobile, including fresh setup/schema/migrations, 168 unit, 33 PostgreSQL/HTTP integration, Python, seven Web e2e and 40 Flutter tests.
- Six complete task scopes (#3/#4/#8/#26/#28/#45) have merge/test evidence for completed/Done; wider Auth, Voucher Store, Order, report, Mobile and WEB-01 scopes remain open with explicit remaining acceptance. Shared foundation review remains separate. No unimplemented endpoint is promoted just because a dependency merged.
- Week 2 assigns the existing issues to their real GitHub owners and prioritizes inventory commands, Payment/COD and atomic checkout. Kanban remains the only live status source. No new board, business code, migration, environment file or group-message template is introduced.

## 06/10/2026 — Công Week 2 Payment/COD and consent/tracking branch

- PAY-01/PAY-04 implement caller-owned Payment creation, COD obligation/collection/Event/audit, ownership-safe Payment read and persisted test QR attempts. Same manager, concurrency/replay, exact amount/state, zero-payable COD, rollback and real HTTP collectCod are verified. QR is instructions only; no live provider/callback/refund success is claimed. Explicit disabled provider returns 503 before writes; UNKNOWN persists and does not create a second reference.
- Consent GET/PATCH implements live M3 guard before strict DTO, ownership/version, atomic metadata audit and withdrawal purge. Tracking worker has durable bindings/DLQ, inbox/effect transaction, source/schema/entity version checks, one purchase signal per Order, grant-window checks and 30-day demo retention. Withdrawal/retention invalidate affected training eligibility/models; real ALS/RAG remain separate tasks.
- Local checks pass: docs/OpenAPI/generated drift (99 public + 11 internal, seven events), backend/Web build, 168 Node unit tests, 41 PostgreSQL/HTTP integration tests, 23 Python tests (including isolated schema and durable broker fixture), seven Web e2e, and four fresh database schema suites with 12 negative invariants. Web e2e first lacked a local browser binary; after installing the Playwright Chromium runtime all seven passed. No source change was needed for that environment failure. Flutter is unchanged except generated contract fixture metadata and is verified separately by CI.
- M2 adds migration 005; M4 adds 004/005; applied 001–003 are unchanged. Public branch status is 28 implemented / 8 sample / 4 mock / 59 pending; internal remains 4 implemented / 2 sample / 5 pending. Added 503 error documentation does not alter request/success payloads. This evidence describes the PR branch, not an already-merged main.
- PAY-01/PAY-04 require peer review and merge before Done. AI-01 remains partial: M1 real search/view producers and full source acceptance still belong to Thịnh; fake/broker fixtures are not all real behavior history. Hoa retains confirm/cancel/Order/COD controller scope, Trí retains M3 events, callback/refund remain PAY-02/PAY-03 stubs. See [handoff](cong-week2-handoff.md).


## PR #90 sau merge — 06/10/2026

[PR #90](https://github.com/embetapbay123/PBL6/pull/90) đã squash merge vào main (`1b6028a`) ngày 06/10/2026 sau self-review và bypass được chủ repo cho phép. [CI main](https://github.com/embetapbay123/PBL6/actions/runs/37455617355) đạt; PR checks đạt 168 Node unit, 41 integration, 23 Python, 7 Web e2e và Flutter. [Handoff trên main](https://github.com/embetapbay123/PBL6/blob/main/docs/implementation/cong-week2-handoff.md).

PAY-01/PAY-04 completed; AI-01 còn nguồn thật. ORDER-05/checkout/callback/refund và producer giữ owner, không đóng thay hoặc đổi metadata rộng.
