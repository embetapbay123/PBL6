-- Private Store configuration. No fabricated address/backfill for existing Stores.
ALTER TABLE store ADD COLUMN return_address jsonb;
ALTER TABLE store ADD CONSTRAINT store_return_address_object CHECK(return_address IS NULL OR jsonb_typeof(return_address)='object');
