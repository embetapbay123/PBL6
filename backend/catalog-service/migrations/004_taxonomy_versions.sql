-- Optimistic concurrency for admin taxonomy edits.
ALTER TABLE category ADD COLUMN version integer NOT NULL DEFAULT 0 CHECK (version >= 0);
ALTER TABLE product_type ADD COLUMN version integer NOT NULL DEFAULT 0 CHECK (version >= 0);
ALTER TABLE attribute_definition ADD COLUMN version integer NOT NULL DEFAULT 0 CHECK (version >= 0);
