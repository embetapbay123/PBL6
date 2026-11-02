CREATE TABLE order_return_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES "order"(id),
  type varchar NOT NULL CHECK(type IN ('REFUND','EXCHANGE')),
  reason varchar(2000) NOT NULL CHECK(length(trim(reason))>0),
  status varchar NOT NULL DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED','APPROVED','REJECTED','RECEIVED','EXCHANGE_SENT','COMPLETED')),
  decision_note varchar(2000),
  replacement_reference varchar(200),
  version integer NOT NULL DEFAULT 0 CHECK(version>=0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE return_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES order_return_request(id),
  from_status varchar,
  to_status varchar NOT NULL,
  actor_user_id uuid NOT NULL,
  reason varchar(2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX return_request_recent ON order_return_request(updated_at DESC,id);
CREATE INDEX return_history_request ON return_status_history(request_id,created_at,id);
ALTER TABLE customer_notification_read DROP CONSTRAINT customer_notification_read_kind_check;
ALTER TABLE customer_notification_read ADD CONSTRAINT customer_notification_read_kind_check CHECK(kind IN ('ORDER_STATUS','PAYMENT_EVENT','RETURN_STATUS'));
