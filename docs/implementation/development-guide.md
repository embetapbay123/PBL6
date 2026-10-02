# Hướng dẫn member phát triển trên khung

Chạy lần đầu theo [README gốc](../../README.md). API qua gateway ở `http://localhost:8080/api/v1`; không gọi service container trực tiếp từ Web/Mobile. DB/broker không publish port ra máy ngoài.

## Cấu trúc và mẫu

```text
backend/
  catalog-service/src/{catalog,inventory,review,moderation,entities}
  commerce-service/src/{cart,order,voucher,payment,report,entities}
  identity-store-service/src/{auth,profile,store,staff,administration,entities}
  ai-service/app/{chat,recommendation,tracking,consent,evaluation}
  shared/src/       # auth, errors, config, transaction helpers, outbox/inbox, HTTP
frontend/src/api/   # generated types, API client, auth provider
frontend/src/bootstrap/ # API thật, routing/query/loading/error mẫu
mobile/lib/core/   # Dio + secure token + refresh một lần
infrastructure/    # Compose, gateway, config/key local
```

Mỗi module có README operation, controller stub, service/repository điểm mở rộng, DTO type alias. Alias TypeScript **không validation runtime**. Khi triển khai phải tạo DTO class-validator cho Node hoặc Pydantic cho M4. ORM model không tự migration và không tự kiểm quyền.

Mẫu đọc: CatalogController → CatalogService → CatalogRepository; lấy Store active qua M3 rồi query M1. Mẫu ghi: ProductUpdateSample → guard → membership/Store/resource → transaction/lock → version → update + audit + outbox. Mẫu phiên: `identity-store-service/src/auth/`.

## Hoàn thiện một endpoint

1. Chọn operation trong [backlog](member-backlog.md); đọc FR/BR/state/RBAC và OpenAPI.
2. Viết DTO allowlist, validation query/body/UUID; giới hạn page/body/chuỗi. Controller parse, guard và gọi service.
3. Service kiểm scope hiện hành, state transition, version/idempotency; không tin user_id/store_id/giá/tổng tiền client.
4. Repository dùng DB sở hữu và parameter query. Truyền đúng EntityManager trong transaction; tránh repository global trong transaction.
5. Thêm migration số mới. Không sửa `001_initial.sql` trên DB đã chạy; không dùng synchronize.
6. Ghi audit/outbox cùng transaction; external effect qua adapter/worker. Consumer inbox và effect cùng transaction rồi ACK.
7. Gỡ đúng method khỏi skeleton controller, thêm controller thật vào `main.ts`. Không đăng ký hai handler cùng method/path.
8. Test thành công, input sai, quyền/ownership, state/version conflict và failure/replay phù hợp. Cập nhật status sau khi test đạt.

## Contract và codegen

OpenAPI là hợp đồng công khai. Giữ snake_case payload, integer VND, lỗi `{code,message,correlation_id,details}`. BIGINT ORM là string; chỉ chuyển Number sau kiểm tra giới hạn an toàn, không tính tiền bằng float.

```powershell
python scripts/sync_contract_status.py
npm run generate:types
npm run docs:check
```

Sync script tạo index/README từ metadata, không ghi controller. `scaffold_contracts.py` chỉ tạo khung ban đầu, chặn chạy lại vì có thể ghi đè controller/migration. Script docs 2.1 cũ không phải công cụ cập nhật thường ngày.

[Internal OpenAPI](../contracts/internal-api.json) và contracts.internal.generated.d.ts có payload/caller chuẩn. Sáu command nội bộ có stub guard/501; context/Store lookup đã chạy thật. DTO runtime command còn phải bổ sung.

HTTP nội bộ dùng internalRequest, service allowlist/key và correlation; scope còn phải kiểm tại service nhận. Command kho dùng `once(manager, caller, operationId, payload, effect)` trong transaction. Event gồm event_id, event_type, schema_version, producer, occurred_at, correlation_id, payload. Binding/consumer mẫu không thay ProductChanged/OrderCompleted.

## Kiểm tra khi sửa code

```powershell
npm run build:backend
npm run test:backend
npm run build
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build m1 m4 web
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools node dist/shared/src/migrate.js
npm run infra:up
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools npm run test:integration
```

M1/M2/M3/worker dùng image pbl6-node:local; rebuild m1 cập nhật image chung. Script dev:m1/m2/m3 có tsc trước để giữ metadata validation; cần env trỏ hạ tầng phù hợp. Với Vite local đặt WEB_ORIGIN=http://localhost:5173 rồi recreate container; dùng Web container/test thì trả origin về http://localhost:8080.

Member bàn giao module, migration, contract change, test result và lỗi chưa xử lý. Công review shared/infrastructure và luồng tích hợp. Xem [verification plan](verification-plan.md).
