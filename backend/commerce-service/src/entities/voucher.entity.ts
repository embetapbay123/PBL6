// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('voucher')
export class Voucher {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "varchar", "nullable": false})
  code!: string;
  @Column({"type": "varchar", "nullable": false})
  scope!: string;
  @Column({"type": "uuid", "nullable": true})
  store_id!: string | null;
  @Column({"type": "uuid", "nullable": false})
  owner_user_id!: string;
  @Column({"type": "varchar", "nullable": false})
  discount_type!: string;
  @Column({"type": "bigint", "nullable": false})
  discount_value!: string;
  @Column({"type": "bigint", "nullable": true})
  max_discount_vnd!: string | null;
  @Column({"type": "bigint", "nullable": false})
  min_goods_vnd!: string;
  @Column({"type": "timestamptz", "nullable": false})
  starts_at!: Date;
  @Column({"type": "timestamptz", "nullable": false})
  ends_at!: Date;
  @Column({"type": "integer", "nullable": false})
  usage_limit!: number;
  @Column({"type": "integer", "nullable": false})
  per_customer_limit!: number;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
  @Column({"type": "integer", "nullable": false})
  version!: number;
}
