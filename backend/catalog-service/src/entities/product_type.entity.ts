// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('product_type')
export class ProductType {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  category_id!: string;
  @Column({"type": "varchar", "nullable": false})
  name!: string;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
}
