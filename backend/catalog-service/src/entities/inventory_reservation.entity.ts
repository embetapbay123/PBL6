// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('inventory_reservation')
export class InventoryReservation {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  order_id!: string;
  @Column({"type": "uuid", "nullable": false})
  purchase_group_id!: string;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
  @Column({"type": "timestamptz", "nullable": false})
  expires_at!: Date;
  @Column({"type": "timestamptz", "nullable": false})
  created_at!: Date;
}
