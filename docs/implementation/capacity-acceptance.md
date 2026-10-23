# Isolated marketplace capacity acceptance

Owner: Công / [OPS-01 #59](https://github.com/embetapbay123/PBL6/issues/59). This measures the real APIs and durable workers with synthetic volume; it does not complete the entire NFR matrix or establish sales/model quality.

## Run

Docker Compose, Node 22 and Python 3.12 are required. Run from the repository root on a dedicated test machine:

```powershell
python scripts/test_capacity_acceptance.py
python scripts/run_capacity_acceptance.py --profile quick
python scripts/run_capacity_acceptance.py --profile target
```

`quick` holds 100 clients for 60 seconds. `target` warms 10 clients for two minutes, ramps to 100 over three minutes, holds 100 for fifteen minutes and ramps down over two minutes. Both use one-second think time. The declared workflow mix is 50% Catalog, 20% Cart, 15% Order reads, 10% Quote and 5% COD creation; each workflow may make several requests, so these are not HTTP request percentages. Login password hashing is excluded: fixture sessions have real 15-minute JWTs, live M3 context and actual refresh after twelve minutes.

The runner creates its own `pbl6-acceptance-<12 hex>` project, network, volumes, fresh credentials and RSA keys, with no host ports or live `.env`. It seeds empty disposable databases with **10 Stores, 1,000 Customers, 10,000 Products, 20,000 Variants and 50,000 historical Orders** and checks actual counts. Synthetic historical COD payments are fixtures; no cash or online payment is executed. New Orders use the actual Cart/Quote/Confirm/Inventory/Payment/worker path with COD and remain unpaid.

The load container binds 100 real private source addresses in its own disposable network namespace. Only this container receives `NET_ADMIN`; no host namespace, device or privileged container is allowed. It does not spoof forwarding headers, change public limits or share the demo network. The unchanged Caddy gateway forwards these real clients; the report verifies all 100 reached the limiter. Cloudflare Tunnel client-IP topology is a separate production check.

## Gates and evidence

All HTTP failures count, including 409, 429 and recovery 503. Gates are p95 below 2,000 ms, HTTP error rate below 1% and response checks above 99%. Uncertain Confirm retries preserve the same key/payload. After load, the runner waits for recovery/outboxes, checks inventory bounds and movement conservation, Payment amount bounds, unpaid COD state, absence of orphan Payments and at least one created Order. A failed threshold or invariant fails the command. No target or duration is silently reduced after a failure.

Resource observations include the k6 container, each API/worker, Postgres active/lock-wait snapshots, outbox age and RabbitMQ queue depth. These are point samples, not a claim of continuous peak capture or proof against every possible lock. The sanitized report records hardware, profile, source hash/revision/dirty flag, measured dataset, failure counts, service HTTP errors and hashes of local observation/summary files. Editing tested sources during a run invalidates it.

Only `artifacts/capacity/<project>/evidence/report.json` is publishable. The generated config, RSA keys, `users.private.json` (tokens), raw summaries, observations and logs stay ignored/local. The runner removes only its validated private project and uniquely named images. The manual [capacity workflow](../../.github/workflows/capacity-acceptance.yml) uploads only the sanitized report; runner hardware is recorded because hosted CI is not equivalent to the demo machine.

Provider/RAG load, Web rendering, Android, real financial transactions, login/email throughput, production Tunnel topology, stress 150/200 and a 60-minute soak remain separate tests. See [performance targets](performance-and-capacity.md) and [full demo matrix](demo-acceptance-matrix.md).

Deployment public key material is read once per configured file path, rather than synchronously reopening the Windows bind-mounted PEM for every guard/configuration lookup. A probe of the old runtime took 341 ms for 200 synchronous reads. Rotating key contents at the same path requires restarting **all** API/worker processes with the matching public/private keys. This caches key material only: User/session, membership/permission, Store visibility and consent still resolve live. The real revocation/Store-lock acceptance suite remains required. The load runner rejects an externally shortened workload even if k6 exits zero; network/5xx-uncertain Confirm retries keep the original key and payload.

## Authenticated Catalog read budget

Initial volume runs exposed M2's Catalog reads sharing a single public source-IP budget (M1 recorded 90 throttled requests in one diagnostic run). M2/M4 now authenticate their public Catalog GETs with existing service identity. Only M1 `GET /api/v1/products` and `GET /api/v1/products/:id` classify validated M2/M4 calls into a shared **6,000/minute/caller** budget. Other routes/methods retain the public **600/minute/IP**, and login retains **30/minute/IP**. Invalid/incomplete service identity returns 401. This does not grant Store visibility, User permissions or mutation access; locked/hidden Products remain hidden, and HTTP dependencies retain their one-second timeout and no automatic command retry.
