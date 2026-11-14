# Giới hạn truy cập gateway

Ngày: 14/11/2026. Đã deploy demo với `EDGE_DEPLOY_OK`, kiểm chứng public và IP thật qua Cloudflare đạt. Bộ chặn `edge-guard` chạy trước các route nghiệp vụ của Caddy, dùng Redis hiện có. Không thay đổi đăng nhập, dữ liệu nghiệp vụ, mật khẩu demo hay ngân sách tạo ảnh.

| Nhóm, dùng chung theo IP | Cửa sổ trượt 10 giây | Cửa sổ dài |
| --- | ---: | ---: |
| Tải trang / F5 | 10 | 60/phút |
| Tổng API, gộp M1/M2/M3/M4 | 40 | 240/phút |
| Tìm kiếm / danh sách sản phẩm | 20 | 90/phút |
| Đăng nhập / đăng nhập demo | 5 | 20/phút |
| Đăng ký / quên mật khẩu | 2 | 10/giờ |

API thuộc nhóm tìm kiếm, đăng nhập hoặc email vẫn phải qua hạn mức tổng API. Các limiter cũ trong service và quota AI tiếp tục áp dụng. Ảnh catalog, JS, CSS và tài nguyên tĩnh không trừ lượt. HEAD/OPTIONS không được dùng để tăng quota; URI được giải mã, chuẩn hóa dấu chấm, dấu gạch chéo và chữ hoa/thường trước khi chọn nhóm. Đổi query hoặc tài khoản không tạo bucket IP mới. Các địa chỉ IPv6 trong cùng /64 dùng chung hạn mức.

Redis thực hiện một Lua script nguyên tử cho mọi cửa sổ liên quan, dùng thời gian từ Redis. Yêu cầu vượt giới hạn không tăng counters hoặc kéo dài thời gian khóa. Counter hết hạn tự động; restart container không xóa hạn mức. Key chỉ chứa hash địa chỉ, nhóm và cửa sổ; không chứa query, cookie, token, ảnh hoặc mật khẩu.

API bị chặn trả JSON `429`, mã `RATE_LIMITED`, correlation ID và `Retry-After` tính theo cửa sổ trượt thực tế. Tải trang bị chặn trả trang tiếng Việt với thời gian chờ và nút thử lại, không tự reload. Response dùng `private, no-store`. Khi Redis lỗi, trả `503`; lỗi kết nối tới guard cũng không cho request đi tiếp. Service không có cổng host và không nhận khóa OpenAI, JWT, database hoặc cookie. Caddy xóa các header credential trên bản sao gửi tới guard; request nghiệp vụ vẫn được chuyển nguyên body và thông tin xác thực.

## IP người dùng trên demo

Demo dùng Cloudflare Tunnel ở host, đi vào cổng origin chỉ bind `127.0.0.1:18080`. Script rollout kiểm tra điều này, tìm đúng gateway của Docker bridge và chỉ tin CIDR /32 đó cùng loopback. Caddy lấy IP từ `CF-Connecting-IP` khi peer nằm trong danh sách tin cậy; request trực tiếp từ peer khác dùng địa chỉ kết nối. Không tin toàn bộ private network hoặc X-Forwarded-For từ người gọi.

Caddy ghi đè X-Forwarded-For và X-PBL6-Client-IP khi gọi M1/M2/M3/M4. Vì vậy limiter cũ và quota tạo ảnh cũng nhận địa chỉ đã xác minh. Bộ kiểm tra public đối chiếu key Redis với IP của cùng caller do `/cdn-cgi/trace` cung cấp; địa chỉ không được ghi ra báo cáo. Gửi header IP giả từ public vẫn bị tính cùng hạn mức.

Không mở origin ra Internet khi dùng cấu hình tin cậy host tunnel này. Nếu đổi topology, cập nhật danh sách proxy chính xác; không thêm `private_ranges` để chữa lỗi. Người dùng chung NAT/Wi-Fi có thể dùng chung hạn mức; điều chỉnh các biến `EDGE_*` nếu có nhiều người demo cùng mạng. Đây là giới hạn request ứng dụng, không thay thế chống DDoS ở mạng/CDN.

## Triển khai và khôi phục

Local: dùng `infrastructure/compose.yaml`; có thể thêm `compose.edge-guard.yaml` để áp dụng read-only filesystem và hardening container. Mặc định không tin Docker bridge cho các request local trực tiếp.

Demo: chạy `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-demo-edge.ps1`. Script xây image guard, giữ route Caddy hiện có, xác minh bind origin/proxy, chỉ cập nhật guard và gateway. M1/M2/M3/M4, worker, web, database và cấu hình gen ảnh không bị recreate. Build hoặc kiểm chứng thất bại sẽ phục hồi gateway; rollout thành công kết thúc bằng `EDGE_DEPLOY_OK`.

Khi thao tác gateway trên demo, dùng cả hai file compose:

```sh
docker compose -p pbl6-demo --env-file infrastructure/.env \
  -f infrastructure/compose.yaml -f infrastructure/compose.edge-guard.yaml \
  ps edge-guard gateway
```

Giữ `EDGE_TRUSTED_PROXY_CIDRS` trong môi trường gateway qua overlay. Không dùng `--remove-orphans` khi chạy compose thiếu overlay: worker try-on và guard của demo có thể nằm ngoài base compose cũ trên server. Deploy AI nhận biết header `{client_ip}` để không lồng thêm reverse_proxy block cũ.

## Kiểm chứng

- 10 test guard: phân nhóm và chuẩn hóa URI, IPv6, cấu hình sai, lỗi Redis, HTTP response, Lua đồng thời/cửa sổ dài/expiry và tách IP.
- 2 test patch gateway: giữ route, idempotency, ghi đè header và từ chối cấu hình lạ.
- M4 full suite: 214 đạt. Không gọi provider trả phí.
- `scripts/verify_edge_guard.py` chạy một đợt hữu hạn: API/trang trả 200 rồi 429, header giả không đổi quota, asset thật vẫn 200, route riêng tư 404, login bị chặn và phục hồi 200 sau thời gian chờ. Không xóa counter và không bypass limiter.
- Báo cáo local/public nằm trong `outputs/edge-guard/`.
- Chromium thật: mở trang bình thường 200, gửi dồn rồi tải lại nhận 429; nút thử lại dùng được bằng bàn phím, viewport 390 px không tràn ngang, không có page error. Có ảnh desktop/mobile và `browser-verification.json`.
- Sau rollout, worker thử đồ vẫn `configured=true`, `demo_mode=true`, `paused=false`, ngân sách 1 USD/ngày và 10 USD/tháng; M4 không bị restart.
- File SSH helper tạm do script quản trị cũ tạo tại `%TEMP%/askpass.cmd` chưa xóa được: bộ duyệt tự động từ chối cả thao tác dọn theo đường dẫn đầy đủ với lý do `blocked by policy`. Các file tạm của script deploy mới được dọn trong finally.

Tham khảo chính thức: [Caddy forward_auth](https://caddyserver.com/docs/caddyfile/directives/forward_auth), [Caddy trusted proxies](https://caddyserver.com/docs/caddyfile/options#trusted-proxies), [chuẩn hóa path matcher](https://caddyserver.com/docs/caddyfile/matchers#path), [Cloudflare CF-Connecting-IP](https://developers.cloudflare.com/fundamentals/reference/http-headers/#cf-connecting-ip).
