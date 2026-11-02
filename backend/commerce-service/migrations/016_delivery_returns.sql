CREATE TABLE delivery_return_case (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES "order"(id),
  status varchar NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','RECEIVED','SETTLING','CLOSED')),
  reason varchar(2000) NOT NULL CHECK(length(trim(reason))>0),
  opened_by_user_id uuid NOT NULL,
  inspection_json jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(inspection_json)='array'),
  inspection_note varchar(2000),
  inventory_status varchar NOT NULL DEFAULT 'PENDING' CHECK(inventory_status IN ('PENDING','APPLIED')),
  inventory_command_json jsonb,
  lease_token uuid, lease_until timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  last_error varchar(100),
  version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  CHECK((lease_token IS NULL)=(lease_until IS NULL)),
  CHECK((status IN ('SETTLING','CLOSED'))=(inventory_command_json IS NOT NULL))
);
CREATE INDEX delivery_return_pending ON delivery_return_case(next_attempt_at,id) WHERE status='SETTLING';
CREATE TABLE delivery_return_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES delivery_return_case(id),
  actor_user_id uuid NOT NULL,
  action varchar NOT NULL,
  before_json jsonb,
  after_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE order_inventory_state DROP CONSTRAINT order_inventory_state_state_check;
ALTER TABLE order_inventory_state ADD CONSTRAINT order_inventory_state_state_check
  CHECK(state IN ('RESERVED','CONSUMED','RELEASED','RESTOCKED','RETURN_INSPECTED'));
