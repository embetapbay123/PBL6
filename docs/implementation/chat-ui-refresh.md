# Chat UI refresh — 2026-11-03

Baseline: `b339b523b3496bfba8edfedeac7572a30503aff3`.

## References and implementation

- [assistant-ui Thread List](https://www.assistant-ui.com/elements/thread-list): persistent session rail, selected row, new conversation, compact timestamp and separate scrolling list.
- [assistant-ui Thread](https://www.assistant-ui.com/elements/thread) and [AI Elements Conversation](https://elements.ai-sdk.dev/components/conversation): transcript, empty state, composer and scroll-to-latest pattern.
- [shadcn Sidebar](https://ui.shadcn.com/docs/components/base/sidebar): compact sidebar hierarchy and active state.

These are design/composition references adapted to the existing REST data model; no third-party runtime, transport or copied template package was installed. No rename/delete/search controls are displayed without supporting APIs. No online/read/delivered indicators are fabricated.

## Changes

The desktop widget now uses a 780px two-pane layout with an independently scrolling session/contact list. AI has a new-session action, selected session, creation timestamp and short identifier. After a session is read, its first user question provides its title for the current page lifetime; the list API does not supply persisted titles. Unknown titles remain “Tư vấn mua sắm”.

Conversation headers show the participant, messages use separate incoming/outgoing bubbles, and the bounded composer stays below the transcript. Pagination appears when there is more than one page. Existing order links, order references, errors, retry recovery and permission checks remain. Store drafts still transfer to the full Messages page. AI can expand in place without navigating to the unrelated Store inbox or discarding its draft.

Customer and Seller inboxes share the same visual structure. Styles are scoped to chat. No database or backend changes.

## Verification

- TypeScript build passed.
- 20 desktop browser tests passed across `chat-launcher`, `order-chat`, `messaging` and `chat-workspace` specs. Controlled fixtures verify session switching, correct destination session, new session, prompt focus, expand/draft retention, both panes, bounded composer, shared Store drafts, ownership denial and unchanged retry body/key.
- Screenshots inspected at 1440×900 and 1280×800. Fixed an inherited 150px history cap and obsolete outgoing-message background discovered during visual inspection.
- Evidence: ignored `artifacts/chat-ui/browser/` and `artifacts/chat-ui/layout/`.

Desktop only, as requested. Mobile fallback CSS remains but was not tested. The AI provider’s occasional validated catalog fallback from the preceding investigation is not claimed resolved by a UI change. Fixture results do not stand in for live provider quality or real message delivery.
