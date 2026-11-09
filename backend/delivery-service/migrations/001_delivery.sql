CREATE TABLE IF NOT EXISTS delivery_parcel (
  id uuid PRIMARY KEY,
  client_reference varchar(100) NOT NULL UNIQUE,
  tracking_code varchar(100) NOT NULL UNIQUE,
  request_json jsonb NOT NULL,
  status varchar(60) NOT NULL DEFAULT 'READY_FOR_PICKUP',
  version integer NOT NULL DEFAULT 1,
  courier_name varchar(200), note varchar(1000),
  collected_vnd bigint NOT NULL DEFAULT 0 CHECK(collected_vnd>=0),
  remitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS delivery_operation (
  operation_id uuid PRIMARY KEY, payload_hash varchar(64) NOT NULL, response_json jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS delivery_event (
  id uuid PRIMARY KEY, parcel_id uuid NOT NULL REFERENCES delivery_parcel(id),
  snapshot_json jsonb NOT NULL, actor varchar(60) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz, delivered_at timestamptz, last_error varchar(60)
);
CREATE INDEX IF NOT EXISTS delivery_event_pending ON delivery_event(next_attempt_at) WHERE delivered_at IS NULL;
