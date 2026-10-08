# M4 / recommendation

Owner: Công

- `GET /recommendations/for-you` — getForYou: **IMPLEMENTED_SAMPLE**
- `GET /products/{id}/related` — getRelatedProducts: **IMPLEMENTED_SAMPLE**

`als.py`: offline implicit ALS; `runtime.py`: consent/model revision/live Catalog gates, content baseline và fallback. Xem [AI runtime handoff](../../../../docs/implementation/ai-runtime-handoff.md) về train/evaluation và giới hạn pool. Model chưa train không được báo MODEL; dữ liệu test không phải chất lượng production.

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.
