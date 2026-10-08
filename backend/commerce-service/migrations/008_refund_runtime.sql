-- Full-payment refund only. Extra bank transfers require separate reconciliation.
CREATE UNIQUE INDEX refund_payment_once ON refund(payment_id);
CREATE UNIQUE INDEX refund_operation_once ON refund(operation_id);
ALTER TABLE refund ADD CONSTRAINT refund_runtime_status CHECK(status IN ('REQUESTED','PROCESSING','UNKNOWN','SUCCEEDED','FAILED'));
CREATE TABLE refund_job (
  refund_id uuid PRIMARY KEY REFERENCES refund(id), operation_id uuid NOT NULL UNIQUE,
  provider text NOT NULL, payment_reference text NOT NULL, amount_vnd bigint NOT NULL CHECK(amount_vnd>0),
  status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','LEASED','RECONCILE','DONE','FAILED')),
  lease_token uuid, lease_until timestamptz, attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  provider_receipt text, last_error text, correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refund_job_pending ON refund_job(created_at) WHERE status IN ('PENDING','RECONCILE','LEASED');
CREATE UNIQUE INDEX refund_provider_receipt_once ON refund_job(provider,provider_receipt) WHERE provider_receipt IS NOT NULL;
