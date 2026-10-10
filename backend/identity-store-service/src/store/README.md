# M3 / store

Owner: Trí

- `POST /me/store-applications` — submitStoreApplication: **IMPLEMENTED**
- `GET /me/store-applications` — listOwnStoreApplications: **IMPLEMENTED**
- `GET /admin/store-applications` — listStoreApplications: **IMPLEMENTED**
- `PATCH /admin/store-applications/{id}` — reviewStoreApplication: **IMPLEMENTED**
- `GET /store` — getOwnStore: **IMPLEMENTED**
- `PATCH /store` — updateOwnStore: **IMPLEMENTED**

Owner routes use the signed-in active membership; store updates are owner-only and use expected-version checks with an audit record in the same transaction. Application approval atomically creates the ACTIVE Store and OWNER membership. `ActiveStores` reads current ACTIVE rows from `store` and authenticates M1/M2/M4 with the internal service guard.
