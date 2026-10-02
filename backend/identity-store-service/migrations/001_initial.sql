-- GENERATED schema foundation from ERD + data dictionary; review migrations before evolving.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE "user" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "email" varchar NOT NULL,
  "email_verified_at" timestamptz,
  "password_hash" varchar NOT NULL,
  "status" varchar NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "version" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("id")
);
CREATE TABLE "customer_profile" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "display_name" varchar NOT NULL,
  "phone" varchar,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "address" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "customer_user_id" uuid NOT NULL,
  "recipient_name" varchar NOT NULL,
  "phone" varchar NOT NULL,
  "line1" varchar NOT NULL,
  "ward" varchar NOT NULL,
  "district" varchar NOT NULL,
  "city" varchar NOT NULL,
  "is_default" boolean NOT NULL,
  "status" varchar NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "role" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "code" varchar NOT NULL,
  "scope" varchar NOT NULL,
  "status" varchar NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "permission" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "code" varchar NOT NULL,
  "resource" varchar NOT NULL,
  "action" varchar NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "role_permission" (
  "role_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  PRIMARY KEY ("role_id","permission_id")
);
CREATE TABLE "user_role" (
  "user_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "granted_at" timestamptz NOT NULL,
  PRIMARY KEY ("user_id","role_id")
);
CREATE TABLE "refresh_session" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "token_hash" varchar NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz,
  PRIMARY KEY ("id")
);
CREATE TABLE "one_time_token" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "purpose" varchar NOT NULL,
  "token_hash" varchar NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "consumed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE "m3_audit" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "actor_user_id" uuid,
  "target_type" varchar NOT NULL,
  "target_id" uuid NOT NULL,
  "action" varchar NOT NULL,
  "reason" text,
  "request_id" varchar NOT NULL,
  "before_json" jsonb DEFAULT '{}'::jsonb,
  "after_json" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE "store_application" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "applicant_user_id" uuid NOT NULL,
  "proposed_name" varchar NOT NULL,
  "contact" varchar NOT NULL,
  "status" varchar NOT NULL,
  "decision_reason" text,
  "decided_by_user_id" uuid,
  "submitted_at" timestamptz NOT NULL DEFAULT now(),
  "decided_at" timestamptz,
  "version" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("id")
);
CREATE TABLE "store" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "application_id" uuid NOT NULL,
  "name" varchar NOT NULL,
  "slug" varchar NOT NULL,
  "description" text,
  "logo_url" varchar,
  "contact" varchar NOT NULL,
  "shipping_fee_vnd" bigint NOT NULL,
  "status" varchar NOT NULL,
  "version" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("id")
);
CREATE TABLE "store_membership" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "store_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" varchar NOT NULL,
  "status" varchar NOT NULL,
  "joined_at" timestamptz NOT NULL,
  "version" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("id")
);
CREATE TABLE "staff_invitation" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "store_id" uuid NOT NULL,
  "invited_email" varchar NOT NULL,
  "invited_user_id" uuid,
  "invited_by_user_id" uuid NOT NULL,
  "status" varchar NOT NULL,
  "token_hash" varchar NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "version" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("id")
);
CREATE TABLE "membership_permission" (
  "membership_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  "granted_at" timestamptz NOT NULL,
  "version" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("membership_id","permission_id")
);
ALTER TABLE "customer_profile" ADD FOREIGN KEY ("user_id") REFERENCES "user"(id);
ALTER TABLE "address" ADD FOREIGN KEY ("customer_user_id") REFERENCES "user"(id);
ALTER TABLE "role_permission" ADD FOREIGN KEY ("role_id") REFERENCES "role"(id);
ALTER TABLE "role_permission" ADD FOREIGN KEY ("permission_id") REFERENCES "permission"(id);
ALTER TABLE "user_role" ADD FOREIGN KEY ("user_id") REFERENCES "user"(id);
ALTER TABLE "user_role" ADD FOREIGN KEY ("role_id") REFERENCES "role"(id);
ALTER TABLE "refresh_session" ADD FOREIGN KEY ("user_id") REFERENCES "user"(id);
ALTER TABLE "one_time_token" ADD FOREIGN KEY ("user_id") REFERENCES "user"(id);
ALTER TABLE "m3_audit" ADD FOREIGN KEY ("actor_user_id") REFERENCES "user"(id);
ALTER TABLE "store_application" ADD FOREIGN KEY ("applicant_user_id") REFERENCES "user"(id);
ALTER TABLE "store_application" ADD FOREIGN KEY ("decided_by_user_id") REFERENCES "user"(id);
ALTER TABLE "store" ADD FOREIGN KEY ("application_id") REFERENCES "store_application"(id);
ALTER TABLE "store_membership" ADD FOREIGN KEY ("store_id") REFERENCES "store"(id);
ALTER TABLE "store_membership" ADD FOREIGN KEY ("user_id") REFERENCES "user"(id);
ALTER TABLE "staff_invitation" ADD FOREIGN KEY ("store_id") REFERENCES "store"(id);
ALTER TABLE "staff_invitation" ADD FOREIGN KEY ("invited_user_id") REFERENCES "user"(id);
ALTER TABLE "staff_invitation" ADD FOREIGN KEY ("invited_by_user_id") REFERENCES "user"(id);
ALTER TABLE "membership_permission" ADD FOREIGN KEY ("membership_id") REFERENCES "store_membership"(id);
ALTER TABLE "membership_permission" ADD FOREIGN KEY ("permission_id") REFERENCES "permission"(id);
CREATE UNIQUE INDEX user_email_unique ON "user"(lower(email));
CREATE UNIQUE INDEX profile_user_unique ON customer_profile(user_id);
CREATE UNIQUE INDEX role_code_unique ON role(code);
CREATE UNIQUE INDEX permission_code_unique ON permission(code);
CREATE UNIQUE INDEX membership_user_active ON store_membership(user_id) WHERE status='ACTIVE';
CREATE UNIQUE INDEX owner_store_active ON store_membership(store_id) WHERE status='ACTIVE' AND role='OWNER';
ALTER TABLE refresh_session ADD family_id uuid NOT NULL;
CREATE UNIQUE INDEX refresh_token_unique ON refresh_session(token_hash);
CREATE TABLE outbox(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_type text NOT NULL, payload jsonb NOT NULL, correlation_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts int NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE inbox(producer text NOT NULL, event_id uuid NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(producer,event_id));
CREATE TABLE operation_result(caller text NOT NULL, operation_id uuid NOT NULL, fingerprint text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(caller,operation_id));
CREATE INDEX outbox_pending ON outbox(next_attempt_at) WHERE published_at IS NULL;
CREATE TABLE bootstrap_effect(event_id uuid PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
