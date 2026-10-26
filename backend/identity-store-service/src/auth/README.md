# M3 / auth

Owner: Trí

- `POST /auth/register` — register: **IMPLEMENTED**
- `POST /auth/verify-email` — verifyEmail: **IMPLEMENTED**
- `POST /auth/login` — login: **IMPLEMENTED**
- `POST /auth/refresh` — refresh: **IMPLEMENTED**
- `POST /auth/logout` — logout: **IMPLEMENTED**
- `POST /auth/reset-password` — resetPassword: **IMPLEMENTED**
- `POST /auth/reset-password/confirm` — confirmResetPassword: **IMPLEMENTED**
- `POST /auth/change-password` — changePassword: **IMPLEMENTED**

Email verification/reset tokens are SHA-256 hashed, single use, and expire after 15 minutes. Password changes require the normal authenticated-session guard, revoke every refresh session for the user, and invalidate outstanding password-reset tokens. Raw email tokens are passed only to the email adapter and are never logged.

M3 defaults to the real SMTP adapter and validates its configuration before starting. Configure `SMTP_HOST`, `SMTP_PORT` (implicit TLS, usually 465), `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`; verification and reset links use `WEB_ORIGIN`. Missing or invalid settings prevent M3 startup. `EMAIL_ADAPTER=mock` is allowed only with `NODE_ENV=development`, but every send fails with 503 so local mock mode cannot claim delivery. HTTP/DB regressions inject an in-memory capture adapter that records delivered verification/reset receipts; runtime never selects it. Register/reset are limited to 10 requests per IP per hour; verification/reset confirmation are limited to 30 per IP per minute. SMTP errors return the safe `503 EMAIL_DELIVERY_UNAVAILABLE` response. Failed sends invalidate that email token; a new registration request for a pending account can issue a fresh token. The pending account and its related records remain for retry and are not represented as successfully delivered. Tests explicitly inject a capture adapter; it is never selected by runtime configuration.

Tokens are SHA-256 hashed, single use, and expire after 15 minutes. Raw email tokens are passed only to the email adapter and are never logged. AUTH-01 still requires an external delivery check using valid provider credentials and a real mailbox.

Internal ResolveCheckoutContext (caller M2) và ResolveAiMetricsScope (caller M4) đã có handler; xem [M3 handoff](../../../../docs/implementation/tri-lookup-handoff.md). Auth context trả cả quyền global từ role đang active và quyền store từ membership hiện hành của store hoạt động; AuthGuard kiểm tra quyền global hiện hành ở mỗi request.
