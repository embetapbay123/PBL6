// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('address')
export class Address {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  customer_user_id!: string;
  @Column({"type": "varchar", "nullable": false})
  recipient_name!: string;
  @Column({"type": "varchar", "nullable": false})
  phone!: string;
  @Column({"type": "varchar", "nullable": false})
  line1!: string;
  @Column({"type": "varchar", "nullable": false})
  ward!: string;
  @Column({"type": "varchar", "nullable": false})
  district!: string;
  @Column({"type": "varchar", "nullable": false})
  city!: string;
  @Column({"type": "boolean", "nullable": false})
  is_default!: boolean;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
}
