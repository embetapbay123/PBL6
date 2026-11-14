-- All admission/settlement transactions lock the singleton guard, including workers.
CREATE TABLE try_on_guard (
  id integer PRIMARY KEY CHECK (id = 1),
  paused boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO try_on_guard(id) VALUES(1);

CREATE TABLE try_on_photo (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  file_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  deleted_at timestamptz,
  UNIQUE(id, owner_id)
);
CREATE INDEX try_on_photo_expiry ON try_on_photo(expires_at) WHERE deleted_at IS NULL;

CREATE TABLE try_on_job (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  photo_id uuid NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  idempotency_key uuid NOT NULL,
  payload_hash char(64) NOT NULL,
  ip_hash char(64),
  garment_key text NOT NULL,
  catalog_image_id uuid NOT NULL,
  catalog_version integer NOT NULL,
  garment_kind text NOT NULL CHECK(garment_kind IN ('tops','bottoms')),
  consent_version text NOT NULL,
  prompt_version text NOT NULL,
  model text NOT NULL,
  quality text NOT NULL CHECK(quality = 'low'),
  complexity text NOT NULL CHECK(complexity = 'low'),
  status text NOT NULL CHECK(status IN ('QUEUED','PROCESSING','SUCCEEDED','FAILED','UNKNOWN','CANCELLED')),
  message text,
  budget_day date NOT NULL,
  budget_month char(7) NOT NULL,
  quota_charged boolean NOT NULL DEFAULT true,
  reserved_micro_usd bigint NOT NULL CHECK(reserved_micro_usd > 0),
  charged_micro_usd bigint CHECK(charged_micro_usd >= 0),
  cost_state text NOT NULL DEFAULT 'RESERVED' CHECK(cost_state IN ('RESERVED','SETTLED','UNKNOWN','RELEASED')),
  usage jsonb NOT NULL DEFAULT '{}',
  provider_request_id varchar(200),
  worker_token uuid,
  lease_until timestamptz,
  dispatched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  delete_requested_at timestamptz,
  deleted_at timestamptz,
  UNIQUE(owner_id, idempotency_key),
  FOREIGN KEY(photo_id, owner_id) REFERENCES try_on_photo(id, owner_id)
);
CREATE UNIQUE INDEX try_on_one_pending ON try_on_job(owner_id) WHERE status IN ('QUEUED','PROCESSING','UNKNOWN');
CREATE INDEX try_on_job_owner ON try_on_job(owner_id, created_at DESC);
CREATE INDEX try_on_job_day ON try_on_job(budget_day);
CREATE INDEX try_on_job_month ON try_on_job(budget_month);
CREATE INDEX try_on_job_queue ON try_on_job(created_at) WHERE status = 'QUEUED';
CREATE INDEX try_on_job_recovery ON try_on_job(lease_until) WHERE status = 'PROCESSING';

CREATE TABLE try_on_budget_audit (
  id uuid PRIMARY KEY,
  job_id uuid REFERENCES try_on_job(id),
  action text NOT NULL CHECK(action IN ('PAUSE','RESUME','RECONCILE')),
  actor varchar(100) NOT NULL,
  reference varchar(200) NOT NULL,
  charged_micro_usd bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
