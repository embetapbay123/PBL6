-- One durable inspection receipt, independent of RPC retries. No inferred sellable quantity.
CREATE TABLE inventory_return_receipt (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL,
  operation_id uuid NOT NULL UNIQUE,
  payload_hash varchar NOT NULL,
  actor_user_id uuid NOT NULL,
  items_json jsonb NOT NULL CHECK(jsonb_typeof(items_json)='array'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inventory_return_receipt_order ON inventory_return_receipt(order_id,id);
ALTER TABLE stock_movement ADD COLUMN receipt_id uuid REFERENCES inventory_return_receipt(id);
CREATE UNIQUE INDEX stock_movement_receipt_inventory ON stock_movement(receipt_id,inventory_id) WHERE receipt_id IS NOT NULL;
