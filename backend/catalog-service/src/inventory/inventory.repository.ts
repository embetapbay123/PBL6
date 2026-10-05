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
}
