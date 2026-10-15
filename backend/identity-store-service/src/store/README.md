# M3 / store

Owner: Trí

- `POST /me/store-applications` — submitStoreApplication: **IMPLEMENTED**
- `GET /me/store-applications` — listOwnStoreApplications: **IMPLEMENTED**
- `GET /admin/store-applications` — listStoreApplications: **IMPLEMENTED**
- `PATCH /admin/store-applications/{id}` — reviewStoreApplication: **IMPLEMENTED**
- `GET /store` — getOwnStore: **IMPLEMENTED**
- `PATCH /store` — updateOwnStore: **IMPLEMENTED**

Owner routes use the signed-in active membership; store updates are owner-only and use expected-version checks with an audit record in the same transaction. Application approval atomically creates the ACTIVE Store and OWNER membership. `ActiveStores` reads current ACTIVE rows from `store` and authenticates M1/M2/M4 with the internal service guard.

Only one PENDING application per applicant is allowed. Submission serializes on the applicant's user row and a partial unique index enforces the rule; duplicate submissions return HTTP 409 `DUPLICATE_APPLICATION`. If the index migration finds existing pending duplicates it aborts with an explicit error and preserves all rows for reviewed resolution.

`Store` updates return `{ id, owner_user_id, name, status, shipping_fee_vnd, version }`; `shipping_fee_vnd` and `version` are JSON numbers. Application submission and review use the `StoreApplication` response shape (`id`, `proposed_name`, `contact`, `status`, `decision_reason`, `version`). Review audit records store the full public application before and after state. Duplicate pending submissions use HTTP 409 / `DUPLICATE_APPLICATION`.
