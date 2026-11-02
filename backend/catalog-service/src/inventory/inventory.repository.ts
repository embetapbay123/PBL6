// Use only this service database; parameterize queries and pass transaction managers explicitly.
import { OwnedRepository } from '../../../shared/src/repository';
import {searchPattern} from '../../../shared/src/search';
import type {AttributeDefinitionRow} from '../catalog/catalog.validation';

export type InventoryFilters={q?:string;product_id?:string;variant_id?:string;from?:string;to?:string;stock?:'IN_STOCK'|'LOW'|'OUT';sort?:'NAME_ASC'|'NAME_DESC'|'AVAILABLE_ASC'|'AVAILABLE_DESC'};
const inventoryJoins=' FROM inventory i LEFT JOIN product_variant v ON v.id=i.variant_id AND v.store_id=i.store_id LEFT JOIN product p ON p.id=v.product_id AND p.store_id=i.store_id';
function inventoryPredicate(store:string,filters:InventoryFilters){
 const values:unknown[]=[store],conditions=['i.store_id=$1'];
 for(const [column,value] of [['v.product_id',filters.product_id],['i.variant_id',filters.variant_id]] as const){if(value){values.push(value);conditions.push(column+'=$'+values.length);}}
 const pattern=searchPattern(filters.q);if(pattern){values.push(pattern);const arg='$'+values.length;conditions.push(`(marketplace_search(p.title) LIKE ${arg} OR marketplace_search(v.sku) LIKE ${arg} OR marketplace_search(v.variant_values_json::text) LIKE ${arg})`);}
 return {values,where:' WHERE '+conditions.join(' AND ')};
}

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
  taxonomy_status?:string;
  variant_values?:Record<string,unknown>;
  product_attributes?:Record<string,unknown>;
  attribute_definitions?:AttributeDefinitionRow[];
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

export interface InventoryIdentity {
  product_id?: string | null;
  product_title?: string | null;
  sku?: string | null;
  variant_values?: Record<string, string> | null;
}

export interface InventoryBalanceRow extends InventoryIdentity {
  variant_id: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  version: number;
}

export interface StockMovementRow extends InventoryIdentity {
  recorded_at?: Date|string|null;
  receipt_id?: string | null;
  delta_reserved?: number;
  operation_id?: string;
  actor_user_id?: string;
  quantity_before?: number | null;
  quantity_after?: number | null;
  reserved_before?: number | null;
  reserved_after?: number | null;
  inventory_version?: number | null;
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

export type InventoryRow = InventoryRecord;
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
  async variantsForQuote(variantIds: string[],lock=false): Promise<QuoteVariantRow[]> {
    if(lock){
      const products=await this.manager.query('SELECT id,product_type_id FROM product WHERE id IN (SELECT product_id FROM product_variant WHERE id=ANY($1::uuid[])) ORDER BY id FOR SHARE',[variantIds]);
      const typeIds=[...new Set(products.map((p:any)=>p.product_type_id))].sort();
      if(typeIds.length)await this.manager.query('SELECT id FROM product_type WHERE id=ANY($1::uuid[]) ORDER BY id FOR SHARE',[typeIds]);
      await this.manager.query('SELECT id FROM product_variant WHERE id=ANY($1::uuid[]) ORDER BY id FOR SHARE',[variantIds]);
    }
    return this.manager.query(
      `SELECT v.id AS variant_id, v.product_id, v.store_id, v.price_vnd,
              v.status AS variant_status, p.status AS product_status, p.moderation_status,
              t.status AS taxonomy_status,v.variant_values_json AS variant_values,p.attributes_json AS product_attributes,
              (SELECT coalesce(jsonb_agg(jsonb_build_object('code',d.code,'required',d.required,'data_type',d.data_type,'allowed_values',d.allowed_values,'variant_factor',d.variant_factor) ORDER BY d.code),'[]'::jsonb) FROM attribute_definition d WHERE d.product_type_id=t.id) AS attribute_definitions,
              greatest(coalesce(i.quantity,0) - coalesce(i.reserved_quantity,0), 0) AS available_quantity,
              coalesce(i.version,0) AS version
         FROM product_variant v
         JOIN product p ON p.id = v.product_id
         JOIN product_type t ON t.id=p.product_type_id
         LEFT JOIN inventory i ON i.variant_id = v.id AND i.store_id = v.store_id
        WHERE v.id = ANY($1::uuid[]) ORDER BY p.id,v.id`,
      [variantIds]);
  }

  /* ------------------------------ INV-01: store inventory read, adjust, movements */

  async pageInventory(storeId: string, page: number, size: number,filters:InventoryFilters={}): Promise<{ items: InventoryBalanceRow[]; total: number }> {
    const {values,where:baseWhere}=inventoryPredicate(storeId,filters);
    const where=baseWhere+(filters.stock==='OUT'?' AND i.quantity-i.reserved_quantity<=0':filters.stock==='LOW'?' AND i.quantity-i.reserved_quantity BETWEEN 1 AND 4':filters.stock==='IN_STOCK'?' AND i.quantity-i.reserved_quantity>0':'');
    const order = filters.sort === 'NAME_ASC' ? 'p.title ASC NULLS LAST, i.variant_id' : filters.sort === 'NAME_DESC' ? 'p.title DESC NULLS LAST, i.variant_id' : filters.sort === 'AVAILABLE_ASC' ? 'greatest(i.quantity-i.reserved_quantity,0) ASC, i.variant_id' : filters.sort === 'AVAILABLE_DESC' ? 'greatest(i.quantity-i.reserved_quantity,0) DESC, i.variant_id' : 'i.variant_id';
    const [count] = await this.manager.query('SELECT count(*)::int AS total'+inventoryJoins+where,values);
    const items = await this.manager.query(
      `SELECT i.variant_id, i.quantity, i.reserved_quantity,
              greatest(i.quantity-i.reserved_quantity,0) AS available_quantity, i.version,
              p.id AS product_id, p.title AS product_title, v.sku, v.variant_values_json AS variant_values
         ${inventoryJoins}${where} ORDER BY ${order} LIMIT $${values.length+1} OFFSET $${values.length+2}`,
      [...values, size, (page - 1) * size]);
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

  async pageMovements(storeId: string, page: number, size: number,filters:InventoryFilters={}): Promise<{ items: StockMovementRow[]; total: number }> {
    const predicate=inventoryPredicate(storeId,filters),values=predicate.values,joins=inventoryJoins+' JOIN stock_movement m ON m.inventory_id=i.id';
    let where=predicate.where;
    for(const [operator,value] of [['>=',filters.from],['<',filters.to]] as const)if(value){values.push(value);where+=` AND coalesce(m.recorded_at,m.created_at) ${operator} $${values.length}::timestamptz`;}
    const [count] = await this.manager.query(
      'SELECT count(*)::int AS total'+joins+where, values);
    const items = await this.manager.query(
      `SELECT m.id, i.variant_id, m.order_id, m.delta_quantity, m.delta_reserved, m.reason, m.created_at AS occurred_at,
              m.recorded_at, m.receipt_id, m.operation_id, m.actor_user_id, m.quantity_before, m.quantity_after,
              m.reserved_before, m.reserved_after, m.inventory_version,
              p.id AS product_id, p.title AS product_title, v.sku, v.variant_values_json AS variant_values
         ${joins}${where} ORDER BY coalesce(m.recorded_at,m.created_at) DESC, m.inventory_version DESC NULLS LAST, m.id LIMIT $${values.length+1} OFFSET $${values.length+2}`,
      [...values, size, (page - 1) * size]);
    return { items, total: count.total };
  }

  async reconciliationMovements(storeId:string,variantId:string):Promise<StockMovementRow[]>{
    return this.manager.query(`SELECT m.*,i.variant_id,m.created_at AS occurred_at FROM stock_movement m JOIN inventory i ON i.id=m.inventory_id WHERE i.store_id=$1 AND i.variant_id=$2 ORDER BY m.inventory_version NULLS FIRST,m.id LIMIT 20001`,[storeId,variantId]);
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
                                  delta_quantity,delta_reserved,reason,actor_user_id,
                                  quantity_before,quantity_after,reserved_before,reserved_after,inventory_version)
       SELECT $1,NULL,NULL,$2,$3,0,$4,$5,quantity-$3,quantity,reserved_quantity,reserved_quantity,version
         FROM inventory WHERE id=$1`,
      [input.inventoryId, input.operationId, input.deltaQuantity, input.reason, input.actorUserId]);
  }

  async lockReservationOrders(orderIds: string[]): Promise<void> {
    for (const orderId of [...new Set(orderIds)].sort()) {
      await this.manager.query("SELECT pg_advisory_xact_lock(hashtextextended('Inventory.Order:' || $1, 0))", [orderId]);
    }
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

  /** Consume commits commercial stock: quantity decreases and the hold is cleared in the same statement. */
  async consumeStock(inventoryId: string, quantity: number): Promise<void> {
    await this.manager.query(
      'UPDATE inventory SET quantity=quantity-$2, reserved_quantity=reserved_quantity-$2, version=version+1 WHERE id=$1',
      [inventoryId, quantity]);
  }

  /** Release only clears the hold; commercial quantity is untouched. */
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
   * Stock audit trail. `delta_quantity` tracks commercial quantity and `delta_reserved` tracks the
   * hold, so reservation history can be reconstructed from movements alone.
   */
  async insertMovement(input: { inventoryId: string; reservationItemId?: string; orderId: string;
    operationId: string; deltaQuantity: number; deltaReserved: number; reason: string; actorUserId: string; receiptId?:string }): Promise<void> {
    await this.manager.query(
      `INSERT INTO stock_movement(inventory_id,reservation_item_id,order_id,operation_id,
                                  delta_quantity,delta_reserved,reason,actor_user_id,
                                  quantity_before,quantity_after,reserved_before,reserved_after,inventory_version,receipt_id)
       SELECT $1,$2,$3,$4,$5,$6,$7,$8,quantity-$5,quantity,reserved_quantity-$6,reserved_quantity,version,$9
         FROM inventory WHERE id=$1`,
      [input.inventoryId, input.reservationItemId ?? null, input.orderId, input.operationId,
        input.deltaQuantity, input.deltaReserved, input.reason, input.actorUserId, input.receiptId ?? null]);
  }

  /* --------------------------------------------- INV-03: restock a consumed Order */

  /** Restock returns commercial quantity after a consumed Order is cancelled; the hold is already cleared. */
  async restockStock(inventoryId: string, quantity: number): Promise<void> {
    await this.manager.query(
      'UPDATE inventory SET quantity=quantity+$2, version=version+1 WHERE id=$1', [inventoryId, quantity]);
  }

  /**
   * Business-state guard for restock. `stock_movement` is the durable record of what already
   * happened, so an Order restocked once cannot be restocked again through a different operation
   * id — `once()` by itself only covers retries of the same id.
   */
  async hasRestockMovement(orderId: string): Promise<boolean> {
    const [row] = await this.manager.query(
      "SELECT 1 AS found FROM stock_movement WHERE order_id=$1 AND reason='RESTOCK' LIMIT 1", [orderId]);
    return row !== undefined;
  }

  /**
   * Overdue holds that are still ACTIVE, with the quantity they are holding.
   *
   * Read-only on purpose: BR-23 lets an Order expire/release its stock only after M2 has
   * reconciled that no Payment Attempt succeeded. M1 cannot read M2's database, so it reports the
   * overdue holds and leaves the decision — and the `ReleaseReservation` call — to M2.
   */
  async overdueReservations(limit: number): Promise<{ reservation_id: string; order_id: string;
    expires_at: Date | string; reserved_quantity: number }[]> {
    return this.manager.query(
      `SELECT r.id AS reservation_id, r.order_id, r.expires_at,
              coalesce(sum(ri.quantity) FILTER (WHERE ri.status='ACTIVE'),0)::int AS reserved_quantity
         FROM inventory_reservation r JOIN reservation_item ri ON ri.reservation_id=r.id
        WHERE r.status='ACTIVE' AND r.expires_at <= now()
        GROUP BY r.id, r.order_id, r.expires_at
       HAVING coalesce(sum(ri.quantity) FILTER (WHERE ri.status='ACTIVE'),0) > 0
        ORDER BY r.expires_at, r.id LIMIT $1`,
      [limit]);
  }

  async hasReceivedInspection(orderId:string):Promise<boolean> {
    return (await this.manager.query('SELECT id FROM inventory_return_receipt WHERE order_id=$1 LIMIT 1',[orderId])).length>0;
  }
  async receivedTotals(orderId:string):Promise<Map<string,number>> {
    const rows=await this.manager.query("SELECT i.variant_id,sum(m.delta_quantity)::int AS quantity FROM stock_movement m JOIN inventory i ON i.id=m.inventory_id WHERE m.order_id=$1 AND m.reason IN ('RESTOCK','RETURN_RECEIVED') GROUP BY i.variant_id",[orderId]);
    return new Map(rows.map((row:any)=>[row.variant_id,row.quantity]));
  }

}
