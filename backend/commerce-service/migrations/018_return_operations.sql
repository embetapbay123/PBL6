-- Additive: an old RECEIVED row is not evidence that stock was inspected/restored.
ALTER TABLE order_return_request
  ADD COLUMN original_type varchar CHECK(original_type IN ('REFUND','EXCHANGE')),
  ADD COLUMN fault_party varchar CHECK(fault_party IN ('STORE','CUSTOMER','DISPUTED')),
  ADD COLUMN fee_payer varchar CHECK(fee_payer IN ('STORE','CUSTOMER')),
  ADD COLUMN return_instructions varchar(2000),
  ADD COLUMN inspection_json jsonb,
  ADD COLUMN inspection_note varchar(2000),
  ADD COLUMN inventory_status varchar NOT NULL DEFAULT 'NOT_STARTED' CHECK(inventory_status IN ('NOT_STARTED','PENDING','APPLIED','LEGACY_RECONCILED')),
  ADD COLUMN inventory_command_json jsonb,
  ADD COLUMN legacy_reconciliation_note varchar(2000),
  ADD COLUMN exchange_status varchar NOT NULL DEFAULT 'NOT_STARTED' CHECK(exchange_status IN ('NOT_STARTED','PENDING','APPLIED','BLOCKED')),
  ADD COLUMN exchange_command_json jsonb,
  ADD COLUMN conversion_status varchar CHECK(conversion_status IN ('PROPOSED','ACCEPTED','DECLINED')),
  ADD COLUMN conversion_note varchar(2000),
  ADD COLUMN lease_token uuid,
  ADD COLUMN lease_until timestamptz,
  ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN last_error varchar(100);
UPDATE order_return_request SET original_type=type;
ALTER TABLE order_return_request ALTER COLUMN original_type SET NOT NULL;
CREATE FUNCTION return_request_original_type() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN NEW.original_type=coalesce(NEW.original_type,NEW.type);
  ELSIF NEW.original_type IS DISTINCT FROM OLD.original_type THEN RAISE EXCEPTION 'original return type is immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER return_original_type BEFORE INSERT OR UPDATE ON order_return_request FOR EACH ROW EXECUTE FUNCTION return_request_original_type();
CREATE TABLE return_operation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES order_return_request(id),
  actor_user_id uuid NOT NULL,
  action varchar NOT NULL,
  detail_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX return_operations_due ON order_return_request(next_attempt_at,id)
  WHERE inventory_status='PENDING' OR exchange_status='PENDING';
