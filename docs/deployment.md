# Hướng dẫn triển khai và demo 2.1 Draft

**Chạy khung local 2.2:** dùng [README gốc](../README.md), [recovery/deploy guide](implementation/observability-and-recovery.md) và [validation record](implementation/validation-record.md). Các bước demo nghiệp vụ bên dưới dành cho hệ hoàn thiện, chưa được thực thi đầy đủ.

**Trạng thái:** tài liệu thiết kế, chưa kiểm chứng trên một hệ thống đang chạy. Triển khai bốn service M1–M4, API Gateway, worker M2/M4 và bốn DB/schema PostgreSQL sở hữu riêng. M4 cần pgvector cho ProductEmbedding; M1 cần JSONB/GIN cho catalog và thuộc tính động. Không dùng credentials production cho demo.

## Biến môi trường cần cung cấp

| Nhóm | Biến gợi ý | Ý nghĩa |
| --- | --- | --- |
| Gateway/Auth | `JWT_SIGNING_KEY`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `RATE_LIMIT_*` | Secret qua env/secret store; HTTPS cho demo |
| M1 | `M1_DATABASE_URL`, `RESERVATION_TTL_SECONDS=900` | DB catalog/kho, TTL giữ tồn |
| M2 | `M2_DATABASE_URL`, `IDEMPOTENCY_TTL_SECONDS=86400`, `RECOVERY_ALERT_AFTER_ATTEMPTS=5` | DB giao dịch, key retry và cảnh báo |
| M3 | `M3_DATABASE_URL` | DB danh tính/Store/quyền |
| M3 demo mailbox | `MOCK_MAILBOX_ENABLED=true`, `MOCK_MAILBOX_URL`, `STAFF_INVITATION_TTL_SECONDS=604800` | M3 ghi link reset/lời mời vào mailbox cục bộ của demo; tester dùng mailbox theo email seed, không gửi email thật |
| M4 | `M4_DATABASE_URL`, `LLM_API_KEY`, `EMBEDDING_MODEL`, `RECOMMENDATION_MODEL_URI` | AI và model version |
| Sandbox | `SANDBOX_CALLBACK_SECRET`, `SANDBOX_BASE_URL` | Xác thực callback mock |
| Kênh | `PUBLIC_API_BASE_URL`, `APP_TIMEZONE=Asia/Bangkok` | Gateway và múi giờ hiển thị |

Không đưa secret vào Git, tài liệu, log hoặc prompt LLM. Migration chạy riêng theo thứ tự M3 → M1 → M2 → M4 cho seed tham chiếu logic; schema giữa service không tạo FK. Seed demo gồm hai Store active, hai Seller/Owner, hai Customer, Product có/không biến thể, tồn, voucher Store/toàn sàn, đơn COD/sandbox và dữ liệu AI giả lập được đánh dấu demo.

Để demo, tester mở mock mailbox theo email tài khoản seed để lấy link xác minh email khi đăng ký hoặc mã/link đặt lại mật khẩu; API reset luôn trả phản hồi giống nhau kể cả email không tồn tại, không trả token trong body hoặc log. `POST /auth/verify-email` ghi `email_verified_at` khi link hợp lệ. Lời mời nhân viên hiện trong `GET /me/invitations` sau khi người được mời đăng nhập bằng email đã xác minh; nếu chưa có tài khoản, tester đăng ký rồi xác minh cùng email trước. Mock mailbox chỉ dùng trong môi trường demo có kiểm soát, tắt ở môi trường triển khai thật cho tới khi có kênh email được thiết kế và kiểm thử. Worker M3 chuyển lời mời PENDING quá hạn thành EXPIRED; API cũng kiểm tra `expires_at` tại thời điểm nhận nên không phụ thuộc worker.

Readiness của M2 cần DB và kết nối M1/M3 tối thiểu; M4 lỗi không chặn catalog/tạo Order. Worker đối soát Order AWAITING_PAYMENT hết hạn, sandbox RECOVERING, COD PREPARING, reservation, callback trùng và Refund FAILED. Health/metric ghi latency API, retry, thời gian index, Payment Success nhưng Order chưa PENDING, tồn giữ quá hạn và payable Order lệch Payment. Demo: tạo hai Store, áp voucher hai lớp, tạo A COD và B SANDBOX cùng purchase_group_id, xử lý A trước khi trả B, thử B hết hạn, hủy một Order, xem Refund/COD, quyền Seller và AI. Chỉ đánh dấu đạt sau khi [Test Plan](test-plan.md) có log thực thi.

## Checklist chuẩn bị release/demo

| Bước | Cần kiểm tra | Bằng chứng cần lưu | Trạng thái hiện tại |
| --- | --- | --- | --- |
| Cấu hình | Bốn DB/schema tách quyền; gateway HTTPS; secret/env không nằm trong Git/log | File cấu hình mẫu đã khử secret, health URL | Chưa kiểm chứng |
| Migration | Chạy migration riêng M3→M1→M2→M4; kiểm constraint/index và không có FK xuyên service | Migration version, log áp dụng | Chưa kiểm chứng |
| Seed | Tài khoản/Store A/B, SKU cuối, SKU mặc định, voucher hai lớp, Order mẫu và consent AI | Seed version, ID demo, checksum | Chưa kiểm chứng |
| Health | Gateway/M1–M4/worker trả health/readiness; M4 lỗi không chặn mua | Kết quả health và thời điểm | Chưa kiểm chứng |
| Đối soát | AWAITING_PAYMENT quá hạn, PREPARING/RECOVERING, Refund FAILED, outbox/inbox tồn | Dashboard/log theo correlation ID | Chưa kiểm chứng |
| Khôi phục | Backup DB trước demo; phương án rollback migration và model/index; không xóa Order đã tạo | Backup ID, quy trình rollback được thử | Chưa kiểm chứng |
| Kiểm thử | Chạy TC-CHK-01, TC-COD-01, TC-ORD-02, TC-SEC-01, TC-AI-01 và TC-OPS-01 | Run ID, build, dataset, log/screenshot | Chưa thực thi |

Các tên biến và thứ tự ở trên là **contract thiết kế**. Khi có repository backend, thay bằng lệnh migration/seed/health thật của từng service và thử trên môi trường demo trước khi ghi “đã kiểm chứng”. Không tự động chạy rollback trên dữ liệu giao dịch chưa đối soát.

## Kịch bản trình bày ngắn

1. Đăng nhập C1, xem Product A/B cùng SKU mặc định và giỏ nhóm theo Store. Áp voucher Store A + voucher sàn; màn quote hiển thị tiền từng Store và tổng tham khảo.
2. Chọn A COD, B SANDBOX và xác nhận một lần. Ghi `purchase_group_id`, hai `order_id`, hai Payment riêng. Seller A giao/thu COD, B vẫn AWAITING_PAYMENT.
3. Trả B qua sandbox, cho xem callback thành công và trạng thái B; chạy lại callback để chứng minh không thu/consume lặp. Giả lập một lần consume lỗi để thấy RECOVERING và worker tự phục hồi.
4. Hủy một Order còn đủ điều kiện; hiển thị kho và Refund/COD riêng của Order đó, Order còn lại không đổi. Thử Seller Store A mở Order B để thấy từ chối.
5. Đổi giá/ẩn Product rồi mở chatbot/gợi ý; card không được trả giá cũ hoặc Product bị ẩn. Chỉ trình bày metric recommendation khi có run thực, nếu chưa có thì hiện **chưa thực thi**.
