-- GENERATED schema foundation from ERD + data dictionary; review migrations before evolving.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE "chat_session" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "anonymous_key" varchar,
  "status" varchar NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE "chat_message" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "session_id" uuid NOT NULL,
  "role" varchar NOT NULL,
  "content" text NOT NULL,
  "product_refs" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE "search_history" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "query" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE "recommendation_interaction" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "event_id" varchar NOT NULL,
  "event_type" varchar NOT NULL,
  "weight" integer NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "personalization_consent" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "status" varchar NOT NULL,
  "source" varchar NOT NULL,
  "changed_at" timestamptz NOT NULL,
  "version" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("id")
);
CREATE TABLE "user_preference" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "profile_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "product_embedding" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "product_id" uuid NOT NULL,
  "source_version" integer NOT NULL,
  "vector" vector(1536) NOT NULL,
  "status" varchar NOT NULL,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "model_version" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "algorithm" varchar NOT NULL,
  "version" varchar NOT NULL DEFAULT 0,
  "artifact_uri" varchar NOT NULL,
  "status" varchar NOT NULL,
  "trained_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "training_run" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "model_version_id" uuid NOT NULL,
  "dataset_version" varchar NOT NULL,
  "split_spec" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" varchar NOT NULL,
  "started_at" timestamptz NOT NULL,
  "finished_at" timestamptz,
  PRIMARY KEY ("id")
);
CREATE TABLE "model_evaluation" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "training_run_id" uuid NOT NULL,
  "baseline_name" varchar NOT NULL,
  "k" integer NOT NULL,
  "precision_at_k" numeric NOT NULL,
  "recall_at_k" numeric NOT NULL,
  "ndcg_at_k" numeric NOT NULL,
  "evaluated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);
ALTER TABLE "chat_message" ADD FOREIGN KEY ("session_id") REFERENCES "chat_session"(id);
ALTER TABLE "training_run" ADD FOREIGN KEY ("model_version_id") REFERENCES "model_version"(id);
ALTER TABLE "model_evaluation" ADD FOREIGN KEY ("training_run_id") REFERENCES "training_run"(id);
CREATE UNIQUE INDEX consent_user_unique ON personalization_consent(user_id);
CREATE TABLE outbox(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_type text NOT NULL, payload jsonb NOT NULL, correlation_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts int NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE inbox(producer text NOT NULL, event_id uuid NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(producer,event_id));
CREATE TABLE operation_result(caller text NOT NULL, operation_id uuid NOT NULL, fingerprint text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(caller,operation_id));
CREATE INDEX outbox_pending ON outbox(next_attempt_at) WHERE published_at IS NULL;
CREATE TABLE bootstrap_effect(event_id uuid PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
