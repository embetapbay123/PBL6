CREATE INDEX order_store_completed_lookup ON "order"(store_id,id) WHERE status='COMPLETED';
CREATE INDEX order_completed_clock_lookup ON order_status_history(order_id,created_at) WHERE to_status='COMPLETED';
