# M3 / auth

Owner: Trí

- `POST /auth/register` — register: **NOT_IMPLEMENTED**
- `POST /auth/verify-email` — verifyEmail: **NOT_IMPLEMENTED**
- `POST /auth/login` — login: **IMPLEMENTED_SAMPLE**
- `POST /auth/refresh` — refresh: **IMPLEMENTED_SAMPLE**
- `POST /auth/logout` — logout: **IMPLEMENTED_SAMPLE**
- `POST /auth/reset-password` — resetPassword: **NOT_IMPLEMENTED**
- `POST /auth/reset-password/confirm` — confirmResetPassword: **NOT_IMPLEMENTED**
- `POST /auth/change-password` — changePassword: **NOT_IMPLEMENTED**

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.

Internal ResolveCheckoutContext (caller M2) và ResolveAiMetricsScope (caller M4) đã có handler; xem [M3 handoff](../../../../docs/implementation/tri-lookup-handoff.md). Auth context chỉ lấy permission từ membership hiện hành của Store hoạt động. Register/verify/reset/change-password vẫn là stub và giữ task Auth riêng.
