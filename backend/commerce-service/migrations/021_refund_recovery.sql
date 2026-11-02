-- Logical Refund identity and its original operation/amount remain unchanged.
-- A verified no-effect failure may have another provider execution, after lookup.
ALTER TABLE refund ADD COLUMN version integer NOT NULL DEFAULT 0 CHECK(version>=0);
CREATE FUNCTION refund_version_and_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.payment_id,NEW.order_id,NEW.operation_id,NEW.amount_vnd) IS DISTINCT FROM
    (OLD.payment_id,OLD.order_id,OLD.operation_id,OLD.amount_vnd) THEN
  RAISE EXCEPTION 'Refund logical identity and amount are immutable';
 END IF;
 NEW.version=OLD.version+1;RETURN NEW;
END $$;
CREATE TRIGGER refund_version_and_identity BEFORE UPDATE ON refund FOR EACH ROW EXECUTE FUNCTION refund_version_and_identity();

ALTER TABLE refund_job ADD COLUMN execution_operation_id uuid;
UPDATE refund_job SET execution_operation_id=operation_id;
CREATE FUNCTION refund_job_execution_default() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.execution_operation_id=coalesce(NEW.execution_operation_id,NEW.operation_id);RETURN NEW;END $$;
-- Old writers continue creating the original execution during reader-first rollout.
CREATE TRIGGER refund_job_execution_default BEFORE INSERT ON refund_job FOR EACH ROW EXECUTE FUNCTION refund_job_execution_default();
ALTER TABLE refund_job ALTER COLUMN execution_operation_id SET NOT NULL;
CREATE UNIQUE INDEX refund_job_execution_once ON refund_job(execution_operation_id);

CREATE TABLE refund_execution (
 operation_id uuid PRIMARY KEY,
 refund_id uuid NOT NULL REFERENCES refund(id),
 provider text NOT NULL,payment_reference text NOT NULL,amount_vnd bigint NOT NULL CHECK(amount_vnd>0),correlation_id text NOT NULL,
 registered_at timestamptz NOT NULL DEFAULT now()
);
-- This records command identity only, not proof it was sent or refunded.
INSERT INTO refund_execution(operation_id,refund_id,provider,payment_reference,amount_vnd,correlation_id)
 SELECT execution_operation_id,refund_id,provider,payment_reference,amount_vnd,correlation_id FROM refund_job;
CREATE FUNCTION reject_refund_execution_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Refund execution identity is append-only';END $$;
CREATE TRIGGER refund_execution_immutable BEFORE UPDATE OR DELETE ON refund_execution FOR EACH ROW EXECUTE FUNCTION reject_refund_execution_mutation();

CREATE TABLE refund_recovery_request (
 id uuid PRIMARY KEY,refund_id uuid NOT NULL REFERENCES refund(id),actor_user_id uuid NOT NULL,
 previous_execution_id uuid NOT NULL REFERENCES refund_execution(operation_id),
 next_execution_id uuid UNIQUE REFERENCES refund_execution(operation_id),
 note varchar(2000) NOT NULL CHECK(length(trim(note))>0),
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','REQUEUED','RECONCILED','BLOCKED')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX refund_recovery_pending_once ON refund_recovery_request(refund_id) WHERE status='PENDING';
CREATE INDEX refund_recovery_history ON refund_recovery_request(refund_id,created_at,id);
