// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('one_time_token')
export class OneTimeToken {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  user_id!: string;
  @Column({"type": "varchar", "nullable": false})
  purpose!: string;
  @Column({"type": "varchar", "nullable": false})
  token_hash!: string;
  @Column({"type": "timestamptz", "nullable": false})
  expires_at!: Date;
  @Column({"type": "timestamptz", "nullable": true})
  consumed_at!: Date | null;
  @Column({"type": "timestamptz", "nullable": false})
  created_at!: Date;
}
