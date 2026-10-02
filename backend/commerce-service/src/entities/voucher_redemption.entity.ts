// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('voucher_redemption')
export class VoucherRedemption {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  voucher_id!: string;
  @Column({"type": "uuid", "nullable": false})
  purchase_group_id!: string;
  @Column({"type": "uuid", "nullable": false})
  order_id!: string;
  @Column({"type": "uuid", "nullable": false})
  customer_user_id!: string;
  @Column({"type": "bigint", "nullable": false})
  discount_vnd!: string;
  @Column({"type": "timestamptz", "nullable": false})
  redeemed_at!: Date;
}
