// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('order_item')
export class OrderItem {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  order_id!: string;
  @Column({"type": "uuid", "nullable": false})
  product_id!: string;
  @Column({"type": "uuid", "nullable": false})
  variant_id!: string;
  @Column({"type": "jsonb", "nullable": false})
  product_snapshot!: Record<string, unknown>;
  @Column({"type": "varchar", "nullable": false})
  sku_snapshot!: string;
  @Column({"type": "bigint", "nullable": false})
  unit_price_vnd!: string;
  @Column({"type": "integer", "nullable": false})
  quantity!: number;
  @Column({"type": "bigint", "nullable": false})
  line_total_vnd!: string;
}
