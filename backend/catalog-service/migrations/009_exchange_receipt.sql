CREATE TABLE inventory_exchange_dispatch (
  receipt_id uuid PRIMARY KEY REFERENCES inventory_return_receipt(id),
  operation_id uuid NOT NULL UNIQUE,
  payload_hash varchar NOT NULL,
  items_json jsonb NOT NULL,
  actor_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
