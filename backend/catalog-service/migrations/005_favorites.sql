CREATE TABLE customer_favorite (
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
CREATE INDEX customer_favorite_recent ON customer_favorite(user_id, created_at DESC, product_id);
