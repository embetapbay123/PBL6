# PBL6 — khung triển khai SOA 4 service

**Nền để bắt đầu code:** [contract, DTO runtime, adapter/fixture và mẫu chạy được](docs/implementation/foundation-handoff.md).

**Nhận việc tuần 1:** [task theo từng người, link issue, lịch 5 ngày và tiêu chí demo](docs/implementation/week1.md).

**Schema đã chốt:** [database baseline 2.2](docs/implementation/database-schema.md) — thành viên code theo migration và contract hiện có.

[![Scaffold checks](https://github.com/embetapbay123/PBL6/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/embetapbay123/PBL6/actions/workflows/ci.yml)

Đây là **khung có code mẫu chạy thật** để thành viên hoàn thiện. Chưa phải marketplace hoàn chỉnh. Thiết kế nghiệp vụ nằm trong [docs](docs/README.md), phần bàn giao code nằm trong [implementation](docs/implementation/README.md).

| Phần | Công nghệ | Người hoàn thiện |
| --- | --- | --- |
| M1 Catalog & Inventory | NestJS / TypeORM / PostgreSQL | Thịnh + Seller Web |
| M2 Commerce | NestJS / TypeORM / PostgreSQL | Hoa: Cart, Order, Voucher, report; Công: Payment, Refund |
| M3 Identity & Store | NestJS / TypeORM / PostgreSQL | Trí + Admin Web |
| M4 AI | FastAPI / SQLAlchemy / pgvector | Công |
| Customer Web | React / TypeScript / TanStack Query | Hatsaphone |
| Customer Android | Flutter / Riverpod / Dio | Hoa |

Mỗi service có database và tài khoản DB riêng trên một PostgreSQL instance. Cart/Order/Payment là module của **cùng M2**, được dùng chung transaction M2. Gateway, Redis và RabbitMQ là hạ tầng.

## Chạy lần đầu

Cần Docker Compose v2, Node 22, Python 3.12; Flutter stable cho Mobile. Mở Docker Desktop trước. Từ thư mục gốc:

```powershell
python scripts/setup_local.py
npm ci
npm --prefix backend ci
npm --prefix frontend ci
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml up -d --wait postgres redis rabbitmq
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools node dist/shared/src/migrate.js
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools node dist/shared/src/seed.js
npm run infra:up
```

Mở [http://localhost:8080](http://localhost:8080). Đăng nhập `customer1@pbl6.test`, `customer2@pbl6.test`, `owner@pbl6.test` hoặc `admin@pbl6.test`. Mật khẩu là `SEED_PASSWORD` trong `infrastructure/.env`, mặc định local `LocalDemo-ChangeMe123!`. Seed chỉ là dữ liệu giả để phát triển. Script giữ cấu hình/khóa đã có, không in secret.

Luồng thật: login/refresh/logout, context/quyền hiện hành, hồ sơ của chính User, danh sách/chi tiết Product và mẫu sửa title/description có expected_version + audit/outbox. AI chỉ chạy mock. Các API còn lại trả `501 FEATURE_NOT_IMPLEMENTED`; UI demo cũ ở `/?mode=mock` vẫn dùng dữ liệu mô phỏng.

## Nhận việc

Toàn bộ **71 task của5 member** đã giao trước trên [bảng tổng Kanban](https://github.com/users/embetapbay123/projects/1/views/3); [bảng phân công đầy đủ](docs/implementation/task-assignment.md) dẫn tới scope/ưu tiên/dependency của từng issue. Member tự chọn việc phù hợp, code bằng contract/seed/fixture trong lúc chờ API tích hợp, không đợi mở task từng đợt. Kéo thẻ để cập nhật tiến độ theo [hướng dẫn](docs/implementation/kanban-guide.md). Username: Công `embetapbay123`, Thịnh `QT-2005`, Hoa `mimidangeiu`, Trí `phantri1912`, Hatsaphone `HATSAPHONE`. Trí đã nhận lời mời repo và được gán14 task; Hoa/Thịnh/Hatsaphone đang chờ nhận, Assignee tạm Công nhưng Owner vẫn là người thực hiện.

1. Mở [Week 1](docs/implementation/week1.md), tìm tên mình và task đầu tiên; tra [bảng giao toàn bộ task](docs/implementation/task-assignment.md) khi cần phạm vi lâu dài. Week 1 ghi link issue, việc cụ thể, thứ tự bàn giao và tiêu chí demo.
2. Đọc [phân công](docs/implementation/service-ownership.md) và [backlog tổng thể](docs/implementation/member-backlog.md) để biết phạm vi lâu dài.
3. Tra [trạng thái endpoint](docs/implementation/endpoint-status.md), [OpenAPI công khai](docs/contracts/openapi.json) và [API nội bộ](docs/contracts/internal-api.json). Phân biệt mẫu, mock và stub 501.
4. Làm theo [hướng dẫn phát triển](docs/implementation/development-guide.md); lấy Auth/Catalog và test làm mẫu. Dùng [mẫu issue](.github/ISSUE_TEMPLATE/member-task.md) để ghi task, branch riêng và PR về `main`.

| Member | Task đầu tiên | Phạm vi lâu dài |
| --- | --- | --- |
| Công | PAY-01: Payment/attempt/port; review nền CORE/FLOW đã có | Shared/hạ tầng/tích hợp; M2 Payment/Refund/COD; M4 AI |
| Thịnh | CAT-QUOTE-01: quote cho M2, rồi CAT-04: public Catalog | M1 và Seller Web |
| Hoa | CART-01: đọc/sửa số lượng/xóa item giỏ | M2 Cart/Order/Voucher/report và Customer Android |
| Trí | ID-01: CRUD địa chỉ | M3 và Admin Web |
| Hatsaphone | WEB-01: danh sách sản phẩm Customer | Customer Web theo từng màn và API bàn giao |

Clone repo và tạo branch theo task, ví dụ cho ID-01:

```powershell
git clone https://github.com/embetapbay123/PBL6.git
cd PBL6
git switch -c feat/id-01-addresses
```

Chạy phần **Chạy lần đầu** phía trên; `.env`, khóa, dependencies và artifacts không có trong Git, script setup tạo cấu hình local. Làm xong demo theo tiêu chí task, ghi kết quả kiểm chứng vào PR; cập nhật contract/types/status/README khi có đổi. Không đổi cả endpoint sang `IMPLEMENTED` nếu mới hoàn thành một phần.

```powershell
npm run generate:types
npm run build:backend
npm run test:backend
npm run build
npm run docs:check
npm run contracts:check
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools npm run test:integration
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml exec -T m4 python -m pytest -q -p no:cacheprovider
```

Web development: Vite cấu hình port **3000**. Đặt `WEB_ORIGIN=http://localhost:3000` trong `infrastructure/.env`, chạy lại `npm run infra:up` rồi `npm run dev`; mở http://localhost:3000, Vite proxy gọi gateway. Trả origin về http://localhost:8080 khi dùng Web container/test. Nếu Vite báo dùng port khác vì 3000 đang bận, giải phóng port hoặc cập nhật origin theo port thực. Mobile: xem [mobile/README](mobile/README.md). Test giao diện: `npm --prefix frontend run test:e2e` khi gateway đã chạy; cần Playwright Chromium đã cài hoặc `PLAYWRIGHT_CHANNEL=msedge` trên máy có Edge.

Sau khi sửa backend: build image `m1` rồi `npm run infra:up`; M1/M2/M3/worker dùng chung image để tiện phát triển nhưng chạy riêng process. Thay schema bằng migration mới rồi chạy lại migrate. Không sửa migration đã áp dụng, không bật TypeORM `synchronize`.

## Giới hạn bàn giao

54 entity nghiệp vụ, migration, DTO type, controller stub và điểm mở rộng service/repository đã có. Đây là nền móng; member vẫn phải bổ sung validation, constraint, state transition và test cho nghiệp vụ mình. Checkout nhiều Store, kho, SePay Test Mode, refund/reconciliation, RAG/ALS, consent/tracking và UI nghiệp vụ chưa hoàn thiện.

[Bảo mật](docs/implementation/security.md), [chịu tải](docs/implementation/performance-and-capacity.md), [phục hồi](docs/implementation/observability-and-recovery.md) phân biệt phần đã có với phần phải làm. Chưa có benchmark 100 user hoặc đánh giá AI thật. Xem [biên bản kiểm tra khung](docs/implementation/validation-record.md).
