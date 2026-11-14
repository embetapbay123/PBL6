# M4 virtual try-on

Direct OpenAI Images Edits integration for a verified Customer's photograph and one catalog garment. No alternative provider, browser API key, automatic paid retry or text-only substitute for the product image.

## Runtime

- Model: `gpt-image-2.6-sunburst`; `quality=low`, `complexity=low`, `n=1`, `size=1024x1536`, JPEG output. These fields and the prompt are server-owned.
- Image uploads are decoded, orientation-normalized, stripped of metadata and resized before private storage. JPEG/PNG/WebP static inputs only, 8 MiB, 24 megapixels and aspect ratio within 1:3 to 3:1.
- Catalog eligibility comes from the product type name, not a client-supplied prompt. Variant images take priority. A generic image is used only for a single-color product or the default color.
- Catalog media under `/catalog/` are fetched from one operator-owned internal web origin. Arbitrary URLs, redirect chains, URL credentials and private-network URLs from product data are rejected.
- PostgreSQL serializes admission with a singleton guard row. Per-user, IP, global day/month counts, cooldown, pending-job uniqueness and budget holds are checked together.
- Counters are durable across Redis/worker restarts. Day boundaries use UTC+7. Unknown reservations carry into later day/month budgets until reconciled.
- A worker claim has a fencing token and lease. The dispatch marker commits before the OpenAI request. A possibly dispatched call is never submitted a second time.
- Results and a minimal usage receipt are persisted before the final database update. Recovery can commit an existing receipt without calling OpenAI again.
- Failure before dispatch releases quota/budget. Failure after dispatch without trustworthy usage retains the full reserve. Network/5xx ambiguity becomes UNKNOWN and blocks another job for that Customer.
- OpenAI authentication/model/quota rejections pause new generation. An observed cost above the reserved amount also pauses generation.
- The single default worker executes one generation at a time. The database concurrency limit is shared if more instances are started; default maximum is two.
- Results use signed URLs valid for at most five minutes, with no-store/referrer/nosniff headers. Deletion revokes access immediately; in-flight output cannot republish a deleted result.
- Cleanup runs every 30 seconds between worker attempts. Photo/result access expires within 24 hours. Physical cleanup can wait for an in-flight request/recovery cycle; private images are excluded from normal database backups.

## Enable on the demo

The rollout configures **1 USD/day and 10 USD/month**, a separate random signing secret and private image volume. Every code rollout sets `TRY_ON_ENABLED=0`. Credentials are transferred separately after the new password gate is installed.

Store the real key in the ignored `infrastructure/.env`. Confirm that its OpenAI project has access to the exact model. Demo configuration uses:

```dotenv
OPENAI_API_KEY=<configure privately on the server>
TRY_ON_ENABLED=1
TRY_ON_DEMO_MODE=1
TRY_ON_DEMO_PASSWORD_HASH='<salted PBKDF2 hash; never the plaintext password>'
TRY_ON_DAILY_BUDGET_MICRO_USD=1000000
TRY_ON_MONTHLY_BUDGET_MICRO_USD=10000000
```

Keep the generated `TRY_ON_SIGNING_KEY`; it must be at least 32 characters. For the Windows demo workflow, run `scripts/configure-demo-try-on.ps1` after deploying M4 and the frontend. It transfers only the key, password hash and approved settings through a temporary private SSH directory, confirms the installed backend gate, recreates M4/worker, and removes the transfer files. It disables generation again if activation fails. Credential values are never printed or passed as command arguments.

For manual server administration, recreate only M4 and its image worker so they receive the configuration:

```sh
docker compose -p pbl6-demo --env-file infrastructure/.env \
  -f infrastructure/compose.yaml -f infrastructure/compose.try-on.yaml \
  up -d --no-deps --no-build m4 worker-try-on
```

The targeted overlay preserves the existing M4 connection. Its private worker environment is saved in `infrastructure/secrets/try-on-worker.env` because the demo uses an imported database name. Do not replace that connection with the local database default or print the file.

Check status without exposing credentials:

```sh
docker compose -p pbl6-demo --env-file infrastructure/.env \
  -f infrastructure/compose.yaml -f infrastructure/compose.try-on.yaml \
  exec -T worker-try-on python -m app.try_on.operator status
```

Use the same compose prefix for the commands below. `configured=true` and `paused=false` mean configuration allows admission; catalog eligibility, user quota and remaining budget are still checked per request.

## Demo password gate

When `TRY_ON_DEMO_MODE=1`, capabilities exposes `demo_password_required=true`. Photo upload and job creation both require `X-Try-On-Demo-Password`; idempotent creation replays also require it. Missing/incorrect passwords cannot reach upload storage, job admission or OpenAI. Login and all normal quotas remain required.

Generate a salted hash using `app.try_on.demo.hash_password` with a private interactive input. Keep the hash single-quoted in dotenv files because it contains dollar signs. No plaintext password, browser-side verifier or reusable unlock token is stored. The frontend clears its transient password field on submission and asks again for another generation.

Redis reserves verification attempts atomically before PBKDF2 work: five failed attempts per account and thirty per IP in a ten-minute bucket. Successful checks release the reservation. Missing Redis or an invalid hash blocks access; it never bypasses the gate. Passwords are excluded from request bodies, persisted jobs, logs, URLs and browser storage.

## Money and limits

- Defaults: three accepted/held attempts per user/day, one pending job/user, 60-second cooldown, 30 attempts/IP/day, 10/IP/minute, 50 attempts/day and 500/month globally.
- Caddy overwrites the quota IP header from the connection peer; never expose M4 directly or accept a visitor-supplied forwarding header. Behind a tunnel/extra proxy, visitors may share that peer IP until a specific trusted-proxy chain is configured. Account/global money limits still apply independently.
- The `250000` micro-USD reserve is **0.25 USD held per job**, not a quoted image price. As a completed job supplies valid usage, its reservation is replaced by the usage-based estimate.
- Standard token rates used by the estimator: 5 micro-USD/text input token, 8/image input token, 30/output token. Unknown/malformed usage is not treated as free.
- Limits apply to this service's admission ledger, not to unrelated use of the same OpenAI project. Estimates are not a guaranteed invoice cap: provider pricing/usage differences or an underestimated per-call reservation can exceed the estimate. Excess observed cost pauses new calls; retain a conservative reserve and review the first real calls before opening broadly.
- Daily money is attributed to admission day. Outstanding unknown/reserved amounts are carried across period boundaries. Queued jobs crossing into the next quota day are cancelled before sending.
- Deleting an image or returning a promotional user allowance never erases the provider attempt or its budget record.

Pause new admissions/dispatches without interrupting the result of an already dispatched call:

```sh
python -m app.try_on.operator pause --actor operator-name --reference "Investigating usage"
```

For an UNKNOWN/FAILED provider attempt, verify the OpenAI usage/request evidence first. Then record the verified amount (USD micro-units) and a short evidence reference; do not paste keys, images or provider response bodies:

```sh
python -m app.try_on.operator reconcile --actor operator-name \
  --job-id <job-uuid> --cost-micro-usd <verified-amount> --reference "usage-export-reference"
python -m app.try_on.operator resume --actor operator-name --reference "Issue resolved"
```

Reconciliation does not call OpenAI, recreate an image, erase the original attempt or silently refund a provider charge. Operator actions have a durable audit record.

## Deployment and verification

- From repository root: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-demo-ai.ps1`.
- The script builds the current M4, applies additive M4 migrations, replaces only M4/the new worker, patches the M4 gateway IP header and checks readiness/public authentication. It leaves paid generation off on every rollout; explicitly re-enable after verifying configuration.
- The rollout executes a script file, not a script piped to bash; Docker run/exec can consume stdin. The worker inherits the active M4 database connection from a private file, not a guessed database name.
- A database migration is not proof that a container was updated. Successful rollout must end with `AI_DEPLOY_OK` and the worker's safe status counters.
- Apply frontend generated contracts through the normal frontend build/deploy procedure separately.
- API contract: `docs/contracts/openapi.json`, eight try-on operations; raw multipart upload and binary signed-result transport are intentionally handled outside the generic JSON dispatcher.

Run the complete M4 suite with deterministic chat limits (demo environment values may be higher):

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm --no-deps -T -e CHAT_DAILY_REQUEST_LIMIT=100 -e CHAT_DAILY_TOKEN_LIMIT=100000 -e CHAT_THINKING=auto m4 python -m pytest -q -p no:cacheprovider
```

Tests use fake OpenAI transports and isolated PostgreSQL schemas; they do not generate billable images. Real model permission, output fidelity and actual cost still require a limited live acceptance test after the key is configured.

Official references: [Images Edits](https://developers.openai.com/api/reference/resources/images/methods/edit), [Sunburst 2.6](https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst), [image generation guide](https://developers.openai.com/api/docs/guides/image-generation).
