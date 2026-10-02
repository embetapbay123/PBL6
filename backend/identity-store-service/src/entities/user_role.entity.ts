// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('user_role')
export class UserRole {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  user_id!: string;
  @PrimaryColumn({"type": "uuid", "nullable": false})
  role_id!: string;
  @Column({"type": "timestamptz", "nullable": false})
  granted_at!: Date;
}
