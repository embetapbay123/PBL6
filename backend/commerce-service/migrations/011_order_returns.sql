CREATE TABLE order_return (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL UNIQUE REFERENCES "order"(id),
 kind varchar(30) NOT NULL CHECK(kind IN ('DELIVERY_FAILED','CUSTOMER_RETURN')),
 status varchar(20) NOT NULL CHECK(status IN ('REQUESTED','APPROVED','REJECTED','RECEIVED')),
 reason varchar(500) NOT NULL, requested_by uuid NOT NULL, requested_at timestamptz NOT NULL DEFAULT now(),
 version integer NOT NULL DEFAULT 0 CHECK(version>=0),
 decided_by uuid, decided_at timestamptz, decision_reason varchar(500),
 received_by uuid, received_at timestamptz, restock boolean,
 CHECK(status<>'RECEIVED' OR (received_by IS NOT NULL AND received_at IS NOT NULL AND restock IS NOT NULL))
);
ALTER TABLE order_inventory_state DROP CONSTRAINT order_inventory_state_state_check;
ALTER TABLE order_inventory_state ADD CONSTRAINT order_inventory_state_state_check CHECK(state IN ('RESERVED','CONSUMED','RELEASED','RESTOCKED','QUARANTINED'));
