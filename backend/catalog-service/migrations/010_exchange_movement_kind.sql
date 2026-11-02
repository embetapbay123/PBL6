-- A return receipt may receive and later dispatch the same variant. Each effect remains unique.
DROP INDEX stock_movement_receipt_inventory;
CREATE UNIQUE INDEX stock_movement_receipt_inventory
  ON stock_movement(receipt_id,inventory_id,reason) WHERE receipt_id IS NOT NULL;
