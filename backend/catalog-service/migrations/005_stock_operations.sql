-- Receipt metadata is separate from the immutable server booking timestamp.
ALTER TABLE stock_movement ADD COLUMN movement_kind varchar(20) CHECK(movement_kind IN ('RECEIPT','CORRECTION'));
ALTER TABLE stock_movement ADD COLUMN received_at timestamptz;
ALTER TABLE stock_movement ADD COLUMN supplier_name varchar(200);
ALTER TABLE stock_movement ADD COLUMN source_reference varchar(200);
ALTER TABLE stock_movement ADD COLUMN requested_by uuid;
CREATE TABLE stock_adjustment_request (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL,
 variant_id uuid NOT NULL REFERENCES product_variant(id), requested_by uuid NOT NULL,
 adjustment_kind varchar(20) NOT NULL DEFAULT 'CORRECTION' CHECK(adjustment_kind IN ('RECEIPT','CORRECTION')),
 delta_quantity integer NOT NULL CHECK(delta_quantity<>0), reason varchar(200) NOT NULL,
 received_at timestamptz, supplier_name varchar(200), source_reference varchar(200),
 expected_inventory_version integer NOT NULL CHECK(expected_inventory_version>=0),
 status varchar(20) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
 version integer NOT NULL DEFAULT 0 CHECK(version>=0), created_at timestamptz NOT NULL DEFAULT now(),
 decided_by uuid, decided_at timestamptz, decision_reason varchar(200)
);
CREATE INDEX stock_request_store_pending ON stock_adjustment_request(store_id,status,created_at DESC,id);
