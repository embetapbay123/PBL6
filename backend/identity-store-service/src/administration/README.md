# M3 / administration

Owner: Trí

- `GET /admin/users` — listUsers: **IMPLEMENTED**
- `PATCH /admin/users/{id}` — updateUserState: **IMPLEMENTED**
- `GET /admin/stores` — listStores: **IMPLEMENTED**
- `PATCH /admin/stores/{id}` — updateStoreState: **IMPLEMENTED**
- `PATCH /admin/roles/{id}` — updateRole: **IMPLEMENTED**

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.
