# M4 / chat

Owner: Công

Week 3: generation qua Ollama/OpenAI-compatible (OpenCode/DeepSeek), revalidate nguồn/giá/card, trace prompt/model và fallback rõ. [Cấu hình/test/blocker](../../../../docs/implementation/cong-week3-handoff.md) có một lượt OpenCode Go generation thật ngày 13/10. Chưa đủ quality/latency/cost acceptance; giữ IMPLEMENTED_SAMPLE.

- `POST /chat/sessions` — createChatSession: **IMPLEMENTED_SAMPLE**
- `POST /chat/sessions/{id}/messages` — sendChatMessage: **IMPLEMENTED_SAMPLE**
- `GET /me/chat/sessions` — listOwnChatSessions: **IMPLEMENTED_SAMPLE**

Chế độ `real`: `runtime.py` quản lý session/ownership/budget/transaction; `retrieval.py` index lexical pgvector versioned; `provider.py` là adapter Ollama tùy chọn và fallback có lý do. Mặc định provider none. Xem [AI runtime handoff](../../../../docs/implementation/ai-runtime-handoff.md) trước khi tích hợp client. Không xem mode mock hoặc provider none là nghiệm thu LLM.

Contract response bao phủ `MODEL_GENERATED` khi có generation và `CATALOG_CHANGED` khi cần bỏ lời giải thích trên nguồn cũ, cùng các lý do fallback đã có. Generated DTO/types và test response dùng cùng enum. [Nghiệm thu bốn service](../../../../docs/implementation/cross-service-acceptance.md) kiểm live session/Guest key/history/budget, ProductChanged/stopped/current price và metrics scope với provider none. Không gọi model trả phí hoặc giả dữ liệu quality/cost.

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.
