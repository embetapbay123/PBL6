# M3 / administration

Owner: Trí

- `GET /admin/users` — listUsers: **IMPLEMENTED**
- `PATCH /admin/users/{id}` — updateUserState: **IMPLEMENTED**
- `GET /admin/stores` — listStores: **IMPLEMENTED**
- `PATCH /admin/stores/{id}` — updateStoreState: **IMPLEMENTED**
- `PATCH /admin/roles/{id}` — updateRole: **NOT_IMPLEMENTED** (HTTP 501 `FEATURE_NOT_IMPLEMENTED`; no role, permission, or audit writes occur)

Effective RBAC remains pending. AuthGuard currently authorizes by role codes, so this endpoint is disabled until effective permissions are enforced and revocation invalidates existing sessions/tokens.

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.
