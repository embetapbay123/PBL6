# M4 / evaluation

Owner: Công

- `GET /ai/metrics` — getAiMetrics: **IMPLEMENTED_SAMPLE**

`ranking.py`: temporal split và metrics; `job.py`: validation selection/test/publish durable; `metrics.py`: live M3 scope, Owner chỉ Store riêng. Xem [AI runtime handoff](../../../../docs/implementation/ai-runtime-handoff.md). Global evaluation chưa thay evaluation riêng Store; chưa có provider thì cost null, không giả bằng 0.

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.


`pipeline.py` dùng chung DB job/benchmark, thêm Content/Behavioral train-only cạnh popularity; quality pass phải vượt cả hai baseline. `benchmark.py` chạy synthetic control trong RAM/schema tách biệt, có raw report/rubric; không publish model phục vụ và không gọi provider. Xem [evaluation handoff](../../../../docs/implementation/ai-evaluation-handoff.md) để chạy lại và phân biệt control PASS với quality thực NOT_RUN.
