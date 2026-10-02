// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('order_status_history')
export class OrderStatusHistory {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  order_id!: string;
  @Column({"type": "varchar", "nullable": true})
  from_status!: string | null;
  @Column({"type": "varchar", "nullable": false})
  to_status!: string;
  @Column({"type": "uuid", "nullable": false})
  actor_user_id!: string;
  @Column({"type": "text", "nullable": true})
  reason!: string | null;
  @Column({"type": "uuid", "nullable": false})
  operation_id!: string;
  @Column({"type": "timestamptz", "nullable": false})
  created_at!: Date;
}
