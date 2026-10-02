# PBL6 — khung triển khai SOA 4 service

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
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml up -d postgres redis rabbitmq
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools node dist/shared/src/migrate.js
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools node dist/shared/src/seed.js
npm run infra:up
```

Mở [http://localhost:8080](http://localhost:8080). Đăng nhập `customer1@pbl6.test`, `customer2@pbl6.test`, `owner@pbl6.test` hoặc `admin@pbl6.test`. Mật khẩu là `SEED_PASSWORD` trong `infrastructure/.env`, mặc định local `LocalDemo-ChangeMe123!`. Seed chỉ là dữ liệu giả để phát triển. Script giữ cấu hình/khóa đã có, không in secret.

Luồng thật: login/refresh/logout, context/quyền hiện hành, hồ sơ của chính User, danh sách/chi tiết Product và mẫu sửa title/description có expected_version + audit/outbox. AI chỉ chạy mock. Các API còn lại trả `501 FEATURE_NOT_IMPLEMENTED`; UI demo cũ ở `/?mode=mock` vẫn dùng dữ liệu mô phỏng.

## Nhận việc

1. Đọc [phân công](docs/implementation/service-ownership.md) và [backlog từng member](docs/implementation/member-backlog.md).
2. Tra [trạng thái endpoint](docs/implementation/endpoint-status.md) và [OpenAPI](docs/contracts/openapi.json).
3. Làm theo [hướng dẫn phát triển](docs/implementation/development-guide.md); lấy Auth/Catalog và test làm mẫu.
4. Hoàn thiện nghiệp vụ trong module được giao; kiểm tra quyền/scope và lỗi trước khi đổi trạng thái endpoint.

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

Web development: đặt `WEB_ORIGIN=http://localhost:5173` trong cấu hình local, chạy lại `npm run infra:up` rồi `npm run dev`; Vite proxy gọi gateway. Trả origin về localhost:8080 khi dùng Web container/test. Mobile: xem [mobile/README](mobile/README.md). Test giao diện: `npm --prefix frontend run test:e2e` khi gateway đã chạy; cần Playwright Chromium đã cài hoặc `PLAYWRIGHT_CHANNEL=msedge` trên máy có Edge.

Sau khi sửa backend: build image `m1` rồi `npm run infra:up`; M1/M2/M3/worker dùng chung image để tiện phát triển nhưng chạy riêng process. Thay schema bằng migration mới rồi chạy lại migrate. Không sửa migration đã áp dụng, không bật TypeORM `synchronize`.

## Giới hạn bàn giao

54 entity nghiệp vụ, migration, DTO type, controller stub và điểm mở rộng service/repository đã có. Đây là nền móng; member vẫn phải bổ sung validation, constraint, state transition và test cho nghiệp vụ mình. Checkout nhiều Store, kho, SePay Test Mode, refund/reconciliation, RAG/ALS, consent/tracking và UI nghiệp vụ chưa hoàn thiện.

[Bảo mật](docs/implementation/security.md), [chịu tải](docs/implementation/performance-and-capacity.md), [phục hồi](docs/implementation/observability-and-recovery.md) phân biệt phần đã có với phần phải làm. Chưa có benchmark 100 user hoặc đánh giá AI thật. Xem [biên bản kiểm tra khung](docs/implementation/validation-record.md).
