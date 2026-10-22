# M4 / tracking

Owner: Công



Xem [backlog](../../../../docs/implementation/member-backlog.md). Implement service logic, migrations, ownership, audit, timeout/recovery and tests before changing endpoint status.

`python -m app.tracking.worker` runs as Compose worker-m4, separate from request handling/training. It binds all seven version 1.0 events on the durable `pbl6.m4.tracking.v1` queue with a DLQ, prefetch 1 and ACK only after transaction commit. Invalid schema/caller source/routing key goes to DLQ; database failure requeues. Service producer enums are validated and VIEW must be M1, CART must be M2. RabbitMQ must remain internal/trusted; this is not a public user-supplied tracking endpoint.

Inbox dedup and effect share one M4 transaction. Current consent and its grant window gate SEARCH/VIEW/CART/PURCHASE. Search stores up to the contract limit; interaction weights are VIEW=1, CART=3, PURCHASE=5 per item (not client-provided). Multi-item purchase uses stable per-item event keys, and an OrderCompleted signal is recorded at most once per Order even if a new envelope/version arrives. Dataset revision advances with ingestion/deletion. Withdrawn/old signals are acknowledged as skipped and cannot be replayed later to bypass consent.

Purchase dedup tombstones retain only Order ID/version and an empty payload; they do not retain Customer IDs/items as hidden behavior after withdrawal. Withdrawal/retention also redact any legacy purchase-state payload while preserving the replay guard.

Product/Store/User/membership state uses monotonic entity versions; stale updates cannot overwrite newer state. ProductChanged invalidates old embeddings, UserLocked withdraws/purges behavior, and Store/membership state is retained for subsequent AI index/scope work. Auth/scope remains live M3 lookup; stored events are not authorization tokens. AI-02/03 still need real indexing/training/serving and must consume this invalidation state.

The [real-service acceptance runner](../../../../docs/implementation/cross-service-acceptance.md) now exercises actual M1 search/view/ProductChanged, M2 Cart and paid-online/COD OrderCompleted, and M3 UserLocked through outbox → RabbitMQ → M4. It also checks inbox/entity replay guards, DLQ, transaction rollback/requeue, retention and withdrawal/regrant with live M3 authentication. An ACTIVE user update must not emit UserLocked. Store/membership lifecycle and its producer owners remain separate integration dependencies; this does not implement Staff/RBAC on their behalf.

All acceptance behavior is controlled test traffic in fresh disposable databases. It is not a sourced marketplace dataset or proof of recommendation/model quality. The broker-only fixture remains a transport control; source hashes, outcomes and remaining limits belong in the runner report and AI-01 issue.
