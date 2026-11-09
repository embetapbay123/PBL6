ALTER TABLE inventory_return_receipt ADD COLUMN kind varchar NOT NULL DEFAULT 'ORIGINAL' CHECK(kind IN ('ORIGINAL','EXCHANGE'));
CREATE TABLE inventory_exchange_return (
  receipt_id uuid PRIMARY KEY REFERENCES inventory_return_receipt(id),
  dispatch_receipt_id uuid NOT NULL UNIQUE REFERENCES inventory_exchange_dispatch(receipt_id)
);
