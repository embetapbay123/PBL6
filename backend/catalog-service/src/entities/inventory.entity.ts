// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('inventory')
export class Inventory {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  variant_id!: string;
  @Column({"type": "uuid", "nullable": false})
  store_id!: string;
  @Column({"type": "integer", "nullable": false})
  quantity!: number;
  @Column({"type": "integer", "nullable": false})
  reserved_quantity!: number;
  @Column({"type": "integer", "nullable": false})
  version!: number;
}
