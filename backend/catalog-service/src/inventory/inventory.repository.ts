// Use only this service database; parameterize queries and pass transaction managers explicitly.
import { OwnedRepository } from '../../../shared/src/repository';

/** Read-only facts QuoteVariants needs for one snapshot. No lock, no write, no reservation. */
export interface QuoteVariantRow {
  variant_id: string;
  product_id: string;
  store_id: string;
  price_vnd: string;
  variant_status: string;
  product_status: string;
  moderation_status: string;
  available_quantity: number;
  version: number;
}

/** A stock row addressed by Store, used by the adjust path under `FOR UPDATE`. */
export interface InventoryRecord {
  id: string;
  variant_id: string;
  store_id: string;
  quantity: number;
  reserved_quantity: number;
  version: number;
}

export interface InventoryBalanceRow {
  variant_id: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  version: number;
}

export interface StockMovementRow {
  id: string;
  variant_id: string;
  order_id: string | null;
  delta_quantity: number;
  reason: string;
  occurred_at: Date | string;
}

export interface LowStockRow {
  variant_id: string;
  available_quantity: number;
}

export class InventoryRepository extends OwnedRepository {
  /**
   * Current Product/Variant/Store facts plus available stock (`quantity - reserved_quantity`).
   * `inventory_variant_unique` keeps one row per Variant, so the join cannot fan out.
   * A missing inventory row still returns the Variant with zero availability instead of
   * dropping it, so the caller gets an explicit business error rather than a silent omission.
   */
  async variantsForQuote(variantIds: string[]): Promise<QuoteVariantRow[]> {
    return this.manager.query(
      `SELECT v.id AS variant_id, v.product_id, v.store_id, v.price_vnd,
              v.status AS variant_status, p.status AS product_status, p.moderation_status,
              greatest(coalesce(i.quantity,0) - coalesce(i.reserved_quantity,0), 0) AS available_quantity,
              coalesce(i.version,0) AS version
         FROM product_variant v
         JOIN product p ON p.id = v.product_id
         LEFT JOIN inventory i ON i.variant_id = v.id AND i.store_id = v.store_id
        WHERE v.id = ANY($1::uuid[])`,
      [variantIds]);
  }

  /* ------------------------------ INV-01: store inventory read, adjust, movements */

  async pageInventory(storeId: string, page: number, size: number): Promise<{ items: InventoryBalanceRow[]; total: number }> {
    const [count] = await this.manager.query('SELECT count(*)::int AS total FROM inventory WHERE store_id=$1', [storeId]);
    const items = await this.manager.query(
      `SELECT variant_id, quantity, reserved_quantity,
              greatest(quantity-reserved_quantity,0) AS available_quantity, version
         FROM inventory WHERE store_id=$1 ORDER BY variant_id LIMIT $2 OFFSET $3`,
      [storeId, size, (page - 1) * size]);
    return { items, total: count.total };
  }

  /**
   * The Store is part of the predicate, so a Variant owned by another Store can never be
   * locked or adjusted: cross-Store access fails as "not found" instead of writing blindly.
   */
  async lockStoreInventory(storeId: string, variantId: string): Promise<InventoryRecord | undefined> {
    const [row] = await this.manager.query(
      `SELECT id, variant_id, store_id, quantity, reserved_quantity, version
         FROM inventory WHERE store_id=$1 AND variant_id=$2 FOR UPDATE`,
      [storeId, variantId]);
    return row;
  }

  async setQuantity(inventoryId: string, quantity: number): Promise<void> {
    await this.manager.query('UPDATE inventory SET quantity=$2, version=version+1 WHERE id=$1', [inventoryId, quantity]);
  }

  async pageMovements(storeId: string, page: number, size: number): Promise<{ items: StockMovementRow[]; total: number }> {
    const [count] = await this.manager.query(
      `SELECT count(*)::int AS total FROM stock_movement m
         JOIN inventory i ON i.id=m.inventory_id WHERE i.store_id=$1`, [storeId]);
    const items = await this.manager.query(
      `SELECT m.id, i.variant_id, m.order_id, m.delta_quantity, m.reason, m.created_at AS occurred_at
         FROM stock_movement m JOIN inventory i ON i.id=m.inventory_id
        WHERE i.store_id=$1 ORDER BY m.created_at DESC, m.id LIMIT $2 OFFSET $3`,
      [storeId, size, (page - 1) * size]);
    return { items, total: count.total };
  }

  /** Available stock at or below the threshold. A dependency failure must surface as 503, never as an empty page. */
  async pageLowStock(storeId: string, threshold: number, page: number, size: number): Promise<{ items: LowStockRow[]; total: number }> {
    const [count] = await this.manager.query(
      `SELECT count(*)::int AS total FROM inventory
        WHERE store_id=$1 AND greatest(quantity-reserved_quantity,0) <= $2`, [storeId, threshold]);
    const items = await this.manager.query(
      `SELECT variant_id, greatest(quantity-reserved_quantity,0) AS available_quantity
         FROM inventory WHERE store_id=$1 AND greatest(quantity-reserved_quantity,0) <= $2
        ORDER BY available_quantity, variant_id LIMIT $3 OFFSET $4`,
      [storeId, threshold, size, (page - 1) * size]);
    return { items, total: count.total };
  }

  /** Audit trail of a manual adjustment. `order_id`/`reservation_item_id` stay null: no Order is involved. */
  async insertStockMovement(input: { inventoryId: string; operationId: string; deltaQuantity: number;
    reason: string; actorUserId: string }): Promise<void> {
    await this.manager.query(
      `INSERT INTO stock_movement(inventory_id,reservation_item_id,order_id,operation_id,
                                  delta_quantity,delta_reserved,reason,actor_user_id)
       VALUES($1,NULL,NULL,$2,$3,0,$4,$5)`,
      [input.inventoryId, input.operationId, input.deltaQuantity, input.reason, input.actorUserId]);
  }
}
