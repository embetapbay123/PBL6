-- No optional extensions. Existing Store indexes bound management scans; this does not claim
-- an indexed full-text engine. Normalize at read time so old decomposed Unicode is searchable.
CREATE FUNCTION marketplace_search(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT translate(regexp_replace(lower(normalize(value,NFD)),U&'[\0300-\036f]','','g'),'đ','d')
$$;
