# DeepSeek output budget — 2026-11-03

Baseline: web `d5c92a2`, AI service `e8ed5b1`. Configured model: `deepseek-v4.1-flash`, OpenAI-compatible provider through OpenCode, thinking `auto`, overall deadline 15 seconds. Credentials were not logged.

## Reproduction and confirmed cause

The desktop demo returned HTTP 200 with `fallback=true`, `fallback_reason=PROVIDER_INVALID_RESPONSE` for “Tìm áo thun dưới 200000 đồng”. This is a rejected provider answer, rather than an authentication or UI failure.

Six direct synthetic requests compared auto/disabled thinking: all returned provider HTTP 200; five passed validation, while one disabled-thinking answer contained unverified numbers. Disabling thinking alone therefore does not establish a fix.

A subsequent controlled probe used the five candidates obtained by the existing public Catalog reader and the same synthetic question. The reader selects ACTIVE/VISIBLE products from active Stores; only public ID/title/description are sent to the already configured provider. No customer history or private order/inventory data was sent.

| Thinking | Output limit | Provider result | App validation |
| --- | ---: | --- | --- |
| auto | 512 | `length`; completion 512 tokens, including 499 reasoning tokens; final content only 26 characters | Invalid/incomplete JSON; fallback |
| disabled | 512 | `stop`, complete JSON | MODEL_GENERATED |
| auto | 1024 | `stop`; completion 519 tokens, including 354 reasoning tokens | MODEL_GENERATED |
| disabled | 1024 | `stop`, complete JSON | MODEL_GENERATED |

The 512-token allowance covers reasoning and final output, leaving too little room for JSON. This agrees with [DeepSeek Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode/) and the [Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/) distinction between `stop` and `length`. The installed runtime trace's failed request also recorded 1256 total tokens, matching the controlled auto/512 probe (744 prompt + 512 completion). Raw model reasoning is neither stored in these artifacts nor exposed to users.

## Fix and verification scope

DeepSeek OpenAI-compatible models use a 1024-token output limit when thinking is auto/enabled. Explicitly disabled thinking and other providers retain 512. Request budget estimation includes the actual selected output allowance. Existing timeout, response-size, price/product ownership and JSON validation remain; there is no automatic retry.

After deploying the provider fix, one browser turn succeeded but a subsequent turn was aborted by the frontend's generic 7000ms deadline. The server nevertheless stored `MODEL_GENERATED` after 7191ms. A controlled browser-clock test reproduced the premature abort. AI message POSTs now have a bounded 35000ms client deadline, allowing the server's maximum 30s provider deadline plus Catalog work; ordinary API calls retain 7000ms. The question remains on failure and is not automatically sent again.

65 targeted container tests passed, covering all three thinking modes, complete structured output, usage-budget accounting, provider validation, algorithm safety and shared network-client behavior. Nine desktop browser tests passed, including a response held beyond 7 seconds and an eventual timeout with no automatic resend. The former test failed against the old client; that evidence is retained in `frontend-before/`. Deployment updates M4 and the frontend, with no schema change.

Evidence in ignored `artifacts/deepseek-debug/`: `browser-report.json`, `provider.jsonl` (synthetic), `synthetic-1024.jsonl`, `live-512.jsonl`, `live-1024.jsonl`. Probes record validation metadata, not API keys or reasoning text. These small samples do not prove a universal model success rate. Queries producing `NO_MATCH` stop at retrieval and do not invoke the model; increasing output tokens does not alter that behavior.
