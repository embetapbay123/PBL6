-- Acknowledged inventory identity at dispatch, distinct from the original order items.
ALTER TABLE order_return_request ADD COLUMN exchange_dispatch_snapshot jsonb;
ALTER TABLE order_return_request ADD CONSTRAINT return_exchange_snapshot_object CHECK(exchange_dispatch_snapshot IS NULL OR jsonb_typeof(exchange_dispatch_snapshot)='object');
CREATE FUNCTION preserve_exchange_dispatch_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.exchange_dispatch_snapshot IS NOT NULL AND NEW.exchange_dispatch_snapshot IS DISTINCT FROM OLD.exchange_dispatch_snapshot THEN
  RAISE EXCEPTION 'Acknowledged exchange snapshot is immutable';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER return_exchange_snapshot_immutable BEFORE UPDATE ON order_return_request FOR EACH ROW EXECUTE FUNCTION preserve_exchange_dispatch_snapshot();
