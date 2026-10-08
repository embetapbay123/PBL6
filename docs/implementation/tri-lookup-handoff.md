# M3 lookup, Profile and Address handoff

Owner: Trí (`phantri1912`). [PR #87](https://github.com/embetapbay123/PBL6/pull/87) merged into main on 06/10/2026 at `c43fdce`. Use main and [Week 2](week2.md) for the next tasks. M1 inventory and M2 Payment/checkout commands remain with their existing owners.

## Internal APIs

- `POST /internal/checkout/context`, caller M2: generated `ResolveCheckoutContextBodyDto` accepts `token`, `address_id`, `store_ids`. Resolve the live session and Customer role; select an active address owned by that user and active Stores. Return `customer_user_id`, the full Address snapshot, and Store `id/name/shipping_fee_vnd/version`. ORM BIGINT stays a string; the response mapper rejects unsafe values before converting to an API number.
- `POST /internal/ai/metrics-scope`, caller M4: generated `ResolveAiMetricsScopeBodyDto` accepts `token` and optional `store_id`. Admin can resolve PLATFORM scope; an explicit active Store narrows the result to STORE. Other users need an active OWNER membership on an active Store. Multiple Owner memberships require an explicit Store. Seller permissions cannot grant metrics access.
- Both return HTTP 200, retain the correlation ID, reject the wrong caller before DTO validation, and remain blocked at the public gateway. Invalid/revoked sessions return 401, insufficient rights 403, missing address/Store 404, unavailable checkout Stores 409 and ambiguous Owner scope 422.

Use `InternalClients.call('ResolveCheckoutContext', body, correlation)` from M2 and the M4 internal adapter for metrics. Do not query M3's database from another service. The existing typed transport applies a one-second timeout and preserves business errors.

## Public APIs and transactions

`PATCH /me` and Address list/create/update/delete have real M3 handlers. Controllers use generated DTOs; repository writes use one transaction. Lock the User row before any Address row or default update, so concurrent default changes serialize. Audit failure rolls back the data changes. Address updates normalize TypeORM UPDATE RETURNING before mapping; Profile dates are ISO strings and nullable fields stay nullable.

Audit stores field names and default flags only. Do not record raw email, phone or full address snapshots in audit. Profile updates cannot change another User; Address updates/deletes conceal another User's address as 404. Empty updates return 422.

The Auth registration, verification and password workflows remain explicit stubs with separate owner tasks. The added mock email/token implementation and duplicate routes were removed from this PR's final diff; their original commits remain in branch history. This PR does not claim delivery of email or completed password recovery.

## Validation and setup

Use the existing README setup, migration and seed commands. No new migration is required; migrations 001–003 are unchanged.

```powershell
npm run docs:check
npm run contracts:check
npm run contracts:drift
npm run build:backend
npm run test:backend
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml up -d
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools npm run test:integration
```

Read `id-lookup.service.test.ts`, `identity.lookup.regression.test.ts` and `profile.address.integration.test.ts` for session/scope, strict response, ownership, concurrent defaults and audit rollback cases. Repository tests use real PostgreSQL; HTTP tests use the running gateway and service guards. Issue completion still requires review, merge and the task's full acceptance criteria.
