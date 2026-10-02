-- GENERATED schema foundation from ERD + data dictionary; review migrations before evolving.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE "cart" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "customer_user_id" uuid NOT NULL,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "cart_item" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "cart_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "quantity" integer NOT NULL,
  "added_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "idempotency_record" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "customer_user_id" uuid NOT NULL,
  "key" varchar NOT NULL,
  "payload_hash" varchar NOT NULL,
  "purchase_group_id" uuid NOT NULL,
  "response_json" jsonb DEFAULT '{}'::jsonb,
  "expires_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "order" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "purchase_group_id" uuid NOT NULL,
  "customer_user_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "address_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" varchar NOT NULL,
  "payment_method" varchar NOT NULL,
  "payment_expires_at" timestamptz,
  "goods_vnd" bigint NOT NULL,
  "store_discount_vnd" bigint NOT NULL,
  "platform_discount_vnd" bigint NOT NULL,
  "shipping_vnd" bigint NOT NULL,
  "payable_vnd" bigint NOT NULL,
  "version" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE "order_item" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "order_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "product_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "sku_snapshot" varchar NOT NULL,
  "unit_price_vnd" bigint NOT NULL,
  "quantity" integer NOT NULL,
  "line_total_vnd" bigint NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "order_status_history" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "order_id" uuid NOT NULL,
  "from_status" varchar,
  "to_status" varchar NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "reason" text,
  "operation_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE "shipment" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "order_id" uuid NOT NULL,
  "status" varchar NOT NULL,
  "tracking_code" varchar,
  "shipped_at" timestamptz,
  "delivered_at" timestamptz,
  PRIMARY KEY ("id")
);
CREATE TABLE "payment" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "order_id" uuid NOT NULL,
  "method" varchar NOT NULL,
  "status" varchar NOT NULL,
  "payable_vnd" bigint NOT NULL,
  "collectible_vnd" bigint NOT NULL,
  "collected_vnd" bigint NOT NULL DEFAULT 0,
  "refunded_vnd" bigint NOT NULL DEFAULT 0,
  "version" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("id")
);
CREATE TABLE "payment_attempt" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "payment_id" uuid NOT NULL,
  "provider_reference" varchar NOT NULL,
  "status" varchar NOT NULL,
  "amount_vnd" bigint NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE "payment_event" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "attempt_id" uuid NOT NULL,
  "provider_event_id" varchar NOT NULL,
  "event_type" varchar NOT NULL,
  "payload_hash" varchar NOT NULL,
  "received_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE "refund" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "payment_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "amount_vnd" bigint NOT NULL,
  "status" varchar NOT NULL,
  "operation_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE "c_o_d_collection" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "order_id" uuid NOT NULL,
  "amount_due_vnd" bigint NOT NULL,
  "amount_collected_vnd" bigint NOT NULL,
  "status" varchar NOT NULL,
  "operation_id" uuid NOT NULL,
  "collected_at" timestamptz,
  PRIMARY KEY ("id")
);
CREATE TABLE "voucher" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "code" varchar NOT NULL,
  "scope" varchar NOT NULL,
  "store_id" uuid,
  "owner_user_id" uuid NOT NULL,
  "discount_type" varchar NOT NULL,
  "discount_value" bigint NOT NULL,
  "max_discount_vnd" bigint,
  "min_goods_vnd" bigint NOT NULL,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz NOT NULL,
  "usage_limit" integer NOT NULL,
  "per_customer_limit" integer NOT NULL,
  "status" varchar NOT NULL,
  "version" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("id")
);
CREATE TABLE "voucher_reservation" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "voucher_id" uuid NOT NULL,
  "purchase_group_id" uuid NOT NULL,
  "customer_user_id" uuid NOT NULL,
  "store_id" uuid,
  "status" varchar NOT NULL,
  "discount_vnd" bigint NOT NULL,
  "expires_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE "voucher_redemption" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "voucher_id" uuid NOT NULL,
  "purchase_group_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "customer_user_id" uuid NOT NULL,
  "discount_vnd" bigint NOT NULL,
  "redeemed_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE "m2_audit" (
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
ALTER TABLE "cart_item" ADD FOREIGN KEY ("cart_id") REFERENCES "cart"(id);
ALTER TABLE "order_item" ADD FOREIGN KEY ("order_id") REFERENCES "order"(id);
ALTER TABLE "order_status_history" ADD FOREIGN KEY ("order_id") REFERENCES "order"(id);
ALTER TABLE "shipment" ADD FOREIGN KEY ("order_id") REFERENCES "order"(id);
ALTER TABLE "payment" ADD FOREIGN KEY ("order_id") REFERENCES "order"(id);
ALTER TABLE "payment_attempt" ADD FOREIGN KEY ("payment_id") REFERENCES "payment"(id);
ALTER TABLE "payment_event" ADD FOREIGN KEY ("attempt_id") REFERENCES "payment_attempt"(id);
ALTER TABLE "refund" ADD FOREIGN KEY ("payment_id") REFERENCES "payment"(id);
ALTER TABLE "refund" ADD FOREIGN KEY ("order_id") REFERENCES "order"(id);
ALTER TABLE "c_o_d_collection" ADD FOREIGN KEY ("order_id") REFERENCES "order"(id);
ALTER TABLE "voucher_reservation" ADD FOREIGN KEY ("voucher_id") REFERENCES "voucher"(id);
ALTER TABLE "voucher_redemption" ADD FOREIGN KEY ("voucher_id") REFERENCES "voucher"(id);
ALTER TABLE "voucher_redemption" ADD FOREIGN KEY ("order_id") REFERENCES "order"(id);
CREATE UNIQUE INDEX order_group_store_unique ON "order"(purchase_group_id,store_id);
CREATE UNIQUE INDEX payment_order_unique ON payment(order_id);
CREATE UNIQUE INDEX attempt_success_unique ON payment_attempt(payment_id) WHERE status='SUCCEEDED';
CREATE UNIQUE INDEX provider_reference_unique ON payment_attempt(provider_reference);
CREATE UNIQUE INDEX provider_event_unique ON payment_event(provider_event_id);
CREATE UNIQUE INDEX refund_operation_unique ON refund(operation_id);
CREATE UNIQUE INDEX cart_user_unique ON cart(customer_user_id);
CREATE INDEX order_customer_status ON "order"(customer_user_id,status);
CREATE TABLE outbox(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_type text NOT NULL, payload jsonb NOT NULL, correlation_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts int NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE inbox(producer text NOT NULL, event_id uuid NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(producer,event_id));
CREATE TABLE operation_result(caller text NOT NULL, operation_id uuid NOT NULL, fingerprint text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(caller,operation_id));
CREATE INDEX outbox_pending ON outbox(next_attempt_at) WHERE published_at IS NULL;
CREATE TABLE bootstrap_effect(event_id uuid PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
