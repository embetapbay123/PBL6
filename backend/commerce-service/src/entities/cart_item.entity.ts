// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('cart_item')
export class CartItem {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  cart_id!: string;
  @Column({"type": "uuid", "nullable": false})
  variant_id!: string;
  @Column({type: "uuid", nullable: true})
  product_id!: string | null;
  @Column({"type": "uuid", "nullable": false})
  store_id!: string;
  @Column({"type": "integer", "nullable": false})
  quantity!: number;
  @Column({"type": "timestamptz", "nullable": false})
  added_at!: Date;
}
