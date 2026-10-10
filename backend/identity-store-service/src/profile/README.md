# M3 / profile

Owner: Trí

- `GET /me/context` — getAuthContext: **IMPLEMENTED_SAMPLE**
- `GET /me` — getProfile: **IMPLEMENTED_SAMPLE**
- `PATCH /me` — updateProfile: **IMPLEMENTED**
- `GET /me/addresses` — listAddresses: **IMPLEMENTED**
- `POST /me/addresses` — createAddress: **IMPLEMENTED**
- `PATCH /me/addresses/{id}` — updateAddress: **IMPLEMENTED**
- `DELETE /me/addresses/{id}` — deleteAddress: **IMPLEMENTED**

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.

## Phần đã triển khai trong sample

- `GET /me` chỉ đọc hồ sơ của `req.auth.user_id`, không nhận user id từ client.
- `PATCH /me` dùng `UpdateProfileBodyDto`, cập nhật `display_name`/`phone` trong transaction và ghi `PROFILE_UPDATED` vào `m3_audit` với correlation/request id.
- `GET /me/context` tính lại user status, role ACTIVE, membership ACTIVE và loại membership của store không còn ACTIVE trước khi trả context; không tin quyền cũ chỉ nằm trong JWT.
- WEB dùng HttpOnly refresh cookie + Origin/CSRF token; MOBILE nhận refresh token trong body theo contract hiện có.

Trạng thái endpoint vẫn là `NOT_IMPLEMENTED` cho đến khi chạy nghiệm thu tích hợp với PostgreSQL/Redis và seed. Unit tests chỉ chứng minh wiring/validation, không phải fixture tích hợp hay giao dịch thành công giả.

Kiểm tra cục bộ:

```powershell
npm --prefix backend run build
npm --prefix backend test
npm run contracts:drift
npm run docs:check
```
