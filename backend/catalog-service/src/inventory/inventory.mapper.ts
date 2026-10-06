import { moneyNumber } from '../../../shared/src/money';
import type { OperationOutputs } from '../../../shared/src/operations.generated';
import type { QuoteVariantRow } from './inventory.repository';

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
