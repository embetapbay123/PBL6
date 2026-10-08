CREATE TABLE consent_audit (
  user_id uuid NOT NULL, version integer NOT NULL, previous_status text,
  status text NOT NULL, source text NOT NULL, changed_at timestamptz NOT NULL,
  PRIMARY KEY(user_id,version)
);
