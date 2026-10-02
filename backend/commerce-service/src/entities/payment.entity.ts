// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('payment')
export class Payment {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  order_id!: string;
  @Column({"type": "varchar", "nullable": false})
  method!: string;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
  @Column({"type": "bigint", "nullable": false})
  payable_vnd!: string;
  @Column({"type": "bigint", "nullable": false})
  collectible_vnd!: string;
  @Column({"type": "bigint", "nullable": false})
  collected_vnd!: string;
  @Column({"type": "bigint", "nullable": false})
  refunded_vnd!: string;
  @Column({"type": "integer", "nullable": false})
  version!: number;
}
