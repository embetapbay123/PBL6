ALTER TABLE shipment ADD COLUMN carrier_name varchar(120);
ALTER TABLE shipment ADD COLUMN dispatch_note varchar(500);
ALTER TABLE shipment ADD COLUMN delivery_note varchar(500);
ALTER TABLE shipment ADD COLUMN dispatched_by uuid;
ALTER TABLE shipment ADD COLUMN delivered_by uuid;
ALTER TABLE shipment ADD COLUMN source varchar(20) NOT NULL DEFAULT 'LEGACY' CHECK(source IN ('MANUAL','LEGACY'));
CREATE INDEX order_customer_status_created ON "order"(customer_user_id,status,created_at DESC,id);
CREATE INDEX order_store_status_created ON "order"(store_id,status,created_at DESC,id);
