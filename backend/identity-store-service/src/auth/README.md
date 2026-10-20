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

The default runtime does not configure an email adapter. Registration and password-reset requests therefore fail closed with HTTP 503 before claiming email delivery. AUTH-01 and the email-dependent portion of AUTH-02 remain pending until a real provider is configured and delivery is verified. The change-password handler is implemented; this does not complete the broader AUTH-02 acceptance criteria.

Internal ResolveCheckoutContext (caller M2) và ResolveAiMetricsScope (caller M4) đã có handler; xem [M3 handoff](../../../../docs/implementation/tri-lookup-handoff.md). Auth context chỉ lấy permission từ membership hiện hành của Store hoạt động.
