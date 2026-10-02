// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('refresh_session')
export class RefreshSession {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  user_id!: string;
  @Column({type:'uuid',nullable:false})
  family_id!: string;
  @Column({"type": "varchar", "nullable": false})
  token_hash!: string;
  @Column({"type": "timestamptz", "nullable": false})
  expires_at!: Date;
  @Column({"type": "timestamptz", "nullable": true})
  revoked_at!: Date | null;
}
