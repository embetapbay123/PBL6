-- Existing rows retain NULL: transaction-start time is not a verified ledger write time.
ALTER TABLE stock_movement ADD COLUMN recorded_at timestamptz;
-- Match the API/JavaScript millisecond precision without rounding into the future.
ALTER TABLE stock_movement ALTER COLUMN recorded_at SET DEFAULT date_trunc('milliseconds',clock_timestamp());
CREATE INDEX stock_movement_inventory_recorded ON stock_movement(inventory_id,recorded_at,inventory_version);
