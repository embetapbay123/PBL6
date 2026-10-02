// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('product_image')
export class ProductImage {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  product_id!: string;
  @Column({"type": "uuid", "nullable": true})
  variant_id!: string | null;
  @Column({"type": "varchar", "nullable": false})
  url!: string;
  @Column({"type": "integer", "nullable": false})
  position!: number;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
}
