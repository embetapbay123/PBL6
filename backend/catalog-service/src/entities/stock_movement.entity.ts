// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('stock_movement')
export class StockMovement {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  inventory_id!: string;
  @Column({"type": "uuid", "nullable": true})
  reservation_item_id!: string | null;
  @Column({"type": "uuid", "nullable": true})
  order_id!: string | null;
  @Column({"type": "uuid", "nullable": false})
  operation_id!: string;
  @Column({"type": "integer", "nullable": false})
  delta_quantity!: number;
  @Column({"type": "integer", "nullable": false})
  delta_reserved!: number;
  @Column({"type": "varchar", "nullable": false})
  reason!: string;
  @Column({"type": "uuid", "nullable": false})
  actor_user_id!: string;
  @Column({"type": "timestamptz", "nullable": false})
  created_at!: Date;
}
