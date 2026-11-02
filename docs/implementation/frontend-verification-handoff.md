# Nghiệm thu web marketplace — 28/10/2026

## Môi trường

Kiểm thử database/HTTP dùng project Docker riêng `pbl6-fe-verify`, volume/network riêng, gateway `127.0.0.1:18080`, image `pbl6-node:fe-verify`. Frontend Vite `127.0.0.1:3109` proxy vào gateway này. Không dùng database của project `pbl6` đang phục vụ demo. Không triển khai hoặc commit thay đổi lên môi trường dùng chung.

M3 có lượt chạy với adapter mock và lượt đầy đủ với capture trên database m3_test riêng; online payment/refund provider disabled. Kiểm thử SMTP dùng peer TLS nội bộ. Những cấu hình này không chứng minh email, chuyển tiền, hoàn tiền hoặc AI provider thật đã nghiệm thu.

## Bằng chứng đã chạy

| Phạm vi | Bằng chứng | Kết quả |
| --- | --- | --- |
| Backend Node | Toàn bộ 40 suite unit trong Linux container | 294 test qua |
| Backend PostgreSQL/HTTP | Toàn bộ 30 suite integration, đủ bốn service, worker M1/M4, RabbitMQ và m3_test riêng | 198 test qua; gồm auth/reset/verify, địa chỉ, lời mời, RBAC xuyên service, catalog, kho, voucher, checkout recovery, COD, callback, review, notifications, returns và audit |
| M4 Python | Toàn bộ test bằng python -m pytest, worker tracking và broker thật | 122 test qua; model transport dùng adapter kiểm thử, không phải nghiệm thu chất lượng model/provider thật |
| Browser hồi quy | 95 test ở API mode sau sửa dialog | 92 qua, 3 bỏ qua có điều kiện; live chat chạy riêng qua 1 test |
| Dialog và thao tác liên quan | Browser inventory/order/Admin review và settings | Qua vòng focus, Escape, khôi phục opener và các luồng ghi. Sau chốt Seller thiếu taxonomy, chạy lại 11 test Seller đều qua; không yêu cầu nhập mã thuộc tính tay |
| Responsive | Seller ở 1440/768/390 px; audit ở 390 px | Qua tương tác và kiểm tra overflow; đã xem ảnh và sửa header/tiêu đề/nav thừa trên mobile |
| Contract/build | Frontend TypeScript/Vite, backend TypeScript/Docker; docs/OpenAPI/runtime drift | Build qua; 128 public + 11 internal operation đồng bộ |

Browser dùng fixture chỉ chứng minh UI, payload và xử lý lỗi. Các kiểm thử database dùng PostgreSQL thật; test provider chuyển tiền và generation dùng adapter có kiểm soát. SMTP sử dụng peer TLS/capture nội bộ, chưa gửi qua dịch vụ email thật. Hai test explicit fixture-mode không được chọn ở API mode; live messaging được bật riêng trên dữ liệu test và kiểm tra lịch sử sau reload.

Lỗi môi trường đã xử lý: gateway kiểm thử ban đầu chưa route AI và chặn non-API; các test outbox cần RabbitMQ/worker và tracking cần worker M4. Không bỏ qua các test này: toàn bộ integration và Python đã qua khi hạ tầng đủ. Các test timeout M4 được cố định cấu hình trong fixture để không phụ thuộc CHAT_TIMEOUT_SECONDS của máy chạy.

Gateway đã được chạy lại bằng chính infrastructure/Caddyfile, chỉ thay listener thành :80; kiểm thử lại boundary/auth, profile Store, chat, returns, reviews và audit đều qua. Cấu hình production trả 404 cho internal/health/metrics thay vì chuyển sang SPA.

## Triển khai

- Chạy migrations mới của M1/M2/M3 trước ứng dụng. M2 cần 011_notifications và 012_return_requests để notification projection hoạt động.
- M1 cần `COMMERCE_URL` để kiểm tra review. Compose đã cấu hình URL service nội bộ; triển khai M2 với contract VerifyReviewEligibility mới trước M1.
- Nạp gateway theo Caddyfile mới: chat về M3; catalog/favorites/review về M1; thông báo/đổi trả về M2; mỗi đường nhật ký về đúng service.
- Sinh lại và kiểm tra bằng `npm run generate:contracts`, `npm run generate:types`, `npm run docs:check`, `npm run contracts:check`, `npm run contracts:drift`.
- Browser hiện dùng Edge có sẵn qua PLAYWRIGHT_CHANNEL=msedge, không cần tải Chromium riêng. Build frontend/backend bằng `npm run build`, `npm run build:backend`. Unit tests trên Windows sandbox có thể lỗi SMTP loopback; bộ test đã được xác minh trong Linux container, không bỏ qua test SMTP.

## Chưa nghiệm thu đầy đủ

Hoàn online sau giao hàng đã có enqueue/kernel đối soát; adapter chuyển tiền thật và hoàn COD chưa có. Refund request không được đánh dấu COMPLETED khi chưa có refund SUCCEEDED và bằng chứng đủ số tiền. Email, thanh toán online, hoàn tiền và AI vẫn cần cấu hình provider test và bằng chứng chạy thực. Cần tiếp tục kiểm tra toàn bộ màn trên thiết bị, bàn phím và các lỗi mạng; không đồng nhất handler IMPLEMENTED với việc hoàn tất toàn bộ kế hoạch hoặc nghiệm thu production.
