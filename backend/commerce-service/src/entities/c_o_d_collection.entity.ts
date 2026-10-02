// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('c_o_d_collection')
export class CODCollection {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  order_id!: string;
  @Column({"type": "bigint", "nullable": false})
  amount_due_vnd!: string;
  @Column({"type": "bigint", "nullable": false})
  amount_collected_vnd!: string;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
  @Column({"type": "uuid", "nullable": false})
  operation_id!: string;
  @Column({"type": "timestamptz", "nullable": true})
  collected_at!: Date | null;
}
