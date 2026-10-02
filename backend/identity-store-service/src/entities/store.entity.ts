// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('store')
export class Store {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  application_id!: string;
  @Column({"type": "varchar", "nullable": false})
  name!: string;
  @Column({"type": "varchar", "nullable": false})
  slug!: string;
  @Column({"type": "text", "nullable": true})
  description!: string | null;
  @Column({"type": "varchar", "nullable": true})
  logo_url!: string | null;
  @Column({"type": "varchar", "nullable": false})
  contact!: string;
  @Column({"type": "bigint", "nullable": false})
  shipping_fee_vnd!: string;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
  @Column({"type": "integer", "nullable": false})
  version!: number;
}
