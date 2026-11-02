-- Store association is derived only from immutable owned entity relationships.
ALTER TABLE m1_audit ADD COLUMN store_id uuid;
UPDATE m1_audit a SET store_id=t.store_id FROM product t WHERE a.target_type='Product' AND a.target_id=t.id;
UPDATE m1_audit a SET store_id=t.store_id FROM inventory t WHERE a.target_type='Inventory' AND a.target_id=t.id;
UPDATE m1_audit a SET store_id=t.store_id FROM product_variant t WHERE a.target_type='Variant' AND a.target_id=t.id;
CREATE INDEX m1_audit_store_time ON m1_audit(store_id,created_at DESC,id);
