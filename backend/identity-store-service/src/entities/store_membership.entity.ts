// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('store_membership')
export class StoreMembership {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  store_id!: string;
  @Column({"type": "uuid", "nullable": false})
  user_id!: string;
  @Column({"type": "varchar", "nullable": false})
  role!: string;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
  @Column({"type": "timestamptz", "nullable": false})
  joined_at!: Date;
  @Column({"type": "integer", "nullable": false})
  version!: number;
}
