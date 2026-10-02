# Bảo mật: phần khung và trách nhiệm hoàn thiện

Nguồn quy tắc: [RBAC](../rbac.md), [security/privacy](../security-privacy.md), [NFR acceptance](../requirements-acceptance.md). Đây là hướng dẫn triển khai, chưa là chứng nhận bảo mật.

| Cơ chế | Khung đã có | Member phải bổ sung |
| --- | --- | --- |
| JWT/session | RS256 allowlist, issuer/audience/expiry/sid; M3 tra phiên và User/membership hiện hành | register/verify/reset/change; revoke phù hợp nghiệp vụ, test khóa User/Store |
| Refresh | Token ngẫu nhiên, hash DB, rotation/family/replay revoke; 7 ngày | retention/history cleanup, nhiều thiết bị và revoke-all UI |
| Web | Access token memory; refresh HttpOnly SameSite=Strict; Origin + CSRF cho cookie auth; CORS origin cố định | kiểm các mutation cookie mới; HTTPS/Secure khi triển khai |
| Mobile | Refresh secure storage, access memory, refresh một lần | kiểm trên thiết bị, vòng đời logout/session expired |
| Scope | Guard roles và lookup M3; Product sample kiểm Store/permission/ownership | scope Customer/Store/Admin cho mọi endpoint thực hiện |
| Input | ValidationPipe allowlist; DTO thật cho auth/catalog; parameter SQL; header/body giới hạn mặc định framework | DTO runtime từng stub, upload validation, rule/amount/version |
| Service identity | Key riêng từng caller, compare constant time, allowlist; internal path không route gateway | scope command, xoay key, TLS mạng nội bộ khi cần |
| DB | Service chỉ nhận URL DB của mình; DB role bị chặn connect DB khác | không đưa credential tools/admin vào app; quyền bảng/backup phù hợp môi trường |
| Abuse | Redis shared counter: login 30/IP/phút; Node/M4 API 600/IP/phút; 429/Retry-After; lỗi limiter trả 503 | giới hạn account+IP, reset/chat/token/cost và test NAT |
| SePay | HMAC raw body + timestamp 300 giây; secret vắng trả 503; có chữ ký hợp lệ vẫn 501 | reference/account/amount/direction/dedup/state/reconciliation; chỉ ACK sau xử lý bền vững |

Mật khẩu BCrypt đầu vào tối đa 72 **byte UTF-8**; cost seed 10 phục vụ local, cần benchmark khi triển khai. Không trả password/token qua log. Tài khoản seed là giả và không dùng ngoài môi trường phát triển.

## Quyền và ranh giới

Service sở hữu tài nguyên lấy User từ verified context, Store từ active membership; bỏ qua store_id/user_id tùy ý trong request. Chi tiết tài nguyên ngoài scope trả 404; thiếu vai trò thao tác trả 403. Owner chỉ cấp nhóm Seller trong RBAC (`product.store.*`, `inventory.store.*`, `order.store.*`, `cod.store.collect`). Admin không mặc nhiên được bán hàng thay Store.

M3 không khả dụng: request cần quyền trả dependency error, không dùng quyền cache cũ. Gateway không cấp quyền bằng header client. Internal key chỉ xác thực service; không thay kiểm tra scope và operation ID. Bản Compose local chia sẻ key map cho các process để xác minh caller; khi triển khai phải hạn chế secret theo receiver/caller và dùng service identity phù hợp môi trường. Private key JWT chỉ mount M3; app khác chỉ có public key.

## Input, upload, secret

DTO type aliases/generated types không bảo vệ runtime. Member phải validation trước service call, chặn mass assignment và kiểm state/version. Ảnh: đề xuất JPEG/PNG/WebP <=5 MiB, kiểm MIME/chữ ký/pixel, tên server cấp; chưa có upload pipeline. Không render Product/chat HTML tin cậy hoặc thêm fetch URL backend khi chưa chặn SSRF.

`.env`, private/public key local và artifacts nằm ngoài Git. Script setup không ghi đè secret đã có; chỉ bổ sung LOCAL_UID/LOCAL_GID nếu cấu hình cũ thiếu. Trên Linux private key tạo mode0600, M3 chạy UID/GID của người tạo khóa để đọc bind-mount; không cần mở private key cho mọi User. Shared container network phục vụ demo local; không expose port service/DB/broker. Chuyển demo HTTPS theo [recovery/deploy](observability-and-recovery.md), bật COOKIE_SECURE. Uvicorn tin forwarded header trong mạng Compose riêng; không publish trực tiếp M4 ra Internet với cấu hình đó.

## AI và quyền riêng tư

M4 đang mock: chưa có cá nhân hóa/lịch sử/consent thật. Khi hoàn thiện: retrieval/prompt là dữ liệu không tin cậy; model không có quyền thực hiện giao dịch/đổi quyền. Kiểm consent trước tracking/training, giới hạn token/cost; Product card xác minh lại qua M1. Không đưa secret/PII vào prompt/log.

Trí review quyền; owner sửa và cung cấp test. Bắt buộc hai User/hai Store, revoked token, mất quyền với JWT còn hạn, input sai, secret không xuất hiện log và service caller ngoài allowlist. Các test mẫu hiện có được ghi trong [validation record](validation-record.md), không đại diện nghiệm thu toàn dự án.
