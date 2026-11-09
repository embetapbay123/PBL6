-- Shipping belongs to the platform. Missing pickup configuration must block
-- booking rather than silently granting the seller manual delivery controls.
ALTER TABLE "order" ALTER COLUMN shipping_mode SET DEFAULT 'PLATFORM';

CREATE OR REPLACE FUNCTION set_order_shipping_mode() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE carrier varchar;
BEGIN
  SELECT provider INTO carrier FROM shipping_pickup_location WHERE store_id=NEW.store_id AND enabled;
  NEW.shipping_mode := coalesce(carrier,'PLATFORM');
  RETURN NEW;
END $$;

-- Orders that have not been handed over can safely join the managed workflow.
-- Keep all recorded journeys, completed orders and after-sale cases unchanged.
UPDATE "order" o SET shipping_mode=coalesce(
    (SELECT provider FROM shipping_pickup_location p WHERE p.store_id=o.store_id AND p.enabled),'PLATFORM'),
  version=version+1
WHERE o.shipping_mode='LEGACY_MANUAL'
  AND o.status IN ('PREPARING','AWAITING_PAYMENT','RECOVERING','PENDING','CONFIRMED','PROCESSING')
  AND NOT EXISTS (SELECT 1 FROM shipment s WHERE s.order_id=o.id)
  AND NOT EXISTS (SELECT 1 FROM shipping_shipment s WHERE s.order_id=o.id)
  AND NOT EXISTS (SELECT 1 FROM delivery_return_case c WHERE c.order_id=o.id)
  AND NOT EXISTS (SELECT 1 FROM order_return_request r WHERE r.order_id=o.id);
