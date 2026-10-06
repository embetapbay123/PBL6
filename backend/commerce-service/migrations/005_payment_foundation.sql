-- Append-only Payment/COD handoff. No fake backfill for existing attempts.
ALTER TABLE payment_attempt ADD COLUMN qr_url text;
ALTER TABLE payment_attempt ADD COLUMN expires_at timestamptz;
ALTER TABLE payment_event ALTER COLUMN attempt_id DROP NOT NULL;
ALTER TABLE payment_event ADD COLUMN payment_id uuid REFERENCES payment(id);
ALTER TABLE payment_event ADD CONSTRAINT payment_event_target CHECK (attempt_id IS NOT NULL OR payment_id IS NOT NULL);
CREATE INDEX payment_attempt_current ON payment_attempt(payment_id,created_at DESC,id);
