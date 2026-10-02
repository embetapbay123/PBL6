-- GENERATED schema foundation from ERD + data dictionary; review migrations before evolving.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE "category" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "parent_id" uuid,
  "name" varchar NOT NULL,
  "slug" varchar NOT NULL,
  "status" varchar NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "product_type" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "category_id" uuid NOT NULL,
  "name" varchar NOT NULL,
  "status" varchar NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "attribute_definition" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "product_type_id" uuid NOT NULL,
  "code" varchar NOT NULL,
  "name" varchar NOT NULL,
  "data_type" varchar NOT NULL,
  "required" boolean NOT NULL,
  "variant_factor" boolean NOT NULL,
  "allowed_values" jsonb DEFAULT '[]'::jsonb,
  "unit" varchar,
  PRIMARY KEY ("id")
);
CREATE TABLE "product" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "store_id" uuid NOT NULL,
  "product_type_id" uuid NOT NULL,
  "title" varchar NOT NULL,
  "description" text,
  "attributes_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" varchar NOT NULL,
  "moderation_status" varchar NOT NULL,
  "version" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("id")
);
CREATE TABLE "product_variant" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "product_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "sku" varchar NOT NULL,
  "price_vnd" bigint NOT NULL,
  "variant_values_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "variant_signature" varchar NOT NULL,
  "is_default" boolean NOT NULL,
  "status" varchar NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "product_image" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "product_id" uuid NOT NULL,
  "variant_id" uuid,
  "url" varchar NOT NULL,
  "position" integer NOT NULL,
  "status" varchar NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "review" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "product_id" uuid NOT NULL,
  "order_item_id" uuid NOT NULL,
  "customer_user_id" uuid NOT NULL,
  "rating" integer NOT NULL,
  "body" text,
  "status" varchar NOT NULL,
  "hidden_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  "version" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("id")
);
CREATE TABLE "review_audit" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "review_id" uuid NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "action" varchar NOT NULL,
  "reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE "m1_audit" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "actor_user_id" uuid NOT NULL,
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
CREATE TABLE "inventory" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "variant_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "quantity" integer NOT NULL,
  "reserved_quantity" integer NOT NULL DEFAULT 0,
  "version" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("id")
);
CREATE TABLE "inventory_reservation" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "order_id" uuid NOT NULL,
  "purchase_group_id" uuid NOT NULL,
  "status" varchar NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE "reservation_item" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "reservation_id" uuid NOT NULL,
  "inventory_id" uuid NOT NULL,
  "quantity" integer NOT NULL,
  "status" varchar NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "stock_movement" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "inventory_id" uuid NOT NULL,
  "reservation_item_id" uuid,
  "order_id" uuid,
  "operation_id" uuid NOT NULL,
  "delta_quantity" integer NOT NULL,
  "delta_reserved" integer NOT NULL,
  "reason" varchar NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
ALTER TABLE "category" ADD FOREIGN KEY ("parent_id") REFERENCES "category"(id);
ALTER TABLE "product_type" ADD FOREIGN KEY ("category_id") REFERENCES "category"(id);
ALTER TABLE "attribute_definition" ADD FOREIGN KEY ("product_type_id") REFERENCES "product_type"(id);
ALTER TABLE "product" ADD FOREIGN KEY ("product_type_id") REFERENCES "product_type"(id);
ALTER TABLE "product_variant" ADD FOREIGN KEY ("product_id") REFERENCES "product"(id);
ALTER TABLE "product_image" ADD FOREIGN KEY ("product_id") REFERENCES "product"(id);
ALTER TABLE "product_image" ADD FOREIGN KEY ("variant_id") REFERENCES "product_variant"(id);
ALTER TABLE "review" ADD FOREIGN KEY ("product_id") REFERENCES "product"(id);
ALTER TABLE "review_audit" ADD FOREIGN KEY ("review_id") REFERENCES "review"(id);
ALTER TABLE "inventory" ADD FOREIGN KEY ("variant_id") REFERENCES "product_variant"(id);
ALTER TABLE "reservation_item" ADD FOREIGN KEY ("reservation_id") REFERENCES "inventory_reservation"(id);
ALTER TABLE "reservation_item" ADD FOREIGN KEY ("inventory_id") REFERENCES "inventory"(id);
ALTER TABLE "stock_movement" ADD FOREIGN KEY ("inventory_id") REFERENCES "inventory"(id);
ALTER TABLE "stock_movement" ADD FOREIGN KEY ("reservation_item_id") REFERENCES "reservation_item"(id);
CREATE UNIQUE INDEX sku_store_unique ON product_variant(store_id,sku);
CREATE UNIQUE INDEX variant_signature_unique ON product_variant(product_id,variant_signature);
CREATE UNIQUE INDEX inventory_variant_unique ON inventory(variant_id);
CREATE UNIQUE INDEX review_item_unique ON review(order_item_id);
ALTER TABLE review ADD CHECK(rating BETWEEN 1 AND 5);
ALTER TABLE inventory ADD CHECK(quantity>=reserved_quantity AND reserved_quantity>=0);
ALTER TABLE product_variant ADD CHECK(price_vnd>=0);
CREATE INDEX product_public_filter ON product(store_id,status,moderation_status);
CREATE INDEX product_attribute_gin ON product USING gin(attributes_json);
CREATE TABLE outbox(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_type text NOT NULL, payload jsonb NOT NULL, correlation_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts int NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE inbox(producer text NOT NULL, event_id uuid NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(producer,event_id));
CREATE TABLE operation_result(caller text NOT NULL, operation_id uuid NOT NULL, fingerprint text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(caller,operation_id));
CREATE INDEX outbox_pending ON outbox(next_attempt_at) WHERE published_at IS NULL;
CREATE TABLE bootstrap_effect(event_id uuid PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
