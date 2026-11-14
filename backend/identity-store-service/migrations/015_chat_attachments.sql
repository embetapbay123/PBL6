-- Private chat files have their own ownership, storage and lifetime; no try-on assets.
CREATE TABLE chat_attachment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES store_conversation(id),
  owner_user_id uuid NOT NULL REFERENCES "user"(id),
  client_upload_id uuid NOT NULL,
  kind varchar NOT NULL CHECK (kind IN ('IMAGE','VIDEO')),
  expected_bytes integer NOT NULL CHECK (expected_bytes > 0 AND expected_bytes <= 20971520),
  input_sha256 varchar(64) NOT NULL CHECK (input_sha256 ~ '^[a-f0-9]{64}$'),
  ip_hash varchar(64) NOT NULL,
  status varchar NOT NULL DEFAULT 'UPLOADING' CHECK (status IN ('UPLOADING','PROCESSING','READY','REJECTED','DELETED','EXPIRED')),
  stored_bytes integer NOT NULL DEFAULT 0 CHECK (stored_bytes >= 0),
  content_type varchar,
  file_key varchar UNIQUE,
  preview_key varchar UNIQUE,
  width integer,
  height integer,
  duration_ms integer,
  error_code varchar,
  lease_token uuid,
  lease_until timestamptz,
  message_id uuid REFERENCES store_message(id),
  version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT now()+interval '24 hours',
  UNIQUE (owner_user_id,client_upload_id),
  CHECK (kind <> 'IMAGE' OR expected_bytes <= 5242880),
  CHECK (status <> 'READY' OR (stored_bytes > 0 AND width > 0 AND height > 0 AND content_type IS NOT NULL AND file_key IS NOT NULL)),
  CHECK (message_id IS NULL OR status IN ('READY','DELETED'))
);
CREATE INDEX chat_attachment_conversation ON chat_attachment(conversation_id,message_id);
CREATE INDEX chat_attachment_owner_quota ON chat_attachment(owner_user_id,created_at);
CREATE INDEX chat_attachment_ip_quota ON chat_attachment(ip_hash,created_at);
CREATE INDEX chat_attachment_work ON chat_attachment(status,lease_until,created_at);

ALTER TABLE store_message ADD COLUMN attachment_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE store_message DROP CONSTRAINT store_message_content_check;
ALTER TABLE store_message ADD CONSTRAINT store_message_content_or_attachment
  CHECK (length(trim(content))>0 OR cardinality(attachment_ids)>0);
ALTER TABLE store_message ADD CONSTRAINT store_message_attachment_limit CHECK (cardinality(attachment_ids)<=3);
