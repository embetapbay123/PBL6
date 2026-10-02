// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('review_audit')
export class ReviewAudit {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  review_id!: string;
  @Column({"type": "uuid", "nullable": false})
  actor_user_id!: string;
  @Column({"type": "varchar", "nullable": false})
  action!: string;
  @Column({"type": "text", "nullable": true})
  reason!: string | null;
  @Column({"type": "timestamptz", "nullable": false})
  created_at!: Date;
}
