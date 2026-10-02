// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('product')
export class Product {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  store_id!: string;
  @Column({"type": "uuid", "nullable": false})
  product_type_id!: string;
  @Column({"type": "varchar", "nullable": false})
  title!: string;
  @Column({"type": "text", "nullable": true})
  description!: string | null;
  @Column({"type": "jsonb", "nullable": false})
  attributes_json!: Record<string, unknown>;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
  @Column({"type": "varchar", "nullable": false})
  moderation_status!: string;
  @Column({"type": "integer", "nullable": false})
  version!: number;
}
