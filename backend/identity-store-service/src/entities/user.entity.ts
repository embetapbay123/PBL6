// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('user')
export class User {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "varchar", "nullable": false})
  email!: string;
  @Column({"type": "timestamptz", "nullable": true})
  email_verified_at!: Date | null;
  @Column({"type": "varchar", "nullable": false})
  password_hash!: string;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
  @Column({"type": "timestamptz", "nullable": false})
  created_at!: Date;
  @Column({"type": "integer", "nullable": false})
  version!: number;
}
