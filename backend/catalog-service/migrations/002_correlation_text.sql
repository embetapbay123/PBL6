-- Correlation IDs follow the HTTP contract (1-64 ASCII letters/digits/hyphens).
ALTER TABLE outbox ALTER COLUMN correlation_id TYPE text USING correlation_id::text;
