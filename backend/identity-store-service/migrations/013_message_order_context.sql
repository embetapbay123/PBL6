-- M2 verifies ownership and immutable Store/Customer association before attaching a reference.
-- No cross-service foreign key or copy of private address/payment data.
ALTER TABLE store_message ADD COLUMN order_id uuid;
CREATE INDEX store_message_order_context ON store_message(conversation_id,order_id,created_at,id) WHERE order_id IS NOT NULL;
