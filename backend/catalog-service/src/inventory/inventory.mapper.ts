import { moneyNumber } from '../../../shared/src/money';
import type { OperationOutputs } from '../../../shared/src/operations.generated';
import type { QuoteVariantRow, ReservationRow } from './inventory.repository';

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
 * One `ReservationView` per requested line. `id` is the reservation that covers the line, so a
 * multi-SKU Order repeats the same id once per Variant. `expires_at` is normalised to an ISO
 * string so a live result and a replay from `operation_result` are byte-identical.
 */
export function reservationView(reservation: ReservationRow, line: { order_id: string; variant_id: string; quantity: number }):
OperationOutputs['ReserveInventory']['reservations'][number] {
  return {
    id: reservation.id,
    order_id: line.order_id,
    variant_id: line.variant_id,
    quantity: line.quantity,
    expires_at: isoTime(reservation.expires_at),
  };
}

export { isoTime };
