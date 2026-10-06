-- Logical M1 reference needed to resolve a trusted Product/Store before Cart/checkout.
-- Existing items remain nullable and must be removed/re-added if no mapping is known.
ALTER TABLE cart_item ADD COLUMN product_id uuid;
