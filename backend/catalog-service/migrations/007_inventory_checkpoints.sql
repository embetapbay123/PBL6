-- Additive reader-first migration. Legacy movements deliberately keep NULL checkpoints:
-- their original balances cannot be inferred reliably from current inventory.
ALTER TABLE stock_movement ADD COLUMN quantity_before integer;
ALTER TABLE stock_movement ADD COLUMN quantity_after integer;
ALTER TABLE stock_movement ADD COLUMN reserved_before integer;
ALTER TABLE stock_movement ADD COLUMN reserved_after integer;
ALTER TABLE stock_movement ADD COLUMN inventory_version integer;
ALTER TABLE stock_movement ADD CONSTRAINT stock_movement_checkpoint_complete CHECK (
  (quantity_before IS NULL AND quantity_after IS NULL AND reserved_before IS NULL AND reserved_after IS NULL AND inventory_version IS NULL)
  OR (quantity_before IS NOT NULL AND quantity_after IS NOT NULL AND reserved_before IS NOT NULL AND reserved_after IS NOT NULL AND inventory_version IS NOT NULL
    AND quantity_after-quantity_before=delta_quantity AND reserved_after-reserved_before=delta_reserved
    AND quantity_before>=reserved_before AND reserved_before>=0
    AND quantity_after>=reserved_after AND reserved_after>=0 AND inventory_version>=0)
);
