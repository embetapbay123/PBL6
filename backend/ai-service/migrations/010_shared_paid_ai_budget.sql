-- Financial reservations outlive deleted chat content. No FK may erase a paid call.
CREATE TABLE paid_ai_call (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  session_id uuid NOT NULL,
  client_message_id uuid NOT NULL,
  payload_hash char(64) NOT NULL,
  purpose text NOT NULL CHECK(purpose='CHAT_MEDIA'),
  model text NOT NULL,
  ip_hash char(64),
  status text NOT NULL CHECK(status IN ('QUEUED','PROCESSING','SUCCEEDED','FAILED','UNKNOWN','CANCELLED')),
  budget_day date NOT NULL,
  budget_month char(7) NOT NULL,
  reserved_micro_usd bigint NOT NULL CHECK(reserved_micro_usd>0),
  charged_micro_usd bigint CHECK(charged_micro_usd>=0),
  cost_state text NOT NULL DEFAULT 'RESERVED' CHECK(cost_state IN ('RESERVED','SETTLED','UNKNOWN','RELEASED')),
  charge_basis text CHECK(charge_basis IN ('CONSERVATIVE_USAGE_BOUND')),
  quota_charged boolean NOT NULL DEFAULT true,
  question text,
  attachment_ids uuid[] NOT NULL,
  session_version integer NOT NULL,
  response jsonb,
  usage jsonb NOT NULL DEFAULT '{}',
  provider_request_id varchar(200),
  worker_token uuid,
  lease_until timestamptz,
  dispatched_at timestamptz,
  content_deleted_at timestamptz,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id,client_message_id),
  CHECK(cardinality(attachment_ids) BETWEEN 0 AND 3)
);
CREATE UNIQUE INDEX paid_ai_one_pending ON paid_ai_call(owner_id) WHERE status IN ('QUEUED','PROCESSING','UNKNOWN') AND content_deleted_at IS NULL;
CREATE INDEX paid_ai_call_queue ON paid_ai_call(status,lease_until,created_at);
CREATE INDEX paid_ai_call_session ON paid_ai_call(session_id);
CREATE INDEX paid_ai_call_ip ON paid_ai_call(ip_hash,created_at);
CREATE VIEW paid_ai_cost AS
 SELECT budget_day,budget_month,reserved_micro_usd,charged_micro_usd,cost_state FROM try_on_job
 UNION ALL
 SELECT budget_day,budget_month,reserved_micro_usd,charged_micro_usd,cost_state FROM paid_ai_call;
