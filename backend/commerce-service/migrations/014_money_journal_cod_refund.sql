-- Reader-first additive migration. Confirmed money events are independent of order creation.
CREATE TABLE money_movement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payment(id),
  order_id uuid NOT NULL REFERENCES "order"(id),
  store_id uuid NOT NULL,
  kind varchar NOT NULL CHECK(kind IN ('COLLECTION','REFUND')),
  amount_vnd bigint NOT NULL CHECK(amount_vnd>=0),
  source_type varchar NOT NULL,
  source_id varchar NOT NULL,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  time_source varchar NOT NULL CHECK(time_source IN ('SYSTEM_CONFIRMED','SYSTEM_RECEIVED','OWNER_ATTESTED')),
  UNIQUE(payment_id,kind), UNIQUE(source_type,source_id)
);
CREATE INDEX money_movement_store_period ON money_movement(store_id,occurred_at,id);
CREATE FUNCTION reject_money_movement_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'money_movement is append-only'; END $$;
CREATE TRIGGER money_movement_immutable BEFORE UPDATE OR DELETE ON money_movement FOR EACH ROW EXECUTE FUNCTION reject_money_movement_mutation();

CREATE TABLE cod_refund_receipt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id uuid NOT NULL UNIQUE REFERENCES refund(id),
  operation_id uuid NOT NULL UNIQUE,
  owner_user_id uuid NOT NULL,
  receipt_reference varchar(200) NOT NULL CHECK(length(trim(receipt_reference))>0),
  recipient_name varchar(200) NOT NULL CHECK(length(trim(recipient_name))>0),
  refunded_at timestamptz NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  amount_vnd bigint NOT NULL CHECK(amount_vnd>0),
  full_amount_confirmed boolean NOT NULL CHECK(full_amount_confirmed)
);
-- Reliable COD timestamp only; never substitute order.created_at for missing cash history.
INSERT INTO money_movement(payment_id,order_id,store_id,kind,amount_vnd,source_type,source_id,occurred_at,time_source)
SELECT p.id,o.id,o.store_id,'COLLECTION',c.amount_collected_vnd,'COD_COLLECTION',c.id::text,c.collected_at,'SYSTEM_CONFIRMED'
FROM c_o_d_collection c JOIN "order" o ON o.id=c.order_id JOIN payment p ON p.order_id=o.id
WHERE c.status='SUCCEEDED' AND c.collected_at IS NOT NULL AND p.method='COD'
  AND p.status IN ('SUCCEEDED','REFUNDED') AND p.collected_vnd=c.amount_collected_vnd AND c.amount_collected_vnd=c.amount_due_vnd;
-- Online history has receipt time, not a verified bank transaction time. Publish that provenance.
INSERT INTO money_movement(payment_id,order_id,store_id,kind,amount_vnd,source_type,source_id,occurred_at,time_source)
SELECT DISTINCT ON (p.id) p.id,o.id,o.store_id,'COLLECTION',p.collected_vnd,'PAYMENT_EVENT',e.id::text,e.received_at,'SYSTEM_RECEIVED'
FROM payment p JOIN "order" o ON o.id=p.order_id JOIN payment_attempt a ON a.payment_id=p.id
JOIN payment_event e ON e.attempt_id=a.id
WHERE p.method='SANDBOX' AND p.status IN ('SUCCEEDED','REFUNDED') AND a.status='SUCCEEDED'
  AND a.amount_vnd=p.collected_vnd AND p.collected_vnd=p.payable_vnd AND e.event_type='SUCCESS'
ORDER BY p.id,e.received_at,e.id;
-- Historical refunds without a trustworthy occurrence time deliberately remain unjournaled.
