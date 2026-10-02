-- Schema baseline 2.2 frozen 2026-10-02. Additive; do not rewrite applied migrations.
CREATE UNIQUE INDEX category_slug_unique ON category(slug);
CREATE UNIQUE INDEX attribute_type_code_unique ON attribute_definition(product_type_id,code);
CREATE UNIQUE INDEX variant_default_unique ON product_variant(product_id) WHERE is_default;
CREATE UNIQUE INDEX reservation_order_unique ON inventory_reservation(order_id);
CREATE UNIQUE INDEX reservation_inventory_unique ON reservation_item(reservation_id,inventory_id);
ALTER TABLE product_variant ADD CONSTRAINT variant_product_store_unique UNIQUE(id,product_id,store_id);
ALTER TABLE product ADD CONSTRAINT product_id_store_unique UNIQUE(id,store_id);
ALTER TABLE product_variant ADD CONSTRAINT variant_store_matches_product FOREIGN KEY(product_id,store_id) REFERENCES product(id,store_id);
ALTER TABLE product_variant ADD CONSTRAINT variant_id_store_unique UNIQUE(id,store_id);
ALTER TABLE inventory ADD CONSTRAINT inventory_store_matches_variant FOREIGN KEY(variant_id,store_id) REFERENCES product_variant(id,store_id);
ALTER TABLE "product" ADD CONSTRAINT product_baseline_check CHECK (version>=0);
ALTER TABLE "product_image" ADD CONSTRAINT product_image_baseline_check CHECK (position>=0);
ALTER TABLE "reservation_item" ADD CONSTRAINT reservation_item_baseline_check CHECK (quantity>0);
ALTER TABLE "inventory" ADD CONSTRAINT inventory_baseline_check CHECK (version>=0);
ALTER TABLE "review" ADD CONSTRAINT review_baseline_check CHECK (version>=0);
