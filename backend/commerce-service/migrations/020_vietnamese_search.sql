-- No optional extensions. Existing Store indexes bound management scans; this does not claim
-- an indexed full-text engine. Normalize at read time so old decomposed Unicode is searchable.
CREATE FUNCTION marketplace_search(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT translate(regexp_replace(lower(normalize(value,NFD)),U&'[\0300-\036f]','','g'),'đ','d')
$$;

-- Correlated snapshot and refund filters first narrow by the owned order, never current catalog.
CREATE INDEX order_item_search_order ON order_item(order_id,id);
CREATE INDEX refund_order_search_time ON refund(order_id,created_at DESC,id DESC);
