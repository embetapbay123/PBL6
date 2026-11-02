-- No backfill from today's catalogue: null explicitly means historical identity unavailable.
ALTER TABLE inventory_exchange_dispatch ADD COLUMN dispatch_snapshot jsonb;
ALTER TABLE inventory_exchange_dispatch ADD CONSTRAINT exchange_dispatch_snapshot_object CHECK(dispatch_snapshot IS NULL OR jsonb_typeof(dispatch_snapshot)='object');
CREATE FUNCTION reject_exchange_dispatch_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Exchange dispatch receipt is immutable';END $$;
CREATE TRIGGER exchange_dispatch_immutable BEFORE UPDATE OR DELETE ON inventory_exchange_dispatch FOR EACH ROW EXECUTE FUNCTION reject_exchange_dispatch_mutation();
