// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('m2_audit')
export class M2Audit {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": true})
  actor_user_id!: string | null;
  @Column({"type": "varchar", "nullable": false})
  target_type!: string;
  @Column({"type": "uuid", "nullable": false})
  target_id!: string;
  @Column({"type": "varchar", "nullable": false})
  action!: string;
  @Column({"type": "text", "nullable": true})
  reason!: string | null;
  @Column({"type": "varchar", "nullable": false})
  request_id!: string;
  @Column({"type": "jsonb", "nullable": true})
  before_json!: Record<string, unknown> | null;
  @Column({"type": "jsonb", "nullable": true})
  after_json!: Record<string, unknown> | null;
  @Column({"type": "timestamptz", "nullable": false})
  created_at!: Date;
}
