-- Preserve the explicitly selected provider mode separately from prompt/model versions.
ALTER TABLE ai_request_trace ADD COLUMN thinking_mode varchar(12);
ALTER TABLE ai_request_trace ADD CONSTRAINT ai_trace_thinking_mode_check
  CHECK (thinking_mode IS NULL OR thinking_mode IN ('auto','enabled','disabled'));
