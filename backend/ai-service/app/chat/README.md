# M4 / chat

Owner: Công

- `POST /chat/sessions` — createChatSession: **IMPLEMENTED_SAMPLE**
- `POST /chat/sessions/{id}/messages` — sendChatMessage: **IMPLEMENTED_SAMPLE**
- `GET /me/chat/sessions` — listOwnChatSessions: **IMPLEMENTED_SAMPLE**

Chế độ `real`: `runtime.py` quản lý session/ownership/budget/transaction; `retrieval.py` index lexical pgvector versioned; `provider.py` là adapter Ollama tùy chọn và fallback có lý do. Mặc định provider none. Xem [AI runtime handoff](../../../../docs/implementation/ai-runtime-handoff.md) trước khi tích hợp client. Không xem mode mock hoặc provider none là nghiệm thu LLM.

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.
