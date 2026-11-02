CREATE TABLE store_conversation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id uuid NOT NULL REFERENCES "user"(id),
  store_id uuid NOT NULL REFERENCES store(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_user_id, store_id)
);
CREATE INDEX store_conversation_customer_recent ON store_conversation(customer_user_id, updated_at DESC, id);
CREATE INDEX store_conversation_store_recent ON store_conversation(store_id, updated_at DESC, id);
CREATE TABLE store_message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES store_conversation(id),
  sender_user_id uuid NOT NULL REFERENCES "user"(id),
  sender_side varchar NOT NULL CHECK(sender_side IN ('CUSTOMER','STORE')),
  client_message_id uuid NOT NULL,
  content varchar(2000) NOT NULL CHECK(length(trim(content))>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, sender_side, client_message_id)
);
CREATE INDEX store_message_history ON store_message(conversation_id, created_at DESC, id DESC);
