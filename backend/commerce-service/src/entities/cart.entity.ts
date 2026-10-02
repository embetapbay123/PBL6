// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('cart')
export class Cart {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  customer_user_id!: string;
  @Column({"type": "timestamptz", "nullable": false})
  updated_at!: Date;
}
