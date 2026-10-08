# PAY-02 — nhận callback và bàn giao xử lý tiếp

Owner Công, [issue #52](https://github.com/embetapbay123/PBL6/issues/52). Durable receipt/Payment đã có; consume/RECOVERING/Refund chưa nghiệm thu. Metadata callback giữ NOT_IMPLEMENTED cho toàn scope, không đóng issue chỉ vì ACK được callback.

## Phần chạy thật

- SePay Test: HMAC-SHA256 trên timestamp.raw_body, giới hạn 5 phút, trước DTO. Bật rõ SEPAY_WEBHOOK_SECRET, PAYMENT_PROVIDER_MODE=sepay_test và SEPAY_TEST_ACCOUNT khớp tài khoản nhận. Không config/secret tự động, không nhận live payment. [HMAC chính thức](https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc).
- DTO nhận gateway/transactionDate/subAccount/description/accumulated tùy chọn theo [payload chính thức](https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook); giữ strict unknown field và safe integer. Reference lấy code hoặc đúng mã PBL6 trong content; referenceCode là mã ngân hàng. Mã mâu thuẫn/sai amount/account bị từ chối; reference không tồn tại trả 404.
- Event ID namespace theo provider. Receipt/hash, PaymentEvent, Payment/Attempt, audit và payment_followup commit cùng transaction trước ACK 200. Không lưu raw bank payload, description/account/content hoặc signature. Amount lưu để đối soát; retention tài chính theo audit riêng, không dùng làm dataset AI.
- Cùng ID/payload replay; khác payload 409; FAILED cũ không ghi đè SUCCEEDED hoặc Payment có attempt mới. SePay transaction khác ID trả thêm vào cùng attempt được lưu EXTRA_TRANSFER_RECONCILE_REQUIRED và amount cho PAY-03; không coi là replay hoặc tăng payable snapshot.
- Sandbox legacy chỉ nhận attempt provider LEGACY_SANDBOX, ký header raw HMAC. Body signature chỉ giữ tương thích DTO, không xác thực/lưu. Không dùng sandbox để settle attempt SePay; không có endpoint public tạo legacy attempt.

## Hoa tích hợp worker Order

Đọc [callback service](../../backend/commerce-service/src/payment/payment.callback.service.ts), [follow-up port](../../backend/commerce-service/src/payment/payment.followup.port.ts), migration M2 006/007. PaymentFollowupPort.pending trả snapshot gồm operation_id ổn định, Order/Payment/Attempt và correlation_id; chỉ DB M2. **Chưa có worker chạy các job này**: Hoa tích hợp vào ORDER-02, không có consume success giả.

| Kind | Việc cần xử lý |
| --- | --- |
| CONSUME_REQUIRED | Hoa lấy reservation IDs đã persist, gọi M1 ConsumeReservation ngoài DB transaction, retry cùng operation_id/payload/correlation. M1 APPLIED/ALREADY_APPLIED rồi transaction Order sang PENDING và complete(operation_id, CONSUMED) cùng manager. Consume lỗi: chỉ Order đó RECOVERING, worker retry/backoff; không thu tiền lại. |
| RECONCILE_REQUIRED | Quá hạn chưa chứng minh release hoặc trạng thái chưa cho consume. Hoa/Công đối soát lifecycle/payment/kho rồi chọn consume/refund; không expire/release chỉ vì timestamp. |
| REFUND_REQUIRED | Success sau EXPIRED/CANCELLED: không mở lại Order hoặc sửa sibling. Công PAY-03 thực hiện Refund; complete(..., REFUNDED) chỉ nhận khi Order đóng, Refund SUCCEEDED đúng snapshot và refunded_vnd đủ. |

Complete yêu cầu caller transaction, kiểm DB, replay cùng resolution, khác resolution 409. Rollback Order cũng rollback marker. Port không gọi mạng hoặc ghi trạng thái Order thay Hoa. Test chuyển Order là fixture mô phỏng điểm nối, không chứng minh M1 đã consume.

PAY-03 còn đối soát receipt EXTRA_TRANSFER_RECONCILE_REQUIRED theo transaction/amount riêng; không đổi payable hoặc coi khoản trả thêm đã tự refund. Lát cắt này chỉ giữ bằng chứng tối thiểu.

## Chạy và nghiệm thu

Migrate theo README thêm M2 006/007, build/recreate M2; không sửa 001–005/reset volume/commit .env.

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools npm run test:integration -- --runTestsByPath tests/integration/payment.callback.test.ts
```

12 test PostgreSQL + HTTP trên schema cô lập: signature/DTO/official fields, unsafe money, duplicate/concurrency, account/reference/amount, provider isolation, late/sibling, audit rollback, completion rollback/replay. Chưa có webhook từ dashboard SePay Test, consume lỗi RECOVERING/restart hoặc Refund thực: bổ sung evidence cùng #14/#22/#53 trước nâng metadata/Done.
