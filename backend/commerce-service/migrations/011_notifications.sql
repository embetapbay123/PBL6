CREATE TABLE customer_notification_read (
  customer_user_id uuid NOT NULL,
  kind varchar NOT NULL CHECK(kind IN ('ORDER_STATUS','PAYMENT_EVENT')),
  event_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(customer_user_id,kind,event_id)
);
