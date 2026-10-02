# Quyết định triển khai khung 2.2

Ngày: 02/10/2026. Các quyết định này thay phần đề xuất sáu service trong hướng dẫn triển khai cũ. Baseline nghiệp vụ 2.1 vẫn là nguồn quy tắc, trừ các điều chỉnh provider/session dưới đây.

| Mã | Quyết định | Hệ quả |
| --- | --- | --- |
| S-01 | 4 service SOA M1–M4, DB user/database riêng trên cùng PostgreSQL instance | M2 được transaction chung Cart/Order/Payment; không transaction xuyên M1/M3/M4 |
| S-02 | NestJS/TypeORM M1–M3; FastAPI/SQLAlchemy M4; RabbitMQ + Redis; Caddy gateway | Image Node chung để phát triển, process và DB ownership riêng; synchronize=false |
| S-03 | Bàn giao khung chi tiết, không code hết nghiệp vụ | 99 operation có trạng thái; controller 501 và service/repository là điểm mở rộng |
| S-04 | Web access token trong memory; refresh cookie HttpOnly; Origin/CSRF; Mobile body token và secure storage | JWT RS256 15 phút, refresh hash/rotation/family 7 ngày; M3 kiểm phiên/quyền hiện hành |
| S-05 | Provider đích: QR + SePay bank webhook Test Mode | Không dùng SePay payment gateway checkout; adapter chữ ký đã có, xử lý tiền chưa có |
| S-06 | Giữ `/payment-callbacks/sandbox` cũ là stub tương thích | Member dùng `/payment-callbacks/sepay`; return URL/stub không là bằng chứng thu tiền |
| S-07 | M4 mặc định mock, không gọi API trả phí | RAG OpenAI và implicit ALS là backlog; không tuyên bố đạt chất lượng AI |
| S-08 | 54 entity đích làm nền migration/model | Technical table và refresh_session.family_id bổ sung cho khung; constraint/index baseline đã bổ sung migration 003; kiểm quyền, cạnh chuyển trạng thái và bất biến liên bảng do service thực thi |

`schema_migration`, `outbox`, `inbox`, `operation_result`, `bootstrap_effect` là bảng kỹ thuật ở từng database. `family_id` giữ lịch sử token refresh để phát hiện replay và thu hồi cả phiên. Migration 002 đổi correlation_id outbox từ UUID sang text cho correlation header giới hạn 64 ký tự. Migrator chung và Alembic M4 dùng ledger tránh áp dụng trùng SQL.

Mẫu `updateProduct` chỉ hỗ trợ title/description/expected_version. Chưa thực hiện đổi loại/variant/trạng thái hoặc toàn bộ ProductUpdate. DTO đầy đủ đã có; trường hợp lệ ngoài phạm vi mẫu trả 501, input sai trả 422. Owner bổ sung logic trước khi đổi IMPLEMENTED.

Các sơ đồ ERD/sequence 2.1 là thiết kế đích, chưa mô tả đầy đủ runtime khung. Thuật ngữ sandbox trong baseline ánh xạ sang provider test cho mốc triển khai; Công đồng bộ state/test/payment schema chi tiết khi hoàn thiện SePay. Không đổi enum nghiệp vụ cũ tùy ý trong UI.
