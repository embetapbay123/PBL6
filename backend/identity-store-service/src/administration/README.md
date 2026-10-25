# M3 / administration

Owner: Trí

- `GET /admin/users` — listUsers: **IMPLEMENTED**
- `PATCH /admin/users/{id}` — updateUserState: **IMPLEMENTED**
- `GET /admin/stores` — listStores: **IMPLEMENTED**
- `PATCH /admin/stores/{id}` — updateStoreState: **IMPLEMENTED**
- `PATCH /admin/roles/{id}` - updateRole: **NOT_IMPLEMENTED** on the current main baseline (HTTP 501, no writes)

Global role permissions are resolved from the database for each authenticated request. The `ADMIN` role also requires `platform.admin`; removing that permission takes effect on the next request without waiting for JWT expiry. Store permissions remain scoped to the active store membership.

Migration `006_platform_admin_permission.sql` grants `platform.admin` to the `ADMIN` role on fresh and existing databases. Effective role permissions are read from the database on every authenticated request, so a revoked permission stops working immediately, including when the caller reuses an older access token. The `platform.admin` permission cannot be granted to another role.
