-- Durable M2 orchestration metadata. Core migrations 001-003 are unchanged.
CREATE TABLE checkout_attempt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id uuid NOT NULL,
  key varchar(200) NOT NULL,
  payload_hash varchar(64) NOT NULL,
  phase varchar(20) NOT NULL CHECK (phase IN ('RESERVING','READY','COMMITTED','COMPENSATING','FAILED')),
  plan_json jsonb NOT NULL,
  reserve_result jsonb,
  response_json jsonb,
  failure_json jsonb,
  released_orders uuid[] NOT NULL DEFAULT '{}',
  lease_token uuid,
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  correlation_id varchar(64) NOT NULL,
  last_error varchar(100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_user_id,key),
  CHECK ((lease_token IS NULL) = (lease_until IS NULL)),
  CHECK (phase <> 'COMMITTED' OR response_json IS NOT NULL)
);
CREATE INDEX checkout_attempt_pending ON checkout_attempt(next_attempt_at,created_at)
  WHERE phase IN ('RESERVING','READY','COMPENSATING');

CREATE TABLE order_inventory_state (
  order_id uuid PRIMARY KEY REFERENCES "order"(id),
  reservation_ids uuid[] NOT NULL CHECK (cardinality(reservation_ids)>0),
  items_json jsonb NOT NULL,
  state varchar(20) NOT NULL CHECK (state IN ('RESERVED','CONSUMED','RELEASED','RESTOCKED')),
  command_kind varchar(10) CHECK (command_kind IN ('CONSUME','RELEASE','RESTOCK')),
  operation_id uuid,
  command_json jsonb,
  lease_token uuid,
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  correlation_id varchar(64) NOT NULL,
  last_error varchar(100),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((command_kind IS NULL) = (command_json IS NULL)),
  CHECK ((command_kind IS NULL) = (operation_id IS NULL)),
  CHECK ((lease_token IS NULL) = (lease_until IS NULL))
);
CREATE INDEX order_inventory_pending ON order_inventory_state(next_attempt_at)
  WHERE command_kind IS NOT NULL;
