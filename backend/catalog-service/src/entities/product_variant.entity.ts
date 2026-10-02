// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('product_variant')
export class ProductVariant {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  product_id!: string;
  @Column({"type": "uuid", "nullable": false})
  store_id!: string;
  @Column({"type": "varchar", "nullable": false})
  sku!: string;
  @Column({"type": "bigint", "nullable": false})
  price_vnd!: string;
  @Column({"type": "jsonb", "nullable": false})
  variant_values_json!: Record<string, unknown>;
  @Column({"type": "varchar", "nullable": false})
  variant_signature!: string;
  @Column({"type": "boolean", "nullable": false})
  is_default!: boolean;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
}
