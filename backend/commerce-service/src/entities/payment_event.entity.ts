// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('payment_event')
export class PaymentEvent {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": true})
  attempt_id!: string | null;
  @Column({type:'uuid',nullable:true})
  payment_id!: string | null;
  @Column({"type": "varchar", "nullable": false})
  provider_event_id!: string;
  @Column({"type": "varchar", "nullable": false})
  event_type!: string;
  @Column({"type": "varchar", "nullable": false})
  payload_hash!: string;
  @Column({"type": "timestamptz", "nullable": false})
  received_at!: Date;
}
