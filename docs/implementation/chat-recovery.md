# Chat recovery — 2026-11-03

Baseline: `e2d84b3d78a1ca75e98ecbbe80eb72e72b92a281`. Desktop only.

## Confirmed cause and fix

After a hard reload with a refresh cookie, the header allowed opening chat before authentication restoration finished. Publishing the restored session remounted the account-scoped QueryClient/ChatProvider, losing the open state. The dialog disappeared without a chat API error. The launcher now waits for restoration to finish, including restoration failure. Account isolation remains intact.

Store conversations were initially empty for the selected demo Customer, rather than failing to load. The empty state now explains how to start from a product or Store.

## Live verification

- AI session creation and message endpoints returned 201/200. The configured provider is reachable; trace metadata included both `MODEL_GENERATED` and `PROVIDER_INVALID_RESPONSE`. A controlled synthetic provider probe returned valid output. Some responses fail validation and use catalog fallback; the exact rejected payload was not retained, so its specific validation failure is not established. Validation is preserved and the UI reports the fallback reason more precisely. This change does not claim to eliminate provider fallback.
- Two independent browser sessions on `https://demo.congnguyen.me`: Customer A opened the Everyday T-shirt, started a conversation with An Nhiên Studio, sent a tagged synthetic message; Owner received and replied; Customer received the reply through polling. POST responses were 201; reads were 200; no page errors.
- Messages deliberately remain in the synthetic demo conversation as visible test data. No real recipients or external messaging service were involved.

## Regression evidence

12 desktop browser tests passed: 5 launcher/AI/draft/retry cases plus 7 order-linked chat cases. Tests cover delayed/failed session restoration, generated/fallback rendering, close/reopen, immutable retry payload and client message ID, verified order references and acknowledged-send recovery. TypeScript build passed.

Evidence under ignored `artifacts/chat-debug/`: `report.json` (original race), `stable-report.json` (live AI), `two-party-report.json`, `two-party-customer.png`, `two-party-owner.png`, and `browser/.last-run.json`.

Fixture tests prove controlled interaction behavior; the live two-party run proves actual message delivery. Neither is evidence of consistent model quality. No mobile/device or screen-reader checks were performed. No database reset, migration or backend deployment is required for this fix.
