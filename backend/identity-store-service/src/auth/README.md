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

Email verification/reset tokens are SHA-256 hashed, single use, and expire after 15 minutes. Password changes revoke every refresh session for the user. Raw email tokens are passed only to the email adapter and are never logged.

Internal ResolveCheckoutContext (caller M2) và ResolveAiMetricsScope (caller M4) đã có handler; xem [M3 handoff](../../../../docs/implementation/tri-lookup-handoff.md). Auth context chỉ lấy permission từ membership hiện hành của Store hoạt động.
