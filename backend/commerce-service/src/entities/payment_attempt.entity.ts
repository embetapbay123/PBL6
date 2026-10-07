// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('payment_attempt')
export class PaymentAttempt {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  payment_id!: string;
  @Column({"type": "varchar", "nullable": false})
  provider_reference!: string;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
  @Column({"type": "bigint", "nullable": false})
  amount_vnd!: string;
  @Column({"type": "timestamptz", "nullable": false})
  created_at!: Date;
  @Column({type:'text',nullable:true})
  qr_url!: string | null;
  @Column({type:'timestamptz',nullable:true})
  expires_at!: Date | null;
  @Column({type:'varchar',nullable:false})
  provider!: 'SEPAY_TEST' | 'LEGACY_SANDBOX';
}
