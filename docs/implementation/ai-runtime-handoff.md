# M4 runtime — recommendation, chat và evaluation

Owner: Công. Liên quan [AI-02 #56](https://github.com/embetapbay123/PBL6/issues/56), [AI-03 #57](https://github.com/embetapbay123/PBL6/issues/57), [AI-04 #58](https://github.com/embetapbay123/PBL6/issues/58). Đây là phần độc lập để tích hợp; chưa nghiệm thu chất lượng bằng hành vi người dùng thực hoặc model sinh câu trả lời thực.

## Cấu hình và chạy

Chạy setup/build/migration/seed theo [README](../../README.md). Migration mới là `backend/ai-service/migrations/006_ai_runtime.sql`; không sửa migration cũ. Sau migration, đặt `AI_MODE=real`, `CHAT_PROVIDER=none` trong cấu hình local được ignore rồi recreate M4. `AI_MODE=mock` vẫn là chế độ mẫu có nhãn riêng. Không commit `.env` hoặc key.

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build m4 worker-m4 tools
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools node dist/shared/src/migrate.js
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml up -d m4 worker-m4
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml exec -T m4 python -m pytest -q -p no:cacheprovider
```

Provider chưa được chọn: `CHAT_PROVIDER=none` không gọi model, trả `fallback=true` và `fallback_reason=PROVIDER_NOT_CONFIGURED`. Đây là gợi ý từ Catalog thật với câu trả lời do server tạo, không phải chất lượng LLM được nghiệm thu. Chỉ lỗi provider cho phép fallback; Catalog/identity lỗi trả lỗi dependency, không dùng fixture hoặc giá cache thay thế.

Khi có Ollama, cấu hình `CHAT_PROVIDER=ollama`, `CHAT_MODEL_URL=http://host.docker.internal:11434`, `CHAT_MODEL=<model đã cài>`. Adapter không cài/download model hoặc gửi API key. URL do operator cấu hình, không nhận từ request. [Ollama Chat API](https://docs.ollama.com/api/chat) dùng structured output, non-streaming và temperature 0. Model chỉ chọn tối đa 3 ID từ tối đa 8 Product; server tạo chữ/giá/card sau khi lookup lại Catalog. Không cho model gọi tool hoặc sửa dữ liệu nghiệp vụ. Model có timeout tổng 2 giây, không retry; response bị giới hạn 64 KiB. Toàn luồng có deadline 4 giây cho dependency/network; thời gian DB chờ pool/transaction nằm ngoài deadline này và phải đo khi test tải.

## Session, quyền và lịch sử

- Guest gọi `POST /api/v1/chat/sessions` với `{}`; response 201 trả `id` và `anonymous_key` do server sinh. Client giữ key riêng cho phiên, gửi header `X-Chat-Key` khi POST message. DB chỉ giữ SHA-256 key. Không cho client chọn key. Không log hoặc chia sẻ key. Guest thiếu key trả 401 trước DTO; key sai/phiên người khác trả 404.
- Customer tạo/gửi phiên bằng Bearer token và chỉ truy cập phiên thuộc User. Token Owner/Admin không có role Customer không được dùng API chat thay Customer.
- `first_message` optional lưu câu mở đầu, chưa tự gọi model. Gửi tiếp bằng `POST /chat/sessions/{id}/messages`, `{ "content": "Tìm máy ảnh" }`. Câu hỏi 1–2000 ký tự; trường lạ/sai kiểu trả 422.
- Customer dùng `GET /api/v1/me/chat/sessions?page=1&size=20`. Thêm `session_id=<UUID>&message_page=1&message_size=20` để đọc nội dung phiên sở hữu. Guest giữ lịch sử trong client; không có API đọc toàn bộ lịch sử Guest. Không thêm operation public mới: vẫn **99 public + 11 internal**.
- Lịch sử chỉ trả text và role; không phát lại card/giá cũ như giá hiện hành. Các lượt đồng thời dùng optimistic version; 409 không ghi nửa lượt. Network/model call chạy ngoài transaction; cặp USER/ASSISTANT và telemetry ghi atomic.
- Ngân sách demo cố định: 100 lượt hoặc 100000 token ước tính/ngày/scope; tạo phiên giới hạn 100/IP/ngày. Ngân sách lưu hash scope, fail closed khi hết, không xem đây là billing thực. `actual_tokens` chỉ có nếu provider trả hợp lệ; `cost_usd=null` khi chưa biết giá, không giả cost=0.
- Redaction giới hạn email/điện thoại/token/password trước lưu câu hỏi và gửi model. Đây là rule-based baseline, không thay hệ thống DLP. Chỉ lịch sử của phiên hiện tại vào prompt. Consent GRANTED mới cho dùng recommendation từ hành vi để sắp xếp retrieval.

## Retrieval và index

`app/catalog.py` gọi M1 public và M3 ActiveStores với correlation, timeout 1 giây, validate response. Chỉ Product ACTIVE/VISIBLE, Store active và Variant ACTIVE có giá safe integer được dùng. Sau model, lookup lại từng card; Product bị ẩn/Store dừng/lookup lỗi không được lưu thành câu trả lời thành công.

`app/chat/retrieval.py` cung cấp index pgvector 1536 chiều bằng **lexical hashing**, không phải pretrained semantic embedding. So khớp source version với Catalog hiện hành và ProductChanged state; thiếu/stale index dùng lexical baseline trên Catalog hiện hành. Không dùng description cache để trả thông tin. Request pool tối đa 100 Product; job index/training tối đa 50 trang/5000 Product, ActiveStores contract tối đa 100 Store. Đây là giới hạn demo, chưa đủ để khẳng định tìm kiếm toàn sàn lớn. Category không có trong response Product nên chưa dùng làm feature; dùng product_type/title/description.

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml exec -T m4 python -m app.chat.retrieval
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml exec -T m4 python -m app.chat.retention
```

Retention job xóa message/session sau 30 ngày, telemetry sau 7 ngày, budget quá 2 ngày. Hệ thống loại phiên quá 30 ngày khỏi API ngay cả trước khi job chạy. Operator phải chạy job định kỳ; chưa có scheduler tự động.

## Recommendation và evaluation

`app/recommendation/als.py` triển khai [implicit ALS](https://yifanhu.net/PUB/cf.pdf) với confidence `1 + alpha * weight`, deterministic seed và JSON artifact trong PostgreSQL. Đọc dữ liệu consent hiện tại trong 30 ngày; 50000 event/1000 User/5000 Product là ngân sách demo. Không train trong request.

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml exec -T m4 python -m app.evaluation.job
```

Nếu chưa có hành vi hợp lệ, job báo `No consented eligible training data`, không tạo model giả. Model ACTIVE chỉ phục vụ khi dataset revision khớp; ingestion làm revision đổi, serving fallback cho tới retrain. Withdrawal/retention xóa artifact chứa User factors và đánh dấu STALE; job publish khóa revision và từ chối nếu dữ liệu đã đổi trong lúc tính.

For-you phân biệt `MODEL`, `BASELINE` theo nội dung của các Product vừa xem khi consent cho phép, và `FALLBACK` theo tập Product hiện hành. Recently viewed dedup theo thời gian, loại Product không còn public. Related trả đúng PageProducts, loại chính Product đang xem, xếp theo product_type/text/độ gần giá. Không có dữ liệu cá nhân khi consent withdrawn.

Evaluation chia timestamp theo từng User 60/20/20, timestamp bằng nhau nằm cùng fold; chọn regularization bằng validation, chỉ đánh giá test sau lựa chọn. Baseline popularity chỉ tính train; cùng candidate snapshot hiện hành và K=10 cho cả hai. Lưu config/seed/dataset hash/split/raw result/P@10/R@10/NDCG@10/coverage/cold-start. Raw results không chứa User IDs. `COMPLETED` có nghĩa đã chạy, `quality_pass=false` vẫn là kết quả hợp lệ. Candidate snapshot hiện hành chưa mô phỏng được lịch sử sản phẩm xuất hiện/biến mất theo thời gian; ghi giới hạn này khi báo cáo offline.

## Metrics và nghiệm thu còn lại

Metrics phải resolve scope qua M3. Admin xem platform/lọc Store; Owner chỉ Store của mình. Trace nhiều Store hoặc không Store bị loại khỏi aggregate Owner; không trả model/global evaluation/dataset count cho Owner. Evaluation riêng Store chưa được tạo bởi job global, nên Owner có thể `NOT_RUN`; không đẩy metric toàn sàn vào response Store.

Các test PostgreSQL dùng schema cô lập, Catalog/provider test double có nhãn test. Test không chứng minh model ngoài đời, độ chính xác RAG trên câu hỏi thật, hay producer M1/M2 đầy đủ. Các issue rộng giữ mở đến khi đủ bằng chứng riêng: producer thật #55; dataset/quality/report #56/#58; provider và latency/cost benchmark #57; checkout/Refund/recovery giữ đúng owner và scope #52/#53.


## Evaluation controls cập nhật 07/10/2026

[Dataset/runner/rubric bàn giao](ai-evaluation-handoff.md) chạy synthetic controls và thêm Content/Behavioral baseline train-only bên cạnh popularity. DB job và benchmark dùng chung pipeline/config/split; quality_pass phải vượt mỗi baseline ít nhất một metric, thiếu Content baseline giữ NOT_RUN. Có raw result, runtime versions và source hashes; không publish synthetic artifact vào serving DB. Chất lượng model/Catalog/dataset thực và pronoun-only context còn nghiệm thu riêng.
