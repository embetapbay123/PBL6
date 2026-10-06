# M4 / consent

Owner: Công

- `GET /me/personalization-consent` — getPersonalizationConsent: **IMPLEMENTED on main (PR #90)**
- `PATCH /me/personalization-consent` — updatePersonalizationConsent: **IMPLEMENTED on main (PR #90)**

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.

M4 migrations 004/005 add event version state, dataset revision and consent audit. Migrations 001–003 stay unchanged. ResolveContext checks the live M3 session/Customer role before DTO validation; user identity comes only from that context. GET defaults to WITHDRAWN/version 0 without inventing a granted record. PATCH accepts `status` and `expected_version`, serializes with tracking using a per-user transaction lock, and returns 409 on concurrent/stale writes. Consent/history and deletion commit together.

Demo retention policy: keep search/interaction data at most 30 days; withdrawal immediately deletes that user's SearchHistory, RecommendationInteraction and UserPreference. Old queued events before the current grant timestamp cannot repopulate behavior after withdrawal/regrant. Audit retains only user/version/status/source/time metadata. Purging increments dataset revision and invalidates ACTIVE trained models as STALE; future AI-02 serving/training must filter model status and read consent/revision. It must not continue serving a model trained on withdrawn behavior. This branch still labels recommendation/chat as mock, and does not claim AI-02 complete.

Retention runs on consent access/ingestion and every ten minutes in worker-m4, including when the queue is idle. Worker failure is retryable and logged without payload/PII. History/embedding/model training policies belong to their separate modules; this policy covers personalization behavior, not deletion of Orders or audit.

Run `docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml exec -T m4 python -m pytest -q -p no:cacheprovider`. The PostgreSQL tests create isolated schemas and verify concurrency, ownership, DTO/response, withdrawal, retention and rollback. The broker test uses a labeled transport fixture and cleans only its unique user/event records.
