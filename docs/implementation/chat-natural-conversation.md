# Natural shopping conversation — 2026-11-03

Baseline: web `5449b01`, M4 `dd91533`. Scope: desktop chat, existing DeepSeek provider and public Catalog.

## Reproduced problems

The exact request “Tôi muốn tìm quà tặng áo thun dưới 100k” returned NO_MATCH without calling the model and displayed “model chưa sẵn sàng”. A size/color follow-up discarded the budget and returned unrelated products costing more than the original limit. A later summary appended “Chưa tìm thấy sản phẩm…” even after describing previously recommended shirts.

The old prompt enforced two short sentences and 900 characters, prohibited every numeral outside a product title, and reduced context to six unlabelled strings of 300 characters. Reopened history started at the oldest page; sends reset the message total. Daily tokens were charged at a conservative estimate without settling to reported provider usage.

## Changes

- Empty results still invoke the configured model. It can explain the mismatch and ask whether to change criteria. Empty product IDs are valid and no longer force an unrelated “no products” suffix onto greetings or summaries.
- Recent history retains user/assistant roles, up to 40 messages, with useful message lengths. The prompt allows explanations/comparisons and up to 4000 answer characters. This follows the [DeepSeek multi-round conversation pattern](https://api-docs.deepseek.com/guides/multi_round_chat/).
- Follow-up search retains the product topic for size/color/budget/selection questions. Budget persists until explicitly changed/cleared, including short replies such as “200k nhé”. A new item search resets the topic. Current live cards are checked against the effective budget, not merely the latest sentence.
- Current prices, public variant values, user-provided budgets and ordinary list/selection counts may appear in prose. Unknown prices, product IDs, unsafe links/markup, sensitive strings and unsupported numeric claims remain rejected. No blanket removal of ownership or purchase/price validation.
- History opens at its latest page. Sending while reading an older page moves to the new answer; an acknowledged send is not repeated if a subsequent history read fails.
- Known provider usage settles its reservation on the reservation date. Unknown outcomes retain the reservation. No automatic paid-request replay or database reset.

## Demo settings

DeepSeek thinking disabled for ordinary shopping conversation; output allowance 2048 tokens (4096 when thinking auto/enabled); provider deadline 25 seconds. The existing AI-only client deadline remains 35 seconds. Demo per-account/day limits are 1000 turns and 1000000 tokens. Default deployments retain 100 turns/100000 tokens unless configured. Real configured credentials are unchanged and not stored in artifacts.

## Validation

90 provider/algorithm/catalog unit tests and 10 focused integrations passed. Integrations use isolated schemas on the QA database, cover empty-result → size/color → increased-budget, 12 turns of role history and actual token settlement, plus existing ownership/version/budget guards. Ten desktop browser tests passed, including a 44-message session, reopening at the latest page and sending after viewing older messages. TypeScript passed.

Evidence under ignored `artifacts/chat-natural/`: `before.json`/`.png`, browser regressions and the controlled multi-turn script. Live verification after deployment is recorded separately. No mobile/device testing was performed. Bounded context and output are retained; these tests do not claim infinite memory or perfect generative factual accuracy.
