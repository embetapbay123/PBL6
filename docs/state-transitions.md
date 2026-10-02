# Vòng đời Order, Payment, tồn và hoàn tiền — 2.1 Draft

Checkout là hoạt động tính quote và xác nhận giỏ, **không có trạng thái entity CheckoutSession**. Một lần xác nhận tạo toàn bộ Order của các Store trong một transaction M2; các Order có chung purchase_group_id nhưng Payment và trạng thái riêng. [Quy tắc nghiệp vụ](business-rules.md) là nguồn bất biến; [sáu state diagram](diagrams/state/) và [sequence](diagrams/sequence/) minh họa luồng.

## Tạo nhóm Order

| Bước | Điều kiện | Tác động | Khi lỗi/lặp |
| --- | --- | --- | --- |
| Quote | Customer chọn CartItem, địa chỉ, phương thức từng Store và voucher | Trả giá hiện hành theo Store và tổng tham khảo; quote_id trỏ cache TTL ngắn, không là entity mua hàng | Không ghi Order, giá cũ cần xác nhận lại |
| Reserve | Xác nhận quote, mọi Store/SKU/voucher còn hợp lệ | M2 cấp trước purchase_group_id và Order ID; M1 reserve đủ SKU, M2 giữ lượt voucher | Bất kỳ SKU lỗi: release mọi reservation/lượt giữ, không có Order |
| Tạo Order | Đã reserve đầy đủ | M2 transaction tạo một Order/Store, OrderItem snapshot, một Payment/Order, voucher redemption, idempotency result và outbox | Transaction lỗi: release reservation/voucher; retry cùng key/hash trả lại cùng nhóm |
| Sau tạo | COD hoặc sandbox theo từng Order | COD PREPARING → PENDING sau consume; sandbox AWAITING_PAYMENT giữ tồn đến hạn | COD consume lỗi ở PREPARING để worker retry; Order khác không chờ thanh toán của nó |

## Order và tồn theo từng phương thức

| Chuyển | Actor/điều kiện | Tác động | Lặp/tranh chấp |
| --- | --- | --- | --- |
| Sandbox PREPARING → AWAITING_PAYMENT | M2 tạo Order, reservation còn hiệu lực | Mở thanh toán riêng Order; payment_expires_at cấu hình mặc định 15 phút | Chưa cho Seller xử lý |
| AWAITING_PAYMENT → PENDING | Callback sandbox Success đã xác minh và M1 consume thành công | Payment SUCCEEDED, tồn đã bán; Order sẵn sàng xử lý | Callback trùng trả trạng thái hiện hành |
| AWAITING_PAYMENT → RECOVERING → PENDING | Payment Success nhưng consume lỗi | Worker retry cùng operation ID, không tạo Attempt/thu tiền mới | Khi không thể phục hồi, Refund riêng Order và Order EXPIRED |
| AWAITING_PAYMENT → EXPIRED | Hết hạn, đối soát provider xác nhận chưa Success | Release reservation, Payment CANCELLED/FAILED | Callback Success đến muộn sau release: ghi nhận thu, Payment REFUND_PENDING và tạo Refund riêng Order; Order vẫn EXPIRED |
| COD PREPARING → PENDING | M1 consume reservation của Order COD thành công | Ghi nghĩa vụ CODCollection, Order sẵn sàng Seller xử lý | Command lỗi giữ PREPARING, retry không trừ tồn hai lần |
| PENDING → CONFIRMED → PROCESSING → SHIPPED | Seller/Owner đúng Store, version đúng | OrderStatusHistory và Shipment mô phỏng | Cạnh sai/version cũ trả 409 |
| SHIPPED → COMPLETED | Sandbox: Seller xác nhận giao; COD: Seller xác nhận giao và thu đủ chính Order | CODCollection/Payment của Order SUCCEEDED, phát OrderCompleted | Order khác cùng nhóm không đổi |
| AWAITING_PAYMENT/PENDING/CONFIRMED → CANCELLED | Customer sở hữu hoặc Seller/Owner đúng Store có lý do | Chưa consume thì release, đã consume thì restock; sandbox đã trả tạo Refund, COD hủy nghĩa vụ | Version cũ trả 409; operation kho/refund chống lặp |

## Payment, Attempt và Refund

Mỗi Order có đúng một Payment, unique Payment.order_id. Sandbox có nhiều PaymentAttempt nhưng tối đa một SUCCEEDED; mỗi callback lưu PaymentEvent theo provider_event_id. COD có một CODCollection/Order, thu đủ một lần trong MVP; không có trạng thái thu tiền chung cho purchase_group_id. Payment.payable_vnd bằng Order.payable_vnd; với COD hủy trước thu, collectible_vnd về 0 nhưng snapshot payable_vnd không đổi.

Refund có order_id và payment_id bắt buộc; Payment.order_id phải bằng Refund.order_id. Order CANCELLED/EXPIRED và Refund REQUESTED/PROCESSING/SUCCEEDED/FAILED là hai trạng thái độc lập. Callback sandbox đến muộn sau release không tạo Order mới vì Order đã tồn tại ở EXPIRED; hoàn tiền trên chính Payment/Order đó. Không có PaymentAllocation hay hoàn tiền toàn checkout.

InventoryReservation của M1 tham chiếu logic order_id được cấp trước khi transaction Order chạy. Reservation ACTIVE → CONSUMED/RELEASED/EXPIRED; StockMovement hoàn kho có order_id và operation_id. M2 đối soát trạng thái provider trước khi release để tránh vừa giao hàng vừa hoàn tiền. Các thời hạn là cấu hình, không viết cứng trong nghiệp vụ.
