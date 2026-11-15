CREATE TABLE ai_chat_attachment (
  id uuid PRIMARY KEY,
  session_id uuid REFERENCES chat_session(id) ON DELETE SET NULL,
  owner_id uuid NOT NULL,
  client_upload_id uuid NOT NULL,
  kind text NOT NULL CHECK(kind IN ('IMAGE','VIDEO')),
  expected_bytes integer NOT NULL CHECK(expected_bytes BETWEEN 1 AND 20971520),
  input_sha256 char(64) NOT NULL CHECK(input_sha256 ~ '^[a-f0-9]{64}$'),
  ip_hash char(64),
  status text NOT NULL DEFAULT 'UPLOADING' CHECK(status IN ('UPLOADING','PROCESSING','READY','REJECTED','DELETED','EXPIRED')),
  stored_bytes integer NOT NULL DEFAULT 0 CHECK(stored_bytes>=0),
  content_type text,
  file_key text UNIQUE,
  preview_key text UNIQUE,
  width integer,
  height integer,
  duration_ms integer,
  lease_token uuid,
  lease_until timestamptz,
  error_code text,
  turn_id uuid REFERENCES paid_ai_call(id),
  message_id uuid REFERENCES chat_message(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  files_deleted_at timestamptz,
  expires_at timestamptz NOT NULL,
  UNIQUE(owner_id,client_upload_id),
  CHECK(kind<>'IMAGE' OR expected_bytes<=5242880),
  CHECK(status<>'READY' OR (stored_bytes>0 AND width>0 AND height>0 AND content_type IS NOT NULL AND file_key IS NOT NULL))
);
CREATE INDEX ai_chat_attachment_work ON ai_chat_attachment(status,lease_until,created_at);
CREATE INDEX ai_chat_attachment_quota ON ai_chat_attachment(owner_id,created_at);
CREATE INDEX ai_chat_attachment_ip ON ai_chat_attachment(ip_hash,created_at);
CREATE INDEX ai_chat_attachment_session ON ai_chat_attachment(session_id);
ALTER TABLE chat_message ADD COLUMN attachment_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE paid_ai_call ADD COLUMN consent_version text;
CREATE TABLE paid_ai_budget_audit (
  id uuid PRIMARY KEY,
  call_id uuid NOT NULL REFERENCES paid_ai_call(id),
  actor varchar(100) NOT NULL,
  reference varchar(200) NOT NULL,
  charged_micro_usd bigint NOT NULL CHECK(charged_micro_usd>=0),
  created_at timestamptz NOT NULL DEFAULT now()
);
