# M3 / administration

Owner: Trí

- `GET /admin/users` — listUsers: **IMPLEMENTED**
- `PATCH /admin/users/{id}` — updateUserState: **IMPLEMENTED**
- `GET /admin/stores` — listStores: **IMPLEMENTED**
- `PATCH /admin/stores/{id}` — updateStoreState: **IMPLEMENTED**
- `PATCH /admin/roles/{id}` — updateRole: **IMPLEMENTED** (optimistic version check, permission replacement, audit)

Global role permissions are resolved from the database for each authenticated request. The `ADMIN` role also requires `platform.admin`; removing that permission takes effect on the next request without waiting for JWT expiry. Store permissions remain scoped to the active store membership.

Migration `006_platform_admin_permission.sql` grants `platform.admin` to the `ADMIN` role on fresh and existing databases. Role updates audit the old and new permission sets; revoked permissions take effect on the next request, including requests using older access tokens. The `platform.admin` permission cannot be granted to another role; removing it from ADMIN immediately denies ADMIN routes on the next request.
