ALTER TABLE "order" DROP CONSTRAINT order_shipping_mode_check;
ALTER TABLE "order" ADD CHECK(shipping_mode IN ('LEGACY_MANUAL','GHN','PLATFORM'));
ALTER TABLE shipping_pickup_location ADD COLUMN provider varchar NOT NULL DEFAULT 'GHN' CHECK(provider IN ('GHN','PLATFORM'));
ALTER TABLE shipping_pickup_location ALTER COLUMN shop_id DROP NOT NULL;
ALTER TABLE shipping_shipment DROP CONSTRAINT shipping_shipment_provider_check;
ALTER TABLE shipping_shipment ADD CHECK(provider IN ('GHN','EXTERNAL','PLATFORM'));
ALTER TABLE shipping_shipment ADD COLUMN courier_name varchar(200), ADD COLUMN delivery_note varchar(1000);
CREATE OR REPLACE FUNCTION set_order_shipping_mode() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE carrier varchar;
BEGIN
  SELECT provider INTO carrier FROM shipping_pickup_location WHERE store_id=NEW.store_id AND enabled;
  IF carrier IS NOT NULL THEN NEW.shipping_mode := carrier; END IF;
  RETURN NEW;
END $$;
