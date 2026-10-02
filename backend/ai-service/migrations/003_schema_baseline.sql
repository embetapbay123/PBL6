-- Schema baseline 2.2 frozen 2026-10-02. Additive; do not rewrite applied migrations.
CREATE UNIQUE INDEX interaction_event_unique ON recommendation_interaction(event_id);
CREATE UNIQUE INDEX preference_user_unique ON user_preference(user_id);
CREATE UNIQUE INDEX embedding_product_unique ON product_embedding(product_id);
CREATE UNIQUE INDEX model_algorithm_version_unique ON model_version(algorithm,version);
CREATE INDEX chat_user_created ON chat_session(user_id,created_at DESC,id);
CREATE INDEX message_session_created ON chat_message(session_id,created_at,id);
CREATE INDEX search_user_created ON search_history(user_id,created_at DESC);
CREATE INDEX interaction_user_time ON recommendation_interaction(user_id,occurred_at DESC);
ALTER TABLE "chat_session" ADD CONSTRAINT chat_session_baseline_check CHECK ((user_id IS NOT NULL AND anonymous_key IS NULL) OR (user_id IS NULL AND anonymous_key IS NOT NULL));
ALTER TABLE "personalization_consent" ADD CONSTRAINT personalization_consent_baseline_check CHECK (version>=0);
ALTER TABLE "recommendation_interaction" ADD CONSTRAINT recommendation_interaction_baseline_check CHECK (weight>0);
ALTER TABLE "product_embedding" ADD CONSTRAINT product_embedding_baseline_check CHECK (source_version>=0);
ALTER TABLE "model_evaluation" ADD CONSTRAINT model_evaluation_baseline_check CHECK (k>0 AND precision_at_k BETWEEN 0 AND 1 AND recall_at_k BETWEEN 0 AND 1 AND ndcg_at_k BETWEEN 0 AND 1);
ALTER TABLE "training_run" ADD CONSTRAINT training_run_baseline_check CHECK (finished_at IS NULL OR finished_at>=started_at);
