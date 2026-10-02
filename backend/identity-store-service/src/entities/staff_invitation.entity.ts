// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('staff_invitation')
export class StaffInvitation {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  store_id!: string;
  @Column({"type": "varchar", "nullable": false})
  invited_email!: string;
  @Column({"type": "uuid", "nullable": true})
  invited_user_id!: string | null;
  @Column({"type": "uuid", "nullable": false})
  invited_by_user_id!: string;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
  @Column({"type": "varchar", "nullable": false})
  token_hash!: string;
  @Column({"type": "timestamptz", "nullable": false})
  expires_at!: Date;
  @Column({"type": "integer", "nullable": false})
  version!: number;
}
