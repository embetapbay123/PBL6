// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('reservation_item')
export class ReservationItem {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  reservation_id!: string;
  @Column({"type": "uuid", "nullable": false})
  inventory_id!: string;
  @Column({"type": "integer", "nullable": false})
  quantity!: number;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
}
