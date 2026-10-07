# Refund runtime — phần độc lập của Công

[PAY-03 #53](https://github.com/embetapbay123/PBL6/issues/53) vẫn mở: provider tiền thật, đối soát tiền chuyển dư và tích hợp cancel/expiry toàn luồng chưa nghiệm thu. Không biến `REQUESTED`/`PROCESSING`/`UNKNOWN` thành thông báo đã hoàn tiền.

## Caller-owned transaction

`PaymentService(manager).requestRefund({order_id,payment_id,amount_vnd,operation_id,correlation_id})` dùng chính EntityManager của transaction Order đang gọi. Không mở transaction khác hoặc gọi provider ở đây. Order phải CANCELLED/EXPIRED; SANDBOX Payment SUCCEEDED đã thu đủ payable; amount phải đúng toàn bộ Order/Payment, refunded=0 và có Attempt SUCCEEDED. Port không hỗ trợ COD/partial refund/hoàn tiền dư, không tự sửa Order.

Lock Order → Payment → Refund; request/Refund/job/audit/idempotency cùng transaction. Cùng operation_id + payload replay kết quả yêu cầu ban đầu; ID giống nhưng payload khác trả 409. Payment đã có Refund bằng ID khác trả 409, không tạo khoản hoàn thứ hai. `GET /orders/{id}/refund` dùng Customer ownership, trả 404 nếu không có/khác User và đúng schema Refund; enum bổ sung UNKNOWN để không nói FAILED khi kết quả ngân hàng chưa rõ.

Migration mới: `backend/commerce-service/migrations/008_refund_runtime.sql` và `009_refund_job_integrity.sql`. Giữ 001–007; không migrate bằng cách sửa baseline. Unique Payment/operation/receipt và FK ràng buộc job/Refund/operation/amount; lưu reference, amount, provider và correlation, không lưu payload ngân hàng thô.

## Worker và provider

`refund.runner.ts` là kernel worker có provider interface; `refund.worker.ts` là CLI hiện dùng DisabledRefundProvider. **Chưa có adapter hoàn tiền ngân hàng thực được cấu hình.** Không cho chọn fake provider qua biến môi trường. Default disabled không gọi network hoặc đổi Payment thành REFUNDED, nhưng có thể enqueue REFUND_REQUIRED của Order đã đóng thành REQUESTED và đưa lease hết hạn về UNKNOWN để đối soát.

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build tools m2
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools node dist/shared/src/migrate.js
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml up -d m2
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm -e SERVICE_ID=M2 tools node dist/commerce-service/src/payment/refund.worker.js --once
```

CLI không có `--once` sẽ poll recovery mỗi giây; operator tự triển khai process khi cần, chưa thêm worker vào Compose mặc định. Có provider thì inject implementation vào RefundRunner; adapter phải đảm bảo durable idempotency cùng operation_id và lookup authoritative, không dùng cache/lookup eventually consistent làm NOT_FOUND. Không invent endpoint hoàn tiền từ API tạo QR/SePay webhook. Provider command/lookup nhận operation_id/provider/payment_reference/amount cố định; network chạy ngoài transaction, deadline tổng 1 giây. Timeout không chứng minh ngân hàng chưa thực thi.

Trạng thái:

| Tình huống | Refund / job | Hành động tiếp |
| --- | --- | --- |
| Request hợp lệ / provider disabled | REQUESTED / PENDING | Chờ adapter đã được nghiệm thu; không báo hoàn tiền |
| Command đã claim | PROCESSING / LEASED | Lease token riêng; gọi ngoài DB transaction |
| Timeout/error/response không khớp | UNKNOWN / RECONCILE | Chỉ lookup, backoff có jitter tối đa 300 giây; không tự gửi command lại |
| Crash hoặc DB/audit lỗi sau command | UNKNOWN sau lease 30 giây / RECONCILE | Restart lookup cùng operation ID, không tạo ID mới |
| Lookup authoritative NOT_FOUND | REQUESTED / PENDING | Gửi lại cùng ID/payload ở lượt sau |
| Provider xác nhận FAILED chưa thực hiện | FAILED / FAILED | `retryKnownFailure(manager,id)` cần transaction; giữ ID cũ. Không dùng cách này cho UNKNOWN hoặc STATE_CHANGED |
| Receipt SUCCEEDED khớp đủ scope/amount | SUCCEEDED / DONE | Payment REFUNDED, event/audit/receipt và marker REFUND_REQUIRED cùng transaction |

Worker kiểm lại Order/Payment trước command và trước ghi ledger. Receipt phải khớp operation/provider/reference/amount; receipt ID bị giới hạn và unique theo provider. Hai worker tranh cùng job chỉ claim một token. Lease cũ không được ghi kết quả sau khi đã mất token. Provider API vẫn phải hỗ trợ idempotency; DB lease không đủ để bảo đảm ngân hàng không thực thi lặp khi process chết.

REFUND_REQUIRED trên Order đóng được enqueue với chính operation_id của follow-up. Chỉ marker đó được tự đóng khi có Refund SUCCEEDED đã ghi cùng transaction. RECONCILE_REQUIRED của Hoa và receipt EXTRA_TRANSFER_RECONCILE_REQUIRED không tự đóng; khoản chính và tiền chuyển dư là hai nghĩa vụ khác nhau. Consumer/Inventory/Order state machine vẫn thuộc owner đã chốt.

## Bằng chứng và phần tiếp

10 PostgreSQL integration cases ở schema cô lập kiểm replay/concurrency/amount/state/ownership/rollback, Disabled provider, receipt mismatch, UNKNOWN→lookup→NOT_FOUND→same-ID retry, expired lease, audit rollback/restart và late payment/tiền dư. Provider test double chỉ nằm trong test, không chứng nhận đã chuyển tiền ngân hàng. Chạy toàn bộ integration và CI trước merge.

Để nghiệm thu PAY-03: chọn phương thức/provider hỗ trợ refund và lookup thật hoặc quy trình đối soát được chốt; kiểm timeout/restart từ provider đó, ghép Hoa cancel/expiry với port, xử lý khoản chuyển dư riêng và demo đúng bằng chứng tiền. Không trả fake SUCCEEDED để hoàn thành issue.
