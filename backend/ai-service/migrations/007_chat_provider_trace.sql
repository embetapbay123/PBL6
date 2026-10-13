-- Append-only provider evidence. No prompt, token, user identifier or provider payload.
ALTER TABLE ai_request_trace ADD COLUMN model_name text;
ALTER TABLE ai_request_trace ADD COLUMN fallback_reason text;
