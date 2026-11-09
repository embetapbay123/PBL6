ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "sold_count" integer NOT NULL DEFAULT 0;

UPDATE "product" p
SET "sold_count" = sub.total_sold
FROM (
  SELECT pv.product_id, GREATEST(0, COALESCE(SUM(
    CASE 
      WHEN sm.reason = 'CONSUME' THEN -sm.delta_quantity
      WHEN sm.reason = 'RESTOCK' THEN -sm.delta_quantity
      ELSE 0
    END
  ), 0))::int AS total_sold
  FROM stock_movement sm
  JOIN inventory i ON i.id = sm.inventory_id
  JOIN product_variant pv ON pv.id = i.variant_id
  WHERE sm.reason IN ('CONSUME', 'RESTOCK')
  GROUP BY pv.product_id
) sub
WHERE p.id = sub.product_id;
