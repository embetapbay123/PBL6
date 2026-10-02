// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('idempotency_record')
export class IdempotencyRecord {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  customer_user_id!: string;
  @Column({"type": "varchar", "nullable": false})
  key!: string;
  @Column({"type": "varchar", "nullable": false})
  payload_hash!: string;
  @Column({"type": "uuid", "nullable": false})
  purchase_group_id!: string;
  @Column({"type": "jsonb", "nullable": true})
  response_json!: Record<string, unknown> | null;
  @Column({"type": "timestamptz", "nullable": false})
  expires_at!: Date;
}
