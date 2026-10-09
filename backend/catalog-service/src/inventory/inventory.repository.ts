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

export interface InventoryRow {
  id: string;
  variant_id: string;
  store_id: string;
  quantity: number;
  reserved_quantity: number;
  version: number;
}

export interface ReservationRow {
  id: string;
  order_id: string;
  status: string;
  expires_at: Date | string;
}

export interface ReservationItemRow {
  id: string;
  reservation_id: string;
  inventory_id: string;
  quantity: number;
  status: string;
  variant_id: string;
  store_id: string;
}

export class InventoryRepository extends OwnedRepository {
  /* ------------------------------------------------------------- QuoteVariants */

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

  /* ------------------------------------------------ Reserve / consume / release */

  /**
   * Lock the stock rows a command is about to mutate.
   *
   * Always `ORDER BY variant_id`: every multi-SKU command takes the same locks in the same
   * order, so two concurrent reservations can never deadlock against each other. The lock is
   * transaction-scoped — the caller owns the transaction.
   */
  async lockInventoryByVariant(variantIds: string[]): Promise<InventoryRow[]> {
    return this.manager.query(
      `SELECT id, variant_id, store_id, quantity, reserved_quantity, version
         FROM inventory WHERE variant_id = ANY($1::uuid[]) ORDER BY variant_id FOR UPDATE`,
      [variantIds]);
  }

  /** Same stable ordering, used when the command starts from reservation items. */
  async lockInventoryById(inventoryIds: string[]): Promise<InventoryRow[]> {
    return this.manager.query(
      `SELECT id, variant_id, store_id, quantity, reserved_quantity, version
         FROM inventory WHERE id = ANY($1::uuid[]) ORDER BY variant_id FOR UPDATE`,
      [inventoryIds]);
  }

  async reservationByOrder(orderId: string): Promise<ReservationRow | undefined> {
    const [row] = await this.manager.query(
      'SELECT id, order_id, status, expires_at FROM inventory_reservation WHERE order_id=$1', [orderId]);
    return row;
  }

  /** `reservation_order_unique` allows exactly one reservation per Order. */
  async insertReservation(orderId: string, purchaseGroupId: string, expiresAt: string): Promise<ReservationRow> {
    const [row] = await this.manager.query(
      `INSERT INTO inventory_reservation(order_id,purchase_group_id,status,expires_at)
       VALUES($1,$2,'ACTIVE',$3) RETURNING id, order_id, status, expires_at`,
      [orderId, purchaseGroupId, expiresAt]);
    return row;
  }

  async insertReservationItem(reservationId: string, inventoryId: string, quantity: number): Promise<{ id: string }> {
    const [row] = await this.manager.query(
      `INSERT INTO reservation_item(reservation_id,inventory_id,quantity,status)
       VALUES($1,$2,$3,'ACTIVE') RETURNING id`,
      [reservationId, inventoryId, quantity]);
    return row;
  }

  async addReserved(inventoryId: string, quantity: number): Promise<void> {
    await this.manager.query(
      'UPDATE inventory SET reserved_quantity=reserved_quantity+$2, version=version+1 WHERE id=$1',
      [inventoryId, quantity]);
  }

  /** Consume ships the goods: stock leaves and the hold is cleared in the same statement. */
  async consumeStock(inventoryId: string, quantity: number): Promise<void> {
    await this.manager.query(
      'UPDATE inventory SET quantity=quantity-$2, reserved_quantity=reserved_quantity-$2, version=version+1 WHERE id=$1',
      [inventoryId, quantity]);
  }

  /** Release only clears the hold; physical stock is untouched. */
  async releaseStock(inventoryId: string, quantity: number): Promise<void> {
    await this.manager.query(
      'UPDATE inventory SET reserved_quantity=reserved_quantity-$2, version=version+1 WHERE id=$1',
      [inventoryId, quantity]);
  }

  /** Locks the requested reservations; a row belonging to another Order is simply not returned. */
  async lockReservations(reservationIds: string[], orderId: string): Promise<ReservationRow[]> {
    return this.manager.query(
      `SELECT id, order_id, status, expires_at FROM inventory_reservation
        WHERE id = ANY($1::uuid[]) AND order_id = $2 ORDER BY id FOR UPDATE`,
      [reservationIds, orderId]);
  }

  async reservationItems(reservationIds: string[]): Promise<ReservationItemRow[]> {
    return this.manager.query(
      `SELECT ri.id, ri.reservation_id, ri.inventory_id, ri.quantity, ri.status,
              i.variant_id, i.store_id
         FROM reservation_item ri JOIN inventory i ON i.id = ri.inventory_id
        WHERE ri.reservation_id = ANY($1::uuid[]) ORDER BY ri.id`,
      [reservationIds]);
  }

  async setReservationItemStatus(ids: string[], status: string): Promise<void> {
    await this.manager.query('UPDATE reservation_item SET status=$2 WHERE id = ANY($1::uuid[])', [ids, status]);
  }

  async setReservationStatus(ids: string[], status: string): Promise<void> {
    await this.manager.query('UPDATE inventory_reservation SET status=$2 WHERE id = ANY($1::uuid[])', [ids, status]);
  }

  /**
   * Stock audit trail. `delta_quantity` tracks physical stock and `delta_reserved` tracks the
   * hold, so reservation history can be reconstructed from movements alone.
   */
  async insertMovement(input: { inventoryId: string; reservationItemId: string; orderId: string;
    operationId: string; deltaQuantity: number; deltaReserved: number; reason: string; actorUserId: string }): Promise<void> {
    await this.manager.query(
      `INSERT INTO stock_movement(inventory_id,reservation_item_id,order_id,operation_id,
                                  delta_quantity,delta_reserved,reason,actor_user_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [input.inventoryId, input.reservationItemId, input.orderId, input.operationId,
        input.deltaQuantity, input.deltaReserved, input.reason, input.actorUserId]);
  }
}
