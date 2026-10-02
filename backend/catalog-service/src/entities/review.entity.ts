// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('review')
export class Review {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  product_id!: string;
  @Column({"type": "uuid", "nullable": false})
  order_item_id!: string;
  @Column({"type": "uuid", "nullable": false})
  customer_user_id!: string;
  @Column({"type": "integer", "nullable": false})
  rating!: number;
  @Column({"type": "text", "nullable": true})
  body!: string | null;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
  @Column({"type": "text", "nullable": true})
  hidden_reason!: string | null;
  @Column({"type": "timestamptz", "nullable": false})
  created_at!: Date;
  @Column({"type": "timestamptz", "nullable": false})
  updated_at!: Date;
  @Column({"type": "integer", "nullable": false})
  version!: number;
}
