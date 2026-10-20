# M3 Staff invitations

Store Owner can list Seller memberships and update membership permissions/status with `expected_version`; a lock removes Seller from the live auth context on the next request. Permissions are limited to the four declared Store Seller permission codes and every update is audited.

| Operation | Route | Status |
| --- | --- | --- |
| List invitations for active Owner store | `GET /store/staff/invitations` | Implemented |
| Create Seller invitation | `POST /store/staff/invitations` | Implemented |
| Revoke pending invitation | `POST /store/staff/invitations/{id}/revoke` | Implemented |
| List invitations for verified user email | `GET /me/invitations` | Implemented |
| Accept invitation and create Seller membership | `POST /me/invitations/{id}/accept` | Implemented |

Owner scope comes from the authenticated `store_membership` context and is checked again against the current active Store/Owner membership in M3. The current Auth context exposes only one selected membership; STORE-02 active-store selection is needed to switch between multiple Store memberships.

Invited email is trimmed and lowercased. Invitations expire after seven days. Only `product.store.read_write`, `inventory.store.read_adjust`, `order.store.read_status_cancel`, and `cod.store.collect` may be granted. Invitation secret hashes are never returned. The receiver must have an active account with verified matching email. Invitation status, membership, permission grants, audit, and `MembershipChanged` outbox event commit in the same M3 PostgreSQL transaction. PostgreSQL row locks serialize accept/revoke, and the existing partial unique index prevents a second active membership for a user.

The invitation email uses the configured M3 email adapter and links to `/customer/invitations`; the recipient must sign in with the invited, verified email. `EMAIL_ADAPTER=mock` fails closed with `503 EMAIL_DELIVERY_UNAVAILABLE`. If delivery fails after the database commit, M3 revokes the still-pending invitation and audits `STAFF_INVITATION_DELIVERY_FAILED`; it does not return a successful invitation response. A concurrent accept or revoke is preserved.

## Handoff to Thịnh and Hatsaphone

Successful response (`201`) for `POST /store/staff/invitations`:

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "store_id": "22222222-2222-4222-8222-222222222222",
  "invited_email": "seller@example.test",
  "permissions": ["order.store.read_status_cancel"],
  "status": "PENDING",
  "expires_at": "2026-10-28T09:00:00.000Z"
}
```

The UI may rely on `id`, `store_id`, `invited_email`, `permissions`, `status`, and `expires_at`. The invitation secret/hash is never exposed. Owner list uses the same invitation shape, with optional `store_name` for `GET /me/invitations`; membership list returns `id`, `store_id`, `user_id`, `email`, `role`, `status`, `permissions`, and optimistic `version`.

Expected errors: `401` unauthenticated/unverified receiver; `403` wrong role/context; `404 NOT_FOUND` out-of-scope Store/member/invitation; `409 DUPLICATE_INVITATION`, `ACTIVE_MEMBERSHIP_EXISTS`, `INVALID_STATE_TRANSITION`, `VERSION_CONFLICT`, or `INVITATION_EXPIRED`; `422 VALIDATION_FAILED`; `503 EMAIL_DELIVERY_UNAVAILABLE` or `PERMISSION_CONFIGURATION_UNAVAILABLE`. Treat `expected_version` conflicts as a prompt to reload current membership state. Permission/status changes increment membership version, audit the update, and emit `MembershipChanged` in the same transaction; auth context and authorization read current membership and permission state on the next request, so an old access token does not preserve revoked access.

Apply the append-only migration before use:

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build tools
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools node dist/shared/src/migrate.js
```

PostgreSQL integration coverage:

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build tools
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools npm run test:integration -- --runTestsByPath tests/integration/staff.invitation.integration.test.ts
```
