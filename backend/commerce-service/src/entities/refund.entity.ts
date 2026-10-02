// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('refund')
export class Refund {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  payment_id!: string;
  @Column({"type": "uuid", "nullable": false})
  order_id!: string;
  @Column({"type": "bigint", "nullable": false})
  amount_vnd!: string;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
  @Column({"type": "uuid", "nullable": false})
  operation_id!: string;
  @Column({"type": "timestamptz", "nullable": false})
  created_at!: Date;
}
