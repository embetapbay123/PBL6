ALTER TABLE shipping_shipment ADD COLUMN carrier_version integer NOT NULL DEFAULT 0;
ALTER TABLE shipping_command ADD COLUMN carrier_command_json jsonb;
CREATE TABLE delivery_callback_receipt (
  event_id uuid PRIMARY KEY, snapshot_json jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz,
  last_error varchar(100), next_attempt_at timestamptz NOT NULL DEFAULT now()
);
