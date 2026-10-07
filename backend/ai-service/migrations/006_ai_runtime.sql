ALTER TABLE model_version ADD COLUMN artifact_json jsonb;
ALTER TABLE model_version ADD COLUMN dataset_revision bigint;
ALTER TABLE model_version ADD COLUMN config_json jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE model_evaluation ADD COLUMN raw_result jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE model_evaluation ADD COLUMN scope_store_id uuid;
CREATE TABLE product_document (
  product_id uuid PRIMARY KEY, store_id uuid NOT NULL, source_version integer NOT NULL,
  payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE chat_session ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE chat_message ADD COLUMN response_meta jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE ai_usage_budget (
  scope_hash text NOT NULL, day date NOT NULL, requests integer NOT NULL, tokens integer NOT NULL,
  PRIMARY KEY(scope_hash,day)
);
CREATE TABLE ai_request_trace (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation text NOT NULL,
  store_ids jsonb NOT NULL, latency_ms integer NOT NULL CHECK(latency_ms>=0),
  fallback boolean NOT NULL, provider text NOT NULL, prompt_version text NOT NULL,
  index_version text NOT NULL, estimated_tokens integer NOT NULL,
  actual_tokens integer, cost_usd numeric, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_trace_recent ON ai_request_trace(created_at);
CREATE INDEX ai_evaluation_scope ON model_evaluation(scope_store_id,evaluated_at DESC);
