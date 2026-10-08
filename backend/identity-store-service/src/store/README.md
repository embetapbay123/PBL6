# M3 / store

Owner: Trí

- `POST /me/store-applications` — submitStoreApplication: **NOT_IMPLEMENTED**
- `GET /me/store-applications` — listOwnStoreApplications: **NOT_IMPLEMENTED**
- `GET /admin/store-applications` — listStoreApplications: **NOT_IMPLEMENTED**
- `PATCH /admin/store-applications/{id}` — reviewStoreApplication: **NOT_IMPLEMENTED**
- `GET /store` — getOwnStore: **IMPLEMENTED**
- `PATCH /store` — updateOwnStore: **IMPLEMENTED**

Owner routes use the signed-in active membership; store updates are owner-only and use expected-version checks with an audit record in the same transaction. `ActiveStores` reads current ACTIVE rows from `store`.
