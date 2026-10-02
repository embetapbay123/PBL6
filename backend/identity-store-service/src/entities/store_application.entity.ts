// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('store_application')
export class StoreApplication {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  applicant_user_id!: string;
  @Column({"type": "varchar", "nullable": false})
  proposed_name!: string;
  @Column({"type": "varchar", "nullable": false})
  contact!: string;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
  @Column({"type": "text", "nullable": true})
  decision_reason!: string | null;
  @Column({"type": "uuid", "nullable": true})
  decided_by_user_id!: string | null;
  @Column({"type": "timestamptz", "nullable": false})
  submitted_at!: Date;
  @Column({"type": "timestamptz", "nullable": true})
  decided_at!: Date | null;
  @Column({"type": "integer", "nullable": false})
  version!: number;
}
