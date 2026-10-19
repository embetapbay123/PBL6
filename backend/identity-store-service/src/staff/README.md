# M3 Staff invitations

| Operation | Route | Status |
| --- | --- | --- |
| List invitations for active Owner store | `GET /store/staff/invitations` | Implemented |
| Create Seller invitation | `POST /store/staff/invitations` | Implemented |
| Revoke pending invitation | `POST /store/staff/invitations/{id}/revoke` | Implemented |
| List invitations for verified user email | `GET /me/invitations` | Implemented |
| Accept invitation and create Seller membership | `POST /me/invitations/{id}/accept` | Implemented |

Owner scope comes from the authenticated `store_membership` context and is checked again against the current active Store/Owner membership in M3. The current Auth context exposes only one selected membership; STORE-02 active-store selection is needed to switch between multiple Store memberships.

Invited email is trimmed and lowercased. Invitations expire after seven days. Only `product.store.read_write`, `inventory.store.read_adjust`, `order.store.read_status_cancel`, and `cod.store.collect` may be granted. Invitation secret hashes are never returned. The receiver must have an active account with verified matching email. Invitation status, membership, permission grants, audit, and `MembershipChanged` outbox event commit in the same M3 PostgreSQL transaction. PostgreSQL row locks serialize accept/revoke, and the existing partial unique index prevents a second active membership for a user.

There is no staff-invitation email sender configured in M3. Creating an invitation persists it successfully; it does not claim an email was sent. The receiver can discover it through `GET /me/invitations`.

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
