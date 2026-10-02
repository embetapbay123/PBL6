# Contract tích hợp service 2.1 Draft

**Khung 2.2:** [Internal OpenAPI](contracts/internal-api.json) chốt payload/path/caller cho các lookup và command mẫu. Chỉ ResolveContext/ActiveStores có xử lý thật; sáu command còn lại trả 501 sau service guard. Bảng/event nghiệp vụ dưới đây là đích, chưa có consumer thật; xem [resilience](implementation/error-handling-and-resilience.md).

Mọi command/event có operation_id hoặc event_id UUID, correlation_id, occurred_at UTC, schema_version, producer và payload. Producer ghi outbox cùng transaction; consumer lưu inbox theo (producer,event_id), xử lý lặp trả cùng kết quả. ID xuyên service là tham chiếu logic, không FK xuyên database.

| Từ → đến | Contract | Payload tối thiểu | Tác động và khi lỗi |
| --- | --- | --- | --- |
| M2 → M1 | QuoteVariants | variant_id, quantity, store_id | Giá/trạng thái/tồn hiện hành; đổi giá yêu cầu quote mới |
| M2 → M1 | ListLowStockVariants | store_id từ membership, ngưỡng tồn cấu hình | Trả Variant tồn thấp cho StoreReport; M1 lỗi thì báo phần báo cáo chưa sẵn sàng, không trả mảng rỗng như số liệu thật |
| M2 → M1 | ReserveInventory | purchase_group_id, order_id dự kiến, variant/quantity, expiry, operation_id | Giữ đủ SKU; nếu một SKU lỗi, release toàn bộ và không tạo Order |
| M2 → M1 | ConsumeReservation | order_id, reservation_id, operation_id | Trừ tồn một lần cho COD sau tạo hoặc sandbox sau Payment Success; lỗi COD giữ PREPARING, sandbox giữ RECOVERING |
| M2 → M1 | ReleaseReservation | order_id, reservation_id, operation_id | Trả phần giữ khi lỗi tạo nhóm, Order hủy/chưa trả hoặc EXPIRED; không release nếu đã consumed |
| M2 → M1 | RestockOrder | order_id, variant/quantity, operation_id | StockMovement gắn order_id, hoàn kho một lần khi Order đã consume bị hủy |
| M1 → M2 | VerifyReviewEligibility | order_item_id, customer_user_id, product_id | Xác minh Order COMPLETED và Customer sở hữu trước tạo Review |
| M1 → M4 | ProductChanged | product_id, store_id, version, status bán, moderation_status, giá Variant | Cập nhật/loại embedding; read vẫn kiểm tra Product hiện hành |
| M3 → M1/M2/M4 | StoreStatusChanged, UserLocked, MembershipChanged | ID, trạng thái, version | Cập nhật cache/index; API nhạy cảm kiểm tra M3 hiện hành |
| M4 → M3 | ResolveAiMetricsScope | user_id, quyền hiệu lực, Store membership | Owner chỉ xem metric Store mình, Admin xem toàn sàn; mất quyền thì 403/404 dù JWT còn hạn |
| M2 → M4 | OrderCompleted, InteractionRecorded | user_id, product_id, event_type, event_id, time | Tín hiệu AI dedup và chỉ dùng khi PersonalizationConsent cho phép |

## Thứ tự và đối soát

M2 cấp Order ID trước reserve, tạo nguyên tập Order/Payment trong transaction M2. Reservation đã giữ nhưng transaction M2 thất bại được release theo operation ID; không có Order một phần. Tranh chấp reserve/consume/release theo order_id được serialize ở M1 bằng lock/version. M2 không xóa Order sau khi tạo; trạng thái chưa trả/hết hạn nằm trên Order.

Gateway callback chứa provider_event_id, provider_reference và chữ ký. M2 tìm PaymentAttempt → Payment → đúng Order, ghi PaymentEvent chống lặp. Trước khi release một Order AWAITING_PAYMENT hết hạn, M2 hỏi gateway nếu kết quả chưa chắc chắn. Nếu Payment đã Success mà consume lỗi, worker retry chính Order ở RECOVERING; không thu tiền lần nữa. Nếu callback Success đến sau release và Order EXPIRED, tạo Refund của Payment/Order đó, các Order cùng purchase_group_id không đổi.

Worker còn kiểm tra COD Order PREPARING, reservation ACTIVE quá hạn, Refund FAILED, voucher giữ nhưng chưa tạo Order và Payment SUCCEEDED mà Order chưa PENDING. Các event version cũ bị ghi nhận rồi bỏ qua. M4 không chặn đơn khi AI lỗi.

## Envelope và ví dụ payload

Mỗi command/event dùng ID chống lặp ở **đúng service sở hữu hiệu ứng**. Producer phát event sau khi commit dữ liệu nguồn; outbox được ghi cùng transaction. Consumer lưu inbox trước/đồng thời với hiệu ứng của nó. `schema_version` dùng định dạng major.minor; thay đổi không tương thích cần version major mới, consumer cũ không được đoán trường bắt buộc.

```json
{
  "event_id": "11111111-1111-4111-8111-111111111111",
  "event_type": "ProductChanged",
  "schema_version": "1.0",
  "producer": "M1",
  "occurred_at": "2026-09-29T09:00:00Z",
  "correlation_id": "22222222-2222-4222-8222-222222222222",
  "entity_id": "33333333-3333-4333-8333-333333333333",
  "entity_version": 7,
  "payload": {"product_id": "33333333-3333-4333-8333-333333333333", "store_id": "44444444-4444-4444-8444-444444444444", "sale_status": "ACTIVE", "moderation_status": "VISIBLE"}
}
```

Giá Variant và trạng thái Store được đối chiếu lại qua M1/M3 khi phục vụ Product card; payload event chỉ giúp cập nhật index. Không coi event này là nguồn giá hiện hành.

| Giao tiếp | ID chống lặp | Timeout/retry | Khi không thể hoàn tất ngay |
| --- | --- | --- | --- |
| M2 → M1 reserve/consume/release/restock | `operation_id` do M2 cấp, M1 giữ kết quả theo ID | Retry cùng payload/ID với backoff; khác payload cùng ID là conflict | Order PREPARING/RECOVERING hoặc release/đối soát; không tạo StockMovement hai lần |
| Gateway → M2 callback | `(provider, provider_event_id)` và provider_reference | Xác minh chữ ký trước ghi; trả ACK cho event đã xử lý | Attempt chưa rõ kết quả được M2 hỏi gateway trước EXPIRED |
| M2 → gateway Refund | `refund_id`/operation ID | Retry cùng khoản tiền và Payment | Refund FAILED/PROCESSING, Order giữ CANCELLED/EXPIRED riêng |
| M1/M2/M3 → M4 event | `event_id`, `entity_version` | At-least-once, inbox dedup; event version cũ bỏ qua | AI index báo chậm; vẫn phải xác minh Product hiện hành trước khi phục vụ |

Service nhận lỗi tạm không được trả Success giả. Sau ngưỡng retry cấu hình (mặc định cảnh báo sau 5 lần), worker ghi trạng thái cần đối soát và cảnh báo vận hành; không tự xóa Order/Payment/Reservation. Correlation ID nối log giữa M1–M4/gateway nhưng log phải khử token, mật khẩu và PII. Xem [Security/Privacy](security-privacy.md) và [deployment checklist](deployment.md).

## Những case đối soát bắt buộc

1. M1 reserve thành công nhưng transaction M2 tạo Order thất bại: release đúng reservation/lượt voucher, không có Order một phần.
2. COD Order PREPARING sau transaction nhưng consume M1 lỗi: retry consume cùng ID; Seller chưa được xử lý cho đến PENDING.
3. Callback sandbox Success đến hai lần hoặc đến sau response timeout: chỉ một Payment/Attempt Success và một StockMovement consume.
4. Payment Success khi consume lỗi: chỉ Order đó RECOVERING; không tạo Attempt thu lại; các Order cùng `purchase_group_id` không đổi.
5. Callback Success đến sau khi Order EXPIRED và reservation đã release: Refund đúng Order/Payment, không tự mở lại Order.
6. Product vừa bị ẩn/Store khóa nhưng M4 chưa nhận event: không hiển thị card vì kiểm tra M1/M3 hiện hành.
