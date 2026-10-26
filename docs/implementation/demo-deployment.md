# Deploy a reviewed demo revision

Owner: Công, OPS-02 [#60](https://github.com/embetapbay123/PBL6/issues/60). This runbook covers deployment and restore evidence, not full feature/provider/UI acceptance.

Use a clean checkout of the reviewed commit. The running checkout may hold uncommitted work; leave it alone. Local secrets and persistent data belong to the **runtime root**, while Docker build contexts and the gateway configuration come from the **candidate checkout**.

```powershell
# Run from the clean candidate checkout. Plan first; no service changes.
python scripts/deploy_candidate.py --runtime-root C:/PBL6
# Apply only after reviewing/checking this revision.
python scripts/deploy_candidate.py --runtime-root C:/PBL6 --apply
```

The existing project must be named `pbl6`, with healthy Postgres/Redis/RabbitMQ and existing `.env`/RSA keys. The command refuses dirty candidates. It does not copy, print or regenerate secrets. All application images have revision-specific tags and OCI revision labels; M1/M2/M3 and their workers use the same Node image, and M4/API and tracking worker use the same AI image.

The sequence is: validate configuration and existing dependencies; build; stop gateway and application writers; dump all four databases with before/after schema/count/row hashes; restore each dump into a **new** `restore_drill_*` database and verify it against its backup-time manifest; migrate; start matching API/Web/workers; verify exact image revisions, migrations, internal readiness, M1/M2/M3 publishers and the M4 consumer; reopen gateway and check Web/Catalog. There is no seed/reset, dependency recreation, volume removal, bank transfer or model-generation call.

Default Compose includes `worker-m3`, so UserLocked and StoreStatusChanged events leave the M3 outbox. The gateway still excludes internal service routes. The existing Tunnel container is not recreated or removed; it reconnects to the same gateway service. Expect a maintenance window after builds finish: callbacks may receive a retryable transport error while ingress is closed. Inspect pending payment receipts/follow-ups after resuming; never manually mark them successful.

Public key material is immutable within a process after its first configuration read. If key contents change at the same path, restart every API/worker with matching public/private material; replacing a mounted file alone does not rotate the cached verifier. User/session/permission/Store/consent checks remain live. Candidate migrations include append-only M4 `008_chat_thinking_trace.sql`; readiness and deployment migration inventory verify it before reopening ingress. `CHAT_THINKING=auto` remains the portable default; explicit DeepSeek modes require actual provider verification and local configuration.

## Evidence and failure handling

Private artifacts are under `artifacts/deployments/<UTC>/`: non-secret override, stage logs, backup pointer and report. Database dumps/manifests are under `artifacts/backups/`; restore verification is under `artifacts/verification/`. Keep them ignored and access controlled: backups contain personal data, and private logs may contain configuration diagnostics. Only a sanitized summary may enter GitHub.

On failure after maintenance starts, the command closes the gateway and leaves data and failed drill databases intact. Inspect the failed stage locally, fix the candidate, and rerun. Do not blindly restart an old API/worker against newer migrations. Prefer a compatible forward fix; rollback requires reviewing schema compatibility and reconciling provider activity. Do not restore a dump over a live database using this tool. For recovery, restore into new databases, verify business/provider reconciliation, then perform a separately reviewed cutover.

Backups compare stable before/after table contents and schema; they are not an atomic snapshot across four services or external payment systems. Restore checks include inventory bounds, Payment refund bounds, unique active default addresses and chat ownership, plus row hashes. They do not prove every cross-service business invariant.

## Remaining acceptance

After deployment, verify authenticated roles/two Stores, checkout/payment/recovery, consent and real UI/device flows using their own issue criteria. A public 200 or matching image revision cannot close OPS-01, OPS-02 or DEMO-01 by itself. Refund remains disabled until an actual supported provider is configured and tested. Representative AI quality, measured load and the Android/full-demo rehearsals require separate evidence.

For an existing seeded demo with `AI_MODE=real`, run the bounded read-only authentication audit:

```powershell
Get-Content scripts/verify_demo_runtime.cjs -Raw | docker exec -i pbl6-m3-1 node
if ($LASTEXITCODE -ne 0) { throw 'Runtime audit failed' }
```

It reads local credentials inside M3, creates/revokes fresh Web sessions, verifies roles, cookie flags, CSRF/rotation/replay, guard-before-validation, AI scope, unsigned callback and internal-route protection. It never prints tokens/PII or mutates business records. An existing cross-Customer Order check reports NOT_RUN when there is no matching Order; do not seed an invented Order to turn it green. Full Seller/two-Store/permission-revocation and device tests remain separate.
