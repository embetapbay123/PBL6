ALTER TABLE outbox ALTER COLUMN correlation_id TYPE text USING correlation_id::text;
