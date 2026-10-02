// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('order')
export class Order {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  purchase_group_id!: string;
  @Column({"type": "uuid", "nullable": false})
  customer_user_id!: string;
  @Column({"type": "uuid", "nullable": false})
  store_id!: string;
  @Column({"type": "jsonb", "nullable": false})
  address_snapshot!: Record<string, unknown>;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
  @Column({"type": "varchar", "nullable": false})
  payment_method!: string;
  @Column({"type": "timestamptz", "nullable": true})
  payment_expires_at!: Date | null;
  @Column({"type": "bigint", "nullable": false})
  goods_vnd!: string;
  @Column({"type": "bigint", "nullable": false})
  store_discount_vnd!: string;
  @Column({"type": "bigint", "nullable": false})
  platform_discount_vnd!: string;
  @Column({"type": "bigint", "nullable": false})
  shipping_vnd!: string;
  @Column({"type": "bigint", "nullable": false})
  payable_vnd!: string;
  @Column({"type": "integer", "nullable": false})
  version!: number;
  @Column({"type": "timestamptz", "nullable": false})
  created_at!: Date;
}
