# Bàn giao backend thử đồ AI

Ngày: 14/11/2026. Đã triển khai FE/BE, cấu hình khóa OpenAI riêng và bật chế độ mật khẩu demo trước mỗi lần tạo ảnh trên local/demo. Readiness và public smoke đạt; chưa gọi tạo ảnh trả phí để nghiệm thu.

## Kết quả

- M4 có tám operation thử đồ: capabilities, upload ảnh, tạo/danh sách/chi tiết/xóa tác vụ, xóa ảnh gốc, đọc kết quả qua URL ký ngắn hạn.
- OpenAI trực tiếp: `gpt-image-2.6-sunburst`, quality/complexity low, một ảnh đầu ra, hai ảnh đầu vào. Model, prompt và kích thước do server quyết định.
- Hạn mức tài khoản/IP, một tác vụ chưa kết thúc/người, cooldown, giới hạn tổng lượt và ngân sách được thực thi trong PostgreSQL; không mất khi Redis/worker restart.
- Ngân sách người dùng đã chọn: 1 USD/ngày, 10 USD/tháng. Khoản giữ trước mặc định là 0.25 USD/tác vụ; đây là dự phòng, không phải đơn giá tạo ảnh.
- Worker dùng lease/fencing, đánh dấu trước khi gửi, lưu receipt trước khi cập nhật DB; không tự gửi lại lời gọi có khả năng đã tới OpenAI.
- Lỗi chưa rõ giữ ngân sách, có CLI tạm dừng/đối soát và audit. Kết quả/ảnh riêng tư có hạn lưu và xóa; xóa khi đang xử lý không làm ảnh xuất hiện lại.
- Secret OpenAI chỉ ở runtime backend. Khóa ký riêng đã được tạo, không lưu trong Git/frontend.
- Demo yêu cầu mật khẩu trên cả upload và tạo job, kiểm tra hash PBKDF2 ở server. Redis giới hạn thử sai; FE không lưu mật khẩu hoặc khóa API.

## Kiểm chứng

| Hạng mục | Kết quả |
| --- | --- |
| Build TypeScript backend | Đạt |
| Build frontend sau sinh types | Đạt |
| OpenAPI validation và generated contract drift | Đạt |
| Toàn bộ M4 pytest với source mới | 204 đạt |
| Trong đó test về thử đồ và mật khẩu demo | 48 đạt |
| Playwright thử đồ trên frontend production preview | 14 đạt |
| Migration M4 local và demo | 009 đã áp dụng |
| M4 local readiness | 200, real mode |
| Demo M4/worker | `AI_DEPLOY_OK`; worker dùng cùng database với M4 |
| Public endpoint capabilities khi chưa đăng nhập | 401 đúng yêu cầu |
| Demo web sau sinh types | `DEPLOY_OK`, public smoke đạt |
| Quyền truy cập model với khóa cung cấp | GET model trả 200; không gọi tạo ảnh trả phí |
| Demo sau khi kích hoạt | `configured=true`, `demo_mode=true`, `paused=false`, readiness 200 |

Bộ kiểm thử M4 chạy với `CHAT_DAILY_REQUEST_LIMIT=100`, `CHAT_DAILY_TOKEN_LIMIT=100000`, `CHAT_THINKING=auto` để cấu hình demo không làm thay đổi giả định kiểm thử. Assertion prompt version cũ của test chat được cập nhật theo phiên bản prompt hiện hành; không thay đổi logic chat.

Test HTTP thử đồ dùng FastAPI thật, PostgreSQL schema riêng và fixture xác thực M3. Test worker dùng provider giả. Chưa nghiệm thu bằng một tài khoản khách hàng thật trên demo hoặc model trả phí: đăng nhập seed/demo dùng trong kiểm tra trực tiếp bị M3 từ chối 403; không thay đổi chính sách xác thực để vượt qua việc này.

`npm run docs:check` hiện chạy được thay vì lỗi `$ref` với schema inline. Nó vẫn báo các metadata/index cũ của messaging/shipping/returns chưa đồng bộ; không tự thêm quyền hoặc scope cho những module ngoài phạm vi thử đồ. OpenAPI validation, contract drift và các test M4 nêu trên đều đạt.

## Vận hành

Xem [runbook đầy đủ](../../backend/ai-service/app/try_on/README.md) để cấu hình khóa, bật tạo ảnh, đọc counters, pause/resume, đối soát UNKNOWN và deploy M4 riêng.

- `scripts/deploy-demo-ai.ps1` chỉ rollout M4/worker/gateway liên quan, giữ dịch vụ M1/M2/M3.
- Worker demo kế thừa URL database thực tế của M4 qua file riêng trong `infrastructure/secrets`; không đoán tên database từ local.
- Giữ `TRY_ON_ENABLED=0` khi chưa có khóa/quyền model. Sau khi đặt khóa riêng tư và bật cờ, cần recreate cả M4 lẫn worker; chưa cần sửa FE.
- Sau mỗi rollout M4, chạy `scripts/configure-demo-try-on.ps1` để chuyển cấu hình riêng và bật lại demo có mật khẩu. Script deploy code luôn tắt tạo ảnh trước khi kiểm tra.
- Cần kiểm tra một nhóm ảnh thật nhỏ để nghiệm thu độ đúng sản phẩm, khuôn mặt/vóc dáng, thời gian và chi phí thực tế trước khi mở rộng.
