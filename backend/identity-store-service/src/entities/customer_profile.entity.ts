// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('customer_profile')
export class CustomerProfile {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  user_id!: string;
  @Column({"type": "varchar", "nullable": false})
  display_name!: string;
  @Column({"type": "varchar", "nullable": true})
  phone!: string | null;
  @Column({"type": "timestamptz", "nullable": false})
  updated_at!: Date;
}
