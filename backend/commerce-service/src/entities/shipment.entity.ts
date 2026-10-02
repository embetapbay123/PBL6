// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('shipment')
export class Shipment {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  order_id!: string;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
  @Column({"type": "varchar", "nullable": true})
  tracking_code!: string | null;
  @Column({"type": "timestamptz", "nullable": true})
  shipped_at!: Date | null;
  @Column({"type": "timestamptz", "nullable": true})
  delivered_at!: Date | null;
}
