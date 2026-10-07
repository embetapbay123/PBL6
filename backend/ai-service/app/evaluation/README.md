# M4 / evaluation

Owner: Công

- `GET /ai/metrics` — getAiMetrics: **IMPLEMENTED_SAMPLE**

`ranking.py`: temporal split và metrics; `job.py`: validation selection/test/publish durable; `metrics.py`: live M3 scope, Owner chỉ Store riêng. Xem [AI runtime handoff](../../../../docs/implementation/ai-runtime-handoff.md). Global evaluation chưa thay evaluation riêng Store; chưa có provider thì cost null, không giả bằng 0.

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.
