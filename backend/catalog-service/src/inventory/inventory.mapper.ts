import { moneyNumber } from '../../../shared/src/money';
import type { OperationOutputs } from '../../../shared/src/operations.generated';
import type { QuoteVariantRow, StockMovementRow } from './inventory.repository';

/** `pg` returns `timestamptz` as a Date; cached idempotent results come back as strings. */
function isoTime(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/**
 * Boundary mapper for QuoteVariants. `price_vnd` stays a BIGINT string in the ORM and is only
 * turned into an integer at the edge, where `moneyNumber` refuses unsafe or fractional values.
 * The requested quantity is echoed back; `available_quantity` is the current stock snapshot.
 */
export function quoteItemResponse(row: QuoteVariantRow, quantity: number): OperationOutputs['QuoteVariants']['items'][number] {
  return {
    variant_id: row.variant_id,
    store_id: row.store_id,
    quantity,
    price_vnd: moneyNumber(row.price_vnd),
    available_quantity: row.available_quantity,
    version: row.version,
  };
}

/**
 * Balance after an adjustment. `available_quantity` is derived here rather than stored, so it can
 * never drift from `quantity - reserved_quantity`; the clamp keeps it inside the contract minimum.
 */
export function inventoryBalance(row: { variant_id: string; quantity: number; reserved_quantity: number; version: number }):
OperationOutputs['adjustInventory'] {
  return {
    variant_id: row.variant_id,
    quantity: row.quantity,
    reserved_quantity: row.reserved_quantity,
    available_quantity: Math.max(row.quantity - row.reserved_quantity, 0),
    version: row.version,
  };
}

/**
 * Movement history row. Optional contract fields are omitted rather than sent as `null`, because
 * the response schema closes the object and types them as strings.
 */
export function stockMovementView(row: StockMovementRow): OperationOutputs['listStockMovements']['items'][number] {
  return {
    id: row.id,
    variant_id: row.variant_id,
    ...(row.order_id === null ? {} : { order_id: row.order_id }),
    delta_quantity: row.delta_quantity,
    ...(row.reason === null ? {} : { reason: row.reason }),
    ...(row.occurred_at === null ? {} : { occurred_at: isoTime(row.occurred_at) }),
  };
}
