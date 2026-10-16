## Local OpenCode Go verification — 2026-10-13

The local M4 configuration now uses `deepseek-v4-flash` with
`https://opencode.ai/zen/go/v1/chat/completions`. The API key remains in the ignored
`infrastructure/.env`; no credential is stored in this document or Git.

A gateway chat smoke returned HTTP 200, `fallback=false`, `MODEL_GENERATED`, and
one current Catalog card in 5,422 ms. This proves one real generation path,
not full AI quality, latency, billing, concurrency or demo acceptance. The earlier
Console 402 was a pay-as-you-go balance error, not a Go subscription check.

The adapter sends its actual application User-Agent and an opaque stable session
header. HTTP chat turns use a hash of the server session ID; standalone selector
instances use a random stable ID. Neither header contains a user ID or guest key.
`CHAT_TIMEOUT_SECONDS` accepts a finite value above zero and at most 30 seconds;
the default remains 2. The local Go smoke uses 15 seconds. The chat flow deadline
is at least 4 seconds and otherwise the provider deadline plus 2 seconds;
internal service deadlines stay unchanged. This does not establish the 2-second
latency goal. Provider failures still fall back and are never automatically retried.

Numeric text is rejected unless it belongs to an exact supplied Catalog title;
prices and current cards remain server-owned. Invalid JSON, invented numeric
claims and unavailable/changed products retain their existing protections.

This local evidence supersedes the provider-not-configured blocker below only.
Human quality review and the remaining AI-03 acceptance criteria are still open.

# Công — bàn giao Week 3, 13/10/2026

[Week 3](week3.md) · [Kanban](https://github.com/users/embetapbay123/projects/1/views/3) · [Demo 03/11](demo-2026-11-03.md). Code đã kiểm và full acceptance được ghi riêng; không coi CI/adapter là bằng chứng provider/model thật.

## Code bổ sung

- [Provider](../../backend/ai-service/app/chat/provider.py) sinh câu trả lời tiếng Việt qua `ollama` hoặc `openai_compatible`, dùng ID/title/description Catalog giới hạn. HTTPS/Bearer key riêng từng request; không redirect/retry, không log key/payload provider. JSON validation, text tối đa 900 ký tự, response 64 KiB, output tối đa 512 token, deadline 2 giây. [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat) · [Ollama](https://docs.ollama.com/capabilities/structured-outputs).
- ID ngoài nguồn, số/giá/link/HTML trong prose hoặc response hỏng trả fallback rõ. Server lấy giá/card từ Catalog mới sau generation; title/description/version/Store hoặc budget thay đổi thì bỏ prose cũ (`CATALOG_CHANGED`). Các kiểm tra này **không bảo đảm mọi nhận định ngôn ngữ đúng**; vẫn cần người chấm đối chiếu nguồn. Retrieval vẫn là lexical baseline.
- [Runtime](../../backend/ai-service/app/chat/runtime.py) dùng câu USER trước trong chính session cho tham chiếu rõ “loại đó”; chủ đề mới giữ câu mới. Chưa chứng minh mọi đại từ hoặc chuỗi tham chiếu mơ hồ. Lịch sử không dùng card/giá cũ làm báo giá hiện tại.
- [Metrics](../../backend/ai-service/app/evaluation/metrics.py): p95, token/cost samples, provider/model/prompt/index version. Tổng tiền/token giữ null khi mẫu thiếu; Owner chỉ đọc trace đúng một Store. [Migration 007](../../backend/ai-service/migrations/007_chat_provider_trace.sql) append-only, giữ migration cũ.
- Budget giữ 100 lượt/ngày và 100.000 token ước lượng: reserve riêng theo context/history UTF-8 trước provider, không đếm lượt hai lần. Estimate bảo thủ không là tokenizer/billing thực; fallback none không tiêu ngân sách model, timeout không tự hoàn budget để tránh retry tiêu phí lặp.
- [Live runner](../../backend/ai-service/app/evaluation/live.py) đọc Catalog thật, bốn câu hỏi smoke, hash nguồn, answer/card/source cho chấm tay, latency/fallback/token và giới hạn mẫu. Chỉ gọi provider khi có `--allow-provider-calls`; không tự train/publish, tạo giao dịch hoặc nhập hành vi giả. PASS chỉ là smoke/có generation, không là full quality acceptance.
- M4 giới hạn body 64 KiB cả chunked, **sau guard**. Worker tracking tự chạy retention chat 30 ngày/trace 7 ngày/budget quá hạn; lỗi retry/log mã sạch.
- [Admission](../../backend/ai-service/app/network.py) giới hạn 8 lượt đọc Catalog đồng thời/process M4 trước HTTP fan-out; chờ slot tối đa 1 giây rồi 503, giải phóng khi cancel/lỗi. Dependency vẫn timeout 1 giây, không retry/cache quyền hoặc giá. CLI offline không dùng limiter serving này.
- Compose chạy `worker-refund` recovery/enqueue trong chế độ **disabled**, không chuyển tiền. Chưa có hợp đồng provider Refund nên không invent adapter ngân hàng từ API QR.

## Cấu hình OpenCode / DeepSeek

Local OpenCode Go đã cấu hình và có một lượt gateway generation thật như evidence phía trên. Các máy khác cần tự cấu hình `infrastructure/.env`; không commit hoặc gửi key vào issue/chat:

```dotenv
AI_MODE=real
CHAT_PROVIDER=openai_compatible
CHAT_MODEL_URL=https://opencode.ai/zen/go/v1/chat/completions
CHAT_MODEL=deepseek-v4-flash
CHAT_API_KEY=
CHAT_RESPONSE_FORMAT=json_object
CHAT_TIMEOUT_SECONDS=15
```

Model ID phải được tài khoản hỗ trợ; không tự chọn model thay thế. Adapter nhận cả base URL hoặc URL đầy đủ `/chat/completions`. Endpoint Go đã trả 200 trên máy chủ repo; endpoint Console trước đó trả 402 do balance. Chỉ dùng `json_schema` nếu provider/model hỗ trợ; không dùng `OPENAI_API_KEY` làm key OpenCode. Thiếu key/model/HTTPS thì real startup fail; khi chưa cấu hình giữ provider none.

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build m4 worker-m4 tools
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm tools node dist/shared/src/migrate.js
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml up -d m4 worker-m4 worker-refund
New-Item -ItemType Directory -Force artifacts/ai-evaluation | Out-Null
# Sau khi cấu hình provider; request có thể phát sinh chi phí theo tài khoản.
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm --no-deps -v "${PWD}/artifacts/ai-evaluation:/artifacts" m4 python -m app.evaluation.live --allow-provider-calls --output /artifacts/live.json
```

Không opt-in/provider none: NOT_RUN, exit 1. Smoke lỗi/không generation: exit 1. Sau smoke còn chat HTTP/session thật, rubric/nguồn/billing/latency. Model chậm có thể fallback theo deadline; fallback không đạt generation.

## Evidence và giới hạn

[Evidence 13/10](evidence/2026-10-13-cong-week3.json): backend/frontend build, docs/OpenAPI/drift/schema PASS; **179 Node unit, 85 integration PostgreSQL, 91 Python, 14 Web e2e, Flutter analyze/40 tests PASS**. Widget/stub tests không chứng minh APK/device hoặc thanh toán thật.

Backup dừng writers, dump bốn DB và restore vào DB mới `restore_drill_*`; schema/migrations/counts/invariants PASS, DB gốc không bị thay thế. Dump/raw ở ignored `artifacts/`; bản tổng chỉ ghi hash/kết quả. Đây là quiesced snapshot, chưa chứng minh hot backup/cross-service atomic snapshot hoặc pending nghiệp vụ đã xử lý hết.

Load public mix list/detail/related, 100 VU/30 giây, think time 20 giây, seed **3 Product**. Trước sửa: 9/601 lỗi 503 related. Sau sửa: 0/601 lỗi, 1202/1202 checks; p95 list ~688 ms/detail ~570 ms/related ~697 ms. Run trước có Web e2e đồng thời, run sau có Python tests đồng thời: không phải A/B benchmark cô lập. Giữ cả hai raw reports. Profile acceptance 100 VU/15 phút **chưa chạy**, vẫn chỉ public read, không thay mixed Commerce/provider NFR:

```powershell
docker run --rm --network pbl6_default -v "${PWD}/infrastructure/load:/scripts:ro" -v "${PWD}/artifacts/verification:/results" -e PROFILE=acceptance grafana/k6:0.57.0 run --summary-export /results/public-read-15m.json /scripts/public-read.k6.js
```

## Task Công và phần còn thiếu

| Task | Đã có / cần nghiệm thu tiếp |
| --- | --- |
| [#1](https://github.com/embetapbay123/PBL6/issues/1), [#50](https://github.com/embetapbay123/PBL6/issues/50), [#51](https://github.com/embetapbay123/PBL6/issues/51), [#54](https://github.com/embetapbay123/PBL6/issues/54) | Đã Done từ main trước; giữ nguyên, regression PASS. |
| [FLOW-01 #6](https://github.com/embetapbay123/PBL6/issues/6) | Contract/shared manager có đủ; giữ Review. Producer/tích hợp rộng vẫn theo Hoa/Thịnh/Trí. |
| [PAY-02 #52](https://github.com/embetapbay123/PBL6/issues/52) | Callback persistence/follow-up đã kiểm. Công chưa có SePay test; Hoa Confirm/Cancel/recovery để kiểm consume-fail/late callback toàn luồng. |
| [PAY-03 #53](https://github.com/embetapbay123/PBL6/issues/53) | Refund kernel/worker/rollback/restart đã kiểm. Công chưa có provider hỗ trợ refund + lookup/idempotency; Hoa đóng Order/compensation. |
| [AI-01 #55](https://github.com/embetapbay123/PBL6/issues/55) | Consent/consumer/inbox/revoke/retention PASS. Còn purchase producer Hoa, M3 auth/membership Trí và receipt qua API/Rabbit thật. |
| [AI-02 #56](https://github.com/embetapbay123/PBL6/issues/56) | ALS/baseline/related/fallback đã có. DB hiện **0 consent GRANTED, 0 interaction, 0 ACTIVE model**; cần dataset có nguồn/consent và ranking thật, không import synthetic để giả đạt. |
| [AI-03 #57](https://github.com/embetapbay123/PBL6/issues/57) | Generation adapter/session/grounding/budget PASS. Local Go gateway smoke: MODEL_GENERATED, fallback=false, 5.422 s. Còn live evaluation/human rubric/billing/latency acceptance; issue In progress, chưa Done. |
| [AI-04 #58](https://github.com/embetapbay123/PBL6/issues/58) | Scope-filtered metrics/version/p95/limits và live runner. Còn Trí ResolveAiMetricsScope + live model/dataset/billing. |
| [OPS-01 #59](https://github.com/embetapbay123/PBL6/issues/59) | Body/key/log controls, admission fix/read smoke PASS. Full security/revoke/upload/mixed load còn module thật và lỗi của đúng owner. |
| [OPS-02 #60](https://github.com/embetapbay123/PBL6/issues/60) | Financial fault/replay/rollback, worker restart và restore PASS. Full matrix chờ Hoa Confirm/Cancel/Voucher, Thịnh restock/expiry, Công provider thật. |
| [DEMO-01 #61](https://github.com/embetapbay123/PBL6/issues/61) | Run/evidence/NOT_RUN rõ. Full nhiều Store/mọi role/3 Web/Android/FR/NFR còn thiếu; không đóng bằng CI. |

Giữ owner nghiệp vụ. Provider prerequisites **15/10**, feature gate **26/10**, demo **03/11**. Không đổi tất cả task thành Done từ bản bàn giao này.
