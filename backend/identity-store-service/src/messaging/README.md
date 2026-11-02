# M3 / Messaging

Customer opens one conversation per Store from a Product or public Store page. The Store must be active. Messages are persisted in M3; the API never reads another participant's conversation.

Store access requires an active membership and either OWNER role or `order.store.read_status_cancel`. Auth resolves the current membership and permissions for each request. Admin has no implicit access to private conversations.

`client_message_id` is a client-generated UUID retained for retries of the same content. A duplicate returns the original message; using the key for different content or another sender returns 409. Sends lock the conversation and commit the message and last-activity timestamp together. Content is plain text, trimmed, and limited to 2000 characters.

Both lists and messages are paginated. Message page 1 contains the newest entries; the web renders each page in chronological order and polls every ten seconds while visible. This is separate from AI chat.

Apply migration `008_buyer_store_chat.sql` before enabling the routes. Runtime and PostgreSQL acceptance are tracked in the frontend verification handoff.
