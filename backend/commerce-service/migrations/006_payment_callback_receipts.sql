-- Durable receipt before acknowledging a provider callback; no raw bank payload/PII.
ALTER TABLE payment_attempt ADD COLUMN provider varchar NOT NULL DEFAULT 'SEPAY_TEST';
ALTER TABLE payment_attempt ADD CONSTRAINT payment_attempt_provider_check CHECK(provider IN ('SEPAY_TEST','LEGACY_SANDBOX'));
CREATE TABLE payment_callback_receipt (
  provider varchar NOT NULL, event_id varchar NOT NULL, payload_hash varchar NOT NULL,
  disposition varchar NOT NULL, attempt_id uuid REFERENCES payment_attempt(id),
  amount_vnd bigint CHECK(amount_vnd>0),
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(provider,event_id)
);
CREATE TABLE payment_followup (
  operation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL UNIQUE REFERENCES payment_attempt(id),
  payment_id uuid NOT NULL REFERENCES payment(id), order_id uuid NOT NULL REFERENCES "order"(id),
  kind varchar NOT NULL CHECK(kind IN ('CONSUME_REQUIRED','REFUND_REQUIRED','RECONCILE_REQUIRED')),
  status varchar NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','DONE')),
  resolution varchar CHECK(resolution IN ('CONSUMED','REFUNDED')),
  CHECK((status='PENDING' AND resolution IS NULL) OR (status='DONE' AND resolution IS NOT NULL)),
  correlation_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_followup_pending ON payment_followup(created_at) WHERE status='PENDING';
