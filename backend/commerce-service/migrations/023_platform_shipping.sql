-- Preserve legacy shipment as the one-per-order compatibility projection.
-- All carrier legs and commands live separately, so existing return SQL stays scoped.
ALTER TABLE "order" ADD COLUMN shipping_mode varchar NOT NULL DEFAULT 'LEGACY_MANUAL'
  CHECK(shipping_mode IN ('LEGACY_MANUAL','GHN'));
ALTER TABLE "order" ADD COLUMN shipping_delivered_at timestamptz;
CREATE TABLE shipping_pickup_location (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL,
  name varchar(200) NOT NULL, shop_id integer NOT NULL CHECK(shop_id>0),
  environment varchar NOT NULL CHECK(environment IN ('staging','production')),
  account_key varchar(100) NOT NULL, address_json jsonb NOT NULL,
  enabled boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(environment,account_key,shop_id)
);
CREATE UNIQUE INDEX shipping_active_pickup ON shipping_pickup_location(store_id) WHERE enabled;
CREATE FUNCTION set_order_shipping_mode() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM shipping_pickup_location WHERE store_id=NEW.store_id AND enabled) THEN
    NEW.shipping_mode := 'GHN';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER order_shipping_mode BEFORE INSERT ON "order" FOR EACH ROW EXECUTE FUNCTION set_order_shipping_mode();
CREATE TABLE shipping_shipment (
  id uuid PRIMARY KEY, order_id uuid NOT NULL REFERENCES "order"(id), store_id uuid NOT NULL,
  return_request_id uuid REFERENCES order_return_request(id),
  leg varchar NOT NULL CHECK(leg IN ('OUTBOUND','EXCHANGE_OUTBOUND','CUSTOMER_RETURN')),
  provider varchar NOT NULL DEFAULT 'GHN' CHECK(provider IN ('GHN','EXTERNAL')),
  pickup_location_id uuid REFERENCES shipping_pickup_location(id),
  environment varchar NOT NULL, account_key varchar(100) NOT NULL, shop_id integer,
  client_order_code varchar(50) NOT NULL UNIQUE, tracking_code varchar(100),
  status varchar NOT NULL DEFAULT 'CREATING', provider_status varchar(100),
  request_json jsonb NOT NULL, cod_vnd bigint NOT NULL DEFAULT 0 CHECK(cod_vnd>=0),
  actual_fee_vnd bigint, cod_collected_at timestamptz, cod_remitted_at timestamptz,
  picked_up_at timestamptz, delivered_at timestamptz, expected_delivery_at timestamptz,
  provider_updated_at timestamptz, last_error varchar(100), version integer NOT NULL DEFAULT 0,
  next_sync_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK((leg='OUTBOUND')=(return_request_id IS NULL))
);
CREATE UNIQUE INDEX shipping_tracking_unique ON shipping_shipment(environment,account_key,tracking_code) WHERE tracking_code IS NOT NULL AND provider='GHN';
CREATE UNIQUE INDEX shipping_outbound_active ON shipping_shipment(order_id) WHERE leg='OUTBOUND' AND status<>'CANCELLED';
CREATE UNIQUE INDEX shipping_return_leg_active ON shipping_shipment(return_request_id,leg) WHERE return_request_id IS NOT NULL AND status<>'CANCELLED';
CREATE INDEX shipping_sync_due ON shipping_shipment(next_sync_at);
CREATE TABLE shipping_command (
  id uuid PRIMARY KEY, shipment_id uuid NOT NULL REFERENCES shipping_shipment(id),
  kind varchar NOT NULL CHECK(kind IN ('CREATE','CANCEL','REDELIVER','RETURN')),
  status varchar NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','UNKNOWN','APPLIED','FAILED')),
  attempts integer NOT NULL DEFAULT 0, last_error varchar(100),
  lease_token uuid, lease_until timestamptz, next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX shipping_command_pending ON shipping_command(shipment_id) WHERE status IN ('PENDING','UNKNOWN');
CREATE TABLE shipping_webhook_receipt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dedup_key varchar(64) NOT NULL UNIQUE,
  environment varchar NOT NULL, account_key varchar(100) NOT NULL, shop_id integer NOT NULL,
  tracking_code varchar(100) NOT NULL, client_order_code varchar(50),
  payload_json jsonb NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz, last_error varchar(100), attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shipping_receipt_pending ON shipping_webhook_receipt(next_attempt_at) WHERE processed_at IS NULL;
CREATE TABLE shipping_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), shipment_id uuid NOT NULL REFERENCES shipping_shipment(id),
  status varchar NOT NULL, provider_status varchar(100), source varchar NOT NULL,
  occurred_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shipment_id,status,occurred_at)
);
CREATE TABLE shipping_cod_evidence (
  shipment_id uuid PRIMARY KEY REFERENCES shipping_shipment(id), amount_vnd bigint NOT NULL,
  source varchar NOT NULL, reference varchar(200) NOT NULL, actor_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE delivery_return_case ADD COLUMN shipping_shipment_id uuid REFERENCES shipping_shipment(id);
CREATE TABLE shipping_exchange_receipt (
  shipment_id uuid PRIMARY KEY REFERENCES shipping_shipment(id),
  status varchar NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPLIED')),
  inspection_json jsonb NOT NULL, note varchar(2000) NOT NULL,
  command_json jsonb NOT NULL, next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error varchar(100), created_at timestamptz NOT NULL DEFAULT now()
);
