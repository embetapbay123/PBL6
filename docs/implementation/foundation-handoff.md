# Nền code đã bàn giao — 2.2.1

Schema, DTO và contract đã có để bắt đầu task. Member hoàn thiện service/repository và giao diện theo issue; không cần tự thiết kế lại các điểm nối. **99 API công khai + 11 API nội bộ** có validation runtime và fixture. Trạng thái nghiệp vụ vẫn là 8 IMPLEMENTED_SAMPLE, 4 MOCK_ONLY, 87 NOT_IMPLEMENTED ở public API; internal có 2 sample, 1 IMPLEMENTED (QuoteVariants) và 8 stub.

## Chạy và kiểm tra nền

Từ thư mục gốc, làm phần setup/install trong [README](../../README.md), sau đó:

```powershell
python scripts/setup_local.py
npm run contracts:drift
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml up -d --wait postgres redis rabbitmq
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools node dist/shared/src/migrate.js
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools node dist/shared/src/seed.js
npm run infra:up
python scripts/wait_local.py
```

Mở http://localhost:8080. Đăng nhập tài khoản seed Owner ở README, vào Sản phẩm → Sửa sản phẩm, đổi tên/mô tả và lưu. Đây là write thật của M1; Cart/Checkout/Payment vẫn trả 501. Không dùng mock UI làm bằng chứng đã tích hợp.

## File mẫu và nơi member làm việc

| Người | Nơi triển khai | Mẫu/contract cần dùng |
| --- | --- | --- |
| Thịnh | M1 catalog/inventory/review; Web `features/seller` | Catalog controller/service/repository/mapper; QuoteVariants và 4 command kho; ListLowStockVariants |
| Hoa | M2 cart/order/voucher/report; Mobile | DTO của từng operation; InternalClients; Order–Payment unit of work |
| Trí | M3 auth/profile/store/staff/admin; Web `features/admin` | Auth hiện có; Address DTO; ResolveCheckoutContext/ResolveAiMetricsScope |
| Hatsaphone | Web `features/customer` | ProductsSample, ProductEdit, components chung, callOperation và fixture |
| Công | Payment/M4/shared | PaymentPort và Pydantic registry; event schemas, provider adapter và CI |

Web mỗi nhóm sửa `features/<nhóm>/routes.tsx` để thêm trang của mình. Không cần sửa BootstrapApp, không tạo AuthProvider/QueryClient thứ hai. Placeholder là chỗ đặt trang, chưa có nghiệp vụ. ProductEdit trong bootstrap là mẫu form dùng API thật, không thay Seller task tạo/sửa Product đầy đủ.

## DTO và validation

OpenAPI là nguồn duy nhất. Generated DTO/types/fixtures tạo bởi `scripts/generate_runtime_contracts.py`; generator chỉ ghi file generated, không ghi đè controller/service/migration.

```powershell
npm run generate:contracts
npm run generate:types
npm run contracts:drift
npm run contracts:check
npm run docs:check
```

Nest: import class như `AddCartItemBodyDto`, `UpdateAddressBodyDto` từ shared `dtos.generated`. Class-validator gọi validator schema đệ quy trên từng trường. RequestContractInterceptor chạy **sau guards**, kiểm tra toàn shape, nested/map, path/query/header và minProperties trước handler. Các stub đã được validation tự động dù không có tham số DTO. Request chuẩn hóa nằm trong `request.contract`; body JSON không coercion. Chỉ query/path/header scalar được convert đúng kiểu đã khai báo; query trùng thành array và bị từ chối khi contract chỉ nhận scalar. Body không có schema chỉ nhận không body hoặc object rỗng.

Pydantic M4: `DTO_REGISTRY[operation][part].model_validate(value)` dùng schema validation strict trước parse; `validate_operation` chuẩn hóa query/path/header và trả dữ liệu đã kiểm. Registry bao phủ 110 operation để đối chiếu, runtime M4 chỉ đăng ký API thuộc M4. Dùng `model_dump(exclude_unset=True)` khi xuất DTO để không thêm `None` cho field bị bỏ qua.

Required khác optional; optional không tự cho phép null. Chỉ field nullable trong OpenAPI mới nhận null. Object đóng không nhận trường lạ; JSON attributes/map mở giữ giá trị, typed map kiểm value và checkout map kiểm Store UUID. Số tiền/số nguyên giới hạn Number.MAX_SAFE_INTEGER; ORM BIGINT giữ string và mapper moneyNumber kiểm trước chuyển số. Error luôn `{code,message,correlation_id,details:[]}`; không đưa token/password/raw callback vào details hoặc log.

Validation chỉ kiểm shape. Owner vẫn phải kiểm quyền hiện hành, ownership, phiên bản, cạnh trạng thái, tồn/giá/lượt voucher và các bất biến liên bảng trong service. DTO có sẵn không làm endpoint thành IMPLEMENTED.

## Điểm nối đã chốt

| Operation | Caller → owner | Nhiệm vụ member |
| --- | --- | --- |
| ResolveContext | M1/M2/M3/M4 → M3 | Sample hiện có; Auth Trí hoàn thiện |
| ActiveStores | M1/M2/M4 → M3 | Sample hiện có; Store Trí hoàn thiện |
| QuoteVariants | M2 → M1 | Thịnh: dữ liệu hiện hành, không giữ tồn |
| ReserveInventory | M2 → M1 | Thịnh: giữ toàn bộ SKU đủ hoặc rollback, theo Order ID cấp trước |
| ConsumeReservation / ReleaseReservation / RestockOrder | M2 → M1 | Thịnh: operation_result + hiệu ứng cùng transaction, không trừ/hoàn hai lần |
| VerifyReviewEligibility | M1 → M2 | Hoa: đúng Customer/Product và OrderItem COMPLETED |
| ResolveCheckoutContext | M2 → M3 | Trí: token Customer, địa chỉ ACTIVE sở hữu, Store snapshot phí/version; trả 404 khi địa chỉ không thuộc user, 409 khi Store ngừng bán |
| ListLowStockVariants | M2 → M1 | Thịnh: resolve token M3, membership/quyền report đúng Store; trả tồn khả dụng và phân trang, không biến lỗi thành danh sách rỗng |
| ResolveAiMetricsScope | M4 → M3 | Trí: resolve phiên hiện hành; Admin PLATFORM hoặc Store filter, Owner STORE đúng membership; Store khác trả 403 |

Schema/path/caller/error đầy đủ trong [internal API](../contracts/internal-api.json). Ba lookup mới và năm command còn lại của nhóm cũ có guard/validation/501, chưa có nghiệp vụ; QuoteVariants đã triển khai ở CAT-QUOTE-01. Khi thêm handler thật, bỏ đúng handler stub để không trùng method/path; cập nhật status đúng owner. Gateway không chuyển tiếp `/internal/*` đến backend.

Nest dùng `InternalClients.call(operation, body, correlation)` với generated input/output; M4 dùng InternalClient và Pydantic input. Timeout 1 giây, không retry trong HTTP request. Caller sai hoặc service credentials sai là lỗi vận hành 503; 404/409/422/501 nghiệp vụ được giữ. Response sai contract hoặc lỗi kết nối trả 503. Không log token/key. Command retry ở worker giữ nguyên ID/payload; đổi payload cùng ID là 409. Các service không đọc DB nhau.

Order–Payment thuộc **cùng M2**, không gọi HTTP nội bộ. `orderPaymentUnitOfWork(source, manager => new PaymentService(manager), work)` truyền manager cho repository Order và PaymentPort. createForOrder/recordCodCollection/requestRefund đang là extension point 501; Hoa giữ Order/controller collectCod, Công triển khai tiền. Không gọi provider hoặc giữ transaction trong lúc gọi M1. Test chứng minh lỗi Payment rollback Order/Payment cùng transaction.

## Event và tracking

[Event schemas](../contracts/events.json) và [event fixtures](../contracts/event-fixtures.generated.json) chốt envelope UUID/version `1.0`, producer, consumer và nguồn phát. Chưa có producer/consumer nghiệp vụ mới; bootstrap.example.v1 vẫn là mẫu vận hành, không tính là tracking thật.

- M1 phát ProductChanged từ mutation; M3 phát StoreStatusChanged/UserLocked/MembershipChanged từ mutation quyền/trạng thái. Mutation/outbox cùng transaction. Consumer bỏ event version cũ; API nhạy cảm vẫn kiểm M3 hiện hành.
- M1 phát SearchRecorded và InteractionRecorded VIEW từ read đã xác thực. Telemetry dùng transaction riêng và lỗi telemetry không làm hỏng đọc Catalog. Guest không phát hành vi cá nhân.
- M2 phát InteractionRecorded CART cùng transaction add-to-cart, phát OrderCompleted khi chuyển COMPLETED thành công. PURCHASE chỉ suy ra từ OrderCompleted, không phát tín hiệu mua trùng ở InteractionRecorded.
- M4 consumer kiểm consent hiện hành, inbox và effect trong cùng transaction rồi ACK. Khi thiếu consent, bỏ hành vi cá nhân theo chính sách privacy. Interaction ID lưu bảng dùng `producer:event_id:product_id`; OrderCompleted gom quantity theo Product trước ghi để một Order nhiều sản phẩm không va unique event_id. Retry cùng envelope không tạo dữ liệu trùng.
- Schema/type/fixture có sẵn không có nghĩa ALS/RAG hoặc RabbitMQ business consumer đã hoạt động. Owner thực hiện trong CAT-04/CART-02/ORDER-04/AI-01 và task M3 tương ứng.

## Fixture và bàn giao PR

`docs/contracts/fixtures.generated.json` có request/response/status cho cả 110 operation, có nhãn `mode=fixture`; fixtures chỉ chứng minh schema, không phải seed, dữ liệu lịch sử hay kết quả nghiệp vụ. Nest/M4 tests validate tất cả fixture.

Web `callOperation` dùng API thật mặc định. Muốn fixture: chạy Vite với `VITE_API_MODE=fixture`, giao diện có nhãn; production chặn chế độ này. Không fallback khi API lỗi. Các command checkout/thanh toán/COD bị chặn ngay trong fixture transport. Token/signature fixture là giá trị vô hiệu, không dùng đăng nhập hay xác minh provider.

Flutter dùng cùng JSON qua asset và `ContractFixtures.operation`, chỉ bật rõ bằng `--dart-define=USE_CONTRACT_FIXTURES=true` khi phát triển. Helper độc lập, ApiClient không tự gọi nó khi mạng lỗi; không dùng để chứng minh APK/device hoặc giao dịch đã hoàn thành.

SePay callback xác minh raw body trước DTO, thiếu secret trả 503. Legacy sandbox callback local chỉ hỗ trợ `X-Sandbox-Signature: sha256=<HMAC-SHA256(raw-body)>` với SANDBOX_WEBHOOK_SECRET riêng; đây không phải protocol SePay. Có chữ ký và DTO hợp lệ vẫn 501, không ACK thu tiền giả. Provider integration/reconciliation vẫn là task Payment.

PR cần nêu operation đã hoàn thiện, demo/cách kiểm, quyền/input/lỗi/version/replay phù hợp, migration mới nếu có, contract/types/fixture/README cùng cập nhật. Không sửa migration 001–003, không commit `.env`, không đổi status chỉ vì đã nối DTO.

## Mẫu dùng DTO/client

Nest handler mới dùng guard/role giống skeleton hiện có, import DTO generated và chuyển vào service:

```typescript
@Post('cart/items') @Roles('CUSTOMER')
add(@Body() dto: AddCartItemBodyDto, @Req() req: any) {
  return this.service.add(dto, req.auth, req.correlationId);
}
// Trong service M2: giữ cùng correlation, không truy cập DB M1.
const quote = await clients.call('QuoteVariants', { items }, correlationId);
```

Web: `callOperation('listProducts', { query: { page: 1, size: 20, q: '' } })`. M4 handler lấy `request.state.contract` đã được kiểm; `InternalClient.call` validate Pydantic input và response. Import `EventContracts['OrderCompleted']['payload']` trong generated operations để giữ type payload đúng khi triển khai producer.

Trước khi đăng ký controller mới, bỏ đúng method stub khỏi skeleton và thêm controller vào main. Nếu thêm operation/field, cập nhật OpenAPI, chạy generate contracts/types, sync status, rồi kiểm drift/docs và test liên quan. Không sửa các file generated bằng tay.
