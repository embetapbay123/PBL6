# API contract 2.1 Draft — Order trước, trả tiền riêng

**Khung 2.2:** [OpenAPI](contracts/openapi.json) hiện có 99 operation (baseline96 + consent GET/PATCH + SePay). [Trạng thái code](implementation/endpoint-status.md) và [provider/session ADR](implementation/scaffold-decisions.md) là nguồn bàn giao hiện hành.

[OpenAPI 3.0 JSON](contracts/openapi.json) là danh mục operation và schema thiết kế. Base path /api/v1, JSON UTF-8, UUID, thời gian UTC, tiền nguyên VND. Lỗi dùng code/message/correlation_id/details. 401 chưa xác thực, 403 thiếu quyền, 404 ngoài scope, 409 xung đột giá/version/idempotency, 422 dữ liệu sai, 429 rate limit. Backend kiểm tra ownership và membership ở mỗi request.

| Nhóm | Endpoint chính | Quyền và ý nghĩa |
| --- | --- | --- |
| Auth | POST /auth/register, /auth/verify-email, /auth/login, /auth/reset-password, /auth/reset-password/confirm, /auth/change-password | M3 lưu token một lần dạng hash; demo nhận link trong mock mailbox, không trả token qua response |
| Store/staff | /me/store-applications, /admin/store-applications, /store/staff/invitations, /me/invitations | Duyệt Store, lời mời theo email đã xác minh, Owner thu hồi PENDING |
| Catalog/inventory | /products, /store/products, /store/inventory | Giá Variant và tồn hiện hành, kiểm tra Store/permission |
| Cart/quote | /cart/items, POST /checkout/quotes | Chọn item nhiều Store, một địa chỉ, payment_methods theo store_id, voucher Store/sàn; quote trả StoreQuote và tổng tham khảo |
| Tạo Order | POST /orders/batches, GET /orders/batches/{id} | Tạo một Order/Store trong một transaction; trả purchase_group_id và danh sách Order; GET tập hợp các Order hiện hành thuộc Customer, không đọc bảng Purchase |
| Payment | POST /orders/{id}/payment-attempts, GET /payments/{id}, POST /payment-callbacks/sandbox | Attempt/gateway gắn riêng Order sandbox AWAITING_PAYMENT; callback chống lặp và xác minh chữ ký |
| Order/Refund | /me/orders, /me/orders/{id}/cancel, /orders/{id}/refund, /store/orders và trạng thái/COD | Order/Payment/Refund độc lập; hủy A không đổi Order B |
| Voucher/Review/Admin/AI | Các endpoint trong OpenAPI | Giữ scope Store/Customer/Admin và điều kiện hiện hành |

`GET /ai/metrics` dùng chung cho Owner và Administrator: M4 lấy Store từ membership hiện hành của Owner để trả số liệu Store; Admin nhận phạm vi toàn sàn hoặc lọc `store_id`. Owner truyền Store khác bị từ chối. Log được khử PII và đánh giá chưa chạy trả `evaluation_status=NOT_RUN`.

`GET /product-types` trả `attribute_definitions` của mỗi ProductType để Portal dựng đúng form thuộc tính động; `POST /store/products` vẫn xác minh giá trị theo định nghĩa hiện hành trước khi lưu.

`GET /store/reports` nhận `from`, `to` UTC và `granularity=DAY|MONTH`; response tách doanh thu hàng Completed, tiền đã thu/hoàn, phí giao hàng, số đơn, Product bán chạy, Variant tồn thấp và chuỗi doanh thu theo kỳ. Variant tồn thấp lấy từ M1 qua contract, không truy vấn DB M1 trực tiếp.

## Quote và tạo nhóm Order

POST /checkout/quotes nhận cart_item_ids, address_id, payment_methods dạng mapping store_id → SANDBOX hoặc COD, platform_voucher_code tùy chọn, store_vouchers tùy chọn. M2 tính lại giá/tồn/Store/voucher và trả quote_id, expires_at, StoreQuote gồm payable riêng từng Store và payable_total_vnd để hiển thị. Tổng quote không phải Payment.

`quote_id` tham chiếu bản quote tạm trong cache có TTL ngắn; đây không là giao dịch mua hay thực thể lưu lịch sử trong ERD. M2 vẫn tính lại giá, tồn và quyền trước khi tạo Order; quote hết hạn hoặc thay đổi trả 409 cùng quote mới để Customer xác nhận lại.

POST /orders/batches nhận cùng dữ liệu, thêm quote_id và expected_payable_total_vnd; header Idempotency-Key bắt buộc, giữ ít nhất 24 giờ. Cùng Customer/key/payload trả đúng purchase_group_id và danh sách Order cũ; cùng key khác payload trả 409. M2 reserve mọi SKU, rồi transaction tạo nguyên tập Order và Payment riêng. Response 201 OrderBatch gồm purchase_group_id, order_ids, orders, payable_total_vnd. Nếu một Store hết hàng/đổi giá, không tạo Order nào; trả lỗi hoặc quote mới. CartItem đã mua được xóa sau transaction nhưng OrderItem snapshot không FK tới CartItem.

Mỗi Order sandbox ban đầu AWAITING_PAYMENT và có payment_expires_at; Customer gọi POST /orders/{id}/payment-attempts riêng cho Order muốn trả. Có thể trả Order A trước, B sau. Order COD vào PREPARING rồi PENDING khi consume tồn; Seller/Owner thu đủ ở Order đó lúc giao. GET /orders/batches/{id} chỉ nhóm theo purchase_group_id trên Order, không có thực thể Purchase/Checkout.

## Callback, hủy và refund

Callback chứa provider_event_id/reference, kết quả, chữ ký. M2 dedup PaymentEvent, kiểm tra Attempt của đúng Order. Success consume tồn; lỗi tạm đưa chính Order đó vào RECOVERING để retry, không tạo Payment mới. Trước khi EXPIRED/release, M2 đối soát gateway; Success đến sau release tạo Refund cho Order đã EXPIRED, không tự mở lại Order. Các Order khác cùng group không thay đổi.

PATCH /store/orders/{id}/status và POST cancel dùng expected_version. AWAITING_PAYMENT/PENDING/CONFIRMED được hủy, PROCESSING trở đi bị từ chối. Chưa trả tiền thì release reservation và không Refund; đã trả thì Refund mock theo payable snapshot gồm phí. Refund có order_id/payment_id bắt buộc và hai ID phải khớp. COD hủy xóa nghĩa vụ thu, không Refund. Response Order tách order.status, payment_status, refund_status.

Voucher sàn được tính trên tập Store tại xác nhận, phân bổ cố định xuống Order; lượt dùng đếm một lần theo purchase_group_id dù mỗi Order có redemption snapshot. Một Order hết hạn/hủy sau tạo không tính lại giảm giá Order còn lại. Xem [Business Rules](business-rules.md), [Data Dictionary](data-dictionary.md) và [Integration Contract](integration-contract.md) để đối chiếu.

## Quy ước chung để client và backend tích hợp

OpenAPI 2.1 có 96 operation với tên tiếng Việt, schema request/response theo miền và 25 ví dụ request cho các luồng quan trọng; các trường `x-required-roles` và `x-data-scope` ghi actor/scope thiết kế. JWT xác thực User, còn quyền Store/ownership phải kiểm tra **tại request**, kể cả khi token chưa hết hạn. API công khai hỗ trợ Guest; chat có thể dùng Guest anonymous key hoặc Customer token; callback sandbox xác thực chữ ký provider, không dùng Bearer của Customer. Các `GET list` nhận `page` từ 1 và `size` mặc định 20, tối đa 100, trả `items,total,page,size`.

Tiền là số nguyên VND không âm; thời gian ISO 8601 UTC; ID là UUID. Các PATCH/decision có cạnh tranh như Order, Review, Product, Voucher, StoreApplication, StoreMembership và taxonomy gửi `expected_version` trong body; 409 `VERSION_CONFLICT` yêu cầu client tải lại bản hiện hành. Schema tạo mới và PATCH tách riêng để PATCH chỉ cần trường định sửa cùng phiên bản, không phải gửi lại toàn bộ dữ liệu. Client giữ nguyên Idempotency-Key và payload khi retry `POST /orders/batches`; nếu đã mất response, gọi `GET /orders/batches/{purchase_group_id}` hoặc tải lại danh sách Order. Không tạo PaymentAttempt mới chỉ vì màn hình chưa nhận callback.

### Ví dụ xác nhận hai Store

```json
{
  "cart_item_ids": ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"],
  "address_id": "33333333-3333-4333-8333-333333333333",
  "payment_methods": {
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": "COD",
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb": "SANDBOX"
  },
  "store_vouchers": {},
  "quote_id": "44444444-4444-4444-8444-444444444444",
  "expected_payable_total_vnd": 290000
}
```

Body trên gửi tới `POST /orders/batches` cùng `Idempotency-Key` mới. Response `201 OrderBatch` chứa `purchase_group_id`, `order_ids`, hai Order và `payable_total_vnd`. **Không có Payment 290000 VND cho cả nhóm**; mỗi Order/Payment giữ `amounts.payable_vnd` riêng. Các UUID trong ví dụ là dữ liệu minh họa, không phải seed thực tế. Voucher sàn và voucher Store nếu có được thêm theo [CheckoutConfirmRequest](contracts/openapi.json); tổng tiền phải tính lại trên server.

### Ví dụ kết quả hủy Order trả trước

```json
{
  "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "purchase_group_id": "44444444-4444-4444-8444-444444444444",
  "store_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "status": "CANCELLED",
  "version": 6,
  "payment_method": "SANDBOX",
  "payment_status": "REFUND_PENDING",
  "refund_status": "PROCESSING",
  "amounts": {"goods_vnd": 100000, "store_discount_vnd": 10000, "platform_discount_vnd": 9310, "shipping_vnd": 15000, "payable_vnd": 95690}
}
```

Ba trạng thái được trả riêng. `CANCELLED` không có nghĩa tiền đã về Customer; client tiếp tục đọc `GET /orders/{id}/refund` để lấy số tiền và tiến độ hoàn. Ví dụ dùng schema `Order` của OpenAPI.

## Danh mục lỗi và cách xử lý

| HTTP | `code` gợi ý | Khi nào | Client nên làm gì |
| --- | --- | --- | --- |
| 400 | `MALFORMED_REQUEST` | JSON/định dạng request sai | Sửa request, không tự retry nguyên payload |
| 401 | `UNAUTHENTICATED` | Thiếu/hết token | Đăng nhập hoặc refresh theo contract; không gửi lại password tự động |
| 403 | `FORBIDDEN` | Thiếu quyền hiệu lực | Ẩn thao tác, tải lại context; không suy ra quyền từ JWT cũ |
| 404 | `NOT_FOUND` | Đối tượng không tồn tại hoặc ngoài Customer/Store scope | Trở về danh sách; không tiết lộ đối tượng khác phạm vi |
| 409 | `PRICE_CHANGED`, `VERSION_CONFLICT`, `IDEMPOTENCY_CONFLICT`, `STATE_CONFLICT` | Quote đổi; version cũ; cùng key khác payload; trạng thái đã chuyển | Tải trạng thái/quote mới và yêu cầu Customer xác nhận lại nếu tiền đổi |
| 422 | `VALIDATION_FAILED`, `VOUCHER_INELIGIBLE`, `INSUFFICIENT_STOCK` | Điều kiện dữ liệu/nghiệp vụ không đạt | Hiển thị trường hoặc item lỗi; không giả định Order đã tạo |
| 429 | `RATE_LIMITED` | Login/search/chat quá ngưỡng | Chờ theo `Retry-After` nếu được trả; không gửi liên tục |
| 5xx | `SERVICE_UNAVAILABLE` | Service/gateway tạm lỗi | Tra cứu trạng thái theo ID/key trước khi retry lệnh ghi |

Error body gồm `code`, `message`, `correlation_id`, `details`; nội dung `details` không chứa secret hoặc dữ liệu ngoài scope. Bảng `code` là danh mục thiết kế; trước khi code, tên cụ thể phải được giữ đồng nhất ở OpenAPI, backend và UI. Lỗi callback gateway không được trả thông tin Order/Customer cho phía không xác thực.
